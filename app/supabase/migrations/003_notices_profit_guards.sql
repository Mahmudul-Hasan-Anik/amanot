-- ==============================================================================
-- আমানত — Migration 003: notices, profit distribution, cash balance guard
-- Run once in Supabase SQL Editor after 002 (safe to re-run).
-- ==============================================================================

-- ---------- Notice board -------------------------------------------------------
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  created_by uuid default auth.uid(),
  created_by_name text,
  created_at timestamptz not null default now()
);
alter table public.notices enable row level security;
drop policy if exists notices_read on public.notices;
create policy notices_read on public.notices for select to authenticated using (public.my_role() is not null);

create or replace function public.add_notice(p_title text, p_body text default '')
returns notices language plpgsql security definer set search_path = public as $$
declare v notices%rowtype;
begin
  perform public.require_admin();
  if coalesce(trim(p_title), '') = '' then raise exception 'নোটিশের শিরোনাম দিন'; end if;
  insert into notices(title, body, created_by_name) values (trim(p_title), coalesce(p_body, ''), public.my_name())
  returning * into v;
  perform public.write_audit('notice_added', jsonb_build_object('notice_id', v.id, 'title', v.title));
  return v;
end; $$;

create or replace function public.delete_notice(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from notices where id = p_id;
  perform public.write_audit('notice_deleted', jsonb_build_object('notice_id', p_id));
end; $$;

-- ---------- Expenses can't take an account below zero -------------------------
create or replace function public.post_expense(p_expense_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_e expenses%rowtype; v_t uuid; v_method text; v_acc cash_accounts%rowtype;
begin
  select * into v_e from expenses where id = p_expense_id for update;
  v_method := public.method_from_source(v_e.payment_source);
  select * into v_acc from cash_accounts where id = public.account_for(v_method) for update;
  if v_acc.id is null or v_acc.amount < v_e.amount then
    raise exception '% -এ পর্যাপ্ত ব্যালেন্স নেই (আছে ৳%)', coalesce(v_acc.name, 'হিসাব'), coalesce(v_acc.amount, 0);
  end if;
  insert into transactions(receipt_no, party_name, party_code, amount, type, payment_method, note)
  values (v_e.voucher_no, 'সমিতি খরচ', 'EXP', v_e.amount, 'expense', v_method, v_e.category || ': ' || v_e.title)
  returning id into v_t;
  update expenses set status = 'approved', transaction_id = v_t where id = v_e.id;
  update cash_accounts set amount = amount - v_e.amount, updated_at = now() where id = v_acc.id;
end; $$;

-- ---------- Annual profit distribution ----------------------------------------
create table if not exists public.profit_distributions (
  year int primary key,
  project_profit numeric(14,2) not null,
  expenses numeric(14,2) not null,
  net_profit numeric(14,2) not null,
  reserve_pct numeric(5,2) not null,
  management_pct numeric(5,2) not null,
  distributed numeric(14,2) not null,
  approved_by_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.profit_shares (
  year int not null references public.profit_distributions(year) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  base_deposit numeric(14,2) not null,
  share numeric(12,2) not null,
  primary key (year, member_id)
);
alter table public.profit_distributions enable row level security;
alter table public.profit_shares enable row level security;
drop policy if exists pd_read on public.profit_distributions;
create policy pd_read on public.profit_distributions for select to authenticated using (public.my_role() is not null);
drop policy if exists ps_read on public.profit_shares;
create policy ps_read on public.profit_shares for select to authenticated
  using (public.is_staff() or member_id = public.my_member_id());

-- Preview numbers the screen shows (same formula the distribution uses)
create or replace function public.profit_preview(p_year int default extract(year from current_date)::int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_proj numeric; v_exp numeric; v_dep numeric; v_done boolean;
begin
  perform public.require_staff();
  select coalesce(sum(greatest(net_profit, 0)), 0) into v_proj from projects;
  select coalesce(sum(amount), 0) into v_exp from transactions
    where type = 'expense' and extract(year from date)::int = p_year;
  select coalesce(sum(total_deposit), 0) into v_dep from members where deleted_at is null and status <> 'inactive';
  select exists(select 1 from profit_distributions where year = p_year) into v_done;
  return jsonb_build_object('year', p_year, 'projectProfit', v_proj, 'expenses', v_exp,
    'netProfit', v_proj - v_exp, 'totalDeposit', v_dep, 'alreadyDistributed', v_done);
end; $$;

create or replace function public.distribute_profit(p_year int, p_reserve_pct numeric, p_management_pct numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb; v_net numeric; v_dist numeric; v_dep numeric; v_n int;
begin
  perform public.require_admin();
  if exists (select 1 from profit_distributions where year = p_year) then
    raise exception '% সালের লাভ ইতিমধ্যে বণ্টন করা হয়েছে', p_year;
  end if;
  if p_reserve_pct < 0 or p_management_pct < 0 or p_reserve_pct + p_management_pct > 100 then
    raise exception 'শতাংশ সঠিক নয়';
  end if;
  v := public.profit_preview(p_year);
  v_net := (v->>'netProfit')::numeric;
  v_dep := (v->>'totalDeposit')::numeric;
  if v_net <= 0 then raise exception 'বণ্টনযোগ্য লাভ নেই'; end if;
  if v_dep <= 0 then raise exception 'কোনো সদস্যের জমা নেই'; end if;
  v_dist := round(v_net * (1 - (p_reserve_pct + p_management_pct) / 100), 2);

  insert into profit_distributions(year, project_profit, expenses, net_profit, reserve_pct, management_pct, distributed, approved_by_name)
  values (p_year, (v->>'projectProfit')::numeric, (v->>'expenses')::numeric, v_net, p_reserve_pct, p_management_pct, v_dist, public.my_name());

  insert into profit_shares(year, member_id, base_deposit, share)
  select p_year, id, total_deposit, round(total_deposit / v_dep * v_dist, 2)
  from members where deleted_at is null and status <> 'inactive' and total_deposit > 0;
  get diagnostics v_n = row_count;

  -- "last distributed profit" shown on member screens
  update members m set profit_2025 = s.share, updated_at = now()
  from profit_shares s where s.year = p_year and s.member_id = m.id;

  perform public.write_audit('profit_distributed', jsonb_build_object('year', p_year, 'amount', v_dist, 'members', v_n));
  return jsonb_build_object('year', p_year, 'distributed', v_dist, 'members', v_n);
end; $$;

-- ---------- Permissions -------------------------------------------------------
revoke execute on function public.add_notice(text, text), public.delete_notice(uuid),
  public.profit_preview(int), public.distribute_profit(int, numeric, numeric), public.post_expense(uuid)
  from public, anon;
grant execute on function public.add_notice(text, text), public.delete_notice(uuid),
  public.profit_preview(int), public.distribute_profit(int, numeric, numeric) to authenticated;
revoke execute on function public.post_expense(uuid) from authenticated;

-- ---------- New project: money moves from a cash account into the project -----
create or replace function public.upsert_project(p jsonb)
returns projects language plpgsql security definer set search_path = public as $$
declare
  v_p projects%rowtype;
  v_inv numeric := coalesce((p->>'investedAmount')::numeric, 0);
  v_method text := coalesce(nullif(p->>'paymentSource',''), 'bank');
  v_acc cash_accounts%rowtype;
begin
  perform public.require_admin();
  if p ? 'id' and nullif(p->>'id','') is not null and exists (select 1 from projects where id = (p->>'id')::uuid) then
    update projects set name = coalesce(nullif(p->>'name',''), name), type = coalesce(p->>'type', type),
      location = coalesce(p->>'location', location), manager = coalesce(p->>'manager', manager),
      status = coalesce(p->>'status', status), start_date = coalesce(p->>'startDate', start_date),
      expected_end = coalesce(p->>'expectedEnd', expected_end)
    where id = (p->>'id')::uuid returning * into v_p;
  else
    if coalesce(trim(p->>'name'), '') = '' then raise exception 'প্রজেক্টের নাম দিন'; end if;
    if v_inv < 0 then raise exception 'বিনিয়োগের পরিমাণ সঠিক নয়'; end if;
    if v_method not in ('cash','bkash','nagad','bank') then v_method := 'bank'; end if;
    if v_inv > 0 then
      select * into v_acc from cash_accounts where id = public.account_for(v_method) for update;
      if v_acc.id is null or v_acc.amount < v_inv then
        raise exception '% -এ পর্যাপ্ত ব্যালেন্স নেই (আছে ৳%)', coalesce(v_acc.name, 'হিসাব'), coalesce(v_acc.amount, 0);
      end if;
    end if;
    insert into projects(id, name, type, location, manager, status, invested_amount, remaining_amount, start_date, expected_end)
    values (coalesce(nullif(p->>'id','')::uuid, gen_random_uuid()), trim(p->>'name'), coalesce(p->>'type',''),
            coalesce(p->>'location',''), coalesce(p->>'manager',''), 'ongoing', v_inv, v_inv,
            coalesce(p->>'startDate',''), coalesce(p->>'expectedEnd',''))
    returning * into v_p;
    if v_inv > 0 then
      update cash_accounts set amount = amount - v_inv, updated_at = now() where id = v_acc.id;
      insert into transactions(receipt_no, project_id, party_name, party_code, amount, type, payment_method, note)
      values ('INV-' || nextval('public.receipt_seq')::text, v_p.id, v_p.name, 'PRJ', v_inv, 'transfer', v_method,
              v_p.name || ': প্রজেক্টে বিনিয়োগ');
    end if;
  end if;
  perform public.write_audit('project_saved', jsonb_build_object('project_id', v_p.id, 'amount', v_inv));
  return v_p;
end; $$;
