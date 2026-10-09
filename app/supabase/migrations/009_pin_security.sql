begin;

-- Existing credentials are not reset. Existing users must upgrade their PIN
-- through the authenticated change flow before business data is accessible.
alter table public.profiles add column if not exists must_change_pin boolean not null default true;
alter table public.profiles add column if not exists credentials_changed_at timestamptz not null default 'epoch';
alter table public.profiles add column if not exists pin_change_failures integer not null default 0;
alter table public.profiles add column if not exists pin_change_locked_until timestamptz;
alter table public.profiles add column if not exists temporary_pin_expires_at timestamptz;
alter table public.members add column if not exists temporary_pin_expires_at timestamptz;

create or replace function public.valid_new_pin(p text)
returns boolean language sql immutable set search_path=public as $$
  select coalesce(p ~ '^[0-9]{6}$' and p !~ '^([0-9])\1{5}$'
    and p not in ('012345','123456','234567','345678','456789','987654','876543','765432','654321','543210'),false);
$$;

create or replace function public.session_ready()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles p join members m on m.id=p.member_id
    where p.id=auth.uid() and p.is_active and not p.must_change_pin
      and m.deleted_at is null and m.status<>'inactive'
      and exists(select 1 from auth.sessions s where s.id=nullif(auth.jwt()->>'session_id','')::uuid
        and s.user_id=p.id and s.created_at>=p.credentials_changed_at));
$$;
create or replace function public.my_role()
returns text language sql stable security definer set search_path=public as $$
  select role from profiles where id=auth.uid() and public.session_ready();
$$;
create or replace function public.my_member_id()
returns uuid language sql stable security definer set search_path=public as $$
  select member_id from profiles where id=auth.uid() and public.session_ready();
$$;
revoke all on function public.valid_new_pin(text),public.session_ready() from public,anon;
grant execute on function public.session_ready() to authenticated;

-- Own profile remains readable for the mandatory PIN-change screen. No table
-- writes are granted to clients; privilege flags cannot be changed by metadata.
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
using ((select public.is_staff()) or ((select public.session_ready()) and user_id=(select auth.uid())));

create or replace function public.change_own_pin(p_current_pin text,p_new_pin text)
returns jsonb language plpgsql security definer set search_path=public,extensions,auth as $$
declare
  p profiles%rowtype; old_hash text;
  current_pin text:=translate(trim(coalesce(p_current_pin,'')),'০১২৩৪৫৬৭৮৯','0123456789');
  new_pin text:=translate(trim(coalesce(p_new_pin,'')),'০১২৩৪৫৬৭৮৯','0123456789');
begin
  select * into p from profiles where id=auth.uid() for update;
  if p.id is null or not p.is_active or not exists(select 1 from members where id=p.member_id and deleted_at is null and status<>'inactive') then
    raise exception 'সক্রিয় অ্যাকাউন্ট প্রয়োজন' using errcode='42501';
  end if;
  if not exists(select 1 from auth.sessions s where s.id=nullif(auth.jwt()->>'session_id','')::uuid
    and s.user_id=p.id and s.created_at>=p.credentials_changed_at) then
    raise exception 'আবার লগইন করুন' using errcode='42501';
  end if;
  if p.pin_change_locked_until>now() then
    return jsonb_build_object('ok',false,'error','বেশি ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে চেষ্টা করুন।');
  end if;
  if p.must_change_pin and p.temporary_pin_expires_at<now() then
    return jsonb_build_object('ok',false,'error','Temporary PIN-এর মেয়াদ শেষ। অ্যাডমিনের সাথে যোগাযোগ করুন।');
  end if;
  if not public.valid_new_pin(new_pin) then
    return jsonb_build_object('ok',false,'error','৬ সংখ্যার পিন দিন; একই সংখ্যা বা ধারাবাহিক সংখ্যা ব্যবহার করবেন না।');
  end if;
  select encrypted_password into old_hash from auth.users where id=p.id for update;
  if current_pin !~ '^([0-9]{4}|[0-9]{6})$' or old_hash is null or extensions.crypt(public.pin_password(current_pin),old_hash) is distinct from old_hash then
    -- Return, rather than raise: failed-attempt counters must commit.
    update profiles set pin_change_failures=case when pin_change_locked_until<=now() then 1 else pin_change_failures+1 end,
      pin_change_locked_until=case when (case when pin_change_locked_until<=now() then 1 else pin_change_failures+1 end)>=5
        then now()+interval '15 minutes' else null end where id=p.id;
    return jsonb_build_object('ok',false,'error','বর্তমান পিন সঠিক নয়।');
  end if;
  if current_pin=new_pin then return jsonb_build_object('ok',false,'error','বর্তমান পিনের থেকে আলাদা পিন দিন।'); end if;
  update auth.users set encrypted_password=extensions.crypt(public.pin_password(new_pin),extensions.gen_salt('bf',10)),updated_at=now() where id=p.id;
  update profiles set must_change_pin=false,credentials_changed_at=clock_timestamp(),pin_change_failures=0,
    pin_change_locked_until=null,temporary_pin_expires_at=null where id=p.id;
  update members set pin_hash=null,temporary_pin_expires_at=null,updated_at=now() where id=p.member_id;
  if to_regclass('auth.sessions') is not null then execute 'delete from auth.sessions where user_id=$1' using p.id; end if;
  perform public.write_audit('pin_changed',jsonb_build_object('member_id',p.member_id));
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.change_own_pin(text,text) from public,anon;
grant execute on function public.change_own_pin(text,text) to authenticated;

