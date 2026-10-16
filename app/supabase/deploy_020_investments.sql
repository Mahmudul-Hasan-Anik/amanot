-- Additive contract layer. Existing projects, ledger and distribution snapshots are preserved.
begin;
select set_config('amanot.m020_financial_guard',(select jsonb_build_object(
 'members',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from public.members),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from public.projects p),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from public.cash_accounts c),
 'ledger',(select md5(coalesce(string_agg((to_jsonb(t)-'principal_part'-'profit_part'-'investment_reversal')::text,',' order by id),'')) from public.transactions t),
 'expenses',(select md5(coalesce(string_agg((to_jsonb(e)-'project_id')::text,',' order by id),'')) from public.expenses e),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from public.profit_distributions d)
))::text,true);
-- Hosted business role intentionally has no persistent CREATE privilege.
-- Ownership transfer needs it during this transaction only; restore it below.
do $$ begin
  if not has_schema_privilege('amanot_rpc','public','CREATE') then
    grant create on schema public to amanot_rpc;
    perform set_config('amanot.m020_restore_create','true',true);
  end if;
end $$;
alter table public.transactions add column if not exists principal_part numeric(14,2);
alter table public.transactions add column if not exists profit_part numeric(14,2);
alter table public.transactions add column if not exists investment_reversal boolean not null default false;
alter table public.expenses add column if not exists project_id uuid;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='expenses_investment_tenant_fk') then
    alter table public.expenses add constraint expenses_investment_tenant_fk foreign key(somiti_id,project_id) references public.projects(somiti_id,id);
  end if;
end $$;
create table if not exists public.investment_contracts (
  id uuid primary key references public.projects(id),
  somiti_id uuid not null default public.current_somiti_id() references public.somitis(id),
  member_id uuid,
  contract_no text not null,
  recipient_name text not null,
  phone text not null,
  whatsapp text not null default '',
  address text not null default '', nid text not null default '',
  father_name text not null default '', mother_name text not null default '',
  emergency_contacts jsonb not null,
  principal numeric(14,2) not null check(principal>0),
  profit_pct numeric(8,4) not null check(profit_pct>=0 and profit_pct<=100),
  profit_amount numeric(14,2) not null check(profit_amount>=0),
  term_months integer not null check(term_months between 1 and 120),
  disbursed_date date not null, first_due_date date not null,
  purpose text not null default '',
  payment_method text not null check(payment_method in ('cash','bank','bkash','nagad')),
  request_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique(somiti_id,id), unique(somiti_id,contract_no),
  foreign key(somiti_id,id) references public.projects(somiti_id,id),
  foreign key(somiti_id,member_id) references public.members(somiti_id,id),
  check(first_due_date>=disbursed_date),
  check(jsonb_typeof(emergency_contacts)='array' and (jsonb_array_length(emergency_contacts) between 1 and 3
    or (emergency_contacts='[]'::jsonb and request_payload='{"redacted":true}'::jsonb and phone='')))
);
create table if not exists public.investment_payment_events (
  id uuid primary key,
  somiti_id uuid not null default public.current_somiti_id() references public.somitis(id),
  investment_id uuid not null,
  transaction_id uuid not null unique references public.transactions(id),
  date date not null,
  amount numeric(14,2) not null check(amount>0),
  principal_part numeric(14,2) not null check(principal_part>=0),
  profit_part numeric(14,2) not null check(profit_part>=0),
  reverses uuid unique references public.investment_payment_events(id),
  payment_method text not null check(payment_method in ('cash','bank','bkash','nagad')),
  note text not null default '',
  created_at timestamptz not null default clock_timestamp(),
  foreign key(somiti_id,investment_id) references public.investment_contracts(somiti_id,id),
  foreign key(somiti_id,transaction_id) references public.transactions(somiti_id,id),
  check(amount=principal_part+profit_part)
);
create table if not exists public.investment_reminder_attempts (
  id uuid primary key,
  somiti_id uuid not null default public.current_somiti_id(),
  investment_id uuid not null,
  actor_name text not null,
  created_at timestamptz not null default now(),
  foreign key(somiti_id,investment_id) references public.investment_contracts(somiti_id,id)
);
alter table public.investment_contracts enable row level security;
alter table public.investment_payment_events enable row level security;
alter table public.investment_reminder_attempts enable row level security;
do $$ declare t text; begin
  foreach t in array array['investment_contracts','investment_payment_events','investment_reminder_attempts'] loop
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to amanot_rpc',t);
    execute format('drop policy if exists tenant_boundary on public.%I',t);
    execute format('create policy tenant_boundary on public.%I as restrictive for all to authenticated,amanot_rpc using(somiti_id=(select public.current_somiti_id())) with check(somiti_id=(select public.current_somiti_id()))',t);
    execute format('drop policy if exists staff_read on public.%I',t);
    execute format('create policy staff_read on public.%I for select to authenticated using((select public.is_staff()))',t);
    execute format('drop policy if exists rpc_access on public.%I',t);
    execute format('create policy rpc_access on public.%I for all to amanot_rpc using(true) with check(true)',t);
    execute format('drop trigger if exists amanot_sync_changed on public.%I',t);
    execute format('create trigger amanot_sync_changed after insert or update or delete on public.%I for each row execute function public.bump_sync_revision()',t);
  end loop;
