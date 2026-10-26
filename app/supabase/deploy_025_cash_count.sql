-- Day close: the cashier counts the cash and the app keeps the count next to the expected balance.
-- No money moves; a difference is only recorded (fix it with a real entry if needed).
begin;
do $$ begin if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc;perform set_config('amanot.m025_restore_create','true',true);end if;end $$;
create table if not exists public.cash_counts(
 id uuid primary key, somiti_id uuid not null default public.current_somiti_id() references public.somitis(id),
 count_date date not null, account_id text not null, expected numeric(14,2) not null, counted numeric(14,2) not null check(counted>=0),
 difference numeric(14,2) not null, note text not null default '', counted_by uuid not null, counted_by_name text,
 created_at timestamptz not null default now(), unique(somiti_id,id)
);
create index if not exists cash_counts_date_idx on public.cash_counts(somiti_id,count_date desc,created_at desc);
alter table public.cash_counts enable row level security;
alter table public.cash_counts force row level security;
revoke all on public.cash_counts from public,anon,authenticated;
grant select on public.cash_counts to authenticated;
grant select,insert on public.cash_counts to amanot_rpc;
drop policy if exists tenant_boundary on public.cash_counts;
create policy tenant_boundary on public.cash_counts as restrictive for all to authenticated,amanot_rpc
 using(somiti_id=(select current_somiti_id())) with check(somiti_id=(select current_somiti_id()));
drop policy if exists staff_read on public.cash_counts;
create policy staff_read on public.cash_counts for select to authenticated using((select session_ready()) and (select is_staff()));
drop policy if exists rpc_access on public.cash_counts;
create policy rpc_access on public.cash_counts for all to amanot_rpc using(true) with check(true);

create or replace function public.record_cash_count(p jsonb)
returns cash_counts language plpgsql security definer set search_path=public as $$
declare r cash_counts%rowtype;a cash_accounts%rowtype;cid uuid;counted numeric;note text;
begin
 perform require_entry_role();
 cid:=(p->>'id')::uuid;counted:=(p->>'counted')::numeric;note:=trim(coalesce(p->>'note',''));
 if cid is null or counted is null or counted<0 or counted<>round(counted,2) or counted>999999999999.99 or length(note)>500 then raise exception 'গোনা টাকার পরিমাণ সঠিক নয় / Invalid count';end if;
 select * into r from cash_counts where id=cid;if r.id is not null then return r;end if;
 select * into a from cash_accounts where id=account_for(coalesce(p->>'method','cash'));
 if a.id is null then raise exception 'হিসাব পাওয়া যায়নি / Account unavailable';end if;
 insert into cash_counts(id,count_date,account_id,expected,counted,difference,note,counted_by,counted_by_name)
 values(cid,investment_business_date(),a.id,a.amount,counted,counted-a.amount,note,rpc_caller_id(),my_name()) returning * into r;
 perform write_audit('cash_counted',jsonb_build_object('count_id',cid,'account',a.id,'expected',a.amount,'counted',counted,'difference',counted-a.amount));
 return r;
end $$;
alter function public.record_cash_count(jsonb) owner to amanot_rpc;
revoke all on function public.record_cash_count(jsonb) from public,anon;
grant execute on function public.record_cash_count(jsonb) to authenticated;
do $$ begin if current_setting('amanot.m025_restore_create',true)='true' then revoke create on schema public from amanot_rpc;end if;end $$;
notify pgrst,'reload schema';
commit;
