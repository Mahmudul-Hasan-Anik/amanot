-- ==============================================================================
-- আমানত — Migration 002: automatic due calculation
-- Run once in Supabase SQL Editor after schema.sql (safe to re-run).
--
-- Dues are now computed from each member's join date, monthly amount and the
-- months they have paid (no cron needed). A month becomes due after the
-- somiti's due day; the late fee applies after due day + grace days.
-- Partial payments are kept as credit and reduce the due amount.
-- ==============================================================================

alter table public.members add column if not exists partial_credit numeric(12,2) not null default 0;
grant select (partial_credit) on public.members to authenticated;

-- Recalculate dues for one member (or everyone when p_member is null)
create or replace function public.refresh_member_dues(p_member uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_info jsonb := coalesce((select info from somiti_settings where id = 1), '{}'::jsonb);
  v_due_day int := coalesce(nullif(v_info->>'dueDay','')::int, 10);
  v_grace int := coalesce(nullif(v_info->>'graceDays','')::int, 5);
  v_late numeric := coalesce(nullif(v_info->>'lateFee','')::numeric, 0);
  v_cur int := extract(month from current_date)::int - 1;
  v_day int := extract(day from current_date)::int;
  v_year int := extract(year from current_date)::int;
  r record;
  m int;
  v_start int;
  v_ms jsonb;
  v_due int;
  v_late_n int;
  v_amt numeric;
  v_n int := 0;
begin
  for r in
    select id, join_date, monthly_amount, months_status, partial_credit, status
    from members
    where deleted_at is null and (p_member is null or id = p_member)
    for update
  loop
    v_ms := '{}'::jsonb;
    -- keep only paid markers, due markers are rebuilt below
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_ms
      from jsonb_each(coalesce(r.months_status, '{}'::jsonb)) where value = '"paid"'::jsonb;

    v_due := 0; v_late_n := 0;
    if extract(year from r.join_date)::int < v_year then
      v_start := 0;
    elsif extract(year from r.join_date)::int = v_year then
      v_start := extract(month from r.join_date)::int - 1;
    else
      v_start := 99;
    end if;

    if r.status <> 'inactive' then
      m := v_start;
      while m <= v_cur loop
        if coalesce(v_ms->>m::text, '') <> 'paid' and (m < v_cur or v_day > v_due_day) then
          v_due := v_due + 1;
          v_ms := v_ms || jsonb_build_object(m::text, 'due');
          if m < v_cur or v_day > v_due_day + v_grace then
            v_late_n := v_late_n + 1;
          end if;
        end if;
        m := m + 1;
      end loop;
    end if;

    v_amt := greatest(0, v_due * r.monthly_amount + v_late_n * v_late - coalesce(r.partial_credit, 0));

    update members set
      months_status = v_ms,
      due_months = v_due,
      due_amount = v_amt,
      status = case
        when r.status = 'inactive' then 'inactive'
        when v_due = 0 or v_amt = 0 then 'paid'
        when coalesce(r.partial_credit, 0) > 0 then 'partial'
        else 'due' end,
      updated_at = now()
    where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end; $$;

-- Callable from the app (staff) to bring every member up to date
create or replace function public.refresh_dues()
returns int language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff();
  return public.refresh_member_dues(null);
end; $$;

-- Deposit: allocate money to the selected months in order; leftover becomes credit
drop function if exists public.record_deposit(uuid, text[], numeric, numeric, numeric, text, text, text);
create or replace function public.record_deposit(
  p_member_id uuid, p_months text[], p_base_amount numeric, p_late_fee numeric, p_total_amount numeric,
  p_payment_method text, p_trx_id text default null, p_note text default null, p_id uuid default null)
returns transactions language plpgsql security definer set search_path = public as $$
declare
  v_m members%rowtype;
  v_t transactions%rowtype;
  v_ms jsonb;
  v_month text;
  v_idx int;
  v_credit numeric;
  v_any_month boolean := false;
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

  v_ms := coalesce(v_m.months_status, '{}'::jsonb);
  v_credit := greatest(0, p_total_amount - coalesce(p_late_fee, 0)) + coalesce(v_m.partial_credit, 0);

  foreach v_month in array coalesce(p_months, array[]::text[]) loop
    v_idx := coalesce(array_position(v_names, v_month), array_position(v_short, v_month),
                      array_position(v_en, lower(split_part(v_month, ' ', 1))));
    if v_idx is not null then
      v_any_month := true;
      exit when v_credit < v_m.monthly_amount;
      v_ms := v_ms || jsonb_build_object((v_idx - 1)::text, 'paid');
      v_credit := v_credit - v_m.monthly_amount;
    end if;
  end loop;

  update members set
    total_deposit = total_deposit + p_total_amount,
    months_status = v_ms,
    partial_credit = case when v_any_month then v_credit else partial_credit end,
    updated_at = now()
  where id = v_m.id;

  perform public.refresh_member_dues(v_m.id);

  update cash_accounts set amount = amount + p_total_amount, updated_at = now()
  where id = public.account_for(p_payment_method);

  perform public.write_audit('deposit_recorded', jsonb_build_object('transaction_id', v_t.id, 'receipt', v_t.receipt_no,
          'member', v_m.code, 'amount', p_total_amount));
  return v_t;
end; $$;

-- Add member: accept joinDate (YYYY-MM-DD)
create or replace function public.add_member(p jsonb)
returns members language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text := nullif(trim(p->>'code'), '');
  v_pin text := regexp_replace(translate(coalesce(nullif(p->>'initialPin',''), '1234'), '০১২৩৪৫৬৭৮৯', '0123456789'), '[^0-9]', '', 'g');
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
  if length(v_pin) <> 4 then raise exception 'পিন ৪ সংখ্যার হতে হবে'; end if;
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
                      nominee_phone, monthly_amount, pin_hash, app_role, role_title, join_date)
  values (coalesce(nullif(p->>'id','')::uuid, gen_random_uuid()), v_code, trim(p->>'name'), nullif(p->>'nameEn',''),
          p->>'phone', coalesce(nullif(p->>'whatsapp',''), p->>'phone'),
          nullif(p->>'nid',''), coalesce(p->>'address',''), coalesce(p->>'nomineeName',''),
          coalesce(p->>'nomineeRelation',''), nullif(p->>'nomineePhone',''),
          coalesce((p->>'monthlyAmount')::numeric, 2000),
          extensions.crypt(v_pin, extensions.gen_salt('bf')),
          'member', 'সাধারণ সদস্য', v_join)
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
  return v_m;
