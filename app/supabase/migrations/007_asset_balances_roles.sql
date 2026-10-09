-- Asset balances and protection of the last super administrator.
begin;
insert into cash_accounts(id,type,name,amount,sort) values('ca5','nagad','নগদ মোবাইল হিসাব',0,5) on conflict(id) do nothing;

create or replace function public.project_profit_between(p_start date,p_end date)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(sum(greatest(coalesce(r.finish,0)-p.invested_amount,0)-greatest(coalesce(r.start,0)-p.invested_amount,0)
    -case when p.status='completed' and p.completed_at>=p_start and p.completed_at<p_end then greatest(p.invested_amount-coalesce(r.finish,0),0) else 0 end),0)
  from projects p left join lateral (
    select sum(amount) filter(where date<p_end) finish,sum(amount) filter(where date<p_start) start
    from transactions where project_id=p.id and type='profit') r on true;
$$;
revoke execute on function public.project_profit_between(date,date) from public,anon,authenticated;

create or replace function public.set_member_app_role(p_id uuid,p_role text,p_title text default null)
returns void language plpgsql security definer set search_path=public as $$
declare m members%rowtype;
begin
  if my_role() is distinct from 'super_admin' then raise exception 'শুধু সুপার অ্যাডমিন' using errcode='42501'; end if;
  if p_role is null or p_role not in ('super_admin','admin','cashier','field_worker','member') then raise exception 'ভূমিকা সঠিক নয়'; end if;
  perform pg_advisory_xact_lock(714207);
  select * into m from members where id=p_id and deleted_at is null for update;
  if m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if m.app_role='super_admin' and p_role<>'super_admin' and not exists(select 1 from members where id<>p_id and app_role='super_admin' and deleted_at is null) then raise exception 'শেষ সুপার অ্যাডমিনের ভূমিকা বদলানো যাবে না'; end if;
  update members set app_role=p_role,role_title=coalesce(p_title,role_title),updated_at=now() where id=p_id;
  update profiles set role=p_role where member_id=p_id;
  perform write_audit('role_changed',jsonb_build_object('member_id',p_id,'role',p_role));
end; $$;

create or replace function public.delete_member(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare m members%rowtype;
begin
  perform require_admin();perform pg_advisory_xact_lock(714207);
  select * into m from members where id=p_id and deleted_at is null for update;
  if m.id is null then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if m.app_role='super_admin' and (my_role()<>'super_admin' or not exists(select 1 from members where id<>p_id and app_role='super_admin' and deleted_at is null)) then raise exception 'এই সুপার অ্যাডমিনকে মুছতে পারবেন না'; end if;
  update members set deleted_at=now(),status='inactive',updated_at=now() where id=p_id;
  update profiles set is_active=false where member_id=p_id;
  perform write_audit('member_deleted',jsonb_build_object('member_id',p_id));
end; $$;

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
  select coalesce(sum(remaining_amount),0) into v_proj from projects;
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

  v_proj_profit := public.project_profit_between(y_start, (current_date + 1));

  -- fund at start of month ≈ current fund − net flow this month
  v_prev_fund := (v_cash + v_proj) - (v_collected + public.project_profit_between(m_start,current_date+1) - v_expense);

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

commit;
