begin;

-- 120 KiB, matching the app's 120 KB upload limit. Existing objects are retained.
update storage.buckets set file_size_limit=122880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'], public=false
where id='member-documents';

create or replace function public.is_member_avatar_path(p_path text)
returns boolean language sql immutable set search_path=public as $$
  select coalesce(p_path ~ '^[0-9a-fA-F-]{36}/avatar(-[0-9a-fA-F-]{36})?\.(jpg|jpeg|png|webp)$',false);
$$;

drop policy if exists member_documents_read on storage.objects;
create policy member_documents_read on storage.objects for select to authenticated
using(bucket_id='member-documents' and public.is_member_avatar_path(name)
  and (public.is_staff() or (storage.foldername(name))[1]=public.my_member_id()::text));

drop policy if exists member_documents_insert on storage.objects;
create policy member_documents_insert on storage.objects for insert to authenticated
with check(bucket_id='member-documents' and public.is_staff() and public.is_member_avatar_path(name)
  and exists(select 1 from public.members m where m.id::text=(storage.foldername(storage.objects.name))[1] and m.deleted_at is null));

drop policy if exists member_documents_update on storage.objects;
create policy member_documents_update on storage.objects for update to authenticated
using(bucket_id='member-documents' and public.is_staff() and public.is_member_avatar_path(name))
with check(bucket_id='member-documents' and public.is_staff() and public.is_member_avatar_path(name)
  and exists(select 1 from public.members m where m.id::text=(storage.foldername(storage.objects.name))[1] and m.deleted_at is null));

-- Keep the RPC signature for older apps, but reject all NID attachment writes.
create or replace function public.set_member_documents(p_member_id uuid,p_avatar_path text default null,p_nid_path text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform require_staff();
  if p_nid_path is not null then raise exception 'NID-এর ছবি নেওয়া হয় না; শুধু নম্বর দিন।'; end if;
  if not exists(select 1 from members where id=p_member_id and deleted_at is null) then raise exception 'সদস্য পাওয়া যায়নি'; end if;
  if p_avatar_path is not null and (not public.is_member_avatar_path(p_avatar_path)
    or split_part(p_avatar_path,'/',1)<>p_member_id::text) then raise exception 'ছবির ঠিকানা সঠিক নয়'; end if;
  update members set avatar_path=coalesce(p_avatar_path,avatar_path),updated_at=now() where id=p_member_id;
  perform write_audit('member_avatar_updated',jsonb_build_object('member_id',p_member_id));
end; $$;
revoke execute on function public.set_member_documents(uuid,text,text) from public,anon;
grant execute on function public.set_member_documents(uuid,text,text) to authenticated;

-- This table is created by the reviewed deployment bundle, not the base schema.
do $$ begin
  if to_regclass('public.amanot_schema_versions') is not null then
    insert into public.amanot_schema_versions(version) values('008') on conflict do nothing;
  end if;
end; $$;
commit;