end $$;
create index if not exists investment_events_contract_date on public.investment_payment_events(somiti_id,investment_id,date,created_at);

create or replace function public.guard_investment_project()
returns trigger language plpgsql security definer set search_path=public as $$
declare c investment_contracts%rowtype; collected numeric;
begin
  select * into c from investment_contracts where id=old.id;
  if c.id is null then return new; end if;
  select coalesce(sum(case when reverses is null then amount else -amount end),0) into collected from investment_payment_events where investment_id=c.id;
  if new.invested_amount<>c.principal or new.returned_amount<>collected or new.remaining_amount<>greatest(0,c.principal-collected)
    or new.net_profit<>greatest(0,collected-c.principal) or new.name<>c.recipient_name
    or new.start_date<>c.disbursed_date::text or new.expected_end<>old.expected_end
    or new.status<>(case when collected=c.principal+c.profit_amount then 'completed' else 'ongoing' end) then
    raise exception 'বিনিয়োগের চুক্তি বা হিসাব সরাসরি পরিবর্তন করা যাবে না';
  end if;
  return new;
end $$;
alter function public.guard_investment_project() owner to amanot_rpc;
revoke all on function public.guard_investment_project() from public,anon,authenticated;
drop trigger if exists investment_contract_guard on public.projects;
create trigger investment_contract_guard before update on public.projects for each row execute function public.guard_investment_project();

create or replace function public.investment_business_date()
returns date language sql stable set search_path=pg_catalog as $$ select (now() at time zone 'Asia/Dhaka')::date; $$;

-- Never permit posting into a year whose member profit shares have been finalized.
create or replace function public.require_open_investment_date(d date)
returns void language plpgsql security definer set search_path=public as $$
begin
  if d is null or d>investment_business_date() then raise exception 'লেনদেনের তারিখ সঠিক নয়'; end if;
  perform pg_advisory_xact_lock(714206,extract(year from d)::int);
  if exists(select 1 from profit_distributions where year>=extract(year from d)::int) then
    raise exception 'লাভ বণ্টনের জন্য এই হিসাব বছর বন্ধ আছে';
  end if;
end $$;

create or replace function public.create_investment_contract(p jsonb)
returns projects language plpgsql security definer set search_path=public as $$
declare c investment_contracts%rowtype; pr projects%rowtype; m members%rowtype;
  a cash_accounts%rowtype; contact jsonb; contacts jsonb; mid uuid; pid uuid;
  principal numeric; pct numeric; profit numeric; months integer; disbursed date; first_due date;
  recipient text; method text; phone text;
