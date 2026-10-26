-- Digital khata (client feedback, Oct 2026).
-- One society, approvals happen outside the app: every entry posts immediately.
-- Corrections are reversing entries (never deletes) and every change is audited.
-- Profit uses taka-months over the society's fiscal year (default July–June).
-- Existing rows are not rewritten; old RPCs stay for older APKs.
begin;
do $$ begin if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc;perform set_config('amanot.m024_restore_create','true',true);end if;end $$;

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------
alter table public.transactions add column if not exists reverses_transaction_id uuid;
create unique index if not exists transactions_reverses_uq on public.transactions(somiti_id,reverses_transaction_id) where reverses_transaction_id is not null;
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
 check(type in ('deposit','expense','transfer','profit','loan','withdrawal','withdrawal_reversal','fund','reversal'));
grant select(reverses_transaction_id) on public.transactions to authenticated;

-- Ledger without cancelled entries; invoker rights keep the tenant/member RLS.
create or replace view public.transactions_effective with (security_invoker=true) as
 select t.* from public.transactions t
 where t.type<>'reversal' and not exists(select 1 from public.transactions v where v.reverses_transaction_id=t.id);
grant select on public.transactions_effective to authenticated,amanot_rpc;

-- Emergency contacts become optional (0–3).
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.investment_contracts'::regclass and contype='c'
   and pg_get_constraintdef(oid) like '%emergency_contacts%' loop
  execute format('alter table public.investment_contracts drop constraint %I',c.conname);
 end loop;
 alter table public.investment_contracts add constraint investment_contracts_contacts_valid
  check(jsonb_typeof(emergency_contacts)='array' and jsonb_array_length(emergency_contacts) between 0 and 3);
end $$;

-- Distribution periods make the fiscal year explicit; legacy rows were calendar years.
alter table public.profit_distributions add column if not exists period_start date;
alter table public.profit_distributions add column if not exists period_end date;
alter table public.profit_distributions add column if not exists mode text not null default 'full';
alter table public.profit_distributions add column if not exists rate_pct numeric(6,2);
update public.profit_distributions set period_start=make_date(year,1,1),period_end=make_date(year,12,31) where period_start is null;
alter table public.profit_shares add column if not exists taka_months numeric(18,2);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.require_entry_role() returns void language plpgsql stable set search_path=public as $$
begin
 if not session_ready() or coalesce(my_role(),'') not in ('super_admin','admin','cashier') then
  raise exception 'অনুমতি নেই / Not permitted' using errcode='42501';
 end if;
end $$;

create or replace function public.fiscal_start_month() returns integer language sql stable security definer set search_path=public as $$
 select greatest(1,least(12,coalesce((select (info->>'fiscalYearStartMonth')::int from somiti_settings where id=1),7)));
$$;

-- Fiscal year label = calendar year in which it ends (Jul 2026–Jun 2027 = 2027).
create or replace function public.fiscal_year_of(d date) returns integer language sql stable security definer set search_path=public as $$
 select extract(year from d)::int + case when fiscal_start_month()>1 and extract(month from d)::int>=fiscal_start_month() then 1 else 0 end;
$$;

-- A date is closed once any distribution period covers it.
create or replace function public.require_open_investment_date(d date)
returns void language plpgsql security definer set search_path=public as $$
begin
 if d is null or d>investment_business_date() then raise exception 'লেনদেনের তারিখ সঠিক নয়'; end if;
 perform pg_advisory_xact_lock(714206,extract(year from d)::int);
 if exists(select 1 from profit_distributions where coalesce(period_end,make_date(year,12,31))>=d) then
  raise exception 'মুনাফা বণ্টন হয়ে যাওয়ায় এই সময়ের হিসাব বন্ধ / This period is closed after profit distribution';
 end if;
end $$;

-- Savings balance hitting zero makes the member inactive (any path).
-- Staff (admin/cashier) keep their login even with zero savings: inactive members cannot sign in.
create or replace function public.member_auto_inactive() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.total_deposit<=0 and old.total_deposit>0 and new.deleted_at is null and coalesce(new.app_role,'member')='member'
  and not exists(select 1 from profiles p where p.member_id=new.id and p.role<>'member') then new.status:='inactive'; end if;
 return new;
end $$;
revoke all on function public.member_auto_inactive() from public,anon,authenticated;
drop trigger if exists trg_member_auto_inactive on public.members;
create trigger trg_member_auto_inactive before update of total_deposit on public.members
 for each row execute function public.member_auto_inactive();

