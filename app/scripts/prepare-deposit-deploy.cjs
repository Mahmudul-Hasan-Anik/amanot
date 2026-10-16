// Prepare only: preserves recorded financial data while applying missing rules.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const snapshot=`select jsonb_build_object(
 'savings',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from members),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from cash_accounts c),
 'ledger',(select md5(coalesce(string_agg(to_jsonb(t)::text,',' order by id),'')) from transactions t),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from projects p),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from profit_distributions d)
)`;
const body=['018_voluntary_deposits.sql','019_deposit_date_and_comment.sql'].map(file=>
 fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8').replace(/\bbegin;/,'').replace(/\bcommit;/,'')
).join('\n');
const sql=`begin;
select set_config('amanot.deposit_financial_guard',(${snapshot})::text,true);
-- Existing RPCs retain their restricted owner; CREATE is restored before commit.
do $$ begin
 if not has_schema_privilege('amanot_rpc','public','CREATE') then
  grant create on schema public to amanot_rpc;
  perform set_config('amanot.deposit_restore_create','true',true);
 end if;
end $$;
${body}
do $$ declare actual jsonb; begin
 ${snapshot} into actual;
 if actual is distinct from current_setting('amanot.deposit_financial_guard')::jsonb then
  raise exception 'Recorded financial data changed; deployment rolled back';
 end if;
 if current_setting('amanot.deposit_restore_create',true)='true' then revoke create on schema public from amanot_rpc; end if;
end $$;
notify pgrst,'reload schema';
select true as voluntary_deposits_ready,true as member_creation_ready,true as recorded_finances_preserved;
commit;
`;
fs.writeFileSync(path.join(root,'supabase/deploy_018_019_deposits.sql'),sql);
console.log('Prepared guarded deposit deployment; no live connection made.');