begin
  perform require_admin();
  pid:=(p->>'id')::uuid;
  if pid is null then raise exception 'Request ID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_somiti_id()::text||pid::text,0));
  select * into c from investment_contracts where id=pid;
  if c.id is not null then
    if c.request_payload<>p then raise exception 'এই আইডির অনুরোধের তথ্য ভিন্ন'; end if;
    select * into pr from projects where id=pid; return pr;
  end if;
  principal:=(p->>'principal')::numeric; pct:=(p->>'profitPct')::numeric;
  months:=(p->>'termMonths')::integer; disbursed:=(p->>'disbursedDate')::date; first_due:=(p->>'firstDueDate')::date;
  if principal is null or principal<=0 or principal>999999999999.99 or principal<>round(principal,2)
    or pct is null or pct<0 or pct>100 or pct<>round(pct,4) or months is null or months not between 1 and 120 then raise exception 'বিনিয়োগের শর্ত সঠিক নয়'; end if;
  profit:=round(principal*pct/100,2);
  if (principal+profit)*100<months or principal+profit>999999999999.99 then raise exception 'বিনিয়োগের পরিমাণ বেশি'; end if;
  perform require_open_investment_date(disbursed);
  if first_due is null or first_due<disbursed then raise exception 'প্রথম কিস্তির তারিখ সঠিক নয়'; end if;
  method:=p->>'paymentMethod';
  if method is null or method not in ('cash','bank','bkash','nagad') then raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়'; end if;
  recipient:=trim(p->>'recipientName');phone:=norm_phone(p->>'phone');
  if coalesce(recipient,'')='' or phone !~ '^01[3-9][0-9]{8}$' then raise exception 'গ্রহীতার নাম ও ফোন দিন'; end if;
  if coalesce(p->>'whatsapp','')<>'' and norm_phone(p->>'whatsapp') !~ '^01[3-9][0-9]{8}$' then raise exception 'WhatsApp নম্বর সঠিক নয়'; end if;
  mid:=nullif(p->>'memberId','')::uuid;
  if mid is not null then
    select * into m from members where id=mid and deleted_at is null and status<>'inactive';
    if m.id is null then raise exception 'সক্রিয় সদস্য পাওয়া যায়নি'; end if;
    recipient:=m.name;
  end if;
  contacts:=p->'contacts';
  if contacts is null or jsonb_typeof(contacts)<>'array' then raise exception 'জরুরি যোগাযোগের তথ্য দিন'; end if;
  if jsonb_array_length(contacts) not between 1 and 3 then raise exception '১ থেকে ৩ জন জরুরি যোগাযোগ দিন'; end if;
  for contact in select value from jsonb_array_elements(contacts) loop
    if coalesce(trim(contact->>'name'),'')='' or coalesce(trim(contact->>'relation'),'')='' or norm_phone(contact->>'phone') !~ '^01[3-9][0-9]{8}$' then raise exception 'জরুরি যোগাযোগের নাম, সম্পর্ক ও ফোন দিন'; end if;
  end loop;
  select * into a from cash_accounts where id=account_for(method) for update;
  if a.id is null or a.amount<principal then raise exception 'পর্যাপ্ত ব্যালেন্স নেই'; end if;
  insert into projects(id,name,type,location,manager,status,invested_amount,remaining_amount,start_date,expected_end)
  values(pid,recipient,'বিনিয়োগ',coalesce(p->>'address',''),'', 'ongoing',principal,principal,disbursed::text,(first_due+make_interval(months=>months-1))::date::text) returning * into pr;
  insert into investment_contracts(id,member_id,contract_no,recipient_name,phone,whatsapp,address,nid,father_name,mother_name,emergency_contacts,
    principal,profit_pct,profit_amount,term_months,disbursed_date,first_due_date,purpose,payment_method,request_payload)
  values(pid,mid,'INV-'||nextval('receipt_seq')::text,recipient,phone,coalesce(p->>'whatsapp',''),coalesce(p->>'address',''),coalesce(p->>'nid',''),
    coalesce(p->>'fatherName',''),coalesce(p->>'motherName',''),contacts,principal,pct,profit,months,disbursed,first_due,coalesce(p->>'purpose',''),method,p);
  insert into transactions(id,receipt_no,project_id,party_name,party_code,date,amount,type,payment_method,note,created_by)
  values(gen_random_uuid(),next_receipt(),pid,recipient,'INV',disbursed,principal,'transfer',method,'বিনিয়োগ প্রদান',rpc_caller_id());
  update cash_accounts set amount=amount-principal,updated_at=now() where id=a.id;
  perform write_audit('investment_disbursed',jsonb_build_object('investment_id',pid,'principal',principal,'profit_pct',pct));
  return pr;
end $$;

create or replace function public.collect_investment_payment(p jsonb)
returns transactions language plpgsql security definer set search_path=public as $$
<<payment>>
declare c investment_contracts%rowtype; pr projects%rowtype; e investment_payment_events%rowtype; t transactions%rowtype;
  amount numeric; principal_part numeric; profit_part numeric; d date; method text; pid uuid; eid uuid;
