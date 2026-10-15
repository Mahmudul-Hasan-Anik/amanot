-- Optional parent names; creating a member never collects an admission fee.
-- Historical deposits and existing members remain unchanged.
begin;
alter table public.members add column if not exists father_name text;
alter table public.members add column if not exists mother_name text;
grant select(father_name,mother_name) on public.members to authenticated;

-- Patch the deployed RPCs so their caller identity, tenant, PIN and audit
-- checks and amanot_rpc ownership remain in place. Fail on unexpected source.
do $$ declare definition text; first_pos int; last_pos int; begin
 definition:=pg_get_functiondef('public.add_member(jsonb)'::regprocedure);
 if position('fatherName' in definition)=0 then
  if position('memberCategory' in definition)=0 then raise exception 'Apply migration 016 first'; end if;
  first_pos:=strpos(definition,'  if v_fee > 0 then');
  last_pos:=strpos(definition,'  perform public.refresh_member_dues(v_m.id);');
  if first_pos=0 or last_pos<=first_pos then raise exception 'Unexpected admission fee block; review migration'; end if;
  definition:=left(definition,first_pos-1)||substr(definition,last_pos);
  definition:=replace(definition,'  v_fee numeric := coalesce((p->>''admissionFee'')::numeric, 0);','');
  definition:=replace(definition,'name, name_en, phone,','name, name_en, father_name, mother_name, phone,');
  definition:=replace(definition,'nullif(p->>''nameEn'',''''),','nullif(p->>''nameEn'',''''), nullif(trim(p->>''fatherName''),''''), nullif(trim(p->>''motherName''),''''),');
  if position('father_name, mother_name' in definition)=0 or position('admissionFee' in definition)>0 or position('v_fee' in definition)>0 then raise exception 'Member details patch failed'; end if;
  execute definition;
 end if;
 definition:=pg_get_functiondef('public.update_member(uuid,jsonb)'::regprocedure);
 if position('fatherName' in definition)=0 then
  if position('  update members set' in definition)=0 or position('memberCategory' in definition)=0 then raise exception 'Unexpected update_member source'; end if;
  definition:=replace(definition,'  update members set',$patch$  update members set
    father_name = case when p ? 'fatherName' then nullif(trim(p->>'fatherName'),'') else father_name end,
    mother_name = case when p ? 'motherName' then nullif(trim(p->>'motherName'),'') else mother_name end,$patch$);
  execute definition;
 end if;
end $$;
commit;
