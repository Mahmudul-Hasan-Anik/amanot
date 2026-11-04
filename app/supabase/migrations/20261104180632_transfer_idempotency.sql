-- Idempotent transfers and explicit endpoints for accurate account activity.
begin;
do $$ begin if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc;perform set_config('amanot.transfer_restore_create','true',true);end if;end $$;

alter table public.transactions add column if not exists transfer_from text;
alter table public.transactions add column if not exists transfer_to text;

create or replace function public.transfer_cash_once(p jsonb)
returns public.transactions language plpgsql security definer set search_path=public as $$
declare pid uuid;src text;dst text;amt numeric;memo text;t transactions%rowtype;a cash_accounts%rowtype;
begin
 perform require_entry_role();
 pid:=(p->>'id')::uuid;src:=p->>'from';dst:=p->>'to';amt:=(p->>'amount')::numeric;memo:=trim(coalesce(p->>'note',''));
 if pid is null or src is null or dst is null or src=dst or amt is null or amt<=0 or amt<>round(amt,2) or amt>9999999999.99 or length(memo)>500 then
  raise exception 'স্থানান্তরের তথ্য সঠিক নয় / Invalid transfer';
 end if;
 -- Serialize retries, including callers racing before the first insert exists.
 perform pg_advisory_xact_lock(hashtextextended(current_somiti_id()::text||':'||pid::text,0));
 select * into t from transactions where id=pid;
 if t.id is not null then
  if t.type<>'transfer' or t.transfer_from is distinct from src or t.transfer_to is distinct from dst or t.amount<>amt or coalesce(t.note,'')<>memo then
   raise exception 'Request ID already used';
  end if;
  return t;
 end if;
 -- Consistent ordering avoids opposing account transfers deadlocking.
 perform 1 from cash_accounts where id in (src,dst) order by id for update;
 select * into a from cash_accounts where id=src;
 if a.id is null or not exists(select 1 from cash_accounts where id=dst) then raise exception 'হিসাব পাওয়া যায়নি / Account unavailable';end if;
 if a.amount<amt then raise exception 'পর্যাপ্ত ব্যালেন্স নেই / Insufficient funds';end if;
 insert into transactions(id,receipt_no,party_name,party_code,amount,type,payment_method,note,date,created_by,transfer_from,transfer_to)
 values(pid,next_receipt(),'হিসাব স্থানান্তর','TRF',amt,'transfer','cash',memo,investment_business_date(),rpc_caller_id(),src,dst) returning * into t;
 update cash_accounts set amount=amount-amt,updated_at=now() where id=src;
 update cash_accounts set amount=amount+amt,updated_at=now() where id=dst;
 perform write_audit('cash_transfer',jsonb_build_object('transaction_id',pid,'from',src,'to',dst,'amount',amt));
 return t;
end $$;
alter function public.transfer_cash_once(jsonb) owner to amanot_rpc;
revoke all on function public.transfer_cash_once(jsonb) from public,anon;
grant execute on function public.transfer_cash_once(jsonb) to authenticated;
do $$ begin if current_setting('amanot.transfer_restore_create',true)='true' then revoke create on schema public from amanot_rpc;end if;end $$;
notify pgrst,'reload schema';
commit;
