-- ==============================================================================
-- আমানত (Amanot) — Supabase backend
-- Run this whole file once in Supabase Dashboard → SQL Editor (safe to re-run).
--
-- Design:
--   * Login = phone + 4-digit PIN, using Supabase email/password auth under the
--     hood (synthetic email "<01XXXXXXXXX>@member.amanot.app", password "amanot:<PIN>").
--   * Admin adds a member with an initial PIN. The member's first login creates
--     their auth account; a trigger checks the PIN against the member row.
--   * The very first sign-up (with bootstrap=true) creates the somiti + super admin.
--   * All writes go through SECURITY DEFINER RPC functions that check the role,
--     update balances atomically and write an audit log. Tables are read-only
--     to clients via RLS.
-- ==============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------------------------

-- Normalise any BD phone (Bengali/English digits, +880, dashes) to 01XXXXXXXXX
create or replace function public.norm_phone(p text)
returns text language sql immutable as $$
  select case
    when length(d) >= 10 then '0' || right(d, 10)
    else d
  end
  from (
    select regexp_replace(
      translate(coalesce(p, ''), '০১২৩৪৫৬৭৮৯', '0123456789'),
      '[^0-9]', '', 'g') as d
  ) s;
$$;

create or replace function public.pin_password(pin text)
returns text language sql immutable as $$
  select 'amanot:' || regexp_replace(translate(coalesce(pin, ''), '০১২৩৪৫৬৭৮৯', '0123456789'), '[^0-9]', '', 'g');
$$;

-- ------------------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------------------

