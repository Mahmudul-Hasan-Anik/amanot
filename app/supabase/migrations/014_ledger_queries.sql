begin;
-- Invoker rights preserve the existing tenant/member RLS boundary.
create or replace function public.get_transaction_page(
  p_limit integer default 50, p_before_created timestamptz default null,
  p_before_id uuid default null, p_from date default null, p_to date default null,
  p_member_id uuid default null, p_project_id uuid default null, p_paid_month text default null
) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
  if not public.session_ready() then raise exception 'আবার লগইন করুন' using errcode='42501'; end if;
  if p_limit is null or p_limit<1 or p_limit>200 then raise exception 'Page limit must be between 1 and 200'; end if;
  if (p_before_created is null)<>(p_before_id is null) then raise exception 'Incomplete page cursor'; end if;
  if p_from is not null and p_to is not null and p_to<=p_from then raise exception 'Invalid date range'; end if;
  if p_paid_month is not null and p_paid_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid paid month'; end if;
  with candidates as materialized (
    select t.* from public.transactions t
    where (p_before_created is null or (t.created_at,t.id)<(p_before_created,p_before_id))
      and (p_from is null or t.date>=p_from) and (p_to is null or t.date<p_to)
      and (p_member_id is null or t.member_id=p_member_id)
      and (p_project_id is null or t.project_id=p_project_id
        -- Preserve visibility of legacy project expenses recorded with a title prefix.
        or exists(select 1 from public.projects p where p.id=p_project_id and starts_with(coalesce(t.note,''),p.name||':')))
      and (p_paid_month is null or (t.type='deposit' and p_paid_month=any(t.months)))
    order by t.created_at desc,t.id desc limit p_limit+1
  ), page as (select * from candidates order by created_at desc,id desc limit p_limit)
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from page p),'[]'::jsonb),
    'hasMore',(select count(*)>p_limit from candidates),
    'cursor',(select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at,id limit 1)
  ) into result;
  return result;
end $$;

create or replace function public.get_ledger_summary(p_from date,p_to date)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
  if not public.session_ready() or not public.is_staff() then raise exception 'অনুমতি নেই' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>3660 then raise exception 'Invalid report range'; end if;
  with ledger as materialized (
    select * from transactions where date>=p_from and date<p_to
  ), monthly as (
    select to_char(date,'YYYY-MM') as "month",
      coalesce(sum(amount) filter(where type='deposit'),0) deposits,
      coalesce(sum(amount) filter(where type='profit'),0) profit,
      coalesce(sum(amount) filter(where type='expense'),0) expenses,
      count(*) transaction_count
    from ledger group by 1
  ), categories as (
    select to_char(date,'YYYY-MM') as "month",category,sum(amount) amount
    from expenses where status='approved' and date>=p_from and date<p_to group by 1,2
  ), collections as (
    select member_id,sum(amount) amount from ledger where type='deposit' and member_id is not null group by member_id
  )
  select jsonb_build_object(
    'months',coalesce((select jsonb_agg(to_jsonb(m) order by m.month) from monthly m),'[]'::jsonb),
    'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.month,c.category) from categories c),'[]'::jsonb),
    'collections',coalesce((select jsonb_object_agg(member_id::text,amount) from collections),'{}'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.get_transaction_page(integer,timestamptz,uuid,date,date,uuid,uuid,text),public.get_ledger_summary(date,date) from public,anon;
grant execute on function public.get_transaction_page(integer,timestamptz,uuid,date,date,uuid,uuid,text),public.get_ledger_summary(date,date) to authenticated;
create index if not exists transactions_tenant_cursor_idx on transactions(somiti_id,created_at desc,id desc);
create index if not exists transactions_member_cursor_idx on transactions(somiti_id,member_id,created_at desc,id desc);
create index if not exists transactions_project_cursor_idx on transactions(somiti_id,project_id,created_at desc,id desc);
do $$ begin
  if to_regclass('public.amanot_schema_versions') is not null then insert into public.amanot_schema_versions(version) values('014') on conflict do nothing; end if;
end $$;
notify pgrst,'reload schema';
commit;
