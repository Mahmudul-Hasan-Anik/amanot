-- Member savings withdrawals; approvals reserve savings, payment posts once.
begin;
do $$ begin if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc;perform set_config('amanot.withdraw_restore_create','true',true);end if;end $$;
alter table public.members add column if not exists total_withdrawn numeric(14,2) not null default 0 check(total_withdrawn>=0);
grant select(total_withdrawn) on public.members to authenticated;
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check(type in ('deposit','expense','transfer','profit','loan','withdrawal','withdrawal_reversal'));
create table if not exists public.withdrawal_requests(
 id uuid primary key, somiti_id uuid not null default public.current_somiti_id() references public.somitis(id),
 member_id uuid not null, member_name text not null, member_code text not null,
 amount numeric(14,2) not null check(amount>0), reason text not null default '',
 preferred_method text not null check(preferred_method in ('cash','bank','bkash','nagad')),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','cancelled','paid','reversed')),
 submitted_by uuid not null, decided_by uuid, paid_by uuid, reversed_by uuid,
 created_at timestamptz not null default now(), decided_at timestamptz, paid_at timestamptz, reversed_at timestamptz,
 decision_note text not null default '', payment_note text not null default '', reversal_reason text not null default '',
 paid_transaction_id uuid, reversal_transaction_id uuid, payment_method text, payment_date date, payment_reference text not null default '',
 unique(somiti_id,id),foreign key(somiti_id,member_id) references public.members(somiti_id,id),
 foreign key(somiti_id,paid_transaction_id) references public.transactions(somiti_id,id),
 foreign key(somiti_id,reversal_transaction_id) references public.transactions(somiti_id,id)
);
create index if not exists withdrawal_member_status_idx on public.withdrawal_requests(somiti_id,member_id,status,created_at desc);
alter table public.withdrawal_requests enable row level security;
alter table public.withdrawal_requests force row level security;
revoke all on public.withdrawal_requests from public,anon,authenticated;
grant select on public.withdrawal_requests to authenticated;
grant select,insert,update on public.withdrawal_requests to amanot_rpc;
drop policy if exists tenant_boundary on public.withdrawal_requests;
create policy tenant_boundary on public.withdrawal_requests as restrictive for all to authenticated,amanot_rpc
 using(somiti_id=(select current_somiti_id())) with check(somiti_id=(select current_somiti_id()));
drop policy if exists withdrawal_read on public.withdrawal_requests;
create policy withdrawal_read on public.withdrawal_requests for select to authenticated
 using((select session_ready()) and ((select is_staff()) or member_id=(select my_member_id())));
drop policy if exists rpc_access on public.withdrawal_requests;
create policy rpc_access on public.withdrawal_requests for all to amanot_rpc using(true) with check(true);
drop trigger if exists amanot_sync_changed on public.withdrawal_requests;
create trigger amanot_sync_changed after insert or update or delete on public.withdrawal_requests for each row execute function public.bump_sync_revision();

