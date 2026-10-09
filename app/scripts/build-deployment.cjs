// Creates the reviewed upgrade bundle for a database already at migration 003.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const tables=['approvals','audit_logs','cash_accounts','expenses','members','notices','profiles','profit_distributions','profit_shares','projects','somiti_settings','transactions'];
const backup='amanot_backup_20261009';
let sql=`-- Upgrade 003 to 007. Backups stay in a private, non-API schema.\nbegin;\ncreate schema if not exists ${backup};\nrevoke all on schema ${backup} from public,anon,authenticated;\n`;
for(const table of tables) sql+=`create table if not exists ${backup}.${table} as table public.${table};\nalter table ${backup}.${table} enable row level security;\nrevoke all on ${backup}.${table} from public,anon,authenticated;\n`;
sql+=`create table if not exists ${backup}.function_definitions as select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f';\nalter table ${backup}.function_definitions enable row level security;\nrevoke all on ${backup}.function_definitions from public,anon,authenticated;\n`;
for(const name of ['004_auto_approval_sms.sql','005_accounting_integrity.sql','006_member_documents.sql','007_asset_balances_roles.sql']) {
 sql+=`\n-- ${name}\n`+fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8').replace(/^\s*(begin|commit);\s*$/gmi,'');
}
sql+=`\ncreate table if not exists public.amanot_schema_versions(version text primary key,applied_at timestamptz not null default now());\nalter table public.amanot_schema_versions enable row level security;\nrevoke all on public.amanot_schema_versions from public,anon,authenticated;\ninsert into public.amanot_schema_versions(version) values('004'),('005'),('006'),('007') on conflict do nothing;\ncommit;\nselect version,applied_at from public.amanot_schema_versions order by version;\n`;
fs.writeFileSync(path.join(root,'supabase/deploy_004_007.sql'),sql);
console.log('Prepared supabase/deploy_004_007.sql with private backups and an atomic upgrade.');
