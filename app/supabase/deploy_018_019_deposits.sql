begin;
select set_config('amanot.deposit_financial_guard',(select jsonb_build_object(
 'savings',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from members),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from cash_accounts c),
 'ledger',(select md5(coalesce(string_agg(to_jsonb(t)::text,',' order by id),'')) from transactions t),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from projects p),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from profit_distributions d)
))::text,true);
-- Existing RPCs retain their restricted owner; CREATE is restored before commit.
do $$ begin
 if not has_schema_privilege('amanot_rpc','public','CREATE') then
  grant create on schema public to amanot_rpc;
  perform set_config('amanot.deposit_restore_create','true',true);
 end if;
end $$;
-- All contributions are voluntary. Historical transactions remain immutable.

alter table public.members alter column monthly_amount set default 0;
create or replace function public.enforce_voluntary_deposits()
returns trigger language plpgsql set search_path=public as $$ begin
 new.monthly_amount:=0; new.due_amount:=0; new.due_months:=0;
 if new.status in ('due','partial') then new.status:='paid'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into new.months_status
 from jsonb_each(coalesce(new.months_status,'{}'::jsonb)) where value='"paid"'::jsonb;
 return new;
end $$;
revoke all on function public.enforce_voluntary_deposits() from public,anon,authenticated;
drop trigger if exists trg_voluntary_deposits on public.members;
create trigger trg_voluntary_deposits before insert or update on public.members
for each row execute function public.enforce_voluntary_deposits();

-- Remove derived obligations, without changing savings, cash, credits or ledger.
update public.members set monthly_amount=0,due_amount=0,due_months=0
where monthly_amount<>0 or due_amount<>0 or due_months<>0 or status in ('due','partial')
 or exists(select 1 from jsonb_each(coalesce(months_status,'{}'::jsonb)) where value='"due"'::jsonb);
create or replace function public.enforce_voluntary_settings()
returns trigger language plpgsql set search_path=public as $$ begin
 new.info:=coalesce(new.info,'{}'::jsonb)||'{"defaultMonthly":0,"lateFee":0,"dueDay":0,"graceDays":0,"depositMode":"voluntary"}'::jsonb;
 return new;
end $$;
revoke all on function public.enforce_voluntary_settings() from public,anon,authenticated;
drop trigger if exists trg_voluntary_settings on public.somiti_settings;
create trigger trg_voluntary_settings before insert or update on public.somiti_settings
for each row execute function public.enforce_voluntary_settings();
update public.somiti_settings set info=info||'{"defaultMonthly":0,"lateFee":0,"dueDay":0,"graceDays":0,"depositMode":"voluntary"}'::jsonb;

create or replace function public.refresh_member_dues(p_member uuid default null)
returns int language plpgsql security definer set search_path=public as $$
declare n int; begin
 update members set due_amount=0,due_months=0,monthly_amount=0
 where deleted_at is null and (p_member is null or id=p_member)
 and (due_amount<>0 or due_months<>0 or monthly_amount<>0 or status in ('due','partial'));
 get diagnostics n=row_count; return n;
end $$;
alter function public.refresh_member_dues(uuid) owner to amanot_rpc;

-- Keep the current tenant/role/PIN/idempotency/account validation in these RPCs.
do $$ declare definition text; first_pos int; last_pos int; begin
 definition:=pg_get_functiondef('public.add_member(jsonb)'::regprocedure);
 if position('fatherName' in definition)=0 then raise exception 'Apply migration 017 first'; end if;
 definition:=replace(definition,'coalesce((p->>''monthlyAmount'')::numeric, 2000)','0');
 execute definition;
 definition:=pg_get_functiondef('public.update_member(uuid,jsonb)'::regprocedure);
 definition:=replace(definition,'coalesce((p->>''monthlyAmount'')::numeric, monthly_amount)','0');
 execute definition;
 definition:=pg_get_functiondef('public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid)'::regprocedure);
 -- Migration 019 replaces the legacy entry point with a dated-RPC wrapper.
 if position('Voluntary contributions' in definition)=0 and not exists(
  select 1 from pg_proc p join pg_language l on l.oid=p.prolang
  where p.oid='public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid)'::regprocedure and l.lanname='sql'
 ) then
  first_pos:=strpos(definition,'  ms:=coalesce(m.months_status');
  last_pos:=strpos(definition,'  insert into transactions(id,receipt_no');
  if first_pos=0 or last_pos<=first_pos then raise exception 'Unexpected record_deposit source'; end if;
  definition:=left(definition,first_pos-1)||$patch$  -- Voluntary contributions: no installment allocation or late fee.
  if coalesce(p_late_fee,0)<>0 then raise exception 'Late fees are disabled' using errcode='22023'; end if;
  ms:=coalesce(m.months_status,'{}'::jsonb); credit:=m.partial_credit;
