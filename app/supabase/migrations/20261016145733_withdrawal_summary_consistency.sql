-- Withdrawal cash flow affects fund growth, not operating expense or profit.
begin;
do $$ begin if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc;perform set_config('amanot.withdraw_summary_restore_create','true',true);end if;end $$;
create index if not exists withdrawal_paid_transaction_idx on public.withdrawal_requests(somiti_id,paid_transaction_id) where paid_transaction_id is not null;
create index if not exists withdrawal_reversal_transaction_idx on public.withdrawal_requests(somiti_id,reversal_transaction_id) where reversal_transaction_id is not null;
do $$ declare d text;begin
 d:=pg_get_functiondef('public.get_somiti_summary()'::regprocedure);
 if position('monthlyWithdrawals' in d)=0 then
  if position('v_prev_fund' in d)=0 or position('r := jsonb_build_object(' in d)=0 then raise exception 'Unexpected summary source';end if;
  d:=replace(d,'r := jsonb_build_object(',
  'v_prev_fund := v_prev_fund + (select coalesce(sum(case type when ''withdrawal'' then amount when ''withdrawal_reversal'' then -amount else 0 end),0) from transactions where date>=m_start and date<investment_business_date()+1);
  r := jsonb_build_object(''monthlyWithdrawals'',(select coalesce(sum(case type when ''withdrawal'' then amount when ''withdrawal_reversal'' then -amount else 0 end),0) from transactions where date>=m_start and date<investment_business_date()+1),');
  execute d;
 end if;
end $$;
do $$ begin if current_setting('amanot.withdraw_summary_restore_create',true)='true' then revoke create on schema public from amanot_rpc;end if;end $$;
notify pgrst,'reload schema';
commit;
