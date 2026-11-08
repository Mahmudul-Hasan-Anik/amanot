// Builds one guarded SQL file for the SQL editor (024 digital khata + 025 cash count).
// Never connects to a database. The guard rolls everything back if any existing
// balance, ledger row, savings or distribution changes.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const fp=`select jsonb_build_object(
 'members',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from public.members),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from public.projects p),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from public.cash_accounts c),
 'ledger',(select md5(coalesce(string_agg((to_jsonb(t)-'reverses_transaction_id')::text,',' order by id),'')) from public.transactions t),
 'distributions',(select md5(coalesce(string_agg(jsonb_build_array(d.somiti_id,d.year,d.net_profit,d.distributed)::text,',' order by d.somiti_id,d.year),'')) from public.profit_distributions d)
)`;
const body=f=>fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8').replace(/^\s*begin;\s*$/m,'').replace(/^\s*commit;\s*$/m,'');
const out=`-- Amanot backend update: digital khata (024) + day-close cash count (025).
-- Paste the whole file into Supabase > SQL Editor and Run. One transaction:
-- if anything fails, or any existing money/ledger data changes, nothing is applied.
begin;
select set_config('amanot.khata_guard',(${fp})::text,true);
${body('20261026120000_digital_khata.sql')}
${body('20261027120000_cash_count.sql')}
do $$ declare actual jsonb; begin
 ${fp} into actual;
 if actual is distinct from current_setting('amanot.khata_guard')::jsonb then raise exception 'Existing financial data changed; update rolled back'; end if;
end $$;
select public.app_build_version() as backend_version,true as existing_money_unchanged;
commit;
`;
fs.writeFileSync(path.join(root,'supabase/deploy_khata_update.sql'),out);
console.log('Wrote supabase/deploy_khata_update.sql (no database connection).');
