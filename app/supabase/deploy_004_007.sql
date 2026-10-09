-- Upgrade 003 to 007. Backups stay in a private, non-API schema.
begin;
create schema if not exists amanot_backup_20261009;
revoke all on schema amanot_backup_20261009 from public,anon,authenticated;
create table if not exists amanot_backup_20261009.approvals as table public.approvals;
alter table amanot_backup_20261009.approvals enable row level security;
revoke all on amanot_backup_20261009.approvals from public,anon,authenticated;
create table if not exists amanot_backup_20261009.audit_logs as table public.audit_logs;
alter table amanot_backup_20261009.audit_logs enable row level security;
revoke all on amanot_backup_20261009.audit_logs from public,anon,authenticated;
create table if not exists amanot_backup_20261009.cash_accounts as table public.cash_accounts;
alter table amanot_backup_20261009.cash_accounts enable row level security;
revoke all on amanot_backup_20261009.cash_accounts from public,anon,authenticated;
create table if not exists amanot_backup_20261009.expenses as table public.expenses;
alter table amanot_backup_20261009.expenses enable row level security;
revoke all on amanot_backup_20261009.expenses from public,anon,authenticated;
create table if not exists amanot_backup_20261009.members as table public.members;
alter table amanot_backup_20261009.members enable row level security;
revoke all on amanot_backup_20261009.members from public,anon,authenticated;
create table if not exists amanot_backup_20261009.notices as table public.notices;
alter table amanot_backup_20261009.notices enable row level security;
revoke all on amanot_backup_20261009.notices from public,anon,authenticated;
create table if not exists amanot_backup_20261009.profiles as table public.profiles;
alter table amanot_backup_20261009.profiles enable row level security;
revoke all on amanot_backup_20261009.profiles from public,anon,authenticated;
create table if not exists amanot_backup_20261009.profit_distributions as table public.profit_distributions;
alter table amanot_backup_20261009.profit_distributions enable row level security;
revoke all on amanot_backup_20261009.profit_distributions from public,anon,authenticated;
create table if not exists amanot_backup_20261009.profit_shares as table public.profit_shares;
alter table amanot_backup_20261009.profit_shares enable row level security;
revoke all on amanot_backup_20261009.profit_shares from public,anon,authenticated;
create table if not exists amanot_backup_20261009.projects as table public.projects;
alter table amanot_backup_20261009.projects enable row level security;
revoke all on amanot_backup_20261009.projects from public,anon,authenticated;
create table if not exists amanot_backup_20261009.somiti_settings as table public.somiti_settings;
alter table amanot_backup_20261009.somiti_settings enable row level security;
revoke all on amanot_backup_20261009.somiti_settings from public,anon,authenticated;
create table if not exists amanot_backup_20261009.transactions as table public.transactions;
alter table amanot_backup_20261009.transactions enable row level security;
revoke all on amanot_backup_20261009.transactions from public,anon,authenticated;
create table if not exists amanot_backup_20261009.function_definitions as select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f';
alter table amanot_backup_20261009.function_definitions enable row level security;
revoke all on amanot_backup_20261009.function_definitions from public,anon,authenticated;

-- 004_auto_approval_sms.sql
-- ==============================================================================
-- আমানত — Migration 004: Auto-Approval Workflow & SMS Audit Logs
-- Run once in Supabase SQL Editor after 003 (safe to re-run).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SMS Logs Table & Traceability
-- ------------------------------------------------------------------------------
create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  recipient_name text,
  member_id uuid references public.members(id) on delete set null,
  template_type text not null default 'custom',
  message text not null,
  provider text not null default 'mock',
  status text not null default 'sent' check (status in ('sent', 'failed', 'queued')),
  response_data jsonb,
  sent_by uuid default auth.uid(),
  sent_by_name text,
  created_at timestamptz not null default now()
);

alter table public.sms_logs enable row level security;
drop policy if exists sms_logs_read on public.sms_logs;
create policy sms_logs_read on public.sms_logs for select to authenticated using (public.is_staff());