-- ---------------------------------------------------------------------------
-- Deposits: inactive members may deposit again and become active.
-- ---------------------------------------------------------------------------
do $$ declare d text; begin
 d:=pg_get_functiondef('public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date)'::regprocedure);
 if position('status=''paid'',updated_at=now() where id=m.id' in d)=0 then
  d:=replace(d,'if m.id is null or m.status=''inactive'' then','if m.id is null then');
  d:=replace(d,'perform refresh_member_dues(m.id);','perform refresh_member_dues(m.id);
  update members set status=''paid'',updated_at=now() where id=m.id and status=''inactive'';');
  if position('status=''paid'',updated_at=now() where id=m.id' in d)=0 then raise exception 'Deposit reactivation guard failed'; end if;
  execute d;
 end if;
end $$;

-- ---------------------------------------------------------------------------
-- Expenses post immediately (approval is outside the app).
-- ---------------------------------------------------------------------------
do $$ declare d text; begin
 d:=pg_get_functiondef('public.add_expense(text,text,numeric,text,text,text,text)'::regprocedure);
 d:=regexp_replace(d,'v_pending\s*:=\s*p_status\s*=\s*''pending''[^;]*;','v_pending := false;');
 if position('v_pending := false;' in d)=0 then raise exception 'Expense approval guard failed'; end if;
 execute d;
 d:=pg_get_functiondef('public.record_investment_expense(jsonb)'::regprocedure);
 d:=regexp_replace(d,'pending:=not is_admin\(\)[^;]*;','pending:=false;');
 if position('pending:=false;' in d)=0 then raise exception 'Investment expense guard failed'; end if;
 execute d;
 -- Cashier corrects mistakes too.
 d:=pg_get_functiondef('public.reverse_investment_payment(uuid,uuid,text)'::regprocedure);
 d:=replace(d,'perform require_admin();','perform require_entry_role();');execute d;
 d:=pg_get_functiondef('public.reverse_withdrawal(uuid,uuid,date,text)'::regprocedure);
 d:=replace(d,'perform require_admin();','perform require_entry_role();');execute d;
end $$;

-- One-step expense with its real date and who spent it.
create or replace function public.record_expense(p jsonb)
returns transactions language plpgsql security definer set search_path=public as $$
declare e expenses%rowtype;t transactions%rowtype;a cash_accounts%rowtype;eid uuid;amt numeric;method text;d date;cat text;title text;spender text;voucher text;
begin
 perform require_entry_role();
 eid:=(p->>'id')::uuid;amt:=(p->>'amount')::numeric;method:=p->>'method';d:=coalesce(nullif(p->>'date','')::date,investment_business_date());
 cat:=trim(coalesce(p->>'category',''));title:=trim(coalesce(p->>'title',''));spender:=trim(coalesce(p->>'spender',''));
 if eid is null or amt is null or amt<=0 or amt<>round(amt,2) or amt>9999999999.99 or method is null or method not in ('cash','bank','bkash','nagad')
  or cat='' or title='' or length(title)>500 or length(spender)>200 then raise exception 'খরচের তথ্য সঠিক নয় / Invalid expense';end if;
 select * into e from expenses where id=eid;
 if e.id is not null then
  if e.amount<>amt or e.title<>title then raise exception 'Request ID already used';end if;
  select * into t from transactions where id=e.transaction_id;return t;
 end if;
 perform require_open_investment_date(d);
 select * into a from cash_accounts where id=account_for(method) for update;
 if a.id is null or a.amount<amt then raise exception '% হিসাবে পর্যাপ্ত টাকা নেই (আছে ৳%) / Insufficient account funds',coalesce(a.name,method),coalesce(a.amount,0);end if;
 voucher:=next_receipt();
 insert into transactions(receipt_no,party_name,party_code,amount,type,payment_method,note,date,created_by)
 values(voucher,title,'EXP',amt,'expense',method,cat||': '||title||case when spender='' then '' else ' · '||spender end,d,rpc_caller_id()) returning * into t;
 insert into expenses(id,voucher_no,title,category,amount,payment_source,note,status,transaction_id,date,created_by)
 values(eid,voucher,title,cat,amt,method,nullif(spender,''),'approved',t.id,d,rpc_caller_id());
 update cash_accounts set amount=amount-amt,updated_at=now() where id=a.id;
 perform write_audit('expense_recorded',jsonb_build_object('expense_id',eid,'transaction_id',t.id,'amount',amt,'category',cat,'date',d));
 return t;
end $$;

-- ---------------------------------------------------------------------------
-- Member number may be changed by an admin, with a reason (audited).
-- ---------------------------------------------------------------------------
do $$ declare d text; begin
 d:=pg_get_functiondef('public.enforce_member_identity()'::regprocedure);
 if position('amanot.member_number_change' in d)=0 then
  d:=replace(d,'if new.member_number is distinct from old.member_number or new.somiti_id is distinct from old.somiti_id then',
   'if (new.member_number is distinct from old.member_number and coalesce(current_setting(''amanot.member_number_change'',true),'''')<>''on'') or new.somiti_id is distinct from old.somiti_id then');
  if position('amanot.member_number_change' in d)=0 then raise exception 'Member number guard failed'; end if;
  execute d;
 end if;
end $$;

create or replace function public.change_member_number(p_member_id uuid,p_number text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m members%rowtype;num text:=translate(trim(coalesce(p_number,'')),'০১২৩৪৫৬৭৮৯','0123456789');note text:=trim(coalesce(p_reason,''));
begin
 perform require_admin();
 if num !~ '^[0-9]{1,12}$' then raise exception 'শুধু সংখ্যায় সদস্য নম্বর দিন / Digits only';end if;
 if length(note)<3 then raise exception 'পরিবর্তনের কারণ দিন / Enter a reason';end if;
 select * into m from members where id=p_member_id and deleted_at is null for update;
 if m.id is null then raise exception 'সদস্য পাওয়া যায়নি / Member unavailable';end if;
 if m.member_category is null then raise exception 'আগে পুরোনো আইডির mapping করুন / Map the legacy ID first';end if;
 if m.member_number=num then return jsonb_build_object('code',m.code);end if;
 if exists(select 1 from members where id<>m.id and coalesce(member_number,substring(code from '^(?:SM|M|S|D)-([0-9]+)$'))=num) then
  raise exception 'এই সদস্য নম্বর ইতিমধ্যে ব্যবহৃত / Number already used';end if;
 perform set_config('amanot.member_number_change','on',true);
 update members set member_number=num,updated_at=now() where id=m.id returning * into m;
 perform set_config('amanot.member_number_change','',true);
 perform write_audit('member_number_changed',jsonb_build_object('member_id',m.id,'reason',note,'new_code',m.code));
 return jsonb_build_object('code',m.code);
end $$;

-- ---------------------------------------------------------------------------
-- Savings withdrawal in one step (deposit + profit may all be withdrawn).
-- ---------------------------------------------------------------------------
create or replace function public.record_withdrawal(p jsonb)
returns withdrawal_requests language plpgsql security definer set search_path=public as $$
declare m members%rowtype;r withdrawal_requests%rowtype;a cash_accounts%rowtype;t transactions%rowtype;
 pid uuid;mid uuid;amt numeric;method text;d date;ref text;note text;
begin
 perform require_entry_role();
 pid:=(p->>'id')::uuid;mid:=(p->>'memberId')::uuid;amt:=(p->>'amount')::numeric;method:=p->>'method';
 d:=coalesce(nullif(p->>'date','')::date,investment_business_date());ref:=trim(coalesce(p->>'reference',''));note:=trim(coalesce(p->>'note',''));
 if pid is null or mid is null or amt is null or amt<=0 or amt<>round(amt,2) or amt>999999999999.99
  or method is null or method not in ('cash','bank','bkash','nagad') or length(ref)>200 or length(note)>1000 then
  raise exception 'উত্তোলনের তথ্য সঠিক নয় / Invalid withdrawal';end if;
 select * into m from members where id=mid and deleted_at is null for update;
 if m.id is null then raise exception 'সদস্য পাওয়া যায়নি / Member unavailable';end if;
 select * into r from withdrawal_requests where id=pid;
 if r.id is not null then
  if r.member_id<>mid or r.amount<>amt or r.status<>'paid' then raise exception 'Request ID already used';end if;return r;
 end if;
 perform require_open_investment_date(d);
 if amt>m.total_deposit then raise exception 'সদস্যের সঞ্চয়ে এত টাকা নেই (আছে ৳%) / Insufficient savings',m.total_deposit;end if;
 select * into a from cash_accounts where id=account_for(method) for update;
 if a.id is null or a.amount<amt then raise exception '% হিসাবে পর্যাপ্ত টাকা নেই (আছে ৳%) / Insufficient account funds',coalesce(a.name,method),coalesce(a.amount,0);end if;
 insert into transactions(id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,trx_id,note,date,created_by)
 values(pid,next_receipt(),mid,m.name,m.code,amt,'withdrawal',method,nullif(ref,''),case when note='' then 'সঞ্চয় ফেরত' else note end,d,rpc_caller_id()) returning * into t;
 insert into withdrawal_requests(id,member_id,member_name,member_code,amount,reason,preferred_method,status,submitted_by,decided_by,paid_by,
  decided_at,paid_at,decision_note,payment_note,paid_transaction_id,payment_method,payment_date,payment_reference)
 values(pid,mid,m.name,m.code,amt,note,method,'paid',rpc_caller_id(),rpc_caller_id(),rpc_caller_id(),now(),now(),'সরাসরি এন্ট্রি',note,t.id,method,d,ref)
 returning * into r;
 update members set total_deposit=total_deposit-amt,total_withdrawn=total_withdrawn+amt,updated_at=now() where id=mid;
 update cash_accounts set amount=amount-amt,updated_at=now() where id=a.id;
 perform write_audit('withdrawal_recorded',jsonb_build_object('request_id',pid,'member_id',mid,'amount',amt,'method',method,'date',d));
 return r;
end $$;

-- ---------------------------------------------------------------------------
-- Money into an account that is not a member deposit.
-- category: opening (opening balance), capital (capital/donation), other_income.
-- ---------------------------------------------------------------------------
create or replace function public.add_fund(p jsonb)
returns transactions language plpgsql security definer set search_path=public as $$
declare t transactions%rowtype;a cash_accounts%rowtype;pid uuid;amt numeric;method text;cat text;d date;note text;label text;
begin
 perform require_entry_role();
 pid:=(p->>'id')::uuid;amt:=(p->>'amount')::numeric;method:=p->>'method';cat:=p->>'category';
 d:=coalesce(nullif(p->>'date','')::date,investment_business_date());note:=trim(coalesce(p->>'note',''));
 if pid is null or amt is null or amt<=0 or amt<>round(amt,2) or amt>999999999999.99 or method is null or method not in ('cash','bank','bkash','nagad')
  or cat is null or cat not in ('opening','capital','other_income') or length(note)>1000 then raise exception 'টাকা যোগের তথ্য সঠিক নয় / Invalid entry';end if;
 select * into t from transactions where id=pid;
 if t.id is not null then if t.type<>'fund' or t.amount<>amt then raise exception 'Request ID already used';end if;return t;end if;
 perform require_open_investment_date(d);
 select * into a from cash_accounts where id=account_for(method) for update;
 if a.id is null then raise exception 'হিসাব পাওয়া যায়নি / Account unavailable';end if;
 label:=case cat when 'opening' then 'প্রারম্ভিক ব্যালেন্স' when 'capital' then 'মূলধন / অনুদান' else 'অন্যান্য আয়' end;
 insert into transactions(id,receipt_no,party_name,party_code,amount,type,payment_method,note,date,created_by)
 values(pid,next_receipt(),label,case cat when 'opening' then 'FUND-OPEN' when 'capital' then 'FUND-CAP' else 'FUND-INC' end,
  amt,'fund',method,coalesce(nullif(note,''),label),d,rpc_caller_id()) returning * into t;
 update cash_accounts set amount=amount+amt,updated_at=now() where id=a.id;
 perform write_audit('fund_added',jsonb_build_object('transaction_id',pid,'category',cat,'amount',amt,'account',a.id));
 return t;
end $$;

-- ---------------------------------------------------------------------------
-- Cancel a deposit, expense or fund entry. A reversing row dated the same day
-- cancels it completely (also for profit). Edit = cancel + enter again.
-- ---------------------------------------------------------------------------
create or replace function public.void_entry(p_id uuid,p_reversal_id uuid,p_reason text)
returns transactions language plpgsql security definer set search_path=public as $$
declare t transactions%rowtype;v transactions%rowtype;m members%rowtype;a cash_accounts%rowtype;note text:=trim(coalesce(p_reason,''));
begin
 perform require_entry_role();
 if p_reversal_id is null or length(note)<3 or length(note)>1000 then raise exception 'বাতিলের কারণ দিন / Enter a reason';end if;
 select * into t from transactions where id=p_id for update;
 if t.id is null then raise exception 'এন্ট্রি পাওয়া যায়নি / Entry unavailable';end if;
 select * into v from transactions where reverses_transaction_id=t.id;
 if v.id is not null then if v.id<>p_reversal_id then raise exception 'এন্ট্রিটি আগেই বাতিল / Already cancelled';end if;return v;end if;
 if t.type not in ('deposit','expense','fund') then raise exception 'এই ধরনের এন্ট্রি এখানে বাতিল করা যায় না / Use the matching correction';end if;
 perform require_open_investment_date(t.date);
 select * into a from cash_accounts where id=account_for(t.payment_method) for update;
 if a.id is null then raise exception 'হিসাব পাওয়া যায়নি / Account unavailable';end if;
 if t.type in ('deposit','fund') and a.amount<t.amount then raise exception '% হিসাবে পর্যাপ্ত টাকা নেই / Insufficient account funds',a.name;end if;
 if t.type='deposit' then
  select * into m from members where id=t.member_id for update;
  if m.id is null or m.total_deposit<t.amount then raise exception 'সদস্যের সঞ্চয় এই জমার চেয়ে কম; আগে উত্তোলন বাতিল করুন / Savings already withdrawn';end if;
 end if;
 insert into transactions(id,receipt_no,member_id,project_id,party_name,party_code,amount,type,payment_method,note,date,created_by,reverses_transaction_id)
 values(p_reversal_id,next_receipt(),t.member_id,t.project_id,t.party_name,t.party_code,t.amount,'reversal',t.payment_method,'বাতিল: '||note,t.date,rpc_caller_id(),t.id)
 returning * into v;
 if t.type='deposit' then
  update members set total_deposit=total_deposit-t.amount,updated_at=now() where id=t.member_id;
  update cash_accounts set amount=amount-t.amount,updated_at=now() where id=a.id;
 elsif t.type='fund' then
  update cash_accounts set amount=amount-t.amount,updated_at=now() where id=a.id;
 else
  update expenses set status='rejected' where transaction_id=t.id;
  update cash_accounts set amount=amount+t.amount,updated_at=now() where id=a.id;
 end if;
 perform write_audit('entry_cancelled',jsonb_build_object('transaction_id',t.id,'reversal_id',v.id,'type',t.type,'amount',t.amount,'reason',note,
  'before',jsonb_build_object('party',t.party_name,'date',t.date,'method',t.payment_method,'note',t.note)));
 return v;
end $$;

-- ---------------------------------------------------------------------------
-- Investment in one step (no proposal/approval), optional contacts/identity.
-- ---------------------------------------------------------------------------
create or replace function public.validate_direct_investment(p jsonb)
returns void language plpgsql stable security definer set search_path=public as $$
declare principal numeric;pct numeric;profit numeric;months int;disbursed date;first_due date;contact jsonb;
begin
 principal:=(p->>'principal')::numeric;pct:=(p->>'profitPct')::numeric;months:=(p->>'termMonths')::int;
 disbursed:=(p->>'disbursedDate')::date;first_due:=(p->>'firstDueDate')::date;
 if principal is null or principal<=0 or principal>999999999999.99 or principal<>round(principal,2)
  or pct is null or pct<0 or pct>100 or pct<>round(pct,4) or months is null or months not between 1 and 120 then raise exception 'বিনিয়োগের শর্ত সঠিক নয়';end if;
 profit:=round(principal*pct/100,2);
 if (principal+profit)*100<months then raise exception 'বিনিয়োগের পরিমাণ মেয়াদের তুলনায় কম';end if;
 if disbursed is null or first_due is null or first_due<disbursed then raise exception 'তারিখ সঠিক নয়';end if;
 if coalesce(p->>'paymentMethod','') not in ('cash','bank','bkash','nagad') then raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়';end if;
 if coalesce(trim(p->>'recipientName'),'')='' and nullif(p->>'memberId','') is null then raise exception 'গ্রহীতার নাম দিন';end if;
 if norm_phone(p->>'phone') !~ '^01[3-9][0-9]{8}$' then raise exception 'সঠিক মোবাইল নম্বর দিন';end if;
 if coalesce(p->>'whatsapp','')<>'' and norm_phone(p->>'whatsapp') !~ '^01[3-9][0-9]{8}$' then raise exception 'WhatsApp নম্বর সঠিক নয়';end if;
 if coalesce(trim(p->>'nid'),'')<>'' and translate(trim(p->>'nid'),'০১২৩৪৫৬৭৮৯','0123456789') !~ '^[0-9]+$' then raise exception 'NID শুধু সংখ্যায় দিন';end if;
 if jsonb_typeof(coalesce(p->'contacts','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p->'contacts','[]'::jsonb))>3 then raise exception 'সর্বোচ্চ ৩ জন জরুরি যোগাযোগ';end if;
 for contact in select value from jsonb_array_elements(coalesce(p->'contacts','[]'::jsonb)) loop
  if coalesce(trim(contact->>'name'),'')='' or norm_phone(contact->>'phone') !~ '^01[3-9][0-9]{8}$' then raise exception 'জরুরি যোগাযোগের নাম ও সঠিক ফোন দিন';end if;
 end loop;
end $$;

create or replace function public.create_investment(p jsonb)
returns projects language plpgsql security definer set search_path=public as $$
declare pr projects%rowtype;m members%rowtype;a cash_accounts%rowtype;pid uuid;mid uuid;recipient text;
 principal numeric;pct numeric;profit numeric;months int;disbursed date;first_due date;method text;
begin
 perform require_entry_role();
 pid:=(p->>'id')::uuid;if pid is null then raise exception 'Request ID required';end if;
 perform pg_advisory_xact_lock(hashtextextended(current_somiti_id()::text||pid::text,0));
 if exists(select 1 from investment_contracts where id=pid) then
  if not exists(select 1 from investment_contracts where id=pid and request_payload=p) then raise exception 'এই আইডির অনুরোধের তথ্য ভিন্ন';end if;
  select * into pr from projects where id=pid;return pr;
 end if;
 perform validate_direct_investment(p);
 principal:=(p->>'principal')::numeric;pct:=(p->>'profitPct')::numeric;months:=(p->>'termMonths')::int;
 disbursed:=(p->>'disbursedDate')::date;first_due:=(p->>'firstDueDate')::date;method:=p->>'paymentMethod';profit:=round(principal*pct/100,2);
 perform require_open_investment_date(disbursed);
 recipient:=trim(coalesce(p->>'recipientName',''));mid:=nullif(p->>'memberId','')::uuid;
 if mid is not null then
  select * into m from members where id=mid and deleted_at is null;
  if m.id is null then raise exception 'সদস্য পাওয়া যায়নি';end if;recipient:=m.name;
 end if;
 select * into a from cash_accounts where id=account_for(method) for update;
 if a.id is null or a.amount<principal then raise exception '% হিসাবে পর্যাপ্ত টাকা নেই (আছে ৳%)',coalesce(a.name,method),coalesce(a.amount,0);end if;
 insert into projects(id,name,type,location,manager,status,invested_amount,remaining_amount,start_date,expected_end)
 values(pid,recipient,'বিনিয়োগ',coalesce(p->>'address',''),'','ongoing',principal,principal,disbursed::text,(first_due+make_interval(months=>months-1))::date::text) returning * into pr;
 insert into investment_contracts(id,member_id,contract_no,recipient_name,phone,whatsapp,address,nid,father_name,mother_name,emergency_contacts,
  principal,profit_pct,profit_amount,term_months,disbursed_date,first_due_date,purpose,payment_method,request_payload)
 values(pid,mid,'INV-'||nextval('receipt_seq')::text,recipient,norm_phone(p->>'phone'),coalesce(p->>'whatsapp',''),coalesce(p->>'address',''),coalesce(p->>'nid',''),
  coalesce(p->>'fatherName',''),coalesce(p->>'motherName',''),coalesce(p->'contacts','[]'::jsonb),principal,pct,profit,months,disbursed,first_due,coalesce(p->>'purpose',''),method,p);
 insert into transactions(id,receipt_no,project_id,party_name,party_code,date,amount,type,payment_method,note,created_by)
 values(gen_random_uuid(),next_receipt(),pid,recipient,'INV',disbursed,principal,'transfer',method,'বিনিয়োগ প্রদান',rpc_caller_id());
 update cash_accounts set amount=amount-principal,updated_at=now() where id=a.id;
 -- Keep the proposals table complete for history screens.
 insert into investment_proposals(id,status,payload,submitted_by,decided_by,disbursed_by,approved_at,disbursed_at,decision_note)
 values(pid,'disbursed',p,rpc_caller_id(),rpc_caller_id(),rpc_caller_id(),now(),now(),'সরাসরি এন্ট্রি') on conflict do nothing;
 perform write_audit('investment_created',jsonb_build_object('investment_id',pid,'principal',principal,'profit_pct',pct));
 return pr;
end $$;

-- Edit an investment. Contact details any time; money terms only before any collection.
create or replace function public.update_investment_contract(p jsonb)
returns projects language plpgsql security definer set search_path=public as $$
declare c investment_contracts%rowtype;pr projects%rowtype;oldt transactions%rowtype;a cash_accounts%rowtype;pid uuid;merged jsonb;
 v_principal numeric;v_pct numeric;v_months int;v_disbursed date;v_first_due date;v_method text;terms_changed boolean;v_recipient text;v_before jsonb;
begin
 perform require_entry_role();
 pid:=(p->>'id')::uuid;
 select * into pr from projects where id=pid for update;
 select * into c from investment_contracts where id=pid for update;
 if c.id is null then raise exception 'বিনিয়োগ পাওয়া যায়নি';end if;
 v_before:=to_jsonb(c)-'request_payload';
 merged:=jsonb_build_object('id',pid,'memberId',c.member_id,'recipientName',c.recipient_name,'phone',c.phone,'whatsapp',c.whatsapp,'address',c.address,
  'nid',c.nid,'fatherName',c.father_name,'motherName',c.mother_name,'contacts',c.emergency_contacts,'purpose',c.purpose,'principal',c.principal,
  'profitPct',c.profit_pct,'termMonths',c.term_months,'disbursedDate',c.disbursed_date,'firstDueDate',c.first_due_date,'paymentMethod',c.payment_method)
  ||(p-'id'-'memberId'-'reason');
 perform validate_direct_investment(merged);
 v_principal:=(merged->>'principal')::numeric;v_pct:=(merged->>'profitPct')::numeric;v_months:=(merged->>'termMonths')::int;
 v_disbursed:=(merged->>'disbursedDate')::date;v_first_due:=(merged->>'firstDueDate')::date;v_method:=merged->>'paymentMethod';
 terms_changed:=v_principal<>c.principal or v_pct<>c.profit_pct or v_months<>c.term_months or v_disbursed<>c.disbursed_date or v_first_due<>c.first_due_date or v_method<>c.payment_method;
 if terms_changed and pr.returned_amount>0 then raise exception 'কিস্তি নেওয়া শুরু হয়েছে; টাকার শর্ত বদলাতে আগে কিস্তি বাতিল করুন / Reverse collections first';end if;
 v_recipient:=case when c.member_id is null then trim(merged->>'recipientName') else c.recipient_name end;
 if v_principal<>c.principal or v_method<>c.payment_method or v_disbursed<>c.disbursed_date then
  perform require_open_investment_date(c.disbursed_date);perform require_open_investment_date(v_disbursed);
  select * into oldt from transactions t where t.project_id=pid and t.party_code='INV' and t.type='transfer'
   and not exists(select 1 from transactions v where v.reverses_transaction_id=t.id) order by t.created_at desc limit 1;
  if oldt.id is not null then
   insert into transactions(id,receipt_no,project_id,party_name,party_code,amount,type,payment_method,note,date,created_by,reverses_transaction_id)
   values(gen_random_uuid(),next_receipt(),pid,oldt.party_name,'INV',oldt.amount,'reversal',oldt.payment_method,'বিনিয়োগ সংশোধন',oldt.date,rpc_caller_id(),oldt.id);
   update cash_accounts set amount=amount+oldt.amount,updated_at=now() where id=account_for(oldt.payment_method);
  end if;
  select * into a from cash_accounts where id=account_for(v_method) for update;
  if a.id is null or a.amount<v_principal then raise exception '% হিসাবে পর্যাপ্ত টাকা নেই (আছে ৳%)',coalesce(a.name,v_method),coalesce(a.amount,0);end if;
  insert into transactions(id,receipt_no,project_id,party_name,party_code,date,amount,type,payment_method,note,created_by)
  values(gen_random_uuid(),next_receipt(),pid,v_recipient,'INV',v_disbursed,v_principal,'transfer',v_method,'বিনিয়োগ প্রদান (সংশোধিত)',rpc_caller_id());
  update cash_accounts set amount=amount-v_principal,updated_at=now() where id=a.id;
 end if;
 update investment_contracts set recipient_name=v_recipient,phone=norm_phone(merged->>'phone'),whatsapp=coalesce(merged->>'whatsapp',''),address=coalesce(merged->>'address',''),
  nid=coalesce(merged->>'nid',''),father_name=coalesce(merged->>'fatherName',''),mother_name=coalesce(merged->>'motherName',''),
  emergency_contacts=coalesce(merged->'contacts','[]'::jsonb),purpose=coalesce(merged->>'purpose',''),principal=v_principal,profit_pct=v_pct,
  profit_amount=round(v_principal*v_pct/100,2),term_months=v_months,disbursed_date=v_disbursed,first_due_date=v_first_due,payment_method=v_method where id=pid;
 update projects set name=v_recipient,location=coalesce(merged->>'address',''),invested_amount=v_principal,
  remaining_amount=greatest(0,v_principal-returned_amount),start_date=v_disbursed::text,expected_end=(v_first_due+make_interval(months=>v_months-1))::date::text
  where id=pid returning * into pr;
 perform write_audit('investment_edited',jsonb_build_object('investment_id',pid,'reason',coalesce(p->>'reason',''),'before',v_before,'after',merged));
 return pr;
end $$;

-- ---------------------------------------------------------------------------
-- Profit: taka-months over the fiscal year.
-- Month weight = lower of the balance at the month's start and end, so a
-- deposit counts from the next month and a withdrawal from its own month.
-- ---------------------------------------------------------------------------
create or replace function public.fiscal_period(p_fy int,out period_start date,out period_end date)
language plpgsql stable security definer set search_path=public as $$
declare sm int:=fiscal_start_month();last_end date;
begin
 period_start:=case when sm=1 then make_date(p_fy,1,1) else make_date(p_fy-1,sm,1) end;
 period_end:=(period_start+interval '1 year')::date; -- exclusive
 -- Never overlap an earlier (possibly calendar-year) distribution.
 select max(coalesce(d.period_end,make_date(d.year,12,31))) into last_end from profit_distributions d where coalesce(d.period_end,make_date(d.year,12,31))<fiscal_period.period_end and d.year<>p_fy;
 if last_end is not null and last_end>=period_start then period_start:=last_end+1;end if;
end $$;

create or replace function public.member_savings_at(p_member uuid,p_before date)
returns numeric language sql stable security definer set search_path=public as $$
 -- Ledger-based balance before a date, plus distributed shares credited by then,
 -- plus a baseline for imported balances that have no ledger rows.
 with led as (
  select coalesce(sum(case t.type when 'deposit' then t.amount when 'withdrawal' then -t.amount when 'withdrawal_reversal' then t.amount end),0) as total_amt,
   coalesce(sum(case t.type when 'deposit' then t.amount when 'withdrawal' then -t.amount when 'withdrawal_reversal' then t.amount end) filter(where t.date<p_before),0) as before_amt
  from transactions_effective t where t.member_id=p_member and t.type in ('deposit','withdrawal','withdrawal_reversal')
 ), sh as (
  select coalesce(sum(s.share),0) as total_amt,coalesce(sum(s.share) filter(where coalesce(d.period_end,make_date(d.year,12,31))<p_before),0) as before_amt
  from profit_shares s join profit_distributions d on d.year=s.year where s.member_id=p_member
 )
 select greatest(0,(m.total_deposit-led.total_amt-sh.total_amt)+led.before_amt+sh.before_amt) from members m,led,sh where m.id=p_member;
$$;

create or replace function public.profit_preview_fy(p_fy int,p_mode text default 'full',p_rate numeric default 0,p_reserve_pct numeric default 0,p_management_pct numeric default 0)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare ps date;pe date;nmonths int;proj numeric;inc numeric;exp numeric;net numeric;dist numeric;total_tm numeric;shares jsonb;done profit_distributions%rowtype;
 pool numeric;
begin
 perform require_staff();
 if p_fy<2000 or p_fy>fiscal_year_of(investment_business_date()) then raise exception 'হিসাব বছর সঠিক নয়';end if;
 select * into done from profit_distributions where year=p_fy;
 if done.year is not null then
  return jsonb_build_object('year',p_fy,'periodStart',done.period_start,'periodEnd',done.period_end,'alreadyDistributed',true,'mode',done.mode,'ratePct',done.rate_pct,
   'projectProfit',done.project_profit,'expenses',done.expenses,'netProfit',done.net_profit,'reservePct',done.reserve_pct,'managementPct',done.management_pct,
   'distributed',done.distributed,'shares',coalesce((select jsonb_agg(jsonb_build_object('memberId',s.member_id,'name',m.name,'code',m.code,'balance',s.base_deposit,
     'takaMonths',s.taka_months,'share',s.share) order by m.code) from profit_shares s join members m on m.id=s.member_id where s.year=p_fy),'[]'::jsonb));
 end if;
 select period_start,period_end into ps,pe from fiscal_period(p_fy);
 if ps>=pe then raise exception 'এই সময়ের মুনাফা আগেই বণ্টিত';end if;
 if p_mode not in ('full','rate') or coalesce(p_reserve_pct,0)<0 or coalesce(p_management_pct,0)<0 or coalesce(p_reserve_pct,0)+coalesce(p_management_pct,0)>100
  or (p_mode='rate' and (p_rate is null or p_rate<=0 or p_rate>100)) then raise exception 'বণ্টনের নিয়ম সঠিক নয়';end if;
 nmonths:=((extract(year from pe)-extract(year from ps))*12+extract(month from pe)-extract(month from ps))::int;
 proj:=project_profit_between(ps,pe);
 select coalesce(sum(amount) filter(where type='fund' and party_code='FUND-INC'),0),coalesce(sum(amount) filter(where type='expense'),0)
  into inc,exp from transactions_effective where date>=ps and date<pe;
 net:=proj+inc-exp;
 pool:=greatest(0,round(net*(100-coalesce(p_reserve_pct,0)-coalesce(p_management_pct,0))/100,2));
 create temp table if not exists _tm(member_id uuid primary key,name text,code text,status text,balance numeric,tm numeric,share numeric) on commit drop;
 truncate _tm;
 insert into _tm(member_id,name,code,status,balance,tm)
 select m.id,m.name,m.code,m.status,member_savings_at(m.id,pe),
  (select coalesce(sum(greatest(0,least(member_savings_at(m.id,g.ms),member_savings_at(m.id,(g.ms+interval '1 month')::date)))),0)
     from (select (ps+make_interval(months=>k))::date ms from generate_series(0,nmonths-1) k) g)
 from members m where m.deleted_at is null;
 delete from _tm where tm<=0;
 select coalesce(sum(tm),0) into total_tm from _tm;
 if p_mode='rate' then
  update _tm set share=round(tm*p_rate/1200,2);
 elsif total_tm>0 then
  update _tm set share=round(pool*tm/total_tm,2);
  update _tm set share=share+(pool-(select sum(share) from _tm)) where member_id=(select member_id from _tm order by tm desc,member_id limit 1);
 else
  update _tm set share=0;
 end if;
 select coalesce(sum(share),0) into dist from _tm;
 select coalesce(jsonb_agg(jsonb_build_object('memberId',member_id,'name',name,'code',code,'status',status,'balance',balance,'takaMonths',tm,'share',share) order by code),'[]'::jsonb)
  into shares from _tm;
 return jsonb_build_object('year',p_fy,'periodStart',ps,'periodEnd',(pe-1),'months',nmonths,'alreadyDistributed',false,'complete',pe<=investment_business_date()+1,
  'mode',p_mode,'ratePct',case when p_mode='rate' then p_rate end,'projectProfit',proj,'otherIncome',inc,'expenses',exp,'netProfit',net,
  'reservePct',case when p_mode='full' then coalesce(p_reserve_pct,0) else 0 end,'managementPct',case when p_mode='full' then coalesce(p_management_pct,0) else 0 end,
  'distributable',case when p_mode='full' then pool else dist end,'distributed',dist,'reserveAmount',greatest(0,net-dist),
  'exceedsProfit',dist>greatest(net,0),'totalTakaMonths',total_tm,'shares',shares);
end $$;

create or replace function public.distribute_profit_fy(p_fy int,p_mode text,p_rate numeric,p_reserve_pct numeric,p_management_pct numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb;ps date;pe date;y int;n int;
begin
 perform require_admin();
 select period_start,period_end into ps,pe from fiscal_period(p_fy);
 for y in extract(year from ps)::int..extract(year from pe)::int loop perform pg_advisory_xact_lock(714206,y);end loop;
 if exists(select 1 from profit_distributions where year=p_fy) then raise exception 'এই বছরের মুনাফা ইতিমধ্যে বণ্টিত';end if;
 if pe>investment_business_date()+1 then raise exception 'অর্থবছর শেষ হওয়ার পর বণ্টন করুন (% পর্যন্ত) / Distribute after the year ends',(pe-1);end if;
 perform 1 from members where deleted_at is null order by id for update;
 v:=profit_preview_fy(p_fy,p_mode,p_rate,p_reserve_pct,p_management_pct);
 if (v->>'distributed')::numeric<=0 then raise exception 'বণ্টনযোগ্য মুনাফা বা সদস্যের জমা নেই';end if;
 if (v->>'exceedsProfit')::boolean then raise exception 'এই হারে মুনাফা দিলে সমিতির আয়ের চেয়ে বেশি দেওয়া হয়; হার কমান / Rate exceeds profit';end if;
 insert into profit_distributions(year,project_profit,expenses,net_profit,reserve_pct,management_pct,distributed,approved_by_name,period_start,period_end,mode,rate_pct)
 values(p_fy,(v->>'projectProfit')::numeric,(v->>'expenses')::numeric,(v->>'netProfit')::numeric,(v->>'reservePct')::numeric,(v->>'managementPct')::numeric,
  (v->>'distributed')::numeric,my_name(),ps,pe-1,p_mode,nullif(v->>'ratePct','')::numeric);
 insert into profit_shares(year,member_id,base_deposit,share,taka_months)
 select p_fy,(s->>'memberId')::uuid,(s->>'balance')::numeric,(s->>'share')::numeric,(s->>'takaMonths')::numeric
 from jsonb_array_elements(v->'shares') s where (s->>'share')::numeric>0;
 get diagnostics n=row_count;
 update members m set profit_balance=m.profit_balance+s.share,total_deposit=m.total_deposit+s.share,last_profit_year=p_fy,updated_at=now()
 from profit_shares s where s.year=p_fy and s.member_id=m.id;
 perform write_audit('profit_distributed',jsonb_build_object('year',p_fy,'mode',p_mode,'rate',p_rate,'amount',(v->>'distributed')::numeric,'members',n,'period_start',ps,'period_end',pe-1));
 return jsonb_build_object('year',p_fy,'distributed',(v->>'distributed')::numeric,'members',n);
end $$;

-- ---------------------------------------------------------------------------
-- Reports ignore cancelled entries; transaction pages flag them.
-- ---------------------------------------------------------------------------
do $$ declare d text; begin
 d:=pg_get_functiondef('public.get_ledger_summary(date,date)'::regprocedure);
 if position('transactions_effective' in d)=0 then
  d:=regexp_replace(d,'\mfrom transactions\M','from transactions_effective','g');
  d:=replace(d,'count(*) transaction_count','coalesce(sum(amount) filter(where type=''fund'' and party_code=''FUND-INC''),0) other_income, coalesce(sum(amount) filter(where type=''fund'' and party_code<>''FUND-INC''),0) funds, count(*) transaction_count');
  execute d;
 end if;
 d:=pg_get_functiondef('public.get_somiti_summary()'::regprocedure);
 if position('transactions_effective' in d)=0 then
  d:=regexp_replace(d,'\mfrom transactions\M','from transactions_effective','g');
  d:=regexp_replace(d,'''backendVersion'',\s*23','''backendVersion'',24');
  execute d;
 end if;
 d:=pg_get_functiondef('public.get_transaction_page(integer,timestamptz,uuid,date,date,uuid,uuid,text)'::regprocedure);
 if position('as voided' in d)=0 then
  d:=replace(d,'select t.*,exists(','select t.*,exists(select 1 from public.transactions v where v.reverses_transaction_id=t.id) as voided,exists(');
  if position('as voided' in d)=0 then raise exception 'Transaction page guard failed'; end if;
  execute d;
 end if;
 d:=pg_get_functiondef('public.app_capabilities()'::regprocedure);
 if position('digitalKhata' in d)=0 then
  d:=regexp_replace(d,'''version'',\s*23','''version'',24,''digitalKhata'',true');execute d;
 end if;
end $$;
create or replace function public.app_build_version() returns integer language sql immutable set search_path=pg_catalog as $$select 24$$;

-- Default settings for the new screens (kept if already present).
update public.somiti_settings set info=jsonb_build_object('fiscalYearStartMonth',7,'memberSeesProfit',true,'profitMode','full')||info where id=1;

do $$ declare sig text;begin foreach sig in array array[
 'require_entry_role()','fiscal_start_month()','fiscal_year_of(date)','require_open_investment_date(date)','change_member_number(uuid,text,text)',
 'record_withdrawal(jsonb)','add_fund(jsonb)','record_expense(jsonb)','void_entry(uuid,uuid,text)','validate_direct_investment(jsonb)','create_investment(jsonb)',
 'update_investment_contract(jsonb)','fiscal_period(integer)','member_savings_at(uuid,date)',
 'profit_preview_fy(integer,text,numeric,numeric,numeric)','distribute_profit_fy(integer,text,numeric,numeric,numeric)'] loop
 execute 'alter function public.'||sig||' owner to amanot_rpc';execute 'revoke all on function public.'||sig||' from public,anon';
end loop;
foreach sig in array array['change_member_number(uuid,text,text)','record_withdrawal(jsonb)','add_fund(jsonb)','record_expense(jsonb)','void_entry(uuid,uuid,text)','create_investment(jsonb)',
 'update_investment_contract(jsonb)','profit_preview_fy(integer,text,numeric,numeric,numeric)','distribute_profit_fy(integer,text,numeric,numeric,numeric)','fiscal_year_of(date)'] loop
 execute 'grant execute on function public.'||sig||' to authenticated';
end loop;
revoke all on function public.app_build_version() from public;grant execute on function public.app_build_version() to anon,authenticated;
end $$;
do $$ begin if current_setting('amanot.m024_restore_create',true)='true' then revoke create on schema public from amanot_rpc;end if;end $$;
notify pgrst,'reload schema';
commit;