end; $$;

-- Update member: recalc dues when the monthly amount / status changes
create or replace function public.update_member(p_id uuid, p jsonb)
returns members language plpgsql security definer set search_path = public as $$
declare v_m members%rowtype;
begin
  perform public.require_staff();
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
  perform public.refresh_member_dues(p_id);
  select * into v_m from members where id = p_id;
  perform public.write_audit('member_updated', jsonb_build_object('member_id', p_id, 'fields', (select jsonb_agg(k) from jsonb_object_keys(p) k)));
  return v_m;
end; $$;

-- Settings change (due day / late fee) should re-price dues
create or replace function public.update_somiti_info(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.require_admin();
  insert into somiti_settings(id, info) values (1, '{}') on conflict (id) do nothing;
  update somiti_settings set info = info || p, updated_at = now() where id = 1 returning info into v;
  if p ?| array['dueDay','graceDays','lateFee'] then
    perform public.refresh_member_dues(null);
  end if;
  perform public.write_audit('somiti_updated', jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p) k)));
  return v;
end; $$;

revoke execute on function public.refresh_member_dues(uuid) from public, anon, authenticated;
grant execute on function public.refresh_dues() to authenticated;
grant execute on function public.record_deposit(uuid, text[], numeric, numeric, numeric, text, text, text, uuid) to authenticated;

select public.refresh_member_dues(null);
