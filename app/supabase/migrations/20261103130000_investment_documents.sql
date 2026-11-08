-- Investment documents: contract, site photos and receipts for every investment
-- (contract-based and older projects). Files live in a private bucket under
-- <project_id>/<uuid>.<ext>; the table keeps the list per society.
-- Paste into Supabase > SQL Editor and Run. Safe to run more than once.
begin;
do $$ begin if not has_schema_privilege('amanot_rpc','public','CREATE') then
 grant create on schema public to amanot_rpc;perform set_config('amanot.m027_restore_create','true',true);end if;end $$;

create table if not exists public.investment_documents(
 id uuid primary key,
 somiti_id uuid not null default public.current_somiti_id() references public.somitis(id),
 project_id uuid not null,
 kind text not null check(kind in ('contract','photo','receipt','other')),
 path text not null unique,
 file_name text not null default '',
 content_type text not null,
 size_bytes integer not null check(size_bytes>0 and size_bytes<=5242880),
 created_by uuid, created_by_name text,
 created_at timestamptz not null default now(),
 deleted_at timestamptz, deleted_by_name text,
 unique(somiti_id,id),
 foreign key(somiti_id,project_id) references public.projects(somiti_id,id)
);
create index if not exists investment_documents_project_idx on public.investment_documents(somiti_id,project_id,created_at desc) where deleted_at is null;
alter table public.investment_documents enable row level security;
alter table public.investment_documents force row level security;
revoke all on public.investment_documents from public,anon,authenticated;
grant select on public.investment_documents to authenticated;
grant select,insert,update on public.investment_documents to amanot_rpc;
drop policy if exists tenant_boundary on public.investment_documents;
create policy tenant_boundary on public.investment_documents as restrictive for all to authenticated,amanot_rpc
 using(somiti_id=(select current_somiti_id())) with check(somiti_id=(select current_somiti_id()));
drop policy if exists staff_read on public.investment_documents;
create policy staff_read on public.investment_documents for select to authenticated using((select session_ready()) and (select is_staff()));
drop policy if exists rpc_access on public.investment_documents;
create policy rpc_access on public.investment_documents for all to amanot_rpc using(true) with check(true);

-- Private bucket: images and PDF, at most 5 MB each.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('investment-documents','investment-documents',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;

-- Staff of the same society only; the first folder must be one of its projects.
drop policy if exists investment_documents_read on storage.objects;
create policy investment_documents_read on storage.objects for select to authenticated
using(bucket_id='investment-documents' and (select public.is_staff())
  and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[1] and p.somiti_id=(select public.current_somiti_id())));
drop policy if exists investment_documents_insert on storage.objects;
create policy investment_documents_insert on storage.objects for insert to authenticated
with check(bucket_id='investment-documents' and (select public.is_staff())
  and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[1] and p.somiti_id=(select public.current_somiti_id())));

create or replace function public.add_investment_document(p jsonb)
returns investment_documents language plpgsql security definer set search_path=public as $$
declare r investment_documents%rowtype; did uuid; pid uuid; v_path text; v_kind text; v_type text; v_size integer;
begin
 perform require_entry_role();
 did:=(p->>'id')::uuid; pid:=(p->>'projectId')::uuid; v_path:=p->>'path'; v_kind:=coalesce(p->>'kind','other');
 v_type:=p->>'contentType'; v_size:=(p->>'size')::integer;
 if did is null or pid is null then raise exception 'ডকুমেন্টের তথ্য সঠিক নয় / Invalid document'; end if;
 select * into r from investment_documents where id=did; if r.id is not null then return r; end if;
 if not exists(select 1 from projects where id=pid) then raise exception 'বিনিয়োগ পাওয়া যায়নি'; end if;
 if v_path is null or split_part(v_path,'/',1)<>pid::text or v_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$'
   or v_kind not in ('contract','photo','receipt','other')
   or v_type not in ('image/jpeg','image/png','image/webp','application/pdf')
   or v_size is null or v_size<=0 or v_size>5242880 then raise exception 'ডকুমেন্টের তথ্য সঠিক নয় / Invalid document'; end if;
 insert into investment_documents(id,project_id,kind,path,file_name,content_type,size_bytes,created_by,created_by_name)
 values(did,pid,v_kind,v_path,left(coalesce(p->>'fileName',''),200),v_type,v_size,rpc_caller_id(),my_name()) returning * into r;
 perform write_audit('investment_document_added',jsonb_build_object('project_id',pid,'document_id',did,'kind',v_kind));
 return r;
end $$;

create or replace function public.remove_investment_document(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare r investment_documents%rowtype;
begin
 perform require_entry_role();
 select * into r from investment_documents where id=p_id and deleted_at is null;
 if r.id is null then return; end if;
 update investment_documents set deleted_at=now(),deleted_by_name=my_name() where id=p_id;
 perform write_audit('investment_document_removed',jsonb_build_object('project_id',r.project_id,'document_id',p_id,'kind',r.kind));
end $$;

alter function public.add_investment_document(jsonb) owner to amanot_rpc;
alter function public.remove_investment_document(uuid) owner to amanot_rpc;
revoke all on function public.add_investment_document(jsonb) from public,anon;
revoke all on function public.remove_investment_document(uuid) from public,anon;
grant execute on function public.add_investment_document(jsonb) to authenticated;
grant execute on function public.remove_investment_document(uuid) to authenticated;
do $$ begin if current_setting('amanot.m027_restore_create',true)='true' then revoke create on schema public from amanot_rpc;end if;end $$;
notify pgrst,'reload schema';
commit;
