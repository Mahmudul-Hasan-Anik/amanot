-- One phone/account belongs to one society. Every bootstrap creates its own
-- society; existing records are preserved together as the legacy society.
begin;
create table public.somitis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  legacy boolean not null default false
);
insert into public.somitis(legacy) values(true);
alter table public.somitis enable row level security;
revoke all on public.somitis from public,anon,authenticated;
-- Backfill ownership metadata without changing ledger amounts. Disable only
-- the immutable-ledger trigger, within this atomic migration; restore it before
-- any permissions change. A failure rolls the trigger state back as well.
alter table public.transactions disable trigger trg_prevent_transaction_update_delete;

do $$ declare t text; legacy_id uuid; begin
  select id into legacy_id from public.somitis where legacy;
  foreach t in array array['profiles','members','somiti_settings','cash_accounts','projects','transactions','expenses','approvals','audit_logs','notices','profit_distributions','profit_shares','sms_logs','sync_clock'] loop
    execute format('alter table public.%I add column somiti_id uuid references public.somitis(id)',t);
    execute format('update public.%I set somiti_id=$1',t) using legacy_id;
    execute format('alter table public.%I alter column somiti_id set not null',t);
    execute format('create index %I on public.%I(somiti_id)',t||'_somiti_idx',t);
  end loop;
end $$;
alter table public.transactions enable trigger trg_prevent_transaction_update_delete;

create or replace function public.current_somiti_id()
returns uuid language sql stable security definer set search_path=public as $$
  select somiti_id from public.profiles where id=auth.uid() and is_active;
$$;
revoke all on function public.current_somiti_id() from public,anon;
grant execute on function public.current_somiti_id() to authenticated;
grant select(somiti_id) on public.members to authenticated;

do $$ declare t text; begin
  foreach t in array array['profiles','members','somiti_settings','cash_accounts','projects','transactions','expenses','approvals','audit_logs','notices','profit_distributions','profit_shares','sms_logs','sync_clock'] loop
    execute format('alter table public.%I alter column somiti_id set default public.current_somiti_id()',t);
  end loop;
end $$;

-- Local IDs repeat between societies; global UUIDs and phone uniqueness remain.
alter table public.profit_shares drop constraint profit_shares_year_fkey;
alter table public.profit_distributions drop constraint profit_distributions_pkey;
alter table public.profit_distributions add primary key(somiti_id,year);
alter table public.profit_shares add foreign key(somiti_id,year) references public.profit_distributions(somiti_id,year) on delete cascade;
alter table public.somiti_settings drop constraint somiti_settings_pkey;
alter table public.somiti_settings add primary key(somiti_id,id);
alter table public.cash_accounts drop constraint cash_accounts_pkey;
alter table public.cash_accounts add primary key(somiti_id,id);
alter table public.sync_clock drop constraint sync_clock_pkey;
alter table public.sync_clock add primary key(somiti_id,id);
drop index public.members_code_uq;
create unique index members_code_uq on public.members(somiti_id,code) where deleted_at is null;

-- Composite FKs stop a caller attaching another society's UUID to its own row.
alter table public.members add unique(somiti_id,id);
alter table public.projects add unique(somiti_id,id);
alter table public.transactions add unique(somiti_id,id);
alter table public.expenses add unique(somiti_id,id);
alter table public.profiles add foreign key(somiti_id,member_id) references public.members(somiti_id,id);
alter table public.transactions add foreign key(somiti_id,member_id) references public.members(somiti_id,id);
alter table public.transactions add foreign key(somiti_id,project_id) references public.projects(somiti_id,id);
alter table public.expenses add foreign key(somiti_id,transaction_id) references public.transactions(somiti_id,id);
alter table public.approvals add foreign key(somiti_id,expense_id) references public.expenses(somiti_id,id);
alter table public.approvals add foreign key(somiti_id,project_id) references public.projects(somiti_id,id);
alter table public.profit_shares add foreign key(somiti_id,member_id) references public.members(somiti_id,id);
alter table public.sms_logs add foreign key(somiti_id,member_id) references public.members(somiti_id,id);