begin
  perform require_staff();
  eid:=(p->>'id')::uuid;pid:=(p->>'projectId')::uuid;
  if eid is null then raise exception 'Request ID required'; end if;
  amount:=(p->>'amount')::numeric;d:=(p->>'date')::date;method:=p->>'paymentMethod';
  select * into c from investment_contracts where id=pid;
  if c.id is null then raise exception 'বিনিয়োগ পাওয়া যায়নি'; end if;
  select * into pr from projects where id=pid for update;
  select * into e from investment_payment_events where id=eid;
  if e.id is not null then
    if e.investment_id is distinct from pid or e.amount is distinct from amount or e.date is distinct from d or e.payment_method is distinct from method or e.note<>coalesce(p->>'note','') or e.reverses is not null then raise exception 'এই আইডির অনুরোধের তথ্য ভিন্ন'; end if;
    select * into t from transactions where id=e.transaction_id;return t;
  end if;
  if amount is null or amount<=0 or amount<>round(amount,2) or amount+pr.returned_amount>c.principal+c.profit_amount then raise exception 'আদায়ের পরিমাণ সঠিক নয় বা বাকি টাকার বেশি'; end if;
  perform require_open_investment_date(d);
  if d<c.disbursed_date or d<coalesce((select max(date) from investment_payment_events where investment_id=pid),c.disbursed_date) then raise exception 'সর্বশেষ আদায়ের আগের তারিখ দেওয়া যাবে না'; end if;
  if method is null or method not in ('cash','bank','bkash','nagad') or not exists(select 1 from cash_accounts where id=account_for(method)) then raise exception 'পেমেন্ট হিসাব সঠিক নয়'; end if;
  principal_part:=least(amount,greatest(0,c.principal-pr.returned_amount));profit_part:=amount-principal_part;
  insert into transactions(id,receipt_no,project_id,party_name,party_code,date,amount,type,payment_method,note,created_by,principal_part,profit_part)
  values(eid,next_receipt(),pid,c.recipient_name,c.contract_no,d,amount,'profit',method,coalesce(nullif(p->>'note',''),'বিনিয়োগের কিস্তি আদায়'),rpc_caller_id(),principal_part,profit_part) returning * into t;
  insert into investment_payment_events(id,investment_id,transaction_id,date,amount,principal_part,profit_part,payment_method,note)
  values(eid,pid,t.id,d,amount,principal_part,profit_part,method,coalesce(p->>'note',''));
  update projects set returned_amount=returned_amount+amount,
    remaining_amount=greatest(0,c.principal-returned_amount-amount),net_profit=greatest(0,returned_amount+amount-c.principal),
    roi_pct=round(greatest(0,returned_amount+amount-c.principal)/c.principal*100),
    recovery_pct=least(100,round((returned_amount+amount)/c.principal*100)),
    status=case when returned_amount+amount=c.principal+c.profit_amount then 'completed' else 'ongoing' end
    where id=pid;
  update cash_accounts set amount=cash_accounts.amount+payment.amount,updated_at=now() where id=account_for(method);
  perform write_audit('investment_collected',jsonb_build_object('investment_id',pid,'transaction_id',eid,'principal',principal_part,'profit',profit_part));
  return t;
end $$;