create or replace function public.submit_withdrawal(p jsonb)
returns withdrawal_requests language plpgsql security definer set search_path=public as $$
declare m members%rowtype;r withdrawal_requests%rowtype;mid uuid;pid uuid;a numeric;reserved numeric;method text;note text;
begin
 if not session_ready() then raise exception 'আবার লগইন করুন / Login required' using errcode='42501';end if;
 mid:=(p->>'memberId')::uuid;pid:=(p->>'id')::uuid;a:=(p->>'amount')::numeric;
 method:=p->>'method';note:=trim(coalesce(p->>'reason',''));
 if pid is null or mid is null or a is null or a<=0 or a>999999999999.99 or a<>round(a,2) or method is null or method not in ('cash','bank','bkash','nagad') or length(note)>1000 then raise exception 'উত্তোলনের তথ্য সঠিক নয় / Invalid withdrawal';end if;
 if mid is distinct from my_member_id() and my_role() not in ('super_admin','admin','cashier') then raise exception 'অনুমতি নেই / Not permitted' using errcode='42501';end if;
 select * into m from members where id=mid and deleted_at is null and status<>'inactive' for update;
 if m.id is null then raise exception 'সক্রিয় সদস্য পাওয়া যায়নি / Active member unavailable';end if;
 select * into r from withdrawal_requests where id=pid;
 if r.id is not null then
  if r.member_id<>mid or r.amount<>a or r.reason<>note or r.preferred_method<>method then raise exception 'Request ID already used with different details';end if;return r;
 end if;
 select coalesce(sum(amount),0) into reserved from withdrawal_requests where member_id=mid and status='approved';
 if a>greatest(0,m.total_deposit-m.profit_balance-reserved) then raise exception 'উত্তোলনযোগ্য জমা পর্যাপ্ত নয় / Insufficient available savings';end if;
 insert into withdrawal_requests(id,member_id,member_name,member_code,amount,reason,preferred_method,submitted_by)
 values(pid,mid,m.name,m.code,a,note,method,rpc_caller_id()) returning * into r;
 perform write_audit('withdrawal_requested',jsonb_build_object('request_id',pid,'member_id',mid,'amount',a));return r;
end $$;

create or replace function public.decide_withdrawal(p_id uuid,p_action text,p_note text default '')
returns withdrawal_requests language plpgsql security definer set search_path=public as $$
declare r withdrawal_requests%rowtype;m members%rowtype;mid uuid;target text;reserved numeric;note text:=trim(coalesce(p_note,''));
begin
 if not session_ready() then raise exception 'আবার লগইন করুন / Login required' using errcode='42501';end if;
 if p_action is null or p_action not in ('approve','reject','cancel') then raise exception 'Invalid decision';end if;
 select member_id into mid from withdrawal_requests where id=p_id;
 if mid is null then raise exception 'আবেদন পাওয়া যায়নি / Request unavailable';end if;
 -- All transitions lock member before request, serializing reservations/payments.
 select * into m from members where id=mid for update;
 select * into r from withdrawal_requests where id=p_id for update;
 if p_action='cancel' and r.status in ('submitted','cancelled') and mid=my_member_id() then null;else perform require_admin();end if;
 if length(note)>1000 or (p_action<>'approve' and note='') then raise exception 'কারণ লিখুন / Enter a reason';end if;
 target:=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'cancelled' end;
 if r.status=target and r.decision_note=note then return r;end if;
 if (p_action in ('approve','reject') and r.status<>'submitted') or (p_action='cancel' and r.status not in ('submitted','approved')) then raise exception 'এই অবস্থায় সিদ্ধান্ত দেওয়া যাবে না / Invalid request state';end if;
 if p_action='approve' then
  if m.deleted_at is not null or m.status='inactive' then raise exception 'সক্রিয় সদস্য প্রয়োজন / Active member required';end if;
  select coalesce(sum(amount),0) into reserved from withdrawal_requests where member_id=mid and status='approved';
  if r.amount>greatest(0,m.total_deposit-m.profit_balance-reserved) then raise exception 'উত্তোলনযোগ্য জমা পর্যাপ্ত নয় / Insufficient available savings';end if;
 end if;
 update withdrawal_requests set status=target,decision_note=note,decided_by=rpc_caller_id(),decided_at=now() where id=p_id returning * into r;
 perform write_audit('withdrawal_'||target,jsonb_build_object('request_id',p_id,'reason',note));return r;
end $$;

create or replace function public.pay_withdrawal(p_id uuid,p_method text,p_date date,p_reference text default '',p_note text default '')
returns withdrawal_requests language plpgsql security definer set search_path=public as $$
declare r withdrawal_requests%rowtype;m members%rowtype;mid uuid;reserved numeric;a cash_accounts%rowtype;t transactions%rowtype;
 ref text:=trim(coalesce(p_reference,''));note text:=trim(coalesce(p_note,''));
