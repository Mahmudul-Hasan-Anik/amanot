// Generates a reviewable SQL artifact only; never connects to production.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const fingerprint=`select jsonb_build_object(
 'members',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from public.members),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from public.projects p),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from public.cash_accounts c),
 'ledger',(select md5(coalesce(string_agg((to_jsonb(t)-'principal_part'-'profit_part'-'investment_reversal')::text,',' order by id),'')) from public.transactions t),
 'expenses',(select md5(coalesce(string_agg((to_jsonb(e)-'project_id')::text,',' order by id),'')) from public.expenses e),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from public.profit_distributions d)
)`;
const prefix=`select set_config('amanot.m020_financial_guard',(${fingerprint})::text,true);`;
const suffix=`do $$ declare actual jsonb; begin
 ${fingerprint} into actual;
 if actual is distinct from current_setting('amanot.m020_financial_guard')::jsonb then raise exception 'Existing financial data changed; migration rolled back'; end if;
end $$;
select true as investment_schema_ready,true as existing_ledger_preserved,true as cash_balances_preserved,true as member_savings_preserved,true as previous_distributions_preserved;
commit;`;
const version=process.argv.includes('--withdrawals')?'023':process.argv.includes('--feedback')?'022':process.argv.includes('--workflow')?'021':'020';
const source=fs.readFileSync(path.join(root,'supabase/migrations/'+(version==='023'?'20261016092904_member_withdrawals.sql':version==='022'?'022_feedback_consistency.sql':version==='021'?'021_investment_workflow.sql':'020_investment_contracts.sql')),'utf8');
const deployment=source.replace('begin;',()=>`begin;\n${prefix}`).replace('commit;',()=>suffix);
fs.writeFileSync(path.join(root,'supabase/deploy_'+version+(version==='023'?'_withdrawals.sql':'_investments.sql')),deployment);
console.log('Prepared guarded investment migration; no database connection was made.');