create or replace function public.admin_reset_member_pin(p_member_id uuid,p_new_pin text default null)
returns void language plpgsql security definer set search_path=public,extensions,auth as $$
declare m members%rowtype; new_pin text:=translate(trim(coalesce(p_new_pin,'')),'০১২৩৪৫৬৭৮৯','0123456789');
begin
  perform public.require_admin();
  if not public.valid_new_pin(new_pin) then raise exception 'নিরাপদ ৬ সংখ্যার temporary PIN প্রয়োজন'; end if;
  select * into m from members where id=p_member_id and deleted_at is null for update;
  if m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if m.user_id=auth.uid() then raise exception 'নিজের পিন পরিবর্তনের জন্য বর্তমান পিন দিন'; end if;
  if m.app_role<>'member' and public.my_role()<>'super_admin' then raise exception 'Staff PIN শুধু সুপার অ্যাডমিন রিসেট করতে পারবেন' using errcode='42501'; end if;
  if m.user_id is null then
    update members set pin_hash=extensions.crypt(new_pin,extensions.gen_salt('bf',10)),
      temporary_pin_expires_at=now()+interval '72 hours',updated_at=now() where id=m.id;
  else
    update auth.users set encrypted_password=extensions.crypt(public.pin_password(new_pin),extensions.gen_salt('bf',10)),updated_at=now() where id=m.user_id;
    update profiles set must_change_pin=true,credentials_changed_at=clock_timestamp(),pin_change_failures=0,
      pin_change_locked_until=null,temporary_pin_expires_at=now()+interval '72 hours' where id=m.user_id;
    if to_regclass('auth.sessions') is not null then execute 'delete from auth.sessions where user_id=$1' using m.user_id; end if;
  end if;
  perform public.write_audit('pin_reset',jsonb_build_object('member_id',m.id));
end; $$;

-- The following auth/member functions retain the existing accounting behavior,
-- but remove shared initial credentials and bind signup password to its PIN.

create or replace function public.handle_auth_user_before_insert()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := public.norm_phone(meta->>'phone');
  v_pin text := regexp_replace(translate(coalesce(meta->>'pin',''), '০১২৩৪৫৬৭৮৯', '0123456789'), '[^0-9]', '', 'g');
  v_member members%rowtype;
  v_bootstrap boolean := coalesce((meta->>'bootstrap')::boolean, false);
begin
  if new.email is distinct from v_phone || '@member.amanot.app' then raise exception 'সঠিক account address প্রয়োজন'; end if;
  if v_pin !~ '^([0-9]{4}|[0-9]{6})$' or new.encrypted_password is null or extensions.crypt(public.pin_password(v_pin),new.encrypted_password) is distinct from new.encrypted_password then raise exception 'PIN ও password মিলতে হবে'; end if;
  if length(v_phone) <> 11 then
    raise exception 'সঠিক মোবাইল নম্বর দিন';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_phone));
  select * into v_member from members where phone_norm = v_phone and deleted_at is null limit 1 for update;

  if v_bootstrap then
    perform pg_advisory_xact_lock(714209);
    if not public.valid_new_pin(v_pin) then raise exception 'নিরাপদ ৬ সংখ্যার PIN প্রয়োজন'; end if;
    if exists (select 1 from profiles) then
      raise exception 'সমিতি ইতিমধ্যে নিবন্ধিত। অ্যাডমিনের সাথে যোগাযোগ করুন।';
    end if;
  else
    if v_member.id is null then
      raise exception 'এই নম্বরটি কোনো সদস্যের নামে নিবন্ধিত নয়';
    end if;
    if v_member.user_id is not null then
      raise exception 'এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে';
    end if;
    if v_member.status='inactive' or v_member.temporary_pin_expires_at<now() then raise exception 'অ্যাডমিনের সাথে যোগাযোগ করুন'; end if;
    if v_member.pin_hash is null or extensions.crypt(v_pin, v_member.pin_hash) <> v_member.pin_hash then
      raise exception 'ভুল পিন';
    end if;
  end if;

  -- never keep the plaintext PIN in auth metadata
  new.raw_user_meta_data := (meta - 'pin') || jsonb_build_object('phone', v_phone);
  return new;
