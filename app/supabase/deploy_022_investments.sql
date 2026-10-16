-- Cross-screen consistency; no existing financial records are rewritten.
begin;
select set_config('amanot.m020_financial_guard',(select jsonb_build_object(
 'members',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from public.members),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from public.projects p),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from public.cash_accounts c),
 'ledger',(select md5(coalesce(string_agg((to_jsonb(t)-'principal_part'-'profit_part'-'investment_reversal')::text,',' order by id),'')) from public.transactions t),
 'expenses',(select md5(coalesce(string_agg((to_jsonb(e)-'project_id')::text,',' order by id),'')) from public.expenses e),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from public.profit_distributions d)
))::text,true);
do $$ begin
 if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc;perform set_config('amanot.m022_restore_create','true',true);end if;
end $$;
do $$ declare d text; begin
 d:=pg_get_functiondef('public.get_somiti_summary()'::regprocedure);
 d:=replace(d,'coalesce(sum(amount) filter (where type in (''deposit'',''profit'')),0)',
 'coalesce(sum(amount) filter (where type = ''deposit''),0) + public.project_profit_between(m_start,investment_business_date()+1)');
 if position('backendVersion' in d)=0 then d:=replace(d,'r := jsonb_build_object(','r := jsonb_build_object(''backendVersion'',22,');end if;
 execute d;
 d:=pg_get_functiondef('public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date)'::regprocedure);
 if position('require_open_investment_date' in d)=0 then
 d:=replace(d,'  -- Voluntary contributions:',
 '  perform require_open_investment_date(coalesce(p_date,investment_business_date()));
  -- Voluntary contributions:');
 d:=replace(d,'coalesce(p_date, current_date)','coalesce(p_date, investment_business_date())');execute d;
 end if;
end $$;

alter table investment_proposals drop constraint if exists investment_proposals_status_check;
alter table investment_proposals add constraint investment_proposals_status_check check(status in ('submitted','approved','rejected','withdrawn','disbursed'));
create or replace function public.withdraw_investment_proposal(p_id uuid,p_note text)
returns investment_proposals language plpgsql security definer set search_path=public as $$
declare r investment_proposals%rowtype;begin
 perform require_admin();
 if coalesce(trim(p_note),'')='' then raise exception 'প্রত্যাহারের কারণ দিন / Enter a withdrawal reason';end if;
 select * into r from investment_proposals where id=p_id for update;
 if r.id is null then raise exception 'Proposal unavailable';end if;
 if r.status='withdrawn' then return r;end if;
 if r.status not in ('submitted','approved') then raise exception 'Only unposted proposals can be withdrawn';end if;
 update investment_proposals set status='withdrawn',decided_by=rpc_caller_id(),approved_at=now(),decision_note=trim(p_note) where id=p_id returning * into r;
 perform write_audit('investment_withdrawn',jsonb_build_object('investment_id',p_id,'reason',trim(p_note)));return r;
end $$;
alter function withdraw_investment_proposal(uuid,text) owner to amanot_rpc;
revoke all on function withdraw_investment_proposal(uuid,text) from public,anon;
grant execute on function withdraw_investment_proposal(uuid,text) to authenticated;

-- Explicit, one-time legacy mapping: caller supplies the number; never guess it.
create or replace function public.map_legacy_member_identity(p_id uuid,p_category text,p_number text)
returns void language plpgsql security definer set search_path=public as $$
declare m members%rowtype; caller uuid; tenant uuid;begin
 perform require_admin();caller:=rpc_caller_id();tenant:=current_somiti_id();
 perform member_display_code(p_category,p_number);
 select * into m from members where id=p_id and somiti_id=tenant and deleted_at is null for update;
 if m.id is null then raise exception 'Member unavailable';end if;
 if m.member_number is not null then
 if m.member_number=p_number and m.member_category=p_category then return;end if;
 raise exception 'Member number is permanent';end if;
 update members set member_category=p_category,member_number=p_number,updated_at=now() where id=p_id and somiti_id=tenant;
 perform write_audit('legacy_identity_mapped',jsonb_build_object('member_id',p_id,'previous_code',m.code,'number',p_number,'category',p_category,'actor',caller));
end $$;
-- The identity trigger permits conversion only under postgres. This narrow RPC
-- checks active admin/PIN/tenant before accessing a row and cannot change money.
alter function map_legacy_member_identity(uuid,text,text) owner to postgres;
revoke all on function map_legacy_member_identity(uuid,text,text) from public,anon;
grant execute on function map_legacy_member_identity(uuid,text,text) to authenticated;

-- New registrations must supply an explicit membership identity for the owner.
do $$ declare d text;begin
 d:=pg_get_functiondef('public.handle_auth_user_before_insert()'::regprocedure);
 if position('member_category' in d)=0 then
 d:=replace(d,'    if not public.valid_new_pin(pin)',
 '    perform public.member_display_code(meta->>''member_category'',meta->>''member_number'');
    if not public.valid_new_pin(pin)');execute d;end if;
 d:=pg_get_functiondef('public.handle_auth_user_after_insert()'::regprocedure);
 if position('member_category,member_number,code' in d)=0 then
 d:=replace(d,'insert into members(somiti_id,code,name,','insert into members(somiti_id,member_category,member_number,code,name,');
 d:=replace(d,'values(society,''SM-001'',','values(society,meta->>''member_category'',meta->>''member_number'',public.member_display_code(meta->>''member_category'',meta->>''member_number''),');
 if position('member_category,member_number,code' in d)=0 then raise exception 'Registration patch failed';end if;execute d;end if;
end $$;

create or replace function public.app_build_version() returns integer language sql immutable as $$select 22$$;
revoke all on function app_build_version() from public;
grant execute on function app_build_version() to anon,authenticated;
create or replace function public.app_capabilities() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not session_ready() then raise exception 'Login required' using errcode='42501';end if;
 return jsonb_build_object('version',22,'voluntaryDeposits',exists(select 1 from somiti_settings where info->>'depositMode'='voluntary'),
 'memberIdentity',true,'investmentWorkflow',true,'proposalWithdrawal',true,'depositDateGuard',true);
end $$;
alter function app_capabilities() owner to amanot_rpc;
revoke all on function app_capabilities() from public,anon;
grant execute on function app_capabilities() to authenticated;
do $$ begin if current_setting('amanot.m022_restore_create',true)='true' then revoke create on schema public from amanot_rpc;end if;end $$;
notify pgrst,'reload schema';
do $$ declare actual jsonb; begin
 select jsonb_build_object(
 'members',(select md5(coalesce(string_agg(jsonb_build_array(id,total_deposit,profit_balance,partial_credit)::text,',' order by id),'')) from public.members),
 'projects',(select md5(coalesce(string_agg(to_jsonb(p)::text,',' order by id),'')) from public.projects p),
 'cash',(select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by somiti_id,id),'')) from public.cash_accounts c),
 'ledger',(select md5(coalesce(string_agg((to_jsonb(t)-'principal_part'-'profit_part'-'investment_reversal')::text,',' order by id),'')) from public.transactions t),
 'expenses',(select md5(coalesce(string_agg((to_jsonb(e)-'project_id')::text,',' order by id),'')) from public.expenses e),
 'distributions',(select md5(coalesce(string_agg(to_jsonb(d)::text,',' order by somiti_id,year),'')) from public.profit_distributions d)
) into actual;
 if actual is distinct from current_setting('amanot.m020_financial_guard')::jsonb then raise exception 'Existing financial data changed; migration rolled back'; end if;
end $$;
select true as investment_schema_ready,true as existing_ledger_preserved,true as cash_balances_preserved,true as member_savings_preserved,true as previous_distributions_preserved;
commit;