-- Business RPCs must not bypass RLS by running as the table owner. This role
-- cannot log in, own tables, inherit other roles, or bypass row security.
create role amanot_rpc nologin noinherit nobypassrls;
grant amanot_rpc to postgres;
grant usage,create on schema public to amanot_rpc;
grant usage on schema auth,extensions to amanot_rpc;
grant execute on all functions in schema public to amanot_rpc;
grant execute on function auth.uid(),auth.jwt() to amanot_rpc;
grant execute on all functions in schema extensions to amanot_rpc;
grant usage,select on all sequences in schema public to amanot_rpc;

-- Phone ownership is global under the agreed one-phone/one-society rule.
-- Return only a boolean; never disclose another society or member's details.
create function public.member_phone_in_use(p_phone text,p_except uuid default null)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from members where phone_norm=public.norm_phone(p_phone)
    and (p_except is null or id<>p_except) and deleted_at is null);
$$;
revoke all on function public.member_phone_in_use(text,uuid) from public,anon,authenticated;
grant execute on function public.member_phone_in_use(text,uuid) to amanot_rpc;

do $$ declare t text; begin
  foreach t in array array['profiles','members','somiti_settings','cash_accounts','projects','transactions','expenses','approvals','audit_logs','notices','profit_distributions','profit_shares','sms_logs','sync_clock'] loop
    execute format('grant select,insert,update,delete on public.%I to amanot_rpc',t);
    execute format('create policy tenant_boundary on public.%I as restrictive for all to authenticated,amanot_rpc using(somiti_id=(select public.current_somiti_id())) with check(somiti_id=(select public.current_somiti_id()))',t);
    execute format('create policy rpc_access on public.%I for all to amanot_rpc using(true) with check(true)',t);
  end loop;
end $$;
create policy society_read on public.somitis for select to authenticated using(id=(select public.current_somiti_id()));
grant select on public.somitis to authenticated;

-- Preserve audited business logic/signatures and existing client execute grants.
-- Only the two singleton upserts need composite conflict targets.
do $$ declare f record; definition text; begin
  for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'write_audit','get_somiti_summary','next_receipt','account_for','add_member','update_member',
      'delete_member','set_member_app_role','record_deposit','post_expense','add_expense',
      'approve_request','reject_request','upsert_project','record_project_return',
      'transfer_cash','upsert_cash_account','update_somiti_info','accrue_monthly_dues',
      'refresh_member_dues','refresh_dues','add_notice','delete_notice','profit_preview',
      'distribute_profit','log_sms','auto_approve_eligible','project_profit_between',
      'set_member_documents']) loop
    if f.proname in ('upsert_cash_account','update_somiti_info','add_member','update_member') then
      definition:=pg_get_functiondef(f.oid);
      definition:=replace(definition,'on conflict (id)','on conflict (somiti_id,id)');
      definition:=replace(definition,
        'exists (select 1 from members where phone_norm = public.norm_phone(p->>''phone'') and deleted_at is null)',
        'public.member_phone_in_use(p->>''phone'')');
      definition:=replace(definition,
        'exists (select 1 from members where phone_norm = public.norm_phone(p->>''phone'') and id <> p_id and deleted_at is null)',
        'public.member_phone_in_use(p->>''phone'',p_id)');
      execute definition;
    end if;
    execute format('alter function %s owner to amanot_rpc',f.oid::regprocedure);
  end loop;
end $$;
revoke create on schema public from amanot_rpc;

-- Credential operations retain platform privileges but explicitly restrict
-- the target before reading/changing passwords or deleting Auth sessions.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.admin_reset_member_pin(uuid,text)'::regprocedure);
  if position('where id=p_member_id and deleted_at is null' in definition)=0 then
    raise exception 'Unexpected PIN reset implementation; review migration';
  end if;
  definition:=replace(definition,'where id=p_member_id and deleted_at is null',
    'where id=p_member_id and somiti_id=public.current_somiti_id() and deleted_at is null');
  execute definition;
end $$;

create or replace function public.handle_auth_user_before_insert()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare meta jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb);
  v_phone text:=public.norm_phone(meta->>'phone');
  pin text:=regexp_replace(translate(coalesce(meta->>'pin',''),'০১২৩৪৫৬৭৮৯','0123456789'),'[^0-9]','','g');
  m members%rowtype;