-- RPC to record SMS log
create or replace function public.log_sms(
  p_phone text,
  p_message text,
  p_template text default 'custom',
  p_recipient_name text default null,
  p_member_id uuid default null,
  p_provider text default 'mock',
  p_status text default 'sent',
  p_response jsonb default '{}'::jsonb
)
returns sms_logs language plpgsql security definer set search_path = public as $$
declare
  v sms_logs%rowtype;
begin
  perform public.require_staff();
  insert into sms_logs (
    recipient_phone,
    recipient_name,
    member_id,
    template_type,
    message,
    provider,
    status,
    response_data,
    sent_by,
    sent_by_name
  ) values (
    public.norm_phone(p_phone),
    p_recipient_name,
    p_member_id,
    p_template,
    p_message,
    p_provider,
    p_status,
    p_response,
    auth.uid(),
    public.my_name()
  )
  returning * into v;

  return v;
end; $$;

-- ------------------------------------------------------------------------------
-- 2. Enhanced add_expense with Automatic Approval
-- ------------------------------------------------------------------------------
alter table public.expenses add column if not exists created_by_name text;
create or replace function public.add_expense(
  p_title text,
  p_category text,
  p_amount numeric,
  p_payment_source text,
  p_voucher_no text,
  p_note text default null,
  p_status text default 'approved'
)
returns expenses language plpgsql security definer set search_path = public as $$
declare
  v_e expenses%rowtype;
  v_settings jsonb := coalesce((select info from somiti_settings where id = 1), '{}'::jsonb);
  v_limit numeric := coalesce((v_settings->>'expenseApprovalLimit')::numeric, 10000);
  v_auto_enabled boolean := coalesce((v_settings->>'autoApproveEnabled')::boolean, true);
  v_auto_threshold numeric := coalesce((v_settings->>'autoApproveThreshold')::numeric, 5000);
  v_pending boolean;
  v_voucher text := coalesce(nullif(trim(p_voucher_no),''), 'V-' || nextval('public.receipt_seq')::text);
begin
  perform public.require_staff();
  if p_amount <= 0 then raise exception 'খরচের পরিমাণ শূন্যের বেশি হতে হবে'; end if;
  if coalesce(trim(p_title),'') = '' then raise exception 'খরচের খাত বা শিরোনাম দিন'; end if;

  if exists (select 1 from expenses where voucher_no = v_voucher) then
    v_voucher := v_voucher || '-' || nextval('public.receipt_seq')::text;
  end if;

  -- Auto-approval rule:
  -- If explicitly requested as 'approved' OR auto-approval is enabled for amounts <= threshold
  if v_auto_enabled and p_amount <= v_auto_threshold then
    v_pending := false;
  else
    v_pending := p_status = 'pending' or not public.is_admin() or (p_amount > v_limit and public.my_role() <> 'super_admin');
  end if;

  insert into expenses(title, category, amount, payment_source, voucher_no, note, status, created_by_name)
  values (p_title, p_category, p_amount, p_payment_source, v_voucher, p_note,
          case when v_pending then 'pending' else 'approved' end, public.my_name())
  returning * into v_e;

  if v_pending then
    insert into approvals(type, title, amount, detail, expense_id, created_by_name)
    values ('expense', p_title, p_amount,
            p_category || ' · ভাউচার: ' || v_voucher || coalesce(' · ' || nullif(p_note,''), ''),
            v_e.id, public.my_name());
    perform public.write_audit('expense_requested', jsonb_build_object('expense_id', v_e.id, 'amount', p_amount, 'title', p_title));
  else
    perform public.post_expense(v_e.id);
    perform public.write_audit('expense_recorded', jsonb_build_object('expense_id', v_e.id, 'amount', p_amount, 'title', p_title, 'auto_approved', true));
  end if;

  return v_e;
end; $$;

-- ------------------------------------------------------------------------------
-- 3. Batch Auto-Approve RPC for Admin
-- ------------------------------------------------------------------------------
create or replace function public.auto_approve_eligible()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_settings jsonb := coalesce((select info from somiti_settings where id = 1), '{}'::jsonb);
  v_threshold numeric := coalesce((v_settings->>'autoApproveThreshold')::numeric, 5000);
  r record;
  v_count int := 0;
  v_total numeric := 0;
