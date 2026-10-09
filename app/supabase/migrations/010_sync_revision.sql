begin;
create table if not exists public.sync_clock(id integer primary key check(id=1),revision bigint not null default 1);
insert into public.sync_clock(id) values(1) on conflict do nothing;
alter table public.sync_clock enable row level security;
revoke all on public.sync_clock from public,anon,authenticated;

create or replace function public.bump_sync_revision()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  -- Dues refreshes touch updated_at even when no business value changed.
  if tg_table_schema='storage' then
    if coalesce(new.bucket_id,old.bucket_id)<>'member-documents' then return null; end if;
  end if;
  if tg_op='UPDATE' and (to_jsonb(new)-'updated_at')=(to_jsonb(old)-'updated_at') then return new; end if;
  update sync_clock set revision=revision+1 where id=1;
  return null;
end; $$;
revoke all on function public.bump_sync_revision() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['members','profiles','somiti_settings','projects','cash_accounts','transactions','expenses','approvals','notices','audit_logs'] loop
    execute format('drop trigger if exists amanot_sync_changed on public.%I',t);
    execute format('create trigger amanot_sync_changed after insert or update or delete on public.%I for each row execute function public.bump_sync_revision()',t);
  end loop;
end; $$;
drop trigger if exists amanot_sync_changed on storage.objects;
create trigger amanot_sync_changed after insert or update or delete on storage.objects
for each row execute function public.bump_sync_revision();
create or replace function public.get_sync_revision()
returns text language plpgsql stable security definer set search_path=public as $$
begin
  if not public.session_ready() then raise exception 'আবার লগইন করুন অথবা পিন পরিবর্তন করুন' using errcode='42501'; end if;
  return (select current_date::text||':'||revision::text from sync_clock where id=1);
end; $$;
revoke all on function public.get_sync_revision() from public,anon;
grant execute on function public.get_sync_revision() to authenticated;

-- Evaluate stable session/role helpers once per SELECT, rather than once for
-- each ledger/member row. The permissions are unchanged.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select public.is_staff()));
drop policy if exists tx_read on public.transactions;
create policy tx_read on public.transactions for select to authenticated using((select public.is_staff()) or member_id=(select public.my_member_id()));
drop policy if exists settings_read on public.somiti_settings;
create policy settings_read on public.somiti_settings for select to authenticated using((select public.session_ready()));
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using((select public.session_ready()));
drop policy if exists cash_read on public.cash_accounts;
create policy cash_read on public.cash_accounts for select to authenticated using((select public.is_staff()));
drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select to authenticated using((select public.is_staff()));
drop policy if exists approvals_read on public.approvals;
create policy approvals_read on public.approvals for select to authenticated using((select public.is_staff()));
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated using((select public.is_admin()));
drop policy if exists member_documents_read on storage.objects;
create policy member_documents_read on storage.objects for select to authenticated
using(bucket_id='member-documents' and public.is_member_avatar_path(name)
  and ((select public.is_staff()) or (storage.foldername(name))[1]=(select public.my_member_id())::text));
do $$ begin
  if to_regclass('public.amanot_schema_versions') is not null then insert into public.amanot_schema_versions(version) values('010') on conflict do nothing; end if;
end; $$;
commit;
