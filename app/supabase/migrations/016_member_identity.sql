-- Manual membership identity. Existing codes/numbers and accounting rows are not rewritten.
begin;
alter table public.members add column if not exists member_category text;
alter table public.members add column if not exists member_number text;
create or replace function public.member_display_code(category text,number text)
returns text language plpgsql immutable set search_path=public as $$
declare prefix text;
begin
  prefix:=case category when 'general' then 'M' when 'shareholder' then 'S' when 'director' then 'D' end;
  if prefix is null or number is null or number !~ '^[0-9]+$' then
    raise exception 'ক্যাটাগরি ও শুধু সংখ্যায় সদস্য নম্বর দিন। / Select category and enter digits-only member number.' using errcode='22023';
  end if;
  return prefix||'-'||number;
end $$;
revoke all on function public.member_display_code(text,text) from public,anon,authenticated;
grant execute on function public.member_display_code(text,text) to amanot_rpc;

do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.members'::regclass and conname='members_identity_valid') then
  alter table public.members add constraint members_identity_valid check(
    (member_category is null and member_number is null) or
    (member_category is not null and member_category in ('general','shareholder','director') and member_number is not null and member_number ~ '^[0-9]+$'));
 end if;
end $$;
-- Legacy SM/M/S/D suffixes remain reserved, including soft-deleted accounts.
-- If legacy suffixes conflict, fail atomically for review instead of renumbering.
create unique index if not exists members_number_identity_uq on public.members
 (somiti_id,(coalesce(member_number,substring(code from '^(?:SM|M|S|D)-([0-9]+)$'))));

grant select(member_category,member_number) on public.members to authenticated;
create or replace function public.enforce_member_identity()
returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and old.member_number is not null then
  if new.member_number is distinct from old.member_number or new.somiti_id is distinct from old.somiti_id then
   raise exception 'সদস্য নম্বর পরিবর্তন করা যাবে না। / Member number is permanent.' using errcode='22023';
  end if;
  if new.member_category is null then raise exception 'Member category is required' using errcode='22023'; end if;
 end if;
 if tg_op='UPDATE' and old.member_number is null and new.member_number is not null and current_user<>'postgres' then
  raise exception 'পুরোনো সদস্যের mapping নিশ্চিত করতে হবে। / Approved legacy mapping is required.' using errcode='22023';
 end if;
 if new.member_number is not null or new.member_category is not null then
  new.code:=public.member_display_code(new.member_category,new.member_number);
 elsif tg_op='UPDATE' and new.code is distinct from old.code then
  raise exception 'Legacy ID is locked pending approved mapping' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function public.enforce_member_identity() from public,anon,authenticated;
drop trigger if exists trg_member_identity on public.members;
create trigger trg_member_identity before insert or update on public.members for each row execute function public.enforce_member_identity();

-- Preserve the currently deployed PIN/dues/tenant RPC implementations and ownership.
do $$ declare definition text; first_pos int; last_pos int; begin
 definition:=pg_get_functiondef('public.add_member(jsonb)'::regprocedure);
 if position('memberCategory' in definition)=0 then
  first_pos:=strpos(definition,'  if v_code is not null and exists');
  last_pos:=strpos(definition,'  insert into members(id, code,');
  if first_pos=0 or last_pos<=first_pos then raise exception 'Unexpected add_member implementation; review before migration'; end if;
  definition:=left(definition,first_pos-1)||$patch$  v_code := public.member_display_code(p->>'memberCategory',p->>'memberNumber');
$patch$||substr(definition,last_pos);
  definition:=replace(definition,'insert into members(id, code,','insert into members(member_category,member_number,id, code,');
  definition:=replace(definition,'values (coalesce(nullif(p->>''id'','''')::uuid, gen_random_uuid()), v_code,','values (p->>''memberCategory'',p->>''memberNumber'',coalesce(nullif(p->>''id'','''')::uuid, gen_random_uuid()), v_code,');
  if position('insert into members(member_category,member_number' in definition)=0 or position('values (p->>''memberCategory''' in definition)=0 then raise exception 'Member identity insert patch failed'; end if;
  execute definition;
 end if;
 definition:=pg_get_functiondef('public.update_member(uuid,jsonb)'::regprocedure);
 if position('memberCategory' in definition)=0 then
  if position('declare v_m members%rowtype;' in definition)=0 or position('  update members set' in definition)=0 then raise exception 'Unexpected update_member implementation; review before migration'; end if;
  definition:=replace(definition,'declare v_m members%rowtype;','declare v_m members%rowtype; v_old_category text; v_number text; v_old_code text;');
  definition:=replace(definition,'  perform public.require_staff();',$patch$  perform public.require_staff();
  select member_category,member_number,code into v_old_category,v_number,v_old_code from members where id=p_id and deleted_at is null;
  if p ? 'memberNumber' and p->>'memberNumber' is distinct from v_number then raise exception 'Member number is permanent' using errcode='22023'; end if;
  if p ? 'code' and p->>'code' is distinct from v_old_code then raise exception 'Member ID is derived from category and number' using errcode='22023'; end if;
  if p ? 'memberCategory' then
   if v_number is null then raise exception 'Approved legacy mapping is required' using errcode='22023'; end if;
   perform public.member_display_code(p->>'memberCategory',v_number);
  end if;
$patch$);
  definition:=replace(definition,'  update members set',$patch$  update members set
    member_category = case when p ? 'memberCategory' then p->>'memberCategory' else member_category end,$patch$);
  definition:=replace(definition,'  v_m.pin_hash:=null; return v_m;',$patch$  if v_old_category is distinct from v_m.member_category then
   perform public.write_audit('member_category_changed',jsonb_build_object('member_id',p_id,'number',v_m.member_number,'from',v_old_category,'to',v_m.member_category));
  end if;
  v_m.pin_hash:=null; return v_m;$patch$);
  execute definition;
 end if;
end $$;
commit;