begin
  perform public.require_admin();

  for r in
    select id, amount, title, expense_id
    from approvals
    where status = 'pending' and type = 'expense' and amount <= v_threshold
    order by created_at asc
    for update
  loop
    if r.expense_id is not null then
      perform public.post_expense(r.expense_id);
    end if;

    update approvals
    set status = 'approved',
        decided_by = auth.uid(),
        decided_by_name = public.my_name() || ' (স্বয়ংক্রিয়)',
        decided_at = now()
    where id = r.id;

    v_count := v_count + 1;
    v_total := v_total + r.amount;

    perform public.write_audit('approval_auto_approved', jsonb_build_object(
      'approval_id', r.id,
      'amount', r.amount,
      'title', r.title
    ));
  end loop;

  return jsonb_build_object('approved_count', v_count, 'total_amount', v_total);
end; $$;

revoke execute on function public.log_sms(text,text,text,text,uuid,text,text,jsonb), public.auto_approve_eligible() from public, anon;
grant execute on function public.log_sms(text,text,text,text,uuid,text,text,jsonb), public.auto_approve_eligible() to authenticated;

-- 005_accounting_integrity.sql
-- Apply after 004. Transactional and safe to re-run.

alter table public.expenses add column if not exists created_by_name text;
alter table public.members add column if not exists dues_start_month date;
alter table public.members add column if not exists profit_balance numeric(14,2) not null default 0;
alter table public.members add column if not exists last_profit_year int;
alter table public.projects add column if not exists completed_at date;
grant select (dues_start_month,profit_balance,last_profit_year) on public.members to authenticated;

-- Legacy month markers had no year. Preserve them in the migration year.
-- Do not invent debts for years the old application never tracked.
update members set dues_start_month = greatest(date_trunc('month',join_date)::date,date_trunc('year',current_date)::date)
where dues_start_month is null;
update members m set months_status = coalesce((select jsonb_object_agg(
  case when key ~ '^\d{1,2}$' then to_char(make_date(extract(year from current_date)::int,key::int+1,1),'YYYY-MM') else key end,value)
  from jsonb_each(coalesce(m.months_status,'{}'::jsonb))), '{}'::jsonb)
where exists(select 1 from jsonb_object_keys(coalesce(m.months_status,'{}'::jsonb)) k where k ~ '^\d{1,2}$');