begin
 perform require_staff();if my_role() not in ('super_admin','admin','cashier') then raise exception 'অনুমতি নেই / Not permitted' using errcode='42501';end if;
 if p_method is null or p_method not in ('cash','bank','bkash','nagad') or p_date is null or length(ref)>200 or length(note)>1000 or (p_method<>'cash' and ref='') then raise exception 'তারিখ, মাধ্যম ও reference দিন / Enter date, method and reference';end if;
 select member_id into mid from withdrawal_requests where id=p_id;
 if mid is null then raise exception 'আবেদন পাওয়া যায়নি / Request unavailable';end if;
 -- Same year lock as distributions; a closed year cannot be rewritten.
 perform pg_advisory_xact_lock(714206,extract(year from p_date)::int);
 select * into m from members where id=mid for update;
 select * into r from withdrawal_requests where id=p_id for update;
 if r.status='paid' then
  if r.payment_method<>p_method or r.payment_date<>p_date or r.payment_reference<>ref or r.payment_note<>note then raise exception 'Payment already recorded with different details';end if;return r;
 end if;
 if r.status<>'approved' then raise exception 'আগে অনুমোদন প্রয়োজন / Approval required';end if;
 perform require_open_investment_date(p_date);
 if p_date<(r.created_at at time zone 'Asia/Dhaka')::date or m.deleted_at is not null or m.status='inactive' then raise exception 'সদস্য বা তারিখ সঠিক নয় / Invalid member or date';end if;
 select coalesce(sum(amount),0) into reserved from withdrawal_requests where member_id=mid and status='approved' and id<>p_id;
 if r.amount>greatest(0,m.total_deposit-m.profit_balance-reserved) then raise exception 'উত্তোলনযোগ্য জমা পর্যাপ্ত নয় / Insufficient available savings';end if;
 select * into a from cash_accounts where id=account_for(p_method) for update;
 if a.id is null or a.amount<r.amount then raise exception 'নির্বাচিত হিসাবে টাকা পর্যাপ্ত নয় / Insufficient account funds';end if;
 insert into transactions(id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,trx_id,note,date,created_by)
 values(p_id,next_receipt(),mid,m.name,m.code,r.amount,'withdrawal',p_method,nullif(ref,''),'Savings withdrawal'||case when note='' then '' else ': '||note end,p_date,rpc_caller_id()) returning * into t;
 update members set total_deposit=total_deposit-r.amount,total_withdrawn=total_withdrawn+r.amount,updated_at=now() where id=mid;
 update cash_accounts set amount=amount-r.amount,updated_at=now() where id=a.id;
 update withdrawal_requests set status='paid',paid_transaction_id=t.id,paid_by=rpc_caller_id(),paid_at=now(),payment_method=p_method,payment_date=p_date,payment_reference=ref,payment_note=note where id=p_id returning * into r;
 perform write_audit('withdrawal_paid',jsonb_build_object('request_id',p_id,'transaction_id',t.id,'amount',r.amount,'method',p_method));return r;
end $$;

