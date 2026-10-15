-- Allow deposit collection date override and custom remarks/comments.
-- If p_date is omitted or null, current_date is used.
begin;

create or replace function public.record_deposit(
  p_member_id uuid,
  p_months text[],
  p_base_amount numeric,
  p_late_fee numeric,
  p_total_amount numeric,
  p_payment_method text,
  p_trx_id text default null,
  p_note text default null,
  p_id uuid default null,
  p_date date default null
)
returns transactions language plpgsql security definer set search_path=public as $$
declare
  m members%rowtype; t transactions%rowtype; ms jsonb; credit numeric;
begin
  perform require_staff();
  if p_total_amount is null or p_total_amount<=0 or p_base_amount is null or p_base_amount<0
    or coalesce(p_late_fee,0)<>0 or p_base_amount<>p_total_amount then
    raise exception 'জমার হিসাব সঠিক নয় বা বিলম্ব ফি বন্ধ রয়েছে';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash','bank','bkash','nagad') then
    raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়';
  end if;
  select * into m from members where id=p_member_id and deleted_at is null for update;
  if m.id is null or m.status='inactive' then raise exception 'সক্রিয় সদস্য পাওয়া যায়নি'; end if;
  if p_id is not null then
    select * into t from transactions where id=p_id;
    if t.id is not null then
      if t.type<>'deposit' or t.member_id<>p_member_id or t.amount<>p_total_amount then
        raise exception 'এই জমার আইডি ইতিমধ্যে ব্যবহৃত';
      end if;
      return t;
    end if;
  end if;
  if not exists(select 1 from cash_accounts where id=account_for(p_payment_method)) then
    raise exception 'হিসাব পাওয়া যায়নি';
  end if;

  -- Voluntary contributions: no installment allocation or late fee.
  ms:=coalesce(m.months_status,'{}'::jsonb); credit:=m.partial_credit;

  insert into transactions(id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,trx_id,note,months,late_fee,date)
  values(
    coalesce(p_id,gen_random_uuid()),
    next_receipt(),
    m.id,
    m.name,
    m.code,
    p_total_amount,
    'deposit',
    p_payment_method,
    nullif(trim(p_trx_id),''),
    coalesce(nullif(trim(p_note),''),'জমা'),
    array[]::text[],
    0,
    coalesce(p_date, current_date)
  ) returning * into t;

  update members set total_deposit=total_deposit+p_base_amount,months_status=ms,partial_credit=credit,updated_at=now() where id=m.id;
  perform refresh_member_dues(m.id);
  update cash_accounts set amount=amount+p_total_amount,updated_at=now() where id=account_for(p_payment_method);
  perform write_audit('deposit_recorded',jsonb_build_object('transaction_id',t.id,'member',m.code,'amount',p_total_amount,'date',t.date));
  return t;
end; $$;

grant execute on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date) to authenticated;

-- Backward-compatibility wrapper for 9-argument callers
create or replace function public.record_deposit(
  p_member_id uuid,
  p_months text[],
  p_base_amount numeric,
  p_late_fee numeric,
  p_total_amount numeric,
  p_payment_method text,
  p_trx_id text default null,
  p_note text default null,
  p_id uuid default null
)
returns transactions language sql security definer set search_path=public as $$
  select public.record_deposit(p_member_id,p_months,p_base_amount,p_late_fee,p_total_amount,p_payment_method,p_trx_id,p_note,p_id,null::date);
$$;

grant execute on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid) to authenticated;

commit;
