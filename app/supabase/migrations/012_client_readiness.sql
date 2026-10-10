begin;

-- Private, row-locked attempt counters. No client can edit its own lock.
create table public.login_attempts (
  phone text primary key, failures integer not null default 0,
  locked_until timestamptz, last_verified_at timestamptz
);
create table public.pin_session_grants (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default clock_timestamp()
);
create table public.login_gate_config (id boolean primary key default true check(id), enabled_at timestamptz not null);
insert into public.login_gate_config values(true,clock_timestamp());
alter table public.login_attempts enable row level security;
alter table public.pin_session_grants enable row level security;
alter table public.login_gate_config enable row level security;
revoke all on public.login_attempts,public.pin_session_grants,public.login_gate_config from public,anon,authenticated,amanot_rpc;

create function public.verify_login_pin(p_phone text,p_pin text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
  v_phone text:=public.norm_phone(p_phone);
  v_pin text:=translate(trim(coalesce(p_pin,'')),'০১২৩৪৫৬৭৮৯','0123456789');
  v_hash text; v_user uuid; v_expiry timestamptz; v_m uuid; a login_attempts%rowtype;
begin
  select m.id,m.user_id,coalesce(u.encrypted_password,m.pin_hash),m.temporary_pin_expires_at
    into v_m,v_user,v_hash,v_expiry from members m left join auth.users u on u.id=m.user_id
    where m.phone_norm=v_phone and m.deleted_at is null and m.status<>'inactive';
  if v_m is null then return jsonb_build_object('ok',false,'error','মোবাইল নম্বর বা পিন সঠিক নয়।'); end if;
  insert into login_attempts(phone) values(v_phone) on conflict do nothing;
  select * into a from login_attempts where phone=v_phone for update;
  if a.locked_until>now() then return jsonb_build_object('ok',false,'error','বেশি ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে চেষ্টা করুন।'); end if;
  if a.locked_until is not null then a.failures:=0; end if;
  if v_pin !~ '^([0-9]{4}|[0-9]{6})$' or v_hash is null
    or extensions.crypt(case when v_user is null then v_pin else public.pin_password(v_pin) end,v_hash) is distinct from v_hash then
    update login_attempts set failures=a.failures+1,last_verified_at=null,
      locked_until=case when a.failures+1>=5 then now()+interval '15 minutes' else null end where phone=v_phone;
    return jsonb_build_object('ok',false,'error','মোবাইল নম্বর বা পিন সঠিক নয়।');
  end if;
  if v_user is null and v_expiry<now() then return jsonb_build_object('ok',false,'error','Temporary PIN-এর মেয়াদ শেষ। অ্যাডমিনের সাথে যোগাযোগ করুন।'); end if;
  update login_attempts set failures=0,locked_until=null,last_verified_at=clock_timestamp() where phone=v_phone;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.verify_login_pin(text,text) from public;
grant execute on function public.verify_login_pin(text,text) to anon,authenticated;

-- Require the same gate before invited-member Auth activation. A failed Auth
-- trigger rolls its transaction back, so attempt counting belongs in the RPC.
do $$ declare d text; begin
  select pg_get_functiondef('public.handle_auth_user_before_insert()'::regprocedure) into d;
  d:=replace(d,'perform pg_advisory_xact_lock(hashtext(v_phone));',
    'perform pg_advisory_xact_lock(hashtext(v_phone));
     if not coalesce((meta->>''bootstrap'')::boolean,false) and not exists(select 1 from public.login_attempts where phone=v_phone and failures=0 and last_verified_at>now()-interval ''2 minutes'' and (locked_until is null or locked_until<=now())) then
       raise exception ''অ্যাপ থেকে পিন যাচাই করে আবার চেষ্টা করুন।'';
     end if;');
  execute d;
end $$;

create function public.confirm_pin_session(p_pin text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_phone text; v_session uuid:=nullif(auth.jwt()->>'session_id','')::uuid; r jsonb;
begin
  select phone into v_phone from profiles where id=auth.uid() and is_active;
  if v_phone is null or not exists(select 1 from auth.sessions s join profiles p on p.id=s.user_id
    where s.id=v_session and s.user_id=auth.uid() and s.created_at>=p.credentials_changed_at) then
    return jsonb_build_object('ok',false,'error','আবার লগইন করুন।');
  end if;
  r:=public.verify_login_pin(v_phone,p_pin);
  if not (r->>'ok')::boolean then return r; end if;
  insert into pin_session_grants(session_id,user_id) values(v_session,auth.uid())
    on conflict(session_id) do update set verified_at=clock_timestamp();
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.confirm_pin_session(text) from public,anon;
grant execute on function public.confirm_pin_session(text) to authenticated;

-- A direct Auth password login cannot bypass the application account lock.
-- Sessions already issued before this migration retain their existing access.
alter table public.somitis add column closed_at timestamptz;
create or replace function public.session_ready()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles p join members m on m.id=p.member_id join somitis o on o.id=p.somiti_id
    where p.id=auth.uid() and p.is_active and not p.must_change_pin and o.closed_at is null
      and m.deleted_at is null and m.status<>'inactive'
      and exists(select 1 from auth.sessions s where s.id=nullif(auth.jwt()->>'session_id','')::uuid
        and s.user_id=p.id and s.created_at>=p.credentials_changed_at
        and (s.created_at<(select enabled_at from login_gate_config where id)
          or exists(select 1 from pin_session_grants g where g.session_id=s.id and g.user_id=p.id and g.verified_at>=p.credentials_changed_at))));
$$;

-- Storage bytes are removed by the Edge Function, never by deleting storage metadata.
create table public.account_file_cleanup (
  member_id uuid primary key, requested_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.account_file_cleanup enable row level security;
revoke all on public.account_file_cleanup from public,anon,authenticated,amanot_rpc;
grant select,update on public.account_file_cleanup to service_role;

create function public.delete_my_account(p_pin text,p_close_society boolean default false,p_confirmation text default '')
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare p profiles%rowtype; v_ids uuid[]; v_users uuid[]; r jsonb; v_name text;
begin
  select * into p from profiles where id=auth.uid() and is_active;
  if p.id is null or not public.session_ready() then raise exception 'আবার লগইন করুন।' using errcode='42501'; end if;
  -- Serialize owner departures/closure inside one society.
  perform pg_advisory_xact_lock(714207);
  perform 1 from somitis where id=p.somiti_id for update;
  r:=public.confirm_pin_session(p_pin);
  if not (r->>'ok')::boolean then return r; end if;
  if p_close_society then
    if p.role<>'super_admin' then raise exception 'শুধু সমিতির মালিক সমিতি বন্ধ করতে পারবেন।' using errcode='42501'; end if;
    select info->>'name' into v_name from somiti_settings where somiti_id=p.somiti_id and id=1;
    if trim(p_confirmation) is distinct from trim(v_name) then raise exception 'নিশ্চিত করতে সমিতির নাম হুবহু লিখুন।'; end if;
    select array_agg(id),array_agg(user_id) filter(where user_id is not null) into v_ids,v_users
      from members where somiti_id=p.somiti_id;
    update somitis set closed_at=now() where id=p.somiti_id;
  else
    if p_confirmation<>'DELETE' then raise exception 'নিশ্চিত করতে DELETE লিখুন।'; end if;
    if p.role='super_admin' and not exists(select 1 from profiles q join members m on m.id=q.member_id
      where q.somiti_id=p.somiti_id and q.id<>p.id and q.role='super_admin' and q.is_active and m.deleted_at is null and m.status<>'inactive') then
      raise exception 'আপনি শেষ মালিক। আগে অন্য কাউকে মালিক করুন অথবা সমিতি বন্ধ করুন।';
    end if;
    v_ids:=array[p.member_id]; v_users:=array[p.id];
  end if;
  insert into account_file_cleanup(member_id) select unnest(v_ids) on conflict do nothing;
  insert into audit_logs(somiti_id,action,actor_id,actor_name,details)
    values(p.somiti_id,case when p_close_society then 'society_closed' else 'account_deleted' end,p.id,'Account owner',jsonb_build_object('member_count',cardinality(v_ids)));
  -- Preserve member IDs, amounts and the immutable financial ledger for accounting.
  update members set name='Deleted account',name_en=null,phone='deleted-'||id::text,whatsapp=null,nid=null,address='',
    nominee_name='',nominee_name_en=null,nominee_relation='',nominee_phone=null,avatar_path=null,
    pin_hash=null,user_id=null,temporary_pin_expires_at=null,next_followup=null,status='inactive',deleted_at=now(),updated_at=now()
    where id=any(v_ids);
  delete from auth.sessions where user_id=any(v_users);
  delete from auth.users where id=any(v_users);
  return jsonb_build_object('ok',true,'memberIds',to_jsonb(v_ids));
end $$;
revoke all on function public.delete_my_account(text,boolean,text) from public,anon;
grant execute on function public.delete_my_account(text,boolean,text) to authenticated;

-- Common tenant/date lookups need a composite index rather than a global scan.
create index transactions_somiti_created_idx on public.transactions(somiti_id,created_at desc,id);
create index transactions_somiti_date_idx on public.transactions(somiti_id,date desc,id);
create index members_somiti_active_idx on public.members(somiti_id,code) where deleted_at is null;
create function public.get_transaction_count() returns bigint language sql stable security invoker set search_path=public
as $$ select count(*) from transactions $$;
revoke all on function public.get_transaction_count() from public,anon;
grant execute on function public.get_transaction_count() to authenticated;
do $$ begin if to_regclass('public.amanot_schema_versions') is not null then
  insert into public.amanot_schema_versions(version) values('012') on conflict do nothing;
end if; end $$;
notify pgrst,'reload schema';
commit;