-- Auditable reversal: only the most recent unreversed payment, no history rewriting.
create or replace function public.reverse_investment_payment(p_id uuid,p_payment_id uuid,p_reason text)
returns transactions language plpgsql security definer set search_path=public as $$
declare e investment_payment_events%rowtype; c investment_contracts%rowtype; pr projects%rowtype; t transactions%rowtype; a cash_accounts%rowtype;
begin
  perform require_admin();
  if p_id is null or coalesce(length(trim(p_reason)),0)<3 then raise exception 'সংশোধনের কারণ দিন'; end if;
  select * into e from investment_payment_events where id=p_payment_id and reverses is null;
  if e.id is null then raise exception 'আদায় পাওয়া যায়নি'; end if;
  select * into pr from projects where id=e.investment_id for update;
  select * into c from investment_contracts where id=pr.id;
  if exists(select 1 from investment_payment_events where id=p_id and reverses=e.id and note=p_reason) then
    select * into t from transactions where id=p_id;return t;
  end if;
  perform require_open_investment_date(e.date);
  perform require_open_investment_date(investment_business_date());
  if exists(select 1 from investment_payment_events where reverses=e.id) or exists(
    select 1 from investment_payment_events newer where newer.investment_id=e.investment_id and newer.reverses is null and newer.created_at>e.created_at
    and not exists(select 1 from investment_payment_events r where r.reverses=newer.id)) then raise exception 'শুধু সর্বশেষ সক্রিয় আদায় সংশোধন করা যাবে'; end if;
  select * into a from cash_accounts where id=account_for(e.payment_method) for update;
  if a.id is null or a.amount<e.amount then raise exception 'ফেরত দেওয়ার পর্যাপ্ত ব্যালেন্স নেই'; end if;
  insert into transactions(id,receipt_no,project_id,party_name,party_code,date,amount,type,payment_method,note,created_by,principal_part,profit_part,investment_reversal)
  values(p_id,next_receipt(),pr.id,c.recipient_name,c.contract_no,investment_business_date(),e.amount,'transfer',e.payment_method,'আদায় বাতিল: '||p_reason,rpc_caller_id(),e.principal_part,e.profit_part,true) returning * into t;
  insert into investment_payment_events(id,investment_id,transaction_id,date,amount,principal_part,profit_part,reverses,payment_method,note)
  values(p_id,pr.id,p_id,investment_business_date(),e.amount,e.principal_part,e.profit_part,e.id,e.payment_method,p_reason);
  update projects set returned_amount=returned_amount-e.amount,remaining_amount=greatest(0,c.principal-returned_amount+e.amount),
    net_profit=greatest(0,returned_amount-e.amount-c.principal),roi_pct=round(greatest(0,returned_amount-e.amount-c.principal)/c.principal*100),
    recovery_pct=least(100,round((returned_amount-e.amount)/c.principal*100)),status='ongoing',completed_at=null where id=pr.id;
  update cash_accounts set amount=amount-e.amount,updated_at=now() where id=a.id;
  perform write_audit('investment_payment_reversed',jsonb_build_object('investment_id',pr.id,'payment_id',e.id,'reversal_id',p_id,'reason',p_reason));
  return t;
end $$;