begin
  if v_phone !~ '^01[3-9][0-9]{8}$' or new.email is distinct from v_phone||'@member.amanot.app' then raise exception 'সঠিক মোবাইল নম্বর দিন'; end if;
  if pin !~ '^([0-9]{4}|[0-9]{6})$' or new.encrypted_password is null or extensions.crypt(public.pin_password(pin),new.encrypted_password) is distinct from new.encrypted_password then raise exception 'PIN ও password মিলতে হবে'; end if;
  perform pg_advisory_xact_lock(hashtext(v_phone));
  select * into m from members where phone_norm=v_phone and deleted_at is null for update;
  if coalesce((meta->>'bootstrap')::boolean,false) then
    if m.id is not null then raise exception 'এই নম্বরটি ইতিমধ্যে একটি সমিতিতে আছে। নতুন সমিতির জন্য আলাদা নম্বর দিন।'; end if;
    if not public.valid_new_pin(pin) then raise exception 'নিরাপদ ৬ সংখ্যার PIN প্রয়োজন'; end if;
    if length(trim(coalesce(meta->>'somiti_name','')))<2 or length(trim(coalesce(meta->>'name','')))<2 then raise exception 'সমিতি ও অ্যাডমিনের নাম দিন'; end if;
  else
    if m.id is null or m.user_id is not null or m.status='inactive' or m.temporary_pin_expires_at<now() then raise exception 'অ্যাডমিনের সাথে যোগাযোগ করুন'; end if;
    if m.pin_hash is null or extensions.crypt(pin,m.pin_hash)<>m.pin_hash then raise exception 'ভুল পিন'; end if;
  end if;
  -- Tenant/role fields in client metadata are never trusted.
  new.raw_user_meta_data:=(meta-'pin'-'somiti_id'-'role')||jsonb_build_object('phone',v_phone);
  return new;
end $$;

create or replace function public.handle_auth_user_after_insert()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare meta jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb); v_phone text:=public.norm_phone(meta->>'phone');
  m members%rowtype; society uuid;
begin
  if coalesce((meta->>'bootstrap')::boolean,false) then
    perform pg_advisory_xact_lock(714209);
    -- Adopt production-safe defaults only on a never-initialized installation.
    select s.id into society from somitis s where s.legacy and not exists(select 1 from profiles)
      and not exists(select 1 from members where somiti_id=s.id) limit 1 for update;
    if society is null then insert into somitis default values returning id into society; end if;
    insert into members(somiti_id,code,name,phone,whatsapp,role_title,app_role,status)
      values(society,'SM-001',trim(meta->>'name'),v_phone,v_phone,'সভাপতি · সুপার অ্যাডমিন','super_admin','paid') returning * into m;
    insert into somiti_settings(somiti_id,id,info) values(society,1,jsonb_build_object('name',trim(meta->>'somiti_name')))
      on conflict(somiti_id,id) do update set info=somiti_settings.info||excluded.info;
    insert into cash_accounts(somiti_id,id,type,name,holder,amount,sort) values
      (society,'ca1','bank','ব্যাংক হিসাব','',0,1),(society,'ca2','cashier','কোষাধ্যক্ষের হাতে','',0,2),
      (society,'ca3','bkash','বিকাশ','',0,3),(society,'ca4','field','মাঠকর্মীর হাতে','',0,4),
      (society,'ca5','nagad','নগদ মোবাইল হিসাব','',0,5) on conflict(somiti_id,id) do nothing;
    insert into sync_clock(somiti_id,id) values(society,1) on conflict do nothing;
  else
    select * into m from members where phone_norm=v_phone and deleted_at is null limit 1;
    society:=m.somiti_id;
  end if;
  update members set user_id=new.id,pin_hash=null,updated_at=now() where id=m.id;
  insert into profiles(id,somiti_id,member_id,phone,full_name,role,must_change_pin,temporary_pin_expires_at)
    values(new.id,society,m.id,v_phone,m.name,m.app_role,not coalesce((meta->>'bootstrap')::boolean,false),m.temporary_pin_expires_at);
  insert into audit_logs(somiti_id,action,actor_id,actor_name,details)
    values(society,'account_created',new.id,m.name,jsonb_build_object('member_id',m.id,'role',m.app_role));
  return new;
