-- Proposal and approval are non-financial; disbursement is one atomic posting.
begin;
do $$ begin
 if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc; perform set_config('amanot.m021_restore_create','true',true); end if;
end $$;
create table if not exists public.investment_proposals (
 id uuid primary key, somiti_id uuid not null default public.current_somiti_id() references public.somitis(id),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','disbursed')),
 payload jsonb not null, submitted_by uuid not null, decided_by uuid, disbursed_by uuid,
 created_at timestamptz not null default now(), approved_at timestamptz, disbursed_at timestamptz,
 decision_note text not null default '', unique(somiti_id,id)
);
alter table public.investment_proposals enable row level security;
alter table public.investment_proposals force row level security;
revoke all on public.investment_proposals from public,anon,authenticated;
grant select on public.investment_proposals to authenticated;
grant select,insert,update,delete on public.investment_proposals to amanot_rpc;
drop policy if exists tenant_boundary on public.investment_proposals;
create policy tenant_boundary on public.investment_proposals as restrictive for all to authenticated,amanot_rpc
 using(somiti_id=(select public.current_somiti_id())) with check(somiti_id=(select public.current_somiti_id()));
drop policy if exists staff_read on public.investment_proposals;
create policy staff_read on public.investment_proposals for select to authenticated using((select public.is_staff()));
drop policy if exists rpc_access on public.investment_proposals;
create policy rpc_access on public.investment_proposals for all to amanot_rpc using(true) with check(true);
drop trigger if exists amanot_sync_changed on public.investment_proposals;
create trigger amanot_sync_changed after insert or update or delete on public.investment_proposals for each row execute function public.bump_sync_revision();
create or replace function public.validate_investment_proposal(p jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare m members%rowtype; principal numeric; pct numeric; profit numeric; months integer; disbursed date; first_due date;
 recipient text; method text; phone text; mid uuid; contacts jsonb; contact jsonb;
begin
  principal:=(p->>'principal')::numeric; pct:=(p->>'profitPct')::numeric;
  months:=(p->>'termMonths')::integer; disbursed:=(p->>'disbursedDate')::date; first_due:=(p->>'firstDueDate')::date;
  if principal is null or principal<=0 or principal>999999999999.99 or principal<>round(principal,2)
    or pct is null or pct<0 or pct>100 or pct<>round(pct,4) or months is null or months not between 1 and 120 then raise exception 'বিনিয়োগের শর্ত সঠিক নয়'; end if;
  profit:=round(principal*pct/100,2);
  if (principal+profit)*100<months or principal+profit>999999999999.99 then raise exception 'বিনিয়োগের পরিমাণ বেশি'; end if;
  if disbursed is null then raise exception 'প্রস্তাবিত তারিখ দিন'; end if;
  if first_due is null or first_due<disbursed then raise exception 'প্রথম কিস্তির তারিখ সঠিক নয়'; end if;
  method:=p->>'paymentMethod';
  if method is null or method not in ('cash','bank','bkash','nagad') then raise exception 'পেমেন্ট পদ্ধতি সঠিক নয়'; end if;
  recipient:=trim(p->>'recipientName');phone:=norm_phone(p->>'phone');
  if coalesce(recipient,'')='' or phone !~ '^01[3-9][0-9]{8}$' then raise exception 'গ্রহীতার নাম ও ফোন দিন'; end if;
  if coalesce(p->>'whatsapp','')<>'' and norm_phone(p->>'whatsapp') !~ '^01[3-9][0-9]{8}$' then raise exception 'WhatsApp নম্বর সঠিক নয়'; end if;
  mid:=nullif(p->>'memberId','')::uuid;
  if mid is not null then
    select * into m from members where id=mid and deleted_at is null and status<>'inactive';
    if m.id is null then raise exception 'সক্রিয় সদস্য পাওয়া যায়নি'; end if;
    recipient:=m.name;
  end if;
  contacts:=p->'contacts';
  if contacts is null or jsonb_typeof(contacts)<>'array' then raise exception 'জরুরি যোগাযোগের তথ্য দিন'; end if;
  if jsonb_array_length(contacts) not between 1 and 3 then raise exception '১ থেকে ৩ জন জরুরি যোগাযোগ দিন'; end if;
  for contact in select value from jsonb_array_elements(contacts) loop
    if coalesce(trim(contact->>'name'),'')='' or coalesce(trim(contact->>'relation'),'')='' or norm_phone(contact->>'phone') !~ '^01[3-9][0-9]{8}$' then raise exception 'জরুরি যোগাযোগের নাম, সম্পর্ক ও ফোন দিন'; end if;
  end loop;
  if coalesce(trim(p->>'nid'),'')='' or translate(trim(p->>'nid'),'০১২৩৪৫৬৭৮৯','0123456789') !~ '^[0-9]+$'
    or coalesce(trim(p->>'fatherName'),'')='' or coalesce(trim(p->>'motherName'),'')='' then raise exception 'NID নম্বর, বাবার নাম ও মায়ের নাম আবশ্যক'; end if;

end $$;
-- Retain original atomic posting internally; older APK cannot bypass approval.
do $$ begin
 if to_regprocedure('public.post_approved_investment(jsonb)') is null then
 alter function public.create_investment_contract(jsonb) rename to post_approved_investment;
 end if;
end $$;
revoke all on function public.post_approved_investment(jsonb) from public,anon,authenticated;
create or replace function public.create_investment_contract(p jsonb)
returns public.projects language plpgsql security definer set search_path=public as $$
begin raise exception 'নতুন বিনিয়োগের জন্য প্রস্তাব, অনুমোদন ও টাকা প্রদান ধাপ ব্যবহার করুন'; end $$;
create or replace function public.submit_investment_proposal(p jsonb)
returns investment_proposals language plpgsql security definer set search_path=public as $$
declare r investment_proposals%rowtype; pid uuid;
begin
 perform require_admin(); pid:=(p->>'id')::uuid;
 if pid is null then raise exception 'Request ID required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(current_somiti_id()::text||pid::text,0));
 select * into r from investment_proposals where id=pid;
 if r.id is not null then
  if r.payload is distinct from p then raise exception 'এই আইডির অনুরোধের তথ্য ভিন্ন'; end if;
  return r;
 end if;
 if exists(select 1 from projects where id=pid) then raise exception 'এই আইডি ইতোমধ্যে ব্যবহৃত হয়েছে'; end if;
 perform validate_investment_proposal(p);
 insert into investment_proposals(id,payload,submitted_by) values(pid,p,rpc_caller_id()) returning * into r;
 perform write_audit('investment_proposed',jsonb_build_object('investment_id',pid)); return r;
end $$;
create or replace function public.decide_investment_proposal(p_id uuid,p_approve boolean,p_note text default '')
returns investment_proposals language plpgsql security definer set search_path=public as $$
declare r investment_proposals%rowtype; target text;
begin
 perform require_admin();
 if p_approve is null then raise exception 'Decision required'; end if;
 target:=case when p_approve then 'approved' else 'rejected' end;
 select * into r from investment_proposals where id=p_id for update;
 if r.id is null then raise exception 'প্রস্তাব পাওয়া যায়নি'; end if;
 if r.status=target and r.decision_note=coalesce(trim(p_note),'') then return r; end if;
 if r.status<>'submitted' then raise exception 'শুধু অপেক্ষমাণ প্রস্তাবের সিদ্ধান্ত দেওয়া যাবে'; end if;
 if not p_approve and coalesce(trim(p_note),'')='' then raise exception 'প্রত্যাখ্যানের কারণ দিন'; end if;
 update investment_proposals set status=target,decided_by=rpc_caller_id(),approved_at=now(),decision_note=coalesce(trim(p_note),'') where id=p_id returning * into r;
 perform write_audit('investment_'||target,jsonb_build_object('investment_id',p_id,'reason',r.decision_note)); return r;
end $$;
create or replace function public.disburse_investment_proposal(p_id uuid,p_date date,p_first_due date,p_method text)
returns projects language plpgsql security definer set search_path=public as $$
declare r investment_proposals%rowtype; pr projects%rowtype; p jsonb;
begin
 perform require_admin();
 select * into r from investment_proposals where id=p_id for update;
 if r.id is null then raise exception 'প্রস্তাব পাওয়া যায়নি'; end if;
 p:=r.payload||jsonb_build_object('disbursedDate',p_date::text,'firstDueDate',p_first_due::text,'paymentMethod',p_method);
 if r.status='disbursed' then
  if not exists(select 1 from investment_contracts where id=p_id and request_payload=p) then raise exception 'টাকা প্রদানের তথ্য ভিন্ন'; end if;
  select * into pr from projects where id=p_id;return pr;
 end if;
 if r.status<>'approved' then raise exception 'প্রথমে প্রস্তাব অনুমোদন করতে হবে'; end if;
 perform validate_investment_proposal(p);
 pr:=post_approved_investment(p);
 update investment_proposals set status='disbursed',disbursed_by=rpc_caller_id(),disbursed_at=now() where id=p_id;
 return pr;
end $$;
do $$ declare sig text; begin
 foreach sig in array array['validate_investment_proposal(jsonb)','create_investment_contract(jsonb)','submit_investment_proposal(jsonb)','decide_investment_proposal(uuid,boolean,text)','disburse_investment_proposal(uuid,date,date,text)'] loop
 execute 'alter function public.'||sig||' owner to amanot_rpc';
 execute 'revoke all on function public.'||sig||' from public,anon,authenticated';
 if sig<>'validate_investment_proposal(jsonb)' then execute 'grant execute on function public.'||sig||' to authenticated'; end if;
 end loop;
end $$;
-- Remove proposal copies when a person/society exercises account deletion.
do $$ declare definition text; begin
 definition:=pg_get_functiondef('public.delete_my_account(text,boolean,text)'::regprocedure);
 if position('delete from public.investment_proposals' in definition)=0 then
 definition:=replace(definition,'delete from auth.sessions where user_id=any(v_users);',
 'delete from public.investment_proposals where somiti_id=p.somiti_id and (p_close_society or nullif(payload->>''memberId'','''')::uuid=any(v_ids));
 delete from auth.sessions where user_id=any(v_users);');
 if position('delete from public.investment_proposals' in definition)=0 then raise exception 'Privacy guard failed'; end if;
 execute definition;
 end if;
end $$;
do $$ begin if current_setting('amanot.m021_restore_create',true)='true' then revoke create on schema public from amanot_rpc; end if; end $$;
notify pgrst,'reload schema';
commit;