create or replace function public.record_investment_reminder(p_id uuid,p_investment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform require_staff();
  if not exists(select 1 from investment_contracts where id=p_investment_id) then raise exception 'বিনিয়োগ পাওয়া যায়নি'; end if;
  insert into investment_reminder_attempts(id,investment_id,actor_name) values(p_id,p_investment_id,my_name()) on conflict(id) do nothing;
end $$;

create or replace function public.record_investment_expense(p jsonb)
returns expenses language plpgsql security definer set search_path=public as $$
declare e expenses%rowtype; c investment_contracts%rowtype; eid uuid; pid uuid; pending boolean; amount numeric; method text; title text; approval_limit numeric;
begin
  perform require_staff();eid:=(p->>'id')::uuid;pid:=(p->>'projectId')::uuid;amount:=(p->>'amount')::numeric;method:=p->>'paymentMethod';title:=trim(p->>'note');
  if eid is null then raise exception 'Request ID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_somiti_id()::text||eid::text,0));
  select * into c from investment_contracts where id=pid;
  if c.id is null then raise exception 'বিনিয়োগ পাওয়া যায়নি'; end if;
  select * into e from expenses where id=eid;
  if e.id is not null then
    if e.project_id is distinct from pid or e.amount is distinct from amount or e.payment_source is distinct from method or e.title is distinct from title then raise exception 'এই আইডির অনুরোধের তথ্য ভিন্ন'; end if;
    return e;
  end if;
  if amount is null or amount<=0 or amount>9999999999.99 or amount<>round(amount,2) or coalesce(title,'')='' or method is null or method not in ('cash','bank','bkash','nagad') then raise exception 'খরচের তথ্য সঠিক নয়'; end if;
  perform require_open_investment_date(investment_business_date());
  select coalesce((info->>'expenseApprovalLimit')::numeric,10000) into approval_limit from somiti_settings where id=1;
  pending:=not is_admin() or (amount>coalesce(approval_limit,10000) and my_role()<>'super_admin');
  insert into expenses(id,project_id,voucher_no,title,category,amount,payment_source,note,status,created_by,date)
  values(eid,pid,next_receipt(),title,'বিনিয়োগ খরচ',amount,method,c.contract_no,case when pending then 'pending' else 'approved' end,rpc_caller_id(),investment_business_date()) returning * into e;
  if pending then
    insert into approvals(type,title,amount,detail,expense_id,project_id,created_by_name,created_by)
    values('expense',title,amount,c.contract_no,eid,pid,my_name(),rpc_caller_id());
  else
    perform post_expense(eid);select * into e from expenses where id=eid;
  end if;
  perform write_audit('investment_expense_added',jsonb_build_object('investment_id',pid,'expense_id',eid,'amount',amount,'status',e.status));
  return e;
end $$;
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.post_expense(uuid)'::regprocedure);
  if position('e.project_id' in definition)=0 then
    definition:=replace(definition,'method:=method_from_source(e.payment_source);','if e.project_id is not null then perform require_open_investment_date(e.date); end if; method:=method_from_source(e.payment_source);');
    definition:=replace(definition,'insert into transactions(receipt_no,party_name,party_code,amount,type,payment_method,note)',
      'insert into transactions(receipt_no,party_name,party_code,amount,type,payment_method,note,project_id,date)');
    definition:=replace(definition,'e.category||'': ''||e.title) returning id into tid;',
      'e.category||'': ''||e.title,e.project_id,e.date) returning id into tid;');
    if position('e.project_id,e.date' in definition)=0 then raise exception 'Expense posting migration guard failed'; end if;
    execute definition;
  end if;
end $$;

-- Old clients must not bypass installment/overpayment rules for new contracts.
do $$ begin
  if to_regprocedure('public.upsert_legacy_project(jsonb)') is null then
    alter function public.upsert_project(jsonb) rename to upsert_legacy_project;
  end if;
end $$;
revoke all on function public.upsert_legacy_project(jsonb) from public,anon,authenticated;
create or replace function public.upsert_project(p jsonb)
returns projects language plpgsql security definer set search_path=public as $$
begin
  perform require_admin();
  if exists(select 1 from investment_contracts where id=nullif(p->>'id','')::uuid) then
    raise exception 'চুক্তির বিনিয়োগ সরাসরি পরিবর্তন করা যাবে না';
  end if;
  -- Older APKs can still operate legacy projects until their UI is upgraded.
  return upsert_legacy_project(p);
end $$;
do $$ begin
  if to_regprocedure('public.record_legacy_project_return(uuid,numeric,text,text)') is null then
    alter function public.record_project_return(uuid,numeric,text,text) rename to record_legacy_project_return;
  end if;
end $$;
revoke all on function public.record_legacy_project_return(uuid,numeric,text,text) from public,anon,authenticated;
create or replace function public.record_project_return(p_project_id uuid,p_amount numeric,p_payment_source text,p_note text default null)
returns transactions language plpgsql security definer set search_path=public as $$
begin
  perform require_staff();
  if exists(select 1 from investment_contracts where id=p_project_id) then raise exception 'এই বিনিয়োগের জন্য নতুন কিস্তি গ্রহণ ফর্ম ব্যবহার করুন'; end if;
  return record_legacy_project_return(p_project_id,p_amount,p_payment_source,p_note);
end $$;

create or replace function public.project_profit_between(p_start date,p_end date)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce((select sum(greatest(coalesce(r.finish,0)-p.invested_amount,0)-greatest(coalesce(r.start,0)-p.invested_amount,0)
    -case when p.status='completed' and p.completed_at>=p_start and p.completed_at<p_end then greatest(p.invested_amount-coalesce(r.finish,0),0) else 0 end)
    from projects p left join lateral (select sum(amount) filter(where date<p_end) finish,sum(amount) filter(where date<p_start) start
      from transactions where project_id=p.id and type='profit') r on true
    where not exists(select 1 from investment_contracts c where c.id=p.id)),0)
    +coalesce((select sum(case when reverses is null then profit_part else -profit_part end) from investment_payment_events where date>=p_start and date<p_end),0);
$$;
-- Preserve all existing distribution eligibility, reserve and share calculations.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.profit_preview(integer)'::regprocedure);
  if position('project_profit_between' in definition)=0 then
    definition:=regexp_replace(definition,'select coalesce\(sum\([\s\S]*?into proj[\s\S]*?r on true;',
      'proj:=public.project_profit_between(make_date(p_year,1,1),make_date(p_year+1,1,1));');
    if position('proj:=public.project_profit_between' in definition)=0 then raise exception 'Profit preview migration guard failed'; end if;
    execute definition;
  end if;
end $$;
-- Name-prefix fallback is for unlinked legacy expenses only, never another contract.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.get_transaction_page(integer,timestamptz,uuid,date,date,uuid,uuid,text)'::regprocedure);
  if position('investment_payment_reversed' in definition)=0 then
    definition:=replace(definition,'select t.* from public.transactions t',
      'select t.*,exists(select 1 from public.investment_payment_events reversal where reversal.reverses=t.id) as investment_payment_reversed from public.transactions t');
  end if;
  if position('investment_contracts' in definition)=0 then
    definition:=replace(definition,
      'or exists(select 1 from public.projects p where p.id=p_project_id and starts_with(coalesce(t.note,''''),p.name||'':'')))',
      'or (t.project_id is null and t.type=''expense'' and not exists(select 1 from public.investment_contracts c where c.id=p_project_id) and exists(select 1 from public.projects p where p.id=p_project_id and starts_with(coalesce(t.note,''''),p.name||'':''))))');
    if position('investment_contracts' in definition)=0 then raise exception 'Ledger scope migration guard failed'; end if;
    execute definition;
  end if;
end $$;
-- Monthly analytics use recognized project profit, never gross principal recovery.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.get_ledger_summary(date,date)'::regprocedure);
  definition:=replace(definition,'coalesce(sum(amount) filter(where type=''profit''),0) profit',
    'public.project_profit_between(greatest(p_from,date_trunc(''month'',min(date))::date),least(p_to,(date_trunc(''month'',min(date))+interval ''1 month'')::date)) profit');
  execute definition;
end $$;

do $$ declare signature text; begin
  foreach signature in array array['investment_business_date()','require_open_investment_date(date)','create_investment_contract(jsonb)','collect_investment_payment(jsonb)',
    'reverse_investment_payment(uuid,uuid,text)','record_investment_reminder(uuid,uuid)','record_investment_expense(jsonb)','record_project_return(uuid,numeric,text,text)','upsert_project(jsonb)',
    'project_profit_between(date,date)'] loop
    execute 'alter function public.'||signature||' owner to amanot_rpc';
    execute 'revoke all on function public.'||signature||' from public,anon,authenticated';
    if signature not in ('require_open_investment_date(date)','investment_business_date()') then execute 'grant execute on function public.'||signature||' to authenticated'; end if;
  end loop;
end $$;
grant execute on function public.record_legacy_project_return(uuid,numeric,text,text) to amanot_rpc;
grant execute on function public.upsert_legacy_project(jsonb) to amanot_rpc;
-- Honor the existing account-deletion promise for newly introduced private copies.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.delete_my_account(text,boolean,text)'::regprocedure);
  if position('investment_contracts' in definition)=0 then
    definition:=replace(definition,'delete from auth.sessions where user_id=any(v_users);',
      'update public.investment_contracts set phone='''',whatsapp='''',address='''',nid='''',father_name='''',mother_name='''',
        emergency_contacts=''[]''::jsonb,request_payload=''{"redacted":true}''::jsonb
        where somiti_id=p.somiti_id and (p_close_society or member_id=any(v_ids));
       delete from auth.sessions where user_id=any(v_users);');
    if position('investment_contracts' in definition)=0 then raise exception 'Privacy migration guard failed'; end if;
    execute definition;
  end if;
end $$;
do $$ begin
  if current_setting('amanot.m020_restore_create',true)='true' then revoke create on schema public from amanot_rpc; end if;
end $$;
notify pgrst,'reload schema';
do $$ declare actual jsonb; begin
 select jsonb_build_object(
 'members',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from public.members),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from public.projects p),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from public.cash_accounts c),
 'ledger',(select md5(coalesce(string_agg((to_jsonb(t)-'principal_part'-'profit_part'-'investment_reversal')::text,',' order by id),'')) from public.transactions t),
 'expenses',(select md5(coalesce(string_agg((to_jsonb(e)-'project_id')::text,',' order by id),'')) from public.expenses e),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from public.profit_distributions d)
) into actual;
 if actual is distinct from current_setting('amanot.m020_financial_guard')::jsonb then raise exception 'Existing financial data changed; migration rolled back'; end if;
end $$;
select true as investment_schema_ready,true as existing_ledger_preserved,true as cash_balances_preserved,true as member_savings_preserved,true as previous_distributions_preserved;
commit;