end $$;

create or replace function public.bump_sync_revision()
returns trigger language plpgsql security definer set search_path=public as $$
declare society uuid;
begin
  if tg_table_schema='storage' then
    if coalesce(new.bucket_id,old.bucket_id)<>'member-documents' then return null; end if;
    select somiti_id into society from members where id::text=split_part(coalesce(new.name,old.name),'/',1);
  else
    society:=coalesce(new.somiti_id,old.somiti_id);
    if tg_op='UPDATE' and (to_jsonb(new)-'updated_at')=(to_jsonb(old)-'updated_at') then return new; end if;
  end if;
  update sync_clock set revision=revision+1 where id=1 and somiti_id=society;
  return null;
end $$;
create or replace function public.get_sync_revision()
returns text language plpgsql stable security definer set search_path=public as $$
begin
  if not public.session_ready() then raise exception 'আবার লগইন করুন অথবা পিন পরিবর্তন করুন' using errcode='42501'; end if;
  return (select current_date::text||':'||somiti_id::text||':'||revision::text from sync_clock where id=1 and somiti_id=public.current_somiti_id());
end $$;

-- Existing photo paths use globally unique member UUIDs. Add a restrictive
-- boundary to ALL storage commands, including updates of existing objects.
drop policy if exists member_documents_read on storage.objects;
create policy member_documents_read on storage.objects for select to authenticated
using(bucket_id='member-documents' and public.is_member_avatar_path(name)
  and ((select public.is_staff()) or (storage.foldername(name))[1]=(select public.my_member_id())::text));
drop policy if exists member_documents_insert on storage.objects;
create policy member_documents_insert on storage.objects for insert to authenticated
with check(bucket_id='member-documents' and (select public.is_staff()) and public.is_member_avatar_path(name)
  and exists(select 1 from public.members m where m.id::text=(storage.foldername(storage.objects.name))[1] and m.deleted_at is null));
drop policy if exists member_documents_update on storage.objects;
create policy member_documents_update on storage.objects for update to authenticated
using(bucket_id='member-documents' and (select public.is_staff()) and public.is_member_avatar_path(name))
with check(bucket_id='member-documents' and (select public.is_staff()) and public.is_member_avatar_path(name)
  and exists(select 1 from public.members m where m.id::text=(storage.foldername(storage.objects.name))[1] and m.deleted_at is null));
create or replace function public.set_member_documents(p_member_id uuid,p_avatar_path text default null,p_nid_path text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform require_staff();
  if p_nid_path is not null then raise exception 'NID-এর ছবি নেওয়া হয় না; শুধু নম্বর দিন।'; end if;
  if not exists(select 1 from members where id=p_member_id and deleted_at is null) then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if p_avatar_path is not null and (not public.is_member_avatar_path(p_avatar_path) or split_part(p_avatar_path,'/',1)<>p_member_id::text) then raise exception 'ছবির ঠিকানা সঠিক নয়'; end if;
  update members set avatar_path=coalesce(p_avatar_path,avatar_path),updated_at=now() where id=p_member_id;
  perform write_audit('member_avatar_updated',jsonb_build_object('member_id',p_member_id));
end $$;
create policy member_document_tenant_boundary on storage.objects as restrictive for all to authenticated
using(bucket_id<>'member-documents' or exists(select 1 from public.members m where m.id::text=split_part(storage.objects.name,'/',1) and m.somiti_id=(select public.current_somiti_id()) and m.deleted_at is null))
with check(bucket_id<>'member-documents' or exists(select 1 from public.members m where m.id::text=split_part(storage.objects.name,'/',1) and m.somiti_id=(select public.current_somiti_id()) and m.deleted_at is null));

-- Existing global initialization API now describes the caller only.
create or replace function public.somiti_initialized()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid());
$$;
do $$ begin
  if to_regclass('public.amanot_schema_versions') is not null then insert into public.amanot_schema_versions(version) values('011') on conflict do nothing; end if;
end $$;
notify pgrst,'reload schema';
commit;