create table if not exists public.somiti_settings (
  id int primary key default 1 check (id = 1),
  info jsonb not null default '{}'::jsonb,   -- name, tagline, regNo, bank info, limits …
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  code text not null,
  name text not null,
  name_en text,
  phone text not null,
  phone_norm text generated always as (public.norm_phone(phone)) stored,
  whatsapp text,
  nid text,
  address text not null default '',
  nominee_name text not null default '',
  nominee_name_en text,
  nominee_relation text not null default '',
  nominee_phone text,
  join_date date not null default current_date,
  monthly_amount numeric(12,2) not null default 2000,
  total_deposit numeric(14,2) not null default 0,
  due_amount numeric(12,2) not null default 0,
  due_months int not null default 0,
  status text not null default 'paid' check (status in ('paid','due','partial','inactive')),
  role_title text default 'সাধারণ সদস্য',                -- display title (সভাপতি, কোষাধ্যক্ষ …)
  app_role text not null default 'member'
    check (app_role in ('super_admin','admin','cashier','field_worker','member')),
  pin_hash text,                                          -- initial PIN (bcrypt) until first login
  profit_2025 numeric(12,2) default 0,
  estimated_profit_2026 numeric(12,2) default 0,
  months_status jsonb not null default '{}'::jsonb,       -- {"0":"paid","7":"due",…}
  next_followup jsonb,                                    -- {"date":"…","note":"…"}
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists members_code_uq on public.members(code) where deleted_at is null;
create unique index if not exists members_phone_uq on public.members(phone_norm) where deleted_at is null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  phone text unique not null,
  full_name text not null,
  role text not null default 'member'
    check (role in ('super_admin','admin','cashier','field_worker','member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_accounts (
  id text primary key,
  type text not null check (type in ('bank','cashier','bkash','nagad','field')),
  name text not null,
  holder text,
  amount numeric(14,2) not null default 0,
  note text,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default '',
  location text default '',
  manager text default '',
  status text not null default 'ongoing' check (status in ('ongoing','delayed','completed')),
  invested_amount numeric(14,2) not null default 0,
  returned_amount numeric(14,2) not null default 0,
  net_profit numeric(14,2) not null default 0,
  roi_pct numeric(7,2) not null default 0,
  start_date text default '',
  expected_end text default '',
  recovery_pct int not null default 0,
  remaining_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create sequence if not exists public.receipt_seq start 1001;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  receipt_no text unique not null,
  member_id uuid references public.members(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  party_name text not null,      -- member / project / "সমিতি খরচ"
  party_code text not null,      -- SM-xxx / EXP / PRJ / TRF
  date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  type text not null check (type in ('deposit','expense','transfer','profit','loan')),
  payment_method text not null check (payment_method in ('cash','bkash','nagad','bank')),
  trx_id text,
  note text,
  months text[],
  late_fee numeric(12,2) default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists transactions_member_idx on public.transactions(member_id);
create index if not exists transactions_date_idx on public.transactions(date desc);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  voucher_no text not null,
  title text not null,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_source text not null,
  note text,
  status text not null default 'approved' check (status in ('approved','pending','rejected')),
  transaction_id uuid references public.transactions(id),
  date date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('expense','investment','correction')),
  title text not null,
  amount numeric(14,2) not null,
  amount_display text,
  detail text not null default '',
  expense_id uuid references public.expenses(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  attachment_type text,
  attachment_title text,
  created_by_name text not null,
  created_by uuid default auth.uid(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by_name text,
  decided_by uuid,
  decided_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  actor_id uuid default auth.uid(),
  actor_name text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- Immutable ledger
-- ------------------------------------------------------------------------------
create or replace function public.prevent_transaction_modification()
returns trigger language plpgsql as $$
begin
  raise exception 'লেজার ট্রানজ্যাকশন পরিবর্তন/ডিলিট নিষিদ্ধ। ভুল হলে বিপরীত সমন্বয় এন্ট্রি দিন।';
end; $$;

drop trigger if exists trg_prevent_transaction_update_delete on public.transactions;
create trigger trg_prevent_transaction_update_delete
before update or delete on public.transactions
for each row execute function public.prevent_transaction_modification();

-- ------------------------------------------------------------------------------
-- Role helpers (used by RLS + RPCs)
-- ------------------------------------------------------------------------------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active;
$$;

create or replace function public.my_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select member_id from profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select coalesce(public.my_role() in ('super_admin','admin','cashier','field_worker'), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(public.my_role() in ('super_admin','admin'), false);
$$;

create or replace function public.require_staff()
returns void language plpgsql stable as $$
begin
  if not public.is_staff() then
    raise exception 'অনুমতি নেই (staff only)' using errcode = '42501';
  end if;
end; $$;

create or replace function public.require_admin()
returns void language plpgsql stable as $$
begin
  if not public.is_admin() then
    raise exception 'অনুমতি নেই (admin only)' using errcode = '42501';
  end if;
end; $$;

create or replace function public.my_name()
returns text language sql stable security definer set search_path = public as $$
  select full_name from profiles where id = auth.uid();
$$;

create or replace function public.write_audit(p_action text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs(action, actor_name, details) values (p_action, public.my_name(), coalesce(p_details, '{}'));
$$;

-- Choose the cash account a payment method/source lands in
create or replace function public.account_for(p_method text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from cash_accounts where type = case p_method
        when 'bank' then 'bank' when 'bkash' then 'bkash' when 'nagad' then 'nagad' else 'cashier' end
     order by sort, id limit 1),
    (select id from cash_accounts where type = 'cashier' order by sort, id limit 1)
  );
$$;

create or replace function public.method_from_source(p_source text)
returns text language sql immutable as $$
  select case
    when lower(coalesce(p_source,'')) ~ '(ব্যাংক|bank)' then 'bank'
    when lower(coalesce(p_source,'')) ~ '(বিকাশ|bkash)' then 'bkash'
    when lower(coalesce(p_source,'')) ~ '(^নগদ$|nagad)' then 'nagad'
    else 'cash' end;
$$;

-- ------------------------------------------------------------------------------
-- Auth: phone + PIN sign-up validation
-- Client calls supabase.auth.signUp({ email: '<phone>@member.amanot.app',
--   password: 'amanot:<pin>', options: { data: { phone, pin, name?, somiti_name?, bootstrap? } } })
-- ------------------------------------------------------------------------------
create or replace function public.handle_auth_user_before_insert()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := public.norm_phone(meta->>'phone');
  v_pin text := regexp_replace(translate(coalesce(meta->>'pin',''), '০১২৩৪৫৬৭৮৯', '0123456789'), '[^0-9]', '', 'g');
  v_member members%rowtype;
  v_bootstrap boolean := coalesce((meta->>'bootstrap')::boolean, false);
begin
  if length(v_phone) <> 11 then
    raise exception 'সঠিক মোবাইল নম্বর দিন';
  end if;

  select * into v_member from members where phone_norm = v_phone and deleted_at is null limit 1;

  if v_bootstrap then
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

  insert into profiles(id, member_id, phone, full_name, role)
  values (new.id, v_member.id, v_phone, v_member.name, v_member.app_role);

  insert into audit_logs(action, actor_id, actor_name, details)
  values ('account_created', new.id, v_member.name, jsonb_build_object('member_id', v_member.id, 'role', v_member.app_role));
  return new;
end; $$;

drop trigger if exists on_auth_user_before_insert on auth.users;
create trigger on_auth_user_before_insert before insert on auth.users
for each row execute function public.handle_auth_user_before_insert();

drop trigger if exists on_auth_user_after_insert on auth.users;
create trigger on_auth_user_after_insert after insert on auth.users
for each row execute function public.handle_auth_user_after_insert();

-- Public (anon) lookups for the login screen. Reveal as little as possible.
create or replace function public.somiti_initialized()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles);
$$;

create or replace function public.check_phone(p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object(
        'exists', true,
        'registered', m.user_id is not null,
        'initial', left(m.name, 1))
     from members m where m.phone_norm = public.norm_phone(p_phone) and m.deleted_at is null
       and m.status <> 'inactive' limit 1),
    jsonb_build_object('exists', false, 'registered', false));
$$;

-- ------------------------------------------------------------------------------
-- Read RPC: dashboard summary (works for members too, without exposing rows)
-- ------------------------------------------------------------------------------
create or replace function public.get_somiti_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
  m_start date := date_trunc('month', current_date)::date;
  y_start date := date_trunc('year', current_date)::date;
  v_cash numeric; v_proj numeric; v_target numeric; v_collected numeric;
  v_income numeric; v_expense numeric; v_total_members int; v_active int;
  v_due_members int; v_inactive int; v_partial int; v_due_amt numeric;
  v_paid int; v_m1 int; v_m2 int; v_m3 int; v_proj_profit numeric; v_prev_fund numeric;
begin
  if auth.uid() is null or public.my_role() is null then
    raise exception 'লগইন প্রয়োজন' using errcode = '42501';
  end if;

  select coalesce(sum(amount),0) into v_cash from cash_accounts;
  select coalesce(sum(invested_amount),0) into v_proj from projects;
  select count(*),
         count(*) filter (where status <> 'inactive'),
         count(*) filter (where status in ('due','partial')),
         count(*) filter (where status = 'inactive'),
         count(*) filter (where status = 'partial'),
         count(*) filter (where status = 'paid'),
         coalesce(sum(due_amount) filter (where status <> 'inactive'),0),
         coalesce(sum(monthly_amount) filter (where status <> 'inactive'),0),
         count(*) filter (where due_months = 1 and status <> 'inactive'),
         count(*) filter (where due_months = 2 and status <> 'inactive'),
         count(*) filter (where due_months >= 3 and status <> 'inactive')
    into v_total_members, v_active, v_due_members, v_inactive, v_partial, v_paid,
         v_due_amt, v_target, v_m1, v_m2, v_m3
    from members where deleted_at is null;

  select coalesce(sum(amount) filter (where type = 'deposit'),0),
         coalesce(sum(amount) filter (where type in ('deposit','profit')),0),
         coalesce(sum(amount) filter (where type = 'expense'),0)
    into v_collected, v_income, v_expense
    from transactions where date >= m_start;

  select coalesce(sum(amount),0) into v_proj_profit
    from transactions where type = 'profit' and date >= y_start;

  -- fund at start of month ≈ current fund − net flow this month
  v_prev_fund := (v_cash + v_proj) - (v_income - v_expense);

  r := jsonb_build_object(
    'totalMembersCount', v_total_members,
    'activeMembersCount', v_active,
    'dueMembersCount', v_due_members,
    'inactiveMembersCount', v_inactive,
    'totalFund', v_cash + v_proj,
    'monthlyFundGrowth', case when v_prev_fund > 0 then round(((v_cash + v_proj) - v_prev_fund) / v_prev_fund * 100, 1) else 0 end,
    'projectInvested', v_proj,
    'projectInvestedPct', case when v_cash + v_proj > 0 then round(v_proj / (v_cash + v_proj) * 100) else 0 end,
    'cashAndBank', v_cash,
    'cashAndBankPct', case when v_cash + v_proj > 0 then round(v_cash / (v_cash + v_proj) * 100) else 0 end,
    'monthlyTarget', v_target,
    'monthlyCollected', v_collected,
    'monthlyCollectedPct', case when v_target > 0 then least(100, round(v_collected / v_target * 100)) else 0 end,
    'monthlyRemaining', greatest(0, v_target - v_collected),
    'paidCount', v_paid,
    'dueCount', v_due_members,
    'partialCount', v_partial,
    'unpaidCount', v_due_members - v_partial,
    'totalDueAmount', v_due_amt,
    'dueBreakdown', jsonb_build_object('month1', v_m1, 'month2', v_m2, 'month3Plus', v_m3),
    'monthlyIncome', v_income,
    'monthlyExpense', v_expense,
    'monthlyNet', v_income - v_expense,
    'yearlyProjectProfit', v_proj_profit
  );
  return r;
end; $$;

-- ------------------------------------------------------------------------------
-- Write RPCs
-- ------------------------------------------------------------------------------

create or replace function public.next_receipt()
returns text language sql volatile security definer set search_path = public as $$
  select '#' || nextval('public.receipt_seq')::text;
$$;

-- Add member ------------------------------------------------------------------
create or replace function public.add_member(p jsonb)
returns members language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text := nullif(trim(p->>'code'), '');
  v_pin text := regexp_replace(translate(coalesce(nullif(p->>'initialPin',''), '1234'), '০১২৩৪৫৬৭৮৯', '0123456789'), '[^0-9]', '', 'g');
  v_fee numeric := coalesce((p->>'admissionFee')::numeric, 0);
  v_m members%rowtype;
  v_n int;
begin
  perform public.require_staff();
  if coalesce(trim(p->>'name'),'') = '' or coalesce(trim(p->>'phone'),'') = '' then
    raise exception 'নাম ও ফোন নম্বর আবশ্যক';
  end if;
  if length(v_pin) <> 4 then raise exception 'পিন ৪ সংখ্যার হতে হবে'; end if;
  if exists (select 1 from members where phone_norm = public.norm_phone(p->>'phone') and deleted_at is null) then
    raise exception 'এই ফোন নম্বরে ইতিমধ্যে সদস্য আছে';
  end if;

  if v_code is null then
    select coalesce(max(nullif(regexp_replace(code, '[^0-9]', '', 'g'), '')::int), 0) + 1 into v_n from members;
    v_code := 'SM-' || lpad(v_n::text, 3, '0');
  end if;

  insert into members(id, code, name, name_en, phone, whatsapp, nid, address, nominee_name, nominee_relation,
                      nominee_phone, monthly_amount, pin_hash, app_role, role_title)
  values (coalesce(nullif(p->>'id','')::uuid, gen_random_uuid()), v_code, trim(p->>'name'), nullif(p->>'nameEn',''), p->>'phone', coalesce(nullif(p->>'whatsapp',''), p->>'phone'),
          nullif(p->>'nid',''), coalesce(p->>'address',''), coalesce(p->>'nomineeName',''),
          coalesce(p->>'nomineeRelation',''), nullif(p->>'nomineePhone',''),
          coalesce((p->>'monthlyAmount')::numeric, 2000),
          extensions.crypt(v_pin, extensions.gen_salt('bf')),
          'member', 'সাধারণ সদস্য')
  returning * into v_m;

  if v_fee > 0 then
    insert into transactions(receipt_no, member_id, party_name, party_code, amount, type, payment_method, note)
    values (public.next_receipt(), v_m.id, v_m.name, v_m.code, v_fee, 'deposit', 'cash', 'ভর্তি ফি ও প্রাথমিক জমা');
    update members set total_deposit = total_deposit + v_fee where id = v_m.id returning * into v_m;
    update cash_accounts set amount = amount + v_fee, updated_at = now() where id = public.account_for('cash');
  end if;

  perform public.write_audit('member_added', jsonb_build_object('member_id', v_m.id, 'code', v_m.code, 'name', v_m.name));
  return v_m;
end; $$;

-- Update member (whitelisted fields) -------------------------------------------
create or replace function public.update_member(p_id uuid, p jsonb)
returns members language plpgsql security definer set search_path = public as $$
declare v_m members%rowtype;
begin
  perform public.require_staff();
  update members set
    name             = coalesce(p->>'name', name),
    name_en          = case when p ? 'nameEn' then p->>'nameEn' else name_en end,
    phone            = coalesce(p->>'phone', phone),
    whatsapp         = case when p ? 'whatsapp' then p->>'whatsapp' else whatsapp end,
    nid              = case when p ? 'nid' then p->>'nid' else nid end,
    address          = coalesce(p->>'address', address),
    nominee_name     = coalesce(p->>'nomineeName', nominee_name),
    nominee_relation = coalesce(p->>'nomineeRelation', nominee_relation),
    nominee_phone    = case when p ? 'nomineePhone' then p->>'nomineePhone' else nominee_phone end,
    monthly_amount   = coalesce((p->>'monthlyAmount')::numeric, monthly_amount),
    status           = coalesce(p->>'status', status),
    role_title       = coalesce(p->>'role', role_title),
    due_amount       = coalesce((p->>'dueAmount')::numeric, due_amount),
    due_months       = coalesce((p->>'dueMonths')::int, due_months),
    months_status    = coalesce(p->'monthsStatus', months_status),
    next_followup    = case when p ? 'nextFollowup' then p->'nextFollowup' else next_followup end,
    updated_at       = now()
  where id = p_id and deleted_at is null
  returning * into v_m;
  if v_m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  perform public.write_audit('member_updated', jsonb_build_object('member_id', p_id, 'fields', (select jsonb_agg(k) from jsonb_object_keys(p) k)));
  return v_m;
end; $$;

create or replace function public.delete_member(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  update members set deleted_at = now(), status = 'inactive', updated_at = now() where id = p_id;
  update profiles set is_active = false where member_id = p_id;
  perform public.write_audit('member_deleted', jsonb_build_object('member_id', p_id));
end; $$;

-- Only super admin can promote/demote
create or replace function public.set_member_app_role(p_id uuid, p_role text, p_title text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'super_admin' then raise exception 'শুধু সুপার অ্যাডমিন' using errcode = '42501'; end if;
  update members set app_role = p_role, role_title = coalesce(p_title, role_title), updated_at = now() where id = p_id;
  update profiles set role = p_role where member_id = p_id;
  perform public.write_audit('role_changed', jsonb_build_object('member_id', p_id, 'role', p_role));
end; $$;

-- Admin resets a member's PIN ---------------------------------------------------
create or replace function public.admin_reset_member_pin(p_member_id uuid, p_new_pin text default '1234')
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_user uuid;
  v_pin text := regexp_replace(translate(coalesce(p_new_pin,'1234'), '০১২৩৪৫৬৭৮৯', '0123456789'), '[^0-9]', '', 'g');
begin
  perform public.require_admin();
  if length(v_pin) <> 4 then raise exception 'পিন ৪ সংখ্যার হতে হবে'; end if;
  select user_id into v_user from members where id = p_member_id;
  if v_user is null then
    update members set pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')), updated_at = now() where id = p_member_id;
  else
    update auth.users set encrypted_password = extensions.crypt(public.pin_password(v_pin), extensions.gen_salt('bf')),
                          updated_at = now()
    where id = v_user;
  end if;
  perform public.write_audit('pin_reset', jsonb_build_object('member_id', p_member_id));
end; $$;

drop function if exists public.record_deposit(uuid, text[], numeric, numeric, numeric, text, text, text);
-- Record deposit ----------------------------------------------------------------
create or replace function public.record_deposit(
  p_member_id uuid, p_months text[], p_base_amount numeric, p_late_fee numeric, p_total_amount numeric,
  p_payment_method text, p_trx_id text default null, p_note text default null, p_id uuid default null)
returns transactions language plpgsql security definer set search_path = public as $$
declare
  v_m members%rowtype;
  v_t transactions%rowtype;
  v_new_due numeric;
  v_ms jsonb;
  v_month text;
  v_idx int;
  v_names text[] := array['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  v_short text[] := array['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'];
  v_en text[] := array['january','february','march','april','may','june','july','august','september','october','november','december'];
begin
  perform public.require_staff();
  if p_total_amount is null or p_total_amount <= 0 then raise exception 'জমার পরিমাণ সঠিক নয়'; end if;
  if p_payment_method not in ('cash','bkash','nagad','bank') then raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়'; end if;

  select * into v_m from members where id = p_member_id and deleted_at is null for update;
  if v_m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;

  insert into transactions(id, receipt_no, member_id, party_name, party_code, amount, type, payment_method,
                           trx_id, note, months, late_fee)
  values (coalesce(p_id, gen_random_uuid()), public.next_receipt(), v_m.id, v_m.name, v_m.code, p_total_amount, 'deposit', p_payment_method,
          nullif(p_trx_id,''), coalesce(nullif(p_note,''), array_to_string(p_months, ', ') || ' মাসের কিস্তি'),
          p_months, coalesce(p_late_fee,0))
  returning * into v_t;

  -- mark months paid
  v_ms := coalesce(v_m.months_status, '{}'::jsonb);
  foreach v_month in array coalesce(p_months, array[]::text[]) loop
    v_idx := coalesce(array_position(v_names, v_month), array_position(v_short, v_month),
                      array_position(v_en, lower(split_part(v_month, ' ', 1))));
    if v_idx is not null then v_ms := v_ms || jsonb_build_object((v_idx - 1)::text, 'paid'); end if;
  end loop;

  v_new_due := greatest(0, v_m.due_amount - p_total_amount);
  update members set
    total_deposit = total_deposit + p_total_amount,
    due_amount = v_new_due,
    due_months = greatest(0, due_months - coalesce(array_length(p_months,1),0)),
    status = case when status = 'inactive' then status when v_new_due = 0 then 'paid' else 'partial' end,
    months_status = v_ms,
    updated_at = now()
  where id = v_m.id;

  update cash_accounts set amount = amount + p_total_amount, updated_at = now()
  where id = public.account_for(p_payment_method);

  perform public.write_audit('deposit_recorded', jsonb_build_object('transaction_id', v_t.id, 'receipt', v_t.receipt_no,
          'member', v_m.code, 'amount', p_total_amount));
  return v_t;
end; $$;

-- Expense -----------------------------------------------------------------------
create or replace function public.post_expense(p_expense_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_e expenses%rowtype; v_t uuid; v_method text;
begin
  select * into v_e from expenses where id = p_expense_id for update;
  v_method := public.method_from_source(v_e.payment_source);
  insert into transactions(receipt_no, party_name, party_code, amount, type, payment_method, note)
  values (v_e.voucher_no, 'সমিতি খরচ', 'EXP', v_e.amount, 'expense', v_method, v_e.category || ': ' || v_e.title)
  returning id into v_t;
  update expenses set status = 'approved', transaction_id = v_t where id = v_e.id;
  update cash_accounts set amount = amount - v_e.amount, updated_at = now() where id = public.account_for(v_method);
end; $$;

create or replace function public.add_expense(
  p_title text, p_category text, p_amount numeric, p_payment_source text, p_voucher_no text,
  p_note text default null, p_status text default 'approved')
returns expenses language plpgsql security definer set search_path = public as $$
declare
  v_e expenses%rowtype;
  v_limit numeric := coalesce((select (info->>'expenseApprovalLimit')::numeric from somiti_settings where id = 1), 10000);
  v_pending boolean;
  v_voucher text := coalesce(nullif(trim(p_voucher_no),''), 'V-' || nextval('public.receipt_seq')::text);
begin
  perform public.require_staff();
  if p_amount is null or p_amount <= 0 then raise exception 'খরচের পরিমাণ সঠিক নয়'; end if;
  if exists (select 1 from transactions where receipt_no = v_voucher) then
    v_voucher := v_voucher || '-' || nextval('public.receipt_seq')::text;
  end if;
  -- maker-checker: non-admins and anything above the limit need approval
  v_pending := p_status = 'pending' or not public.is_admin() or p_amount > v_limit and public.my_role() <> 'super_admin';

  insert into expenses(voucher_no, title, category, amount, payment_source, note, status)
  values (v_voucher, p_title, p_category, p_amount, p_payment_source, p_note, case when v_pending then 'pending' else 'approved' end)
  returning * into v_e;

  if v_pending then
    insert into approvals(type, title, amount, detail, expense_id, created_by_name)
    values ('expense', p_title, p_amount,
            p_category || ' · ভাউচার: ' || v_voucher || coalesce(' · ' || nullif(p_note,''), ''),
            v_e.id, coalesce(public.my_name(), 'স্টাফ'));
  else
    perform public.post_expense(v_e.id);
    select * into v_e from expenses where id = v_e.id;
  end if;

  perform public.write_audit('expense_added', jsonb_build_object('expense_id', v_e.id, 'amount', p_amount, 'status', v_e.status));
  return v_e;
end; $$;

-- Approvals ---------------------------------------------------------------------
create or replace function public.approve_request(p_id uuid)
returns approvals language plpgsql security definer set search_path = public as $$
declare v_a approvals%rowtype; v_e expenses%rowtype;
begin
  perform public.require_admin();
  select * into v_a from approvals where id = p_id and status = 'pending' for update;
  if v_a.id is null then raise exception 'অনুমোদনের অনুরোধ পাওয়া যায়নি'; end if;
  if v_a.created_by = auth.uid() and public.my_role() <> 'super_admin' then
    raise exception 'নিজের অনুরোধ নিজে অনুমোদন করা যাবে না';
  end if;

  if v_a.expense_id is not null then
    perform public.post_expense(v_a.expense_id);
  elsif v_a.type in ('expense','investment') then
    insert into expenses(voucher_no, title, category, amount, payment_source, note, status)
    values ('V-' || nextval('public.receipt_seq')::text, v_a.title,
            case when v_a.type = 'investment' then 'প্রজেক্ট বিনিয়োগ' else 'সাধারণ ব্যয়' end,
            v_a.amount, case when v_a.type = 'investment' then 'ব্যাংক' else 'হাতে নগদ' end, v_a.detail, 'pending')
    returning * into v_e;
    perform public.post_expense(v_e.id);
    if v_a.type = 'investment' and v_a.project_id is not null then
      update projects set invested_amount = invested_amount + v_a.amount,
                          remaining_amount = remaining_amount + v_a.amount where id = v_a.project_id;
    end if;
  end if;

  update approvals set status = 'approved', decided_by = auth.uid(), decided_by_name = public.my_name(), decided_at = now()
  where id = p_id returning * into v_a;
  perform public.write_audit('approval_approved', jsonb_build_object('approval_id', p_id, 'amount', v_a.amount));
  return v_a;
end; $$;

create or replace function public.reject_request(p_id uuid, p_reason text default null)
returns approvals language plpgsql security definer set search_path = public as $$
declare v_a approvals%rowtype;
begin
  perform public.require_admin();
  update approvals set status = 'rejected', decided_by = auth.uid(), decided_by_name = public.my_name(),
         decided_at = now(), rejection_reason = coalesce(nullif(p_reason,''), 'অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার')
  where id = p_id and status = 'pending' returning * into v_a;
  if v_a.id is null then raise exception 'অনুমোদনের অনুরোধ পাওয়া যায়নি'; end if;
  if v_a.expense_id is not null then update expenses set status = 'rejected' where id = v_a.expense_id; end if;
  perform public.write_audit('approval_rejected', jsonb_build_object('approval_id', p_id, 'reason', v_a.rejection_reason));
  return v_a;
end; $$;

-- Projects ----------------------------------------------------------------------
create or replace function public.upsert_project(p jsonb)
returns projects language plpgsql security definer set search_path = public as $$
declare v_p projects%rowtype; v_inv numeric := coalesce((p->>'investedAmount')::numeric, 0);
begin
  perform public.require_admin();
  if p ? 'id' and nullif(p->>'id','') is not null then
    update projects set name = coalesce(p->>'name', name), type = coalesce(p->>'type', type),
      location = coalesce(p->>'location', location), manager = coalesce(p->>'manager', manager),
      status = coalesce(p->>'status', status), start_date = coalesce(p->>'startDate', start_date),
      expected_end = coalesce(p->>'expectedEnd', expected_end)
    where id = (p->>'id')::uuid returning * into v_p;
  else
    insert into projects(name, type, location, manager, status, invested_amount, remaining_amount, start_date, expected_end)
    values (p->>'name', coalesce(p->>'type',''), coalesce(p->>'location',''), coalesce(p->>'manager',''),
            coalesce(p->>'status','ongoing'), v_inv, v_inv, coalesce(p->>'startDate',''), coalesce(p->>'expectedEnd',''))
    returning * into v_p;
  end if;
  perform public.write_audit('project_saved', jsonb_build_object('project_id', v_p.id));
  return v_p;
end; $$;

create or replace function public.record_project_return(
  p_project_id uuid, p_amount numeric, p_payment_source text, p_note text default null)
returns transactions language plpgsql security definer set search_path = public as $$
declare v_p projects%rowtype; v_t transactions%rowtype; v_ret numeric; v_method text;
begin
  perform public.require_staff();
  if p_amount is null or p_amount <= 0 then raise exception 'পরিমাণ সঠিক নয়'; end if;
  select * into v_p from projects where id = p_project_id for update;
  if v_p.id is null then raise exception 'প্রজেক্ট পাওয়া যায়নি'; end if;
  v_method := case when public.method_from_source(p_payment_source) = 'bank' then 'bank' else 'cash' end;
  v_ret := v_p.returned_amount + p_amount;

  update projects set
    returned_amount = v_ret,
    remaining_amount = greatest(0, invested_amount - v_ret),
    recovery_pct = case when invested_amount > 0 then least(100, round(v_ret / invested_amount * 100)) else 0 end,
    net_profit = v_ret - invested_amount,
    roi_pct = case when invested_amount > 0 then round((v_ret - invested_amount) / invested_amount * 100) else 0 end
  where id = v_p.id;

  insert into transactions(receipt_no, project_id, party_name, party_code, amount, type, payment_method, note)
  values ('RET-' || nextval('public.receipt_seq')::text, v_p.id, v_p.name, 'PRJ', p_amount, 'profit', v_method,
          v_p.name || ': ' || coalesce(nullif(p_note,''), 'প্রজেক্ট আয় / ফেরত'))
  returning * into v_t;

  update cash_accounts set amount = amount + p_amount, updated_at = now() where id = public.account_for(v_method);
  perform public.write_audit('project_return', jsonb_build_object('project_id', v_p.id, 'amount', p_amount));
  return v_t;
end; $$;

-- Cash transfer -----------------------------------------------------------------
create or replace function public.transfer_cash(p_from text, p_to text, p_amount numeric, p_note text default null)
returns transactions language plpgsql security definer set search_path = public as $$
declare v_from cash_accounts%rowtype; v_to cash_accounts%rowtype; v_t transactions%rowtype;
begin
  perform public.require_staff();
  if p_from = p_to then raise exception 'একই হিসাবে স্থানান্তর করা যাবে না'; end if;
  select * into v_from from cash_accounts where id = p_from for update;
  select * into v_to from cash_accounts where id = p_to for update;
  if v_from.id is null or v_to.id is null then raise exception 'হিসাব পাওয়া যায়নি'; end if;
  if p_amount is null or p_amount <= 0 or v_from.amount < p_amount then raise exception 'পর্যাপ্ত ব্যালেন্স নেই'; end if;

  update cash_accounts set amount = amount - p_amount, updated_at = now() where id = p_from;
  update cash_accounts set amount = amount + p_amount, updated_at = now() where id = p_to;

  insert into transactions(receipt_no, party_name, party_code, amount, type, payment_method, note)
  values ('TRF-' || nextval('public.receipt_seq')::text, 'হিসাব স্থানান্তর', 'TRF', p_amount, 'transfer', 'cash',
          coalesce(nullif(p_note,''), v_from.name || ' থেকে ' || v_to.name || '-এ স্থানান্তর'))
  returning * into v_t;
  perform public.write_audit('cash_transfer', jsonb_build_object('from', p_from, 'to', p_to, 'amount', p_amount));
  return v_t;
end; $$;

create or replace function public.upsert_cash_account(p jsonb)
returns cash_accounts language plpgsql security definer set search_path = public as $$
declare v_a cash_accounts%rowtype;
begin
  perform public.require_admin();
  insert into cash_accounts(id, type, name, holder, note, sort)
  values (p->>'id', coalesce(p->>'type','cashier'), p->>'name', p->>'holder', p->>'note', coalesce((p->>'sort')::int, 0))
  on conflict (id) do update set type = excluded.type, name = excluded.name, holder = excluded.holder,
     note = excluded.note, updated_at = now()
  returning * into v_a;
  perform public.write_audit('cash_account_saved', jsonb_build_object('id', v_a.id));
  return v_a;
end; $$;

-- Somiti profile ----------------------------------------------------------------
create or replace function public.update_somiti_info(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.require_admin();
  insert into somiti_settings(id, info) values (1, '{}') on conflict (id) do nothing;
  update somiti_settings set info = info || p, updated_at = now() where id = 1 returning info into v;
  perform public.write_audit('somiti_updated', jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p) k)));
  return v;
end; $$;

-- Monthly dues: run on the 1st of every month (see pg_cron at bottom) ------------
create or replace function public.accrue_monthly_dues()
returns int language plpgsql security definer set search_path = public as $$
declare v_prev int := extract(month from (current_date - interval '1 month'))::int - 1; v_n int;
begin
  -- members who did not pay last month get it added to their due
  update members set
    due_amount = due_amount + monthly_amount,
    due_months = due_months + 1,
    status = 'due',
    months_status = months_status || jsonb_build_object(v_prev::text, 'due'),
    updated_at = now()
  where deleted_at is null and status <> 'inactive'
    and coalesce(months_status->>v_prev::text, '') <> 'paid'
    and join_date < date_trunc('month', current_date);
  get diagnostics v_n = row_count;
  -- reset the new year's months in January
  if extract(month from current_date) = 1 then
    update members set months_status = '{}'::jsonb where deleted_at is null;
  end if;
  insert into audit_logs(action, actor_name, details) values ('dues_accrued', 'system', jsonb_build_object('members', v_n));
  return v_n;
end; $$;

-- ------------------------------------------------------------------------------
-- Row Level Security: clients can only SELECT; all writes via RPCs above
-- ------------------------------------------------------------------------------
alter table public.somiti_settings enable row level security;
alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.projects enable row level security;
alter table public.transactions enable row level security;
alter table public.expenses enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists settings_read on public.somiti_settings;
create policy settings_read on public.somiti_settings for select to authenticated using (public.my_role() is not null);

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (public.is_staff() or user_id = auth.uid());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists cash_read on public.cash_accounts;
create policy cash_read on public.cash_accounts for select to authenticated using (public.is_staff());

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using (public.my_role() is not null);

drop policy if exists tx_read on public.transactions;
create policy tx_read on public.transactions for select to authenticated
  using (public.is_staff() or member_id = public.my_member_id());

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select to authenticated using (public.is_staff());

drop policy if exists approvals_read on public.approvals;
create policy approvals_read on public.approvals for select to authenticated using (public.is_staff());

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated using (public.is_admin());

-- hide pin hashes from clients (column-level grant without pin_hash)
revoke select on public.members from anon, authenticated;
grant select (id, user_id, code, name, name_en, phone, phone_norm, whatsapp, nid, address, nominee_name,
  nominee_name_en, nominee_relation, nominee_phone, join_date, monthly_amount, total_deposit, due_amount,
  due_months, status, role_title, app_role, profit_2025, estimated_profit_2026, months_status, next_followup,
  deleted_at, created_at, updated_at) on public.members to authenticated;

-- Function permissions: lock everything, then grant what the app calls
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.check_phone(text), public.somiti_initialized() to anon, authenticated;
grant execute on function
  public.my_role(), public.my_member_id(), public.is_staff(), public.is_admin(),
  public.get_somiti_summary(), public.add_member(jsonb), public.update_member(uuid, jsonb),
  public.delete_member(uuid), public.set_member_app_role(uuid, text, text),
  public.admin_reset_member_pin(uuid, text),
  public.record_deposit(uuid, text[], numeric, numeric, numeric, text, text, text, uuid),
  public.add_expense(text, text, numeric, text, text, text, text),
  public.approve_request(uuid), public.reject_request(uuid, text),
  public.upsert_project(jsonb), public.record_project_return(uuid, numeric, text, text),
  public.transfer_cash(text, text, numeric, text), public.upsert_cash_account(jsonb),
  public.update_somiti_info(jsonb)
to authenticated;
-- needed inside RLS policies / generated columns
grant execute on function public.norm_phone(text), public.pin_password(text) to anon, authenticated;

-- ------------------------------------------------------------------------------
-- Base data (production-safe: no fake members)
-- ------------------------------------------------------------------------------
insert into public.somiti_settings(id, info) values (1, jsonb_build_object(
  'name', 'আমানত সমিতি', 'nameEn', 'Amanot Somiti', 'tagline', 'সমিতির সব হিসাব, এক জায়গায়',
  'regNo', '', 'establishedYear', '', 'address', '', 'phone', '', 'email', '', 'authority', '',
  'committeeTenure', '', 'bankName', '', 'bankAccountNo', '', 'bkashNo', '', 'nagadNo', '',
  'expenseApprovalLimit', 10000, 'dueDay', 10, 'graceDays', 5, 'lateFee', 100,
  'reservePct', 10, 'directorPct', 10))
on conflict (id) do nothing;

insert into public.cash_accounts(id, type, name, holder, amount, sort) values
  ('ca1', 'bank',    'ব্যাংক হিসাব',       '', 0, 1),
  ('ca2', 'cashier', 'কোষাধ্যক্ষের হাতে',   '', 0, 2),
  ('ca3', 'bkash',   'বিকাশ',             '', 0, 3),
  ('ca4', 'field',   'মাঠকর্মীর হাতে',     '', 0, 4)
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- Optional: automatic monthly dues (enable "pg_cron" in Database → Extensions first)
-- select cron.schedule('amanot-monthly-dues', '5 0 1 * *', 'select public.accrue_monthly_dues()');
-- ------------------------------------------------------------------------------
