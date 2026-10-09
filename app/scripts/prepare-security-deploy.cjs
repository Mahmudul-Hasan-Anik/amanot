// Produces a transactional deployment with an owner-only rollback snapshot.
// No credentials or member records leave the database.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const strip=s=>s.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'');
const sql=`begin;
create schema if not exists amanot_backup_security_20261009;
revoke all on schema amanot_backup_security_20261009 from public,anon,authenticated;
do $backup$ declare t text; begin
  foreach t in array array['members','profiles','somiti_settings','projects','cash_accounts','transactions','expenses','approvals','notices','audit_logs'] loop
    if to_regclass('amanot_backup_security_20261009.'||t) is null then
      execute format('create table amanot_backup_security_20261009.%I as table public.%I',t,t);
    end if;
    execute format('alter table amanot_backup_security_20261009.%I enable row level security',t);
  end loop;
end $backup$;
create table if not exists amanot_backup_security_20261009.functions as
select p.oid::regprocedure::text as signature,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f';
alter table amanot_backup_security_20261009.functions enable row level security;
revoke all on all tables in schema amanot_backup_security_20261009 from public,anon,authenticated;
${['009_pin_security.sql','010_sync_revision.sql'].map(f=>strip(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'))).join('\n')}
commit;
select '009 + 010 installed' as deployment,
  (select jsonb_agg(to_jsonb(t) order by id) from public.transactions t) is not distinct from
  (select jsonb_agg(to_jsonb(t) order by id) from amanot_backup_security_20261009.transactions t) as ledger_unchanged,
  not has_schema_privilege('anon','amanot_backup_security_20261009','usage') and
  not has_schema_privilege('authenticated','amanot_backup_security_20261009','usage') as rollback_private,
  to_regclass('auth.sessions') is not null as auth_sessions_present,
  public.valid_new_pin('572849') and not public.valid_new_pin('123456') as pin_policy_ready,
  exists(select 1 from storage.buckets where id='member-documents' and not public and file_size_limit=122880) as photos_private_120k;
`;
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/security-deploy.sql'),sql);
console.log('Generated transactional security deployment (SQL only; no user data).');
