-- Physical receipt-book numbers are chosen by the cashier.  They are not the
-- internal transaction/voucher identifiers and each collection book advances
-- independently.
begin;

alter table public.transactions add column if not exists book_receipt_no text;
alter table public.transactions add column if not exists book_receipt_series text;
alter table public.transactions drop constraint if exists transactions_book_receipt_series_check;
alter table public.transactions add constraint transactions_book_receipt_series_check
  check(book_receipt_series is null or book_receipt_series in ('savings','installment'));
create unique index if not exists transactions_book_receipt_unique
  on public.transactions(somiti_id,book_receipt_series,book_receipt_no)
  where book_receipt_no is not null;

create or replace function public.next_collection_receipt(p_series text)
returns text language plpgsql security definer set search_path=public as $$
declare n numeric;
begin
  perform require_staff();
  if p_series not in ('savings','installment') then raise exception 'Unknown receipt book'; end if;
  select max(book_receipt_no::numeric) into n from transactions
    where somiti_id=current_somiti_id() and book_receipt_series=p_series
      and book_receipt_no ~ '^[0-9]+$';
  return case when n is null then '' else (n+1)::text end;
end $$;
alter function public.next_collection_receipt(text) owner to amanot_rpc;
revoke all on function public.next_collection_receipt(text) from public,anon;
grant execute on function public.next_collection_receipt(text) to authenticated;

-- A new, unambiguous 11-argument entry point preserves old callers while
-- recording the number written in the savings book.
create or replace function public.record_deposit(
  p_member_id uuid,p_months text[],p_base_amount numeric,p_late_fee numeric,p_total_amount numeric,
  p_payment_method text,p_trx_id text,p_note text,p_id uuid,p_date date,p_book_receipt_no text
) returns transactions language plpgsql security definer set search_path=public as $$
declare m members%rowtype;t transactions%rowtype;ms jsonb;credit numeric;book_no text:=nullif(trim(p_book_receipt_no),'');
begin
  perform require_staff();
  if p_total_amount is null or p_total_amount<=0 or p_base_amount is null or p_base_amount<0 or coalesce(p_late_fee,0)<>0 or p_base_amount<>p_total_amount then raise exception 'জমার হিসাব সঠিক নয় বা বিলম্ব ফি বন্ধ রয়েছে';end if;
  if p_payment_method is null or p_payment_method not in ('cash','bank','bkash','nagad') then raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়';end if;
  if book_no is null or length(book_no)>50 then raise exception 'চাঁদা বইয়ের রশিদ নম্বর দিন';end if;
  select * into m from members where id=p_member_id and deleted_at is null for update;
  if m.id is null then raise exception 'সদস্য পাওয়া যায়নি';end if;
  if p_id is not null then select * into t from transactions where id=p_id;if t.id is not null then return t;end if;end if;
  if not exists(select 1 from cash_accounts where id=account_for(p_payment_method)) then raise exception 'হিসাব পাওয়া যায়নি';end if;
  ms:=coalesce(m.months_status,'{}'::jsonb);credit:=m.partial_credit;
  insert into transactions(id,receipt_no,book_receipt_no,book_receipt_series,member_id,party_name,party_code,amount,type,payment_method,trx_id,note,months,late_fee,date)
  values(coalesce(p_id,gen_random_uuid()),next_receipt(),book_no,'savings',m.id,m.name,m.code,p_total_amount,'deposit',p_payment_method,nullif(trim(p_trx_id),''),coalesce(nullif(trim(p_note),''),'জমা'),array[]::text[],0,coalesce(p_date,investment_business_date())) returning * into t;
  update members set total_deposit=total_deposit+p_base_amount,months_status=ms,partial_credit=credit,updated_at=now() where id=m.id;
  perform refresh_member_dues(m.id);update members set status='paid',updated_at=now() where id=m.id and status='inactive';
  update cash_accounts set amount=amount+p_total_amount,updated_at=now() where id=account_for(p_payment_method);
  perform write_audit('deposit_recorded',jsonb_build_object('transaction_id',t.id,'member',m.code,'amount',p_total_amount,'book_receipt',book_no,'date',t.date));return t;
end $$;
alter function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date,text) owner to amanot_rpc;
revoke all on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date,text) from public,anon;
grant execute on function public.record_deposit(uuid,text[],numeric,numeric,numeric,text,text,text,uuid,date,text) to authenticated;

-- Add the installment-book number without changing the existing financial logic.
do $$ declare d text; begin
  d:=pg_get_functiondef('public.collect_investment_payment(jsonb)'::regprocedure);
  if position('book_receipt_series' in d)=0 then
    d:=replace(d,'amount numeric; principal_part numeric; profit_part numeric; d date; method text; pid uuid; eid uuid;',
      'amount numeric; principal_part numeric; profit_part numeric; d date; method text; pid uuid; eid uuid; book_no text;');
    d:=replace(d,'amount:=(p->>''amount'')::numeric;d:=(p->>''date'')::date;method:=p->>''paymentMethod'';',
      'amount:=(p->>''amount'')::numeric;d:=(p->>''date'')::date;method:=p->>''paymentMethod'';book_no:=nullif(trim(p->>''bookReceiptNo''),'''');if book_no is null or length(book_no)>50 then raise exception ''কিস্তি বইয়ের রশিদ নম্বর দিন'';end if;');
    d:=replace(d,'insert into transactions(id,receipt_no,project_id,party_name,party_code,date,amount,type,payment_method,note,created_by,principal_part,profit_part)',
      'insert into transactions(id,receipt_no,book_receipt_no,book_receipt_series,project_id,party_name,party_code,date,amount,type,payment_method,note,created_by,principal_part,profit_part)');
    d:=replace(d,'values(eid,next_receipt(),pid,c.recipient_name,c.contract_no,d,amount,''profit'',method,',
      'values(eid,next_receipt(),book_no,''installment'',pid,c.recipient_name,c.contract_no,d,amount,''profit'',method,');
    execute d;
  end if;
end $$;

create or replace function public.app_build_version() returns integer language sql immutable as $$select 24$$;
notify pgrst,'reload schema';
commit;
