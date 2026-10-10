begin;
-- Hosted postgres cannot necessarily grant USAGE on the platform-owned auth
-- schema. Keep the business role outside auth; expose only the request UID
-- through a narrowly scoped helper owned by the existing platform-aware role.
create or replace function public.rpc_caller_id()
returns uuid language sql stable security definer set search_path=pg_catalog as $$
  select auth.uid();
$$;
alter function public.rpc_caller_id() owner to postgres;
revoke all on function public.rpc_caller_id() from public,anon,authenticated;
grant execute on function public.rpc_caller_id() to amanot_rpc;

-- Preserve business RPC ownership, signatures, ACLs and tenant RLS. No Auth
-- table/schema privileges or bypass-RLS permissions are added to amanot_rpc.
do $$ declare f record; definition text; begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    join pg_roles r on r.oid=p.proowner
    where n.nspname='public' and r.rolname='amanot_rpc' and p.prokind='f'
      and p.proname in ('approve_request','auto_approve_eligible',
        'get_somiti_summary','log_sms','reject_request')
  loop
    definition:=pg_get_functiondef(f.oid);
    if position('auth.uid()' in definition)>0 then
      execute replace(definition,'auth.uid()','public.rpc_caller_id()');
    end if;
  end loop;
end $$;
do $$ begin
  if to_regclass('public.amanot_schema_versions') is not null then
    insert into public.amanot_schema_versions(version) values('015') on conflict do nothing;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
