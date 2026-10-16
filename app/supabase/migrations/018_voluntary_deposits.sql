-- All contributions are voluntary. Historical transactions remain immutable.
begin;
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
commit;