$patch$||substr(definition,last_pos);
  definition:=replace(definition,'''কিস্তি জমা''','''জমা''');
  execute definition;
 end if;
end $$;


-- Allow deposit collection date override and custom remarks/comments.
-- If p_date is omitted or null, current_date is used.


do $$ begin
 if not has_schema_privilege('amanot_rpc','public','CREATE') then
  grant create on schema public to amanot_rpc;
  perform set_config('amanot.m019_restore_create','true',true);
 end if;
end $$;

create or replace function public.record_deposit(
  p_member_id uuid,
  p_months text[],
  p_base_amount numeric,
  p_late_fee numeric,
  p_total_amount numeric,
  p_payment_method text,
  p_trx_id text,
  p_note text,
  p_id uuid,
  p_date date
)
returns transactions language plpgsql security definer set search_path=public as $$
declare
  m members%rowtype; t transactions%rowtype; ms jsonb; credit numeric;
begin
  perform require_staff();
  if p_total_amount is null or p_total_amount<=0 or p_base_amount is null or p_base_amount<0
    or coalesce(p_late_fee,0)<>0 or p_base_amount<>p_total_amount then
    raise exception 'জমার হিসাব সঠিক নয় বা বিলম্ব ফি বন্ধ রয়েছে';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash','bank','bkash','nagad') then
    raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়';
  end if;
  select * into m from members where id=p_member_id and deleted_at is null for update;
  if m.id is null or m.status='inactive' then raise exception 'সক্রিয় সদস্য পাওয়া যায়নি'; end if;
  if p_id is not null then
    select * into t from transactions where id=p_id;
    if t.id is not null then
      if t.type<>'deposit' or t.member_id<>p_member_id or t.amount<>p_total_amount then
        raise exception 'এই জমার আইডি ইতিমধ্যে ব্যবহৃত';
      end if;
      return t;
    end if;
  end if;
  if not exists(select 1 from cash_accounts where id=account_for(p_payment_method)) then
    raise exception 'হিসাব পাওয়া যায়নি';
  end if;

  -- Voluntary contributions: no installment allocation or late fee.
  ms:=coalesce(m.months_status,'{}'::jsonb); credit:=m.partial_credit;

  insert into transactions(id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,trx_id,note,months,late_fee,date)
  values(
    coalesce(p_id,gen_random_uuid()),
    next_receipt(),
    m.id,
    m.name,
    m.code,
    p_total_amount,
    'deposit',
    p_payment_method,
    nullif(trim(p_trx_id),''),
    coalesce(nullif(trim(p_note),''),'জমা'),
    array[]::text[],
    0,
    coalesce(p_date, current_date)
  ) returning * into t;

  update members set total_deposit=total_deposit+p_base_amount,months_status=ms,partial_credit=credit,updated_at=now() where id=m.id;
  perform refresh_member_dues(m.id);
  update cash_accounts set amount=amount+p_total_amount,updated_at=now() where id=account_for(p_payment_method);
  perform write_audit('deposit_recorded',jsonb_build_object('transaction_id',t.id,'member',m.code,'amount',p_total_amount,'date',t.date));
  return t;
end; $$;

grant execute on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date) to authenticated;

-- Backward-compatibility wrapper for 9-argument callers
create or replace function public.record_deposit(
  p_member_id uuid,
  p_months text[],
  p_base_amount numeric,
  p_late_fee numeric,
  p_total_amount numeric,
  p_payment_method text,
  p_trx_id text default null,
  p_note text default null,
  p_id uuid default null
)
returns transactions language sql security definer set search_path=public as $$
  select public.record_deposit(p_member_id,p_months,p_base_amount,p_late_fee,p_total_amount,p_payment_method,p_trx_id,p_note,p_id,null::date);
$$;

grant execute on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid) to authenticated;

-- Keep both entry points inside the existing tenant RLS boundary.
alter function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date) owner to amanot_rpc;
alter function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid) owner to amanot_rpc;
revoke all on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date) from public,anon;
revoke all on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid) from public,anon;
do $$ begin
 if current_setting('amanot.m019_restore_create',true)='true' then revoke create on schema public from amanot_rpc; end if;
end $$;


do $$ declare actual jsonb; begin
 select jsonb_build_object(
 'savings',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from members),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from cash_accounts c),
 'ledger',(select md5(coalesce(string_agg(to_jsonb(t)::text,',' order by id),'')) from transactions t),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from projects p),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from profit_distributions d)
) into actual;
 if actual is distinct from current_setting('amanot.deposit_financial_guard')::jsonb then
  raise exception 'Recorded financial data changed; deployment rolled back';
 end if;
 if current_setting('amanot.deposit_restore_create',true)='true' then revoke create on schema public from amanot_rpc; end if;
end $$;
notify pgrst,'reload schema';
select true as voluntary_deposits_ready,true as member_creation_ready,true as recorded_finances_preserved;
commit;