end; $$;

create or replace function public.handle_auth_user_after_insert()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := public.norm_phone(meta->>'phone');
  v_member members%rowtype;
begin
  select * into v_member from members where phone_norm = v_phone and deleted_at is null limit 1;

  if coalesce((meta->>'bootstrap')::boolean, false) then
    if v_member.id is null then
      insert into members(code, name, phone, whatsapp, role_title, app_role, status)
      values ((select 'SM-' || lpad((coalesce(max(nullif(regexp_replace(code, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0') from members),
              coalesce(nullif(meta->>'name',''), 'অ্যাডমিন'), v_phone, v_phone,
              'সভাপতি · সুপার অ্যাডমিন', 'super_admin', 'paid')
      returning * into v_member;
    else
      update members set app_role = 'super_admin' where id = v_member.id returning * into v_member;
    end if;
    insert into somiti_settings(id, info) values (1, '{}'::jsonb) on conflict (id) do nothing;
    if nullif(meta->>'somiti_name','') is not null then
      update somiti_settings set info = info || jsonb_build_object('name', meta->>'somiti_name'), updated_at = now() where id = 1;
    end if;
  end if;

  update members set user_id = new.id, pin_hash = null, updated_at = now() where id = v_member.id;

  insert into profiles(id,member_id,phone,full_name,role,must_change_pin,temporary_pin_expires_at)
  values(new.id,v_member.id,v_phone,v_member.name,v_member.app_role,not coalesce((meta->>'bootstrap')::boolean,false),v_member.temporary_pin_expires_at);

  insert into audit_logs(action, actor_id, actor_name, details)
  values ('account_created', new.id, v_member.name, jsonb_build_object('member_id', v_member.id, 'role', v_member.app_role));
  return new;
end; $$;

create or replace function public.add_member(p jsonb)
returns members language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text := nullif(trim(p->>'code'), '');
  v_pin text := translate(trim(coalesce(p->>'initialPin','')),'০১২৩৪৫৬৭৮৯','0123456789');
  v_fee numeric := coalesce((p->>'admissionFee')::numeric, 0);
  v_join date := coalesce(nullif(p->>'joinDate','')::date, current_date);
  v_m members%rowtype;
  v_n int;
begin
  perform public.require_staff();
  if coalesce(trim(p->>'name'),'') = '' or coalesce(trim(p->>'phone'),'') = '' then
    raise exception 'নাম ও ফোন নম্বর আবশ্যক';
  end if;
  if length(public.norm_phone(p->>'phone')) <> 11 then raise exception 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন'; end if;
  if not public.valid_new_pin(v_pin) then raise exception 'নিরাপদ ৬ সংখ্যার temporary PIN প্রয়োজন'; end if;
  if exists (select 1 from members where phone_norm = public.norm_phone(p->>'phone') and deleted_at is null) then
    raise exception 'এই ফোন নম্বরে ইতিমধ্যে সদস্য আছে';
  end if;
  if v_code is not null and exists (select 1 from members where code = v_code and deleted_at is null) then
    v_code := null; -- taken: auto-generate instead
  end if;
  if v_code is null then
    select coalesce(max(nullif(regexp_replace(code, '[^0-9]', '', 'g'), '')::int), 0) + 1 into v_n from members;
    v_code := 'SM-' || lpad(v_n::text, 3, '0');
  end if;

  insert into members(id, code, name, name_en, phone, whatsapp, nid, address, nominee_name, nominee_relation,
                      nominee_phone, monthly_amount, pin_hash, app_role, role_title, join_date, temporary_pin_expires_at)
  values (coalesce(nullif(p->>'id','')::uuid, gen_random_uuid()), v_code, trim(p->>'name'), nullif(p->>'nameEn',''),
          p->>'phone', coalesce(nullif(p->>'whatsapp',''), p->>'phone'),
          nullif(p->>'nid',''), coalesce(p->>'address',''), coalesce(p->>'nomineeName',''),
          coalesce(p->>'nomineeRelation',''), nullif(p->>'nomineePhone',''),
          coalesce((p->>'monthlyAmount')::numeric, 2000),
          extensions.crypt(v_pin, extensions.gen_salt('bf',10)),
          'member', 'সাধারণ সদস্য', v_join, now()+interval '72 hours')
  returning * into v_m;

  if v_fee > 0 then
    insert into transactions(receipt_no, member_id, party_name, party_code, amount, type, payment_method, note)
    values (public.next_receipt(), v_m.id, v_m.name, v_m.code, v_fee, 'deposit', 'cash', 'ভর্তি ফি');
    update members set total_deposit = total_deposit + v_fee where id = v_m.id;
    update cash_accounts set amount = amount + v_fee, updated_at = now() where id = public.account_for('cash');
  end if;

  perform public.refresh_member_dues(v_m.id);
  select * into v_m from members where id = v_m.id;
  perform public.write_audit('member_added', jsonb_build_object('member_id', v_m.id, 'code', v_m.code, 'name', v_m.name));
  v_m.pin_hash:=null;
  return v_m;
end; $$;

create or replace function public.update_member(p_id uuid, p jsonb)
returns members language plpgsql security definer set search_path = public as $$
declare v_m members%rowtype;
begin
  perform public.require_staff();
  if p ? 'phone' and exists(select 1 from members where id=p_id and user_id is not null and phone_norm<>public.norm_phone(p->>'phone')) then
    raise exception 'সক্রিয় login-এর ফোন নম্বর এই form থেকে বদলানো যাবে না। অ্যাডমিনের recovery procedure ব্যবহার করুন।';
  end if;
  if p ? 'phone' and exists (select 1 from members where phone_norm = public.norm_phone(p->>'phone') and id <> p_id and deleted_at is null) then
    raise exception 'এই ফোন নম্বরে অন্য সদস্য আছে';
  end if;
  update members set
    name             = coalesce(nullif(p->>'name',''), name),
    name_en          = case when p ? 'nameEn' then p->>'nameEn' else name_en end,
    phone            = coalesce(nullif(p->>'phone',''), phone),
    whatsapp         = case when p ? 'whatsapp' then p->>'whatsapp' else whatsapp end,
    nid              = case when p ? 'nid' then p->>'nid' else nid end,
    address          = coalesce(p->>'address', address),
    nominee_name     = coalesce(p->>'nomineeName', nominee_name),
    nominee_relation = coalesce(p->>'nomineeRelation', nominee_relation),
    nominee_phone    = case when p ? 'nomineePhone' then p->>'nomineePhone' else nominee_phone end,
    monthly_amount   = coalesce((p->>'monthlyAmount')::numeric, monthly_amount),
    status           = case when p->>'status' = 'inactive' then 'inactive'
                            when p->>'status' is not null and status = 'inactive' then 'paid'
                            else status end,
    role_title       = coalesce(p->>'role', role_title),
    next_followup    = case when p ? 'nextFollowup' then p->'nextFollowup' else next_followup end,
    updated_at       = now()
  where id = p_id and deleted_at is null
  returning * into v_m;
  if v_m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  update profiles set full_name=v_m.name where member_id=p_id;
  perform public.refresh_member_dues(p_id);
  select * into v_m from members where id = p_id;
  perform public.write_audit('member_updated', jsonb_build_object('member_id', p_id, 'fields', (select jsonb_agg(k) from jsonb_object_keys(p) k)));
  v_m.pin_hash:=null; return v_m;
end; $$;

-- Direct Auth API password updates cannot clear the business-data gate. The
-- verified PIN-change RPC clears it only after its stronger policy succeeds.
create or replace function public.password_changed_requires_pin_upgrade()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update profiles set must_change_pin=true,credentials_changed_at=clock_timestamp() where id=new.id;
  return new;
end; $$;
drop trigger if exists amanot_password_changed on auth.users;
create trigger amanot_password_changed after update of encrypted_password on auth.users
for each row when (old.encrypted_password is distinct from new.encrypted_password)
execute function public.password_changed_requires_pin_upgrade();
revoke all on function public.password_changed_requires_pin_upgrade() from public,anon,authenticated;

revoke all on function public.admin_reset_member_pin(uuid,text) from public,anon;
grant execute on function public.admin_reset_member_pin(uuid,text) to authenticated;
do $$ begin
  if to_regclass('public.amanot_schema_versions') is not null then insert into public.amanot_schema_versions(version) values('009') on conflict do nothing; end if;
end; $$;
commit;
