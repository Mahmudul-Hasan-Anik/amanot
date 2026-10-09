-- Apply after 004. Transactional and safe to re-run.
begin;

alter table public.expenses add column if not exists created_by_name text;
alter table public.members add column if not exists dues_start_month date;
alter table public.members add column if not exists profit_balance numeric(14,2) not null default 0;
alter table public.members add column if not exists last_profit_year int;
alter table public.projects add column if not exists completed_at date;
grant select (dues_start_month,profit_balance,last_profit_year) on public.members to authenticated;

-- Legacy month markers had no year. Preserve them in the migration year.
-- Do not invent debts for years the old application never tracked.
update members set dues_start_month = greatest(date_trunc('month',join_date)::date,date_trunc('year',current_date)::date)
where dues_start_month is null;
update members m set months_status = coalesce((select jsonb_object_agg(
  case when key ~ '^\d{1,2}$' then to_char(make_date(extract(year from current_date)::int,key::int+1,1),'YYYY-MM') else key end,value)
  from jsonb_each(coalesce(m.months_status,'{}'::jsonb))), '{}'::jsonb)
where exists(select 1 from jsonb_object_keys(coalesce(m.months_status,'{}'::jsonb)) k where k ~ '^\d{1,2}$');

create or replace function public.refresh_member_dues(p_member uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := coalesce((select info from somiti_settings where id=1),'{}'::jsonb);
  due_day int := greatest(1,least(28,coalesce((cfg->>'dueDay')::int,10)));
  grace int := greatest(0,coalesce((cfg->>'graceDays')::int,5));
  fee numeric := greatest(0,coalesce((cfg->>'lateFee')::numeric,0));
  r record; period date; ms jsonb; due_n int; late_n int; amt numeric; n int:=0;
begin
  for r in select * from members where deleted_at is null and (p_member is null or id=p_member) for update loop
    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into ms
    from jsonb_each(coalesce(r.months_status,'{}'::jsonb)) where value='"paid"'::jsonb;
    due_n:=0; late_n:=0;
    period:=coalesce(r.dues_start_month,date_trunc('month',r.join_date)::date);
    if r.status <> 'inactive' then
      while period <= date_trunc('month',current_date)::date loop
        if coalesce(ms->>to_char(period,'YYYY-MM'),'') <> 'paid' and current_date > period+due_day-1 then
          due_n:=due_n+1;
          ms:=ms || jsonb_build_object(to_char(period,'YYYY-MM'),'due');
          if current_date > period+due_day-1+grace then late_n:=late_n+1; end if;
        end if;
        period:=(period+interval '1 month')::date;
      end loop;
    end if;
    amt:=greatest(0,due_n*r.monthly_amount+late_n*fee-r.partial_credit);
    update members set months_status=ms,due_months=due_n,due_amount=amt,
      status=case when r.status='inactive' then 'inactive' when amt=0 then 'paid' when r.partial_credit>0 then 'partial' else 'due' end,
      updated_at=now() where id=r.id;
    n:=n+1;
  end loop;
  return n;
end; $$;

create or replace function public.record_deposit(
  p_member_id uuid,p_months text[],p_base_amount numeric,p_late_fee numeric,p_total_amount numeric,
  p_payment_method text,p_trx_id text default null,p_note text default null,p_id uuid default null)
returns transactions language plpgsql security definer set search_path=public as $$
declare
  m members%rowtype; t transactions%rowtype; ms jsonb; credit numeric; item text; idx int; period date;
  seen text[]:=array[]::text[]; canonical text[]:=array[]::text[];
  names text[]:=array['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  english text[]:=array['january','february','march','april','may','june','july','august','september','october','november','december'];
begin
  perform require_staff();
  if p_total_amount is null or p_total_amount<=0 or p_base_amount is null or p_base_amount<0
    or coalesce(p_late_fee,0)<0 or p_base_amount+coalesce(p_late_fee,0)<>p_total_amount then
    raise exception 'জমার হিসাব সঠিক নয়';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash','bank','bkash','nagad') then raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়'; end if;
  select * into m from members where id=p_member_id and deleted_at is null for update;
  if m.id is null or m.status='inactive' then raise exception 'সক্রিয় সদস্য পাওয়া যায়নি'; end if;
  if p_id is not null then
    select * into t from transactions where id=p_id;
    if t.id is not null then
      if t.type<>'deposit' or t.member_id<>p_member_id or t.amount<>p_total_amount then raise exception 'এই জমার আইডি ইতিমধ্যে ব্যবহৃত'; end if;
      return t;
    end if;
  end if;
  if not exists(select 1 from cash_accounts where id=account_for(p_payment_method)) then raise exception 'হিসাব পাওয়া যায়নি'; end if;
  ms:=coalesce(m.months_status,'{}'::jsonb); credit:=m.partial_credit+p_base_amount;
  foreach item in array coalesce(p_months,array[]::text[]) loop
    if item ~ '^\d{4}-(0[1-9]|1[0-2])$' then period:=(item||'-01')::date;
    else
      idx:=coalesce(array_position(names,item),array_position(english,lower(item)));
      if idx is null then raise exception 'কিস্তির মাস সঠিক নয়'; end if;
      period:=make_date(extract(year from current_date)::int,idx,1);
    end if;
    item:=to_char(period,'YYYY-MM');
    if item=any(seen) then raise exception 'একই মাস একাধিকবার নির্বাচন করা হয়েছে'; end if;
    seen:=array_append(seen,item); canonical:=array_append(canonical,item);
    if period<coalesce(m.dues_start_month,date_trunc('month',m.join_date)::date) then raise exception 'যোগদানের আগের মাসের কিস্তি নয়'; end if;
    if ms->>item='paid' then raise exception 'এই মাসের কিস্তি ইতিমধ্যে পরিশোধিত'; end if;
    if m.monthly_amount>0 and credit>=m.monthly_amount then
      ms:=ms||jsonb_build_object(item,'paid'); credit:=credit-m.monthly_amount;
    end if;
  end loop;
  insert into transactions(id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,trx_id,note,months,late_fee)
  values(coalesce(p_id,gen_random_uuid()),next_receipt(),m.id,m.name,m.code,p_total_amount,'deposit',p_payment_method,
    nullif(trim(p_trx_id),''),coalesce(nullif(trim(p_note),''),'কিস্তি জমা'),canonical,coalesce(p_late_fee,0)) returning * into t;
  update members set total_deposit=total_deposit+p_base_amount,months_status=ms,partial_credit=credit,updated_at=now() where id=m.id;
  perform refresh_member_dues(m.id);
  update cash_accounts set amount=amount+p_total_amount,updated_at=now() where id=account_for(p_payment_method);
  perform write_audit('deposit_recorded',jsonb_build_object('transaction_id',t.id,'member',m.code,'amount',p_total_amount));
  return t;
end; $$;

-- Posting is idempotent; balance and expense rows remain locked until commit.
create or replace function public.post_expense(p_expense_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e expenses%rowtype; a cash_accounts%rowtype; method text; tid uuid;
begin
  select * into e from expenses where id=p_expense_id for update;
  if e.id is null then raise exception 'খরচ পাওয়া যায়নি'; end if;
  if e.transaction_id is not null then return; end if;
  if e.status='rejected' then raise exception 'বাতিল খরচ অনুমোদন করা যাবে না'; end if;
  method:=method_from_source(e.payment_source);
  select * into a from cash_accounts where id=account_for(method) for update;
  if a.id is null or a.amount<e.amount then raise exception 'পর্যাপ্ত ব্যালেন্স নেই'; end if;
  insert into transactions(receipt_no,party_name,party_code,amount,type,payment_method,note)
  values(e.voucher_no,'সমিতি খরচ','EXP',e.amount,'expense',method,e.category||': '||e.title) returning id into tid;
  update expenses set transaction_id=tid,status='approved' where id=e.id;
  update cash_accounts set amount=amount-e.amount,updated_at=now() where id=a.id;
end; $$;

create or replace function public.auto_approve_eligible()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  cfg jsonb:=coalesce((select info from somiti_settings where id=1),'{}'::jsonb);
  threshold numeric:=coalesce((cfg->>'autoApproveThreshold')::numeric,5000);
  r record; n int:=0; total numeric:=0;
begin
  perform require_admin();
  if not coalesce((cfg->>'autoApproveEnabled')::boolean,true) then raise exception 'স্বয়ংক্রিয় অনুমোদন বন্ধ আছে'; end if;
  for r in select * from approvals where status='pending' and type='expense' and expense_id is not null and amount<=threshold order by created_at for update loop
    perform post_expense(r.expense_id);
    update approvals set status='approved',decided_by=auth.uid(),decided_by_name=my_name(),decided_at=now() where id=r.id;
    n:=n+1; total:=total+r.amount;
    perform write_audit('approval_auto_approved',jsonb_build_object('approval_id',r.id,'amount',r.amount));
  end loop;
  return jsonb_build_object('approved_count',n,'total_amount',total);
end; $$;

-- Record when a project closes; annual profit includes both gains and realized losses.
create or replace function public.track_project_completion()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from new.status) then new.completed_at:=current_date; end if;
  return new;
end; $$;
drop trigger if exists project_completion on projects;
create trigger project_completion before insert or update on projects for each row execute function track_project_completion();
update projects set completed_at=current_date where status='completed' and completed_at is null;

create or replace function public.profit_preview(p_year int default extract(year from current_date)::int)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare proj numeric; exp numeric; dep numeric; done boolean; shares jsonb;
begin
  perform require_staff();
  if p_year<2000 or p_year>extract(year from current_date)::int then raise exception 'হিসাব বছর সঠিক নয়'; end if;
  select coalesce(sum(
    greatest(coalesce(r.until_year,0)-p.invested_amount,0)-greatest(coalesce(r.before_year,0)-p.invested_amount,0)
    -case when p.status='completed' and extract(year from p.completed_at)::int=p_year then greatest(p.invested_amount-coalesce(r.until_year,0),0) else 0 end),0)
  into proj from projects p left join lateral (
    select sum(amount) filter(where extract(year from date)::int<=p_year) until_year,
      sum(amount) filter(where extract(year from date)::int<p_year) before_year
    from transactions where project_id=p.id and type='profit') r on true;
  select coalesce(sum(amount),0) into exp from transactions where type='expense' and extract(year from date)::int=p_year;
  select coalesce(sum(total_deposit),0) into dep from members where deleted_at is null and status<>'inactive';
  select exists(select 1 from profit_distributions where year=p_year) into done;
  select coalesce(jsonb_agg(jsonb_build_object('memberId',m.id,'name',m.name,'code',m.code,'baseDeposit',m.total_deposit,
    'share',s.share) order by m.code),'[]'::jsonb) into shares from members m left join profit_shares s on s.member_id=m.id and s.year=p_year
    where m.deleted_at is null and (s.member_id is not null or m.status<>'inactive');
  if done then
    return (select jsonb_build_object('year',year,'projectProfit',project_profit,'expenses',expenses,'netProfit',net_profit,
      'totalDeposit',(select coalesce(sum(base_deposit),0) from profit_shares where year=p_year),'alreadyDistributed',true,
      'distributed',distributed,'reservePct',reserve_pct,'managementPct',management_pct,'shares',shares) from profit_distributions where year=p_year);
  end if;
  return jsonb_build_object('year',p_year,'projectProfit',proj,'expenses',exp,'netProfit',proj-exp,'totalDeposit',dep,'alreadyDistributed',false,'shares',shares);
end; $$;

create or replace function public.distribute_profit(p_year int,p_reserve_pct numeric,p_management_pct numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb; dist numeric; dep numeric; n int; remainder numeric; first_id uuid;
begin
  perform require_admin();
  perform pg_advisory_xact_lock(714206,p_year);
  if exists(select 1 from profit_distributions where year=p_year) then raise exception 'এই বছরের লাভ ইতিমধ্যে বণ্টিত'; end if;
  if p_reserve_pct is null or p_management_pct is null or p_reserve_pct<0 or p_management_pct<0 or p_reserve_pct+p_management_pct>100 then raise exception 'শতাংশ সঠিক নয়'; end if;
  perform 1 from members where deleted_at is null order by id for update;
  v:=profit_preview(p_year); dep:=(v->>'totalDeposit')::numeric;
  if (v->>'netProfit')::numeric<=0 or dep<=0 then raise exception 'বণ্টনযোগ্য লাভ বা সদস্যের জমা নেই'; end if;
  dist:=round((v->>'netProfit')::numeric*(100-p_reserve_pct-p_management_pct)/100,2);
  insert into profit_distributions(year,project_profit,expenses,net_profit,reserve_pct,management_pct,distributed,approved_by_name)
  values(p_year,(v->>'projectProfit')::numeric,(v->>'expenses')::numeric,(v->>'netProfit')::numeric,p_reserve_pct,p_management_pct,dist,my_name());
  insert into profit_shares(year,member_id,base_deposit,share)
  select p_year,id,total_deposit,round(total_deposit/dep*dist,2) from members where deleted_at is null and status<>'inactive' and total_deposit>0;
  get diagnostics n=row_count;
  select dist-coalesce(sum(share),0) into remainder from profit_shares where year=p_year;
  select member_id into first_id from profit_shares where year=p_year order by base_deposit desc,member_id limit 1;
  update profit_shares set share=share+remainder where year=p_year and member_id=first_id;
  update members m set profit_balance=m.profit_balance+s.share,profit_2025=s.share,last_profit_year=p_year,
    total_deposit=m.total_deposit+s.share,updated_at=now() from profit_shares s where s.year=p_year and s.member_id=m.id;
  perform write_audit('profit_distributed',jsonb_build_object('year',p_year,'amount',dist,'members',n));
  return jsonb_build_object('year',p_year,'distributed',dist,'members',n);
end; $$;

revoke execute on function public.refresh_member_dues(uuid),public.post_expense(uuid),public.track_project_completion() from public,anon,authenticated;
revoke execute on function public.auto_approve_eligible(),public.log_sms(text,text,text,text,uuid,text,text,jsonb) from public,anon;
grant execute on function public.auto_approve_eligible(),public.log_sms(text,text,text,text,uuid,text,text,jsonb) to authenticated;

-- Reconcile missing configuration key from the old settings screen.
update somiti_settings set info=info||jsonb_build_object('autoApproveThreshold',coalesce(info->'autoApproveThreshold',info->'autoApproveLimit','5000'::jsonb)) where id=1;
commit;
