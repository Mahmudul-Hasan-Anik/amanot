-- One-time import for version 1 SomitiPro JSON backups.  It deliberately
-- accepts imports only into a newly bootstrapped society, so no live ledger can
-- be merged or overwritten accidentally.
begin;
-- The hosted RPC owner normally has no CREATE privilege.  Temporarily grant it
-- while transferring ownership of this migration's function.
do $$ begin
  if not has_schema_privilege('amanot_rpc','public','CREATE') then
    grant create on schema public to amanot_rpc;
    perform set_config('amanot.legacy_import_restore_create','true',true);
  end if;
end $$;

create or replace function public.import_legacy_backup(p_backup jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r jsonb; s jsonb; i jsonb; v_somiti uuid:=public.current_somiti_id();
  v_member uuid; v_project uuid; v_source text; v_phone text; v_member_number text; v_category text; v_placeholder int; v_principal numeric; v_profit numeric;
  v_members int:=0; v_savings int:=0; v_investments int:=0; v_total_savings numeric:=0;
  v_created date; v_months int; v_name text; v_org jsonb;
begin
  perform public.require_admin();
  if p_backup is null or p_backup->>'version'<>'1'
    or jsonb_typeof(p_backup->'members')<>'array' or jsonb_typeof(p_backup->'savings')<>'array' then
    raise exception 'সমর্থিত SomitiPro ব্যাকআপ ফাইল নয়';
  end if;
  if jsonb_array_length(p_backup->'members')>1000 or jsonb_array_length(p_backup->'savings')>20000
    or (p_backup ? 'investments' and jsonb_typeof(p_backup->'investments')<>'array')
    or coalesce(jsonb_array_length(p_backup->'investments'),0)>1000 then
    raise exception 'ব্যাকআপের আকার সঠিক নয়';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_somiti::text||':legacy-import',0));
  if (select count(*) from public.members where somiti_id=v_somiti and deleted_at is null)>1
    or exists(select 1 from public.transactions where somiti_id=v_somiti)
    or exists(select 1 from public.projects where somiti_id=v_somiti) then
    raise exception 'শুধু নতুন, খালি সমিতিতে ব্যাকআপ ইমপোর্ট করা যাবে';
  end if;

  create temporary table legacy_member_map(source_id text primary key, member_id uuid not null) on commit drop;
  for r in select value from jsonb_array_elements(p_backup->'members') loop
    v_source:=nullif(trim(r->>'id'),''); v_name:=nullif(trim(r->>'name'),'');
    if v_source is null or v_name is null then raise exception 'সদস্যের নাম বা আইডি নেই'; end if;
    -- SomitiPro exports sometimes use 00/01 or repeated numbers as a
    -- placeholder. The phone_norm index keeps digits only, so text placeholders
    -- would all collide. Give these rows a unique internal 0199… number.
    v_phone:=public.norm_phone(r->>'whatsappNumber');
    if v_phone !~ '^01[3-9][0-9]{8}$' or exists(select 1 from public.members where phone_norm=v_phone and deleted_at is null) then
      v_placeholder:=90000000+v_members+1;
      loop
        v_phone:='019'||lpad(v_placeholder::text,8,'0');
        exit when not exists(select 1 from public.members where phone_norm=v_phone and deleted_at is null);
        v_placeholder:=v_placeholder+1;
      end loop;
    end if;
    v_member_number:=regexp_replace(coalesce(r->>'memberIdNumber',''),'[^0-9]','','g');
    if v_member_number='' then v_member_number:=(900000+v_members+1)::text; end if;
    v_category:=case when r->>'role'='D' then 'director' else 'general' end;
    v_member:=gen_random_uuid();
    insert into public.members(id,somiti_id,code,name,phone,whatsapp,nid,address,nominee_name,nominee_phone,join_date,status,role_title,app_role,member_category,member_number,father_name,created_at)
    values(v_member,v_somiti,'LEG-'||v_member_number,v_name,v_phone,
      case when v_phone=public.norm_phone(r->>'whatsappNumber') then v_phone else null end,
      coalesce(r->>'nidNumber',''),coalesce(r->>'address',''),coalesce(r->>'nomineeName',''),coalesce(r->>'nomineePhone',''),
      case when coalesce(r->>'joiningDate','') ~ '^\\d{4}-\\d{2}-(0[1-9]|[12][0-9]|3[01])$' then (r->>'joiningDate')::date else current_date end,
      'paid',case when r->>'role'='D' then 'পরিচালক' else 'সাধারণ সদস্য' end,'member',v_category,v_member_number,coalesce(r->>'fatherName',''),coalesce(nullif(r->>'createdAt','')::timestamptz,now()));
    insert into legacy_member_map values(v_source,v_member); v_members:=v_members+1;
  end loop;

  for s in select value from jsonb_array_elements(p_backup->'savings') loop
    select member_id into v_member from legacy_member_map where source_id=s->>'memberId';
    if v_member is null then raise exception 'সঞ্চয়ের সদস্য পাওয়া যায়নি'; end if;
    if coalesce((s->>'amount')::numeric,0)<=0 or (s->>'amount')::numeric>999999999999.99 then raise exception 'সঞ্চয়ের পরিমাণ সঠিক নয়'; end if;
    insert into public.transactions(id,somiti_id,receipt_no,member_id,party_name,party_code,date,amount,type,payment_method,note,months,created_at)
    select gen_random_uuid(),v_somiti,'LEG-S-'||substr(md5(coalesce(s->>'id',s::text)),1,20),m.id,m.name,m.code,
      coalesce(nullif(s->>'paymentDate','')::date,current_date),(s->>'amount')::numeric,'deposit','cash',
      coalesce(nullif(s->>'receiverName',''),'পুরোনো সঞ্চয় ইমপোর্ট'),case when s->>'month' ~ '^\\d{4}-\\d{2}$' then array[s->>'month'] else array[]::text[] end,
      coalesce(nullif(s->>'createdAt','')::timestamptz,now()) from public.members m where m.id=v_member;
    update public.members set total_deposit=total_deposit+(s->>'amount')::numeric,updated_at=now() where id=v_member;
    v_total_savings:=v_total_savings+(s->>'amount')::numeric; v_savings:=v_savings+1;
  end loop;
  update public.cash_accounts set amount=amount+v_total_savings,updated_at=now() where somiti_id=v_somiti and id='ca2';

  for i in select value from jsonb_array_elements(coalesce(p_backup->'investments','[]'::jsonb)) loop
    v_principal:=coalesce((i->>'totalAmount')::numeric,0)-coalesce((i->>'profitAmount')::numeric,0);
    v_profit:=coalesce((i->>'profitAmount')::numeric,0); v_months:=greatest(1,least(120,coalesce((i->>'tenureMonths')::int,1)));
    if v_principal<=0 or v_profit<0 then continue; end if;
    v_created:=coalesce(nullif(i->>'createdAt','')::timestamptz::date,current_date);
    v_member:=null; select member_id into v_member from legacy_member_map where source_id=i->>'memberId';
    v_name:=coalesce(nullif(trim(i->>'investorName'),''),'পুরোনো বিনিয়োগ');
    insert into public.projects(id,somiti_id,name,type,location,status,invested_amount,remaining_amount,start_date,expected_end,created_at)
    values(gen_random_uuid(),v_somiti,v_name,'বিনিয়োগ',coalesce(i->>'permanentAddress',''),'ongoing',v_principal,v_principal,v_created::text,(v_created+make_interval(months=>v_months))::date::text,coalesce(nullif(i->>'createdAt','')::timestamptz,now())) returning id into v_project;
    insert into public.investment_contracts(id,somiti_id,member_id,contract_no,recipient_name,phone,address,nid,father_name,emergency_contacts,principal,profit_pct,profit_amount,term_months,disbursed_date,first_due_date,payment_method,request_payload,created_at)
    values(v_project,v_somiti,v_member,'LEG-I-'||substr(md5(coalesce(i->>'id',i::text)),1,16),v_name,'',coalesce(i->>'permanentAddress',''),coalesce(i->>'nidNumber',''),coalesce(i->>'parentNames',''),coalesce(i->'emergencyContacts','[]'::jsonb),v_principal,round(v_profit*100/v_principal,4),v_profit,v_months,v_created,v_created,'cash',i||jsonb_build_object('legacySchedulePending',true),coalesce(nullif(i->>'createdAt','')::timestamptz,now()));
    v_investments:=v_investments+1;
  end loop;
  v_org:=coalesce(p_backup->'organization','{}'::jsonb);
  update public.somiti_settings set info=info||jsonb_build_object('name',coalesce(nullif(v_org->>'orgName',''),info->>'name'),'brandPrimaryColor',v_org->>'brandPrimaryColor','directorNames',coalesce(v_org->'directorNames','[]'::jsonb),'directorSharePercent',coalesce(v_org->'directorSharePercent','20')) where somiti_id=v_somiti and id=1;
  perform public.write_audit('legacy_backup_imported',jsonb_build_object('members',v_members,'savings',v_savings,'investments',v_investments,'source_organization',v_org->>'orgName'));
  return jsonb_build_object('members',v_members,'savings',v_savings,'investments',v_investments);
end $$;
alter function public.import_legacy_backup(jsonb) owner to amanot_rpc;
revoke all on function public.import_legacy_backup(jsonb) from public,anon;
grant execute on function public.import_legacy_backup(jsonb) to authenticated;
do $$ begin
  if current_setting('amanot.legacy_import_restore_create',true)='true' then
    revoke create on schema public from amanot_rpc;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
