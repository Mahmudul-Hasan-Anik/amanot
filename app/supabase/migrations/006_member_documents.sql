begin;
alter table public.members add column if not exists avatar_path text;
alter table public.members add column if not exists nid_path text;
grant select(avatar_path,nid_path) on public.members to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('member-documents','member-documents',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;

drop policy if exists member_documents_read on storage.objects;
create policy member_documents_read on storage.objects for select to authenticated
using(bucket_id='member-documents' and (public.is_staff() or (storage.foldername(name))[1]=public.my_member_id()::text));
drop policy if exists member_documents_insert on storage.objects;
create policy member_documents_insert on storage.objects for insert to authenticated
with check(bucket_id='member-documents' and public.is_staff() and exists(select 1 from public.members where id::text=(storage.foldername(name))[1] and deleted_at is null));
drop policy if exists member_documents_update on storage.objects;
create policy member_documents_update on storage.objects for update to authenticated
using(bucket_id='member-documents' and public.is_staff()) with check(bucket_id='member-documents' and public.is_staff());

create or replace function public.set_member_documents(p_member_id uuid,p_avatar_path text default null,p_nid_path text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform require_staff();
  if not exists(select 1 from members where id=p_member_id and deleted_at is null) then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if p_avatar_path is not null and split_part(p_avatar_path,'/',1)<>p_member_id::text
    or p_nid_path is not null and split_part(p_nid_path,'/',1)<>p_member_id::text then raise exception 'নথির ঠিকানা সঠিক নয়'; end if;
  update members set avatar_path=coalesce(p_avatar_path,avatar_path),nid_path=coalesce(p_nid_path,nid_path),updated_at=now() where id=p_member_id;
  perform write_audit('member_documents_updated',jsonb_build_object('member_id',p_member_id));
end; $$;
revoke execute on function public.set_member_documents(uuid,text,text) from public,anon;
grant execute on function public.set_member_documents(uuid,text,text) to authenticated;
commit;