create or replace function public.reverse_withdrawal(p_id uuid,p_reversal_id uuid,p_date date,p_reason text)
returns withdrawal_requests language plpgsql security definer set search_path=public as $$
declare r withdrawal_requests%rowtype;mid uuid;t transactions%rowtype;note text:=trim(coalesce(p_reason,''));
begin
 perform require_admin();
 if p_reversal_id is null or p_date is null or note='' or length(note)>1000 then raise exception 'সংশোধনের কারণ ও তারিখ দিন / Enter reversal reason and date';end if;
 select member_id into mid from withdrawal_requests where id=p_id;
 if mid is null then raise exception 'আবেদন পাওয়া যায়নি / Request unavailable';end if;
 perform pg_advisory_xact_lock(714206,extract(year from p_date)::int);
 perform 1 from members where id=mid for update;
 select * into r from withdrawal_requests where id=p_id for update;
 if r.status='reversed' then
  select * into t from transactions where id=r.reversal_transaction_id;
  if r.reversal_transaction_id<>p_reversal_id or t.date<>p_date or r.reversal_reason<>note then raise exception 'Reversal already recorded';end if;return r;
 end if;
 if r.status<>'paid' then raise exception 'শুধু পরিশোধিত উত্তোলন সংশোধন করা যায় / Paid withdrawal required';end if;
 perform require_open_investment_date(p_date);
 if p_date<r.payment_date then raise exception 'সংশোধনের তারিখ সঠিক নয় / Invalid reversal date';end if;
 perform 1 from cash_accounts where id=account_for(r.payment_method) for update;
 if not found then raise exception 'Account unavailable';end if;
 insert into transactions(id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,note,date,created_by)
 values(p_reversal_id,next_receipt(),mid,r.member_name,r.member_code,r.amount,'withdrawal_reversal',r.payment_method,'Withdrawal reversal: '||note,p_date,rpc_caller_id()) returning * into t;
 update members set total_deposit=total_deposit+r.amount,total_withdrawn=total_withdrawn-r.amount,updated_at=now() where id=mid;
 update cash_accounts set amount=amount+r.amount,updated_at=now() where id=account_for(r.payment_method);
 update withdrawal_requests set status='reversed',reversal_transaction_id=t.id,reversed_by=rpc_caller_id(),reversed_at=now(),reversal_reason=note where id=p_id returning * into r;
 perform write_audit('withdrawal_reversed',jsonb_build_object('request_id',p_id,'transaction_id',t.id,'reason',note));return r;
end $$;

do $$ declare sig text;begin foreach sig in array array['submit_withdrawal(jsonb)','decide_withdrawal(uuid,text,text)','pay_withdrawal(uuid,text,date,text,text)','reverse_withdrawal(uuid,uuid,date,text)'] loop
 execute 'alter function public.'||sig||' owner to amanot_rpc';execute 'revoke all on function public.'||sig||' from public,anon';execute 'grant execute on function public.'||sig||' to authenticated';end loop;end $$;
-- Keep old finalized profit shares intact. Future allocation already uses the
-- remaining total_deposit, which the payment/reversal updates under year locks.
create or replace function public.app_build_version() returns integer language sql immutable set search_path=pg_catalog as $$select 23$$;
revoke all on function app_build_version() from public;grant execute on function app_build_version() to anon,authenticated;
do $$ declare d text;begin
 d:=pg_get_functiondef('public.get_somiti_summary()'::regprocedure);d:=replace(d,'''backendVersion'',22','''backendVersion'',23');
 if position('pendingWithdrawalAmount' in d)=0 then d:=replace(d,'''backendVersion'',23,','''backendVersion'',23,''pendingWithdrawalAmount'',(select coalesce(sum(amount),0) from withdrawal_requests where status=''approved''),''pendingWithdrawalCount'',(select count(*) from withdrawal_requests where status in (''submitted'',''approved'')),');end if;execute d;
 d:=pg_get_functiondef('public.app_capabilities()'::regprocedure);d:=replace(d,'''version'',22','''version'',23,''memberWithdrawals'',true');execute d;
 d:=pg_get_functiondef('public.get_ledger_summary(date,date)'::regprocedure);
 if position('withdrawals' in d)=0 then d:=replace(d,'count(*) transaction_count','coalesce(sum(amount) filter(where type=''withdrawal''),0)-coalesce(sum(amount) filter(where type=''withdrawal_reversal''),0) withdrawals, count(*) transaction_count');execute d;end if;
end $$;
do $$ begin if current_setting('amanot.withdraw_restore_create',true)='true' then revoke create on schema public from amanot_rpc;end if;end $$;
notify pgrst,'reload schema';
commit;