create or replace function public.refresh_member_dues(p_member uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := coalesce((select info from somiti_settings where id=1),'{}'::jsonb);
  due_day int := greatest(1,least(28,coalesce((cfg->>'dueDay')::int,10)));
  grace int := greatest(0,coalesce((cfg->>'graceDays')::int,5));
  fee numeric := greatest(0,coalesce((cfg->>'lateFee')::numeric,0));
  r record; period date; ms jsonb; due_n int; late_n int; amt numeric; n int:=0;
begin
  for r in select * from members where deleted_at is null and (p_member is null or id=p_member) for update loop
    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into ms
    from jsonb_each(coalesce(r.months_status,'{}'::jsonb)) where value='"paid"'::jsonb;
    due_n:=0; late_n:=0;
    period:=coalesce(r.dues_start_month,date_trunc('month',r.join_date)::date);
    if r.status <> 'inactive' then
      while period <= date_trunc('month',current_date)::date loop
        if coalesce(ms->>to_char(period,'YYYY-MM'),'') <> 'paid' and current_date > period+due_day-1 then
          due_n:=due_n+1;
          ms:=ms || jsonb_build_object(to_char(period,'YYYY-MM'),'due');
          if current_date > period+due_day-1+grace then late_n:=late_n+1; end if;
        end if;
        period:=(period+interval '1 month')::date;
      end loop;
    end if;
    amt:=greatest(0,due_n*r.monthly_amount+late_n*fee-r.partial_credit);
    update members set months_status=ms,due_months=due_n,due_amount=amt,
      status=case when r.status='inactive' then 'inactive' when amt=0 then 'paid' when r.partial_credit>0 then 'partial' else 'due' end,
      updated_at=now() where id=r.id;
    n:=n+1;
  end loop;
  return n;
end; $$;

create or replace function public.record_deposit(
  p_member_id uuid,p_months text[],p_base_amount numeric,p_late_fee numeric,p_total_amount numeric,
  p_payment_method text,p_trx_id text default null,p_note text default null,p_id uuid default null)
returns transactions language plpgsql security definer set search_path=public as $$
declare
  m members%rowtype; t transactions%rowtype; ms jsonb; credit numeric; item text; idx int; period date;
  seen text[]:=array[]::text[]; canonical text[]:=array[]::text[];
  names text[]:=array['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  english text[]:=array['january','february','march','april','may','june','july','august','september','october','november','december'];
begin
  perform require_staff();
  if p_total_amount is null or p_total_amount<=0 or p_base_amount is null or p_base_amount<0
    or coalesce(p_late_fee,0)<0 or p_base_amount+coalesce(p_late_fee,0)<>p_total_amount then
    raise exception 'জমার হিসাব সঠিক নয়';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash','bank','bkash','nagad') then raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়'; end if;
  select * into m from members where id=p_member_id and deleted_at is null for update;
  if m.id is null or m.status='inactive' then raise exception 'সক্রিয় সদস্য পাওয়া যায়নি'; end if;
  if p_id is not null then
    select * into t from transactions where id=p_id;
    if t.id is not null then
      if t.type<>'deposit' or t.member_id<>p_member_id or t.amount<>p_total_amount then raise exception 'এই জমার আইডি ইতিমধ্যে ব্যবহৃত'; end if;
      return t;
    end if;
  end if;
  if not exists(select 1 from cash_accounts where id=account_for(p_payment_method)) then raise exception 'হিসাব পাওয়া যায়নি'; end if;
  ms:=coalesce(m.months_status,'{}'::jsonb); credit:=m.partial_credit+p_base_amount;
  foreach item in array coalesce(p_months,array[]::text[]) loop
    if item ~ '^\d{4}-(0[1-9]|1[0-2])$' then period:=(item||'-01')::date;
    else
      idx:=coalesce(array_position(names,item),array_position(english,lower(item)));
      if idx is null then raise exception 'কিস্তির মাস সঠিক নয়'; end if;
      period:=make_date(extract(year from current_date)::int,idx,1);
    end if;
    item:=to_char(period,'YYYY-MM');
    if item=any(seen) then raise exception 'একই মাস একাধিকবার নির্বাচন করা হয়েছে'; end if;
    seen:=array_append(seen,item); canonical:=array_append(canonical,item);
    if period<coalesce(m.dues_start_month,date_trunc('month',m.join_date)::date) then raise exception 'যোগদানের আগের মাসের কিস্তি নয়'; end if;
    if ms->>item='paid' then raise exception 'এই মাসের কিস্তি ইতিমধ্যে পরিশোধিত'; end if;
    if m.monthly_amount>0 and credit>=m.monthly_amount then
      ms:=ms||jsonb_build_object(item,'paid'); credit:=credit-m.monthly_amount;
    end if;
  end loop;
  insert into transactions(id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,trx_id,note,months,late_fee)
  values(coalesce(p_id,gen_random_uuid()),next_receipt(),m.id,m.name,m.code,p_total_amount,'deposit',p_payment_method,
    nullif(trim(p_trx_id),''),coalesce(nullif(trim(p_note),''),'কিস্তি জমা'),canonical,coalesce(p_late_fee,0)) returning * into t;
  update members set total_deposit=total_deposit+p_base_amount,months_status=ms,partial_credit=credit,updated_at=now() where id=m.id;
  perform refresh_member_dues(m.id);
  update cash_accounts set amount=amount+p_total_amount,updated_at=now() where id=account_for(p_payment_method);
  perform write_audit('deposit_recorded',jsonb_build_object('transaction_id',t.id,'member',m.code,'amount',p_total_amount));
  return t;
end; $$;

-- Posting is idempotent; balance and expense rows remain locked until commit.
create or replace function public.post_expense(p_expense_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e expenses%rowtype; a cash_accounts%rowtype; method text; tid uuid;
begin
  select * into e from expenses where id=p_expense_id for update;
  if e.id is null then raise exception 'খরচ পাওয়া যায়নি'; end if;
  if e.transaction_id is not null then return; end if;
  if e.status='rejected' then raise exception 'বাতিল খরচ অনুমোদন করা যাবে না'; end if;
  method:=method_from_source(e.payment_source);
  select * into a from cash_accounts where id=account_for(method) for update;
  if a.id is null or a.amount<e.amount then raise exception 'পর্যাপ্ত ব্যালেন্স নেই'; end if;
  insert into transactions(receipt_no,party_name,party_code,amount,type,payment_method,note)
  values(e.voucher_no,'সমিতি খরচ','EXP',e.amount,'expense',method,e.category||': '||e.title) returning id into tid;
  update expenses set transaction_id=tid,status='approved' where id=e.id;
  update cash_accounts set amount=amount-e.amount,updated_at=now() where id=a.id;
end; $$;

create or replace function public.auto_approve_eligible()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  cfg jsonb:=coalesce((select info from somiti_settings where id=1),'{}'::jsonb);
  threshold numeric:=coalesce((cfg->>'autoApproveThreshold')::numeric,5000);
  r record; n int:=0; total numeric:=0;
begin
  perform require_admin();
  if not coalesce((cfg->>'autoApproveEnabled')::boolean,true) then raise exception 'স্বয়ংক্রিয় অনুমোদন বন্ধ আছে'; end if;
  for r in select * from approvals where status='pending' and type='expense' and expense_id is not null and amount<=threshold order by created_at for update loop
    perform post_expense(r.expense_id);
    update approvals set status='approved',decided_by=auth.uid(),decided_by_name=my_name(),decided_at=now() where id=r.id;
    n:=n+1; total:=total+r.amount;
    perform write_audit('approval_auto_approved',jsonb_build_object('approval_id',r.id,'amount',r.amount));
  end loop;
  return jsonb_build_object('approved_count',n,'total_amount',total);
end; $$;

-- Record when a project closes; annual profit includes both gains and realized losses.
create or replace function public.track_project_completion()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from new.status) then new.completed_at:=current_date; end if;
  return new;
end; $$;
drop trigger if exists project_completion on projects;
create trigger project_completion before insert or update on projects for each row execute function track_project_completion();
update projects set completed_at=current_date where status='completed' and completed_at is null;

create or replace function public.profit_preview(p_year int default extract(year from current_date)::int)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare proj numeric; exp numeric; dep numeric; done boolean; shares jsonb;
begin
  perform require_staff();
  if p_year<2000 or p_year>extract(year from current_date)::int then raise exception 'হিসাব বছর সঠিক নয়'; end if;
  select coalesce(sum(
    greatest(coalesce(r.until_year,0)-p.invested_amount,0)-greatest(coalesce(r.before_year,0)-p.invested_amount,0)
    -case when p.status='completed' and extract(year from p.completed_at)::int=p_year then greatest(p.invested_amount-coalesce(r.until_year,0),0) else 0 end),0)
  into proj from projects p left join lateral (
    select sum(amount) filter(where extract(year from date)::int<=p_year) until_year,
      sum(amount) filter(where extract(year from date)::int<p_year) before_year
    from transactions where project_id=p.id and type='profit') r on true;
  select coalesce(sum(amount),0) into exp from transactions where type='expense' and extract(year from date)::int=p_year;
  select coalesce(sum(total_deposit),0) into dep from members where deleted_at is null and status<>'inactive';
  select exists(select 1 from profit_distributions where year=p_year) into done;
  select coalesce(jsonb_agg(jsonb_build_object('memberId',m.id,'name',m.name,'code',m.code,'baseDeposit',m.total_deposit,
    'share',s.share) order by m.code),'[]'::jsonb) into shares from members m left join profit_shares s on s.member_id=m.id and s.year=p_year
    where m.deleted_at is null and (s.member_id is not null or m.status<>'inactive');
  if done then
    return (select jsonb_build_object('year',year,'projectProfit',project_profit,'expenses',expenses,'netProfit',net_profit,
      'totalDeposit',(select coalesce(sum(base_deposit),0) from profit_shares where year=p_year),'alreadyDistributed',true,
      'distributed',distributed,'reservePct',reserve_pct,'managementPct',management_pct,'shares',shares) from profit_distributions where year=p_year);
  end if;
  return jsonb_build_object('year',p_year,'projectProfit',proj,'expenses',exp,'netProfit',proj-exp,'totalDeposit',dep,'alreadyDistributed',false,'shares',shares);
end; $$;

create or replace function public.distribute_profit(p_year int,p_reserve_pct numeric,p_management_pct numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb; dist numeric; dep numeric; n int; remainder numeric; first_id uuid;
begin
  perform require_admin();
  perform pg_advisory_xact_lock(714206,p_year);
  if exists(select 1 from profit_distributions where year=p_year) then raise exception 'এই বছরের লাভ ইতিমধ্যে বণ্টিত'; end if;
  if p_reserve_pct is null or p_management_pct is null or p_reserve_pct<0 or p_management_pct<0 or p_reserve_pct+p_management_pct>100 then raise exception 'শতাংশ সঠিক নয়'; end if;
  perform 1 from members where deleted_at is null order by id for update;
  v:=profit_preview(p_year); dep:=(v->>'totalDeposit')::numeric;
  if (v->>'netProfit')::numeric<=0 or dep<=0 then raise exception 'বণ্টনযোগ্য লাভ বা সদস্যের জমা নেই'; end if;
  dist:=round((v->>'netProfit')::numeric*(100-p_reserve_pct-p_management_pct)/100,2);
  insert into profit_distributions(year,project_profit,expenses,net_profit,reserve_pct,management_pct,distributed,approved_by_name)
  values(p_year,(v->>'projectProfit')::numeric,(v->>'expenses')::numeric,(v->>'netProfit')::numeric,p_reserve_pct,p_management_pct,dist,my_name());
  insert into profit_shares(year,member_id,base_deposit,share)
  select p_year,id,total_deposit,round(total_deposit/dep*dist,2) from members where deleted_at is null and status<>'inactive' and total_deposit>0;
  get diagnostics n=row_count;
  select dist-coalesce(sum(share),0) into remainder from profit_shares where year=p_year;
  select member_id into first_id from profit_shares where year=p_year order by base_deposit desc,member_id limit 1;
  update profit_shares set share=share+remainder where year=p_year and member_id=first_id;
  update members m set profit_balance=m.profit_balance+s.share,profit_2025=s.share,last_profit_year=p_year,
    total_deposit=m.total_deposit+s.share,updated_at=now() from profit_shares s where s.year=p_year and s.member_id=m.id;
  perform write_audit('profit_distributed',jsonb_build_object('year',p_year,'amount',dist,'members',n));
  return jsonb_build_object('year',p_year,'distributed',dist,'members',n);
end; $$;

revoke execute on function public.refresh_member_dues(uuid),public.post_expense(uuid),public.track_project_completion() from public,anon,authenticated;
revoke execute on function public.auto_approve_eligible(),public.log_sms(text,text,text,text,uuid,text,text,jsonb) from public,anon;
grant execute on function public.auto_approve_eligible(),public.log_sms(text,text,text,text,uuid,text,text,jsonb) to authenticated;

-- Reconcile missing configuration key from the old settings screen.
update somiti_settings set info=info||jsonb_build_object('autoApproveThreshold',coalesce(info->'autoApproveThreshold',info->'autoApproveLimit','5000'::jsonb)) where id=1;

-- 006_member_documents.sql

alter table public.members add column if not exists avatar_path text;
alter table public.members add column if not exists nid_path text;
grant select(avatar_path,nid_path) on public.members to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('member-documents','member-documents',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;

drop policy if exists member_documents_read on storage.objects;
create policy member_documents_read on storage.objects for select to authenticated
using(bucket_id='member-documents' and (public.is_staff() or (storage.foldername(name))[1]=public.my_member_id()::text));
drop policy if exists member_documents_insert on storage.objects;
create policy member_documents_insert on storage.objects for insert to authenticated
with check(bucket_id='member-documents' and public.is_staff() and exists(select 1 from public.members where id::text=(storage.foldername(name))[1] and deleted_at is null));
drop policy if exists member_documents_update on storage.objects;
create policy member_documents_update on storage.objects for update to authenticated
using(bucket_id='member-documents' and public.is_staff()) with check(bucket_id='member-documents' and public.is_staff());

create or replace function public.set_member_documents(p_member_id uuid,p_avatar_path text default null,p_nid_path text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform require_staff();
  if not exists(select 1 from members where id=p_member_id and deleted_at is null) then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if p_avatar_path is not null and split_part(p_avatar_path,'/',1)<>p_member_id::text
    or p_nid_path is not null and split_part(p_nid_path,'/',1)<>p_member_id::text then raise exception 'নথির ঠিকানা সঠিক নয়'; end if;
  update members set avatar_path=coalesce(p_avatar_path,avatar_path),nid_path=coalesce(p_nid_path,nid_path),updated_at=now() where id=p_member_id;
  perform write_audit('member_documents_updated',jsonb_build_object('member_id',p_member_id));
end; $$;
revoke execute on function public.set_member_documents(uuid,text,text) from public,anon;
grant execute on function public.set_member_documents(uuid,text,text) to authenticated;

-- 007_asset_balances_roles.sql
-- Asset balances and protection of the last super administrator.

insert into cash_accounts(id,type,name,amount,sort) values('ca5','nagad','নগদ মোবাইল হিসাব',0,5) on conflict(id) do nothing;

create or replace function public.project_profit_between(p_start date,p_end date)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(sum(greatest(coalesce(r.finish,0)-p.invested_amount,0)-greatest(coalesce(r.start,0)-p.invested_amount,0)
    -case when p.status='completed' and p.completed_at>=p_start and p.completed_at<p_end then greatest(p.invested_amount-coalesce(r.finish,0),0) else 0 end),0)
  from projects p left join lateral (
    select sum(amount) filter(where date<p_end) finish,sum(amount) filter(where date<p_start) start
    from transactions where project_id=p.id and type='profit') r on true;
$$;
revoke execute on function public.project_profit_between(date,date) from public,anon,authenticated;

create or replace function public.set_member_app_role(p_id uuid,p_role text,p_title text default null)
returns void language plpgsql security definer set search_path=public as $$
declare m members%rowtype;
begin
  if my_role() is distinct from 'super_admin' then raise exception 'শুধু সুপার অ্যাডমিন' using errcode='42501'; end if;
  if p_role is null or p_role not in ('super_admin','admin','cashier','field_worker','member') then raise exception 'ভূমিকা সঠিক নয়'; end if;
  perform pg_advisory_xact_lock(714207);
  select * into m from members where id=p_id and deleted_at is null for update;
  if m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if m.app_role='super_admin' and p_role<>'super_admin' and not exists(select 1 from members where id<>p_id and app_role='super_admin' and deleted_at is null) then raise exception 'শেষ সুপার অ্যাডমিনের ভূমিকা বদলানো যাবে না'; end if;
  update members set app_role=p_role,role_title=coalesce(p_title,role_title),updated_at=now() where id=p_id;
  update profiles set role=p_role where member_id=p_id;
  perform write_audit('role_changed',jsonb_build_object('member_id',p_id,'role',p_role));
end; $$;

create or replace function public.delete_member(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare m members%rowtype;
begin
  perform require_admin();perform pg_advisory_xact_lock(714207);
  select * into m from members where id=p_id and deleted_at is null for update;
  if m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if m.app_role='super_admin' and (my_role()<>'super_admin' or not exists(select 1 from members where id<>p_id and app_role='super_admin' and deleted_at is null)) then raise exception 'এই সুপার অ্যাডমিনকে মুছতে পারবেন না'; end if;
  update members set deleted_at=now(),status='inactive',updated_at=now() where id=p_id;
  update profiles set is_active=false where member_id=p_id;
  perform write_audit('member_deleted',jsonb_build_object('member_id',p_id));
end; $$;

create or replace function public.get_somiti_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
  m_start date := date_trunc('month', current_date)::date;
  y_start date := date_trunc('year', current_date)::date;
  v_cash numeric; v_proj numeric; v_target numeric; v_collected numeric;
  v_income numeric; v_expense numeric; v_total_members int; v_active int;
  v_due_members int; v_inactive int; v_partial int; v_due_amt numeric;
  v_paid int; v_m1 int; v_m2 int; v_m3 int; v_proj_profit numeric; v_prev_fund numeric;
begin
  if auth.uid() is null or public.my_role() is null then
    raise exception 'লগইন প্রয়োজন' using errcode = '42501';
  end if;

  select coalesce(sum(amount),0) into v_cash from cash_accounts;
  select coalesce(sum(remaining_amount),0) into v_proj from projects;
  select count(*),
         count(*) filter (where status <> 'inactive'),
         count(*) filter (where status in ('due','partial')),
         count(*) filter (where status = 'inactive'),
         count(*) filter (where status = 'partial'),
         count(*) filter (where status = 'paid'),
         coalesce(sum(due_amount) filter (where status <> 'inactive'),0),
         coalesce(sum(monthly_amount) filter (where status <> 'inactive'),0),
         count(*) filter (where due_months = 1 and status <> 'inactive'),
         count(*) filter (where due_months = 2 and status <> 'inactive'),
         count(*) filter (where due_months >= 3 and status <> 'inactive')
    into v_total_members, v_active, v_due_members, v_inactive, v_partial, v_paid,
         v_due_amt, v_target, v_m1, v_m2, v_m3
    from members where deleted_at is null;

  select coalesce(sum(amount) filter (where type = 'deposit'),0),
         coalesce(sum(amount) filter (where type in ('deposit','profit')),0),
         coalesce(sum(amount) filter (where type = 'expense'),0)
    into v_collected, v_income, v_expense
    from transactions where date >= m_start;

  v_proj_profit := public.project_profit_between(y_start, (current_date + 1));

  -- fund at start of month ≈ current fund − net flow this month
  v_prev_fund := (v_cash + v_proj) - (v_collected + public.project_profit_between(m_start,current_date+1) - v_expense);

  r := jsonb_build_object(
    'totalMembersCount', v_total_members,
    'activeMembersCount', v_active,
    'dueMembersCount', v_due_members,
    'inactiveMembersCount', v_inactive,
    'totalFund', v_cash + v_proj,
    'monthlyFundGrowth', case when v_prev_fund > 0 then round(((v_cash + v_proj) - v_prev_fund) / v_prev_fund * 100, 1) else 0 end,
    'projectInvested', v_proj,
    'projectInvestedPct', case when v_cash + v_proj > 0 then round(v_proj / (v_cash + v_proj) * 100) else 0 end,
    'cashAndBank', v_cash,
    'cashAndBankPct', case when v_cash + v_proj > 0 then round(v_cash / (v_cash + v_proj) * 100) else 0 end,
    'monthlyTarget', v_target,
    'monthlyCollected', v_collected,
    'monthlyCollectedPct', case when v_target > 0 then least(100, round(v_collected / v_target * 100)) else 0 end,
    'monthlyRemaining', greatest(0, v_target - v_collected),
    'paidCount', v_paid,
    'dueCount', v_due_members,
    'partialCount', v_partial,
    'unpaidCount', v_due_members - v_partial,
    'totalDueAmount', v_due_amt,
    'dueBreakdown', jsonb_build_object('month1', v_m1, 'month2', v_m2, 'month3Plus', v_m3),
    'monthlyIncome', v_income,
    'monthlyExpense', v_expense,
    'monthlyNet', v_income - v_expense,
    'yearlyProjectProfit', v_proj_profit
  );
  return r;
end; $$;

create table if not exists public.amanot_schema_versions(version text primary key,applied_at timestamptz not null default now());
alter table public.amanot_schema_versions enable row level security;
revoke all on public.amanot_schema_versions from public,anon,authenticated;
insert into public.amanot_schema_versions(version) values('004'),('005'),('006'),('007') on conflict do nothing;
commit;
select version,applied_at from public.amanot_schema_versions order by version;
