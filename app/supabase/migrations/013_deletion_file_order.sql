begin;
-- Supabase may retain owner foreign keys on storage objects. Delete bytes via
-- Storage before deleting Auth users; never remove storage metadata with SQL.
create function public.preview_account_deletion(p_pin text,p_close_society boolean default false,p_confirmation text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare p profiles%rowtype; r jsonb; ids uuid[]; v_name text;
begin
  select * into p from profiles where id=auth.uid() and is_active;
  if p.id is null or not public.session_ready() then raise exception 'আবার লগইন করুন।' using errcode='42501'; end if;
  r:=public.confirm_pin_session(p_pin);if not (r->>'ok')::boolean then return r;end if;
  if p_close_society then
    if p.role<>'super_admin' then raise exception 'শুধু সমিতির মালিক সমিতি বন্ধ করতে পারবেন।' using errcode='42501';end if;
    select info->>'name' into v_name from somiti_settings where somiti_id=p.somiti_id and id=1;
    if trim(p_confirmation) is distinct from trim(v_name) then raise exception 'নিশ্চিত করতে সমিতির নাম হুবহু লিখুন।';end if;
    select array_agg(id) into ids from members where somiti_id=p.somiti_id;
  else
    if p_confirmation<>'DELETE' then raise exception 'নিশ্চিত করতে DELETE লিখুন।';end if;
    if p.role='super_admin' and not exists(select 1 from profiles q join members m on m.id=q.member_id
      where q.somiti_id=p.somiti_id and q.id<>p.id and q.role='super_admin' and q.is_active and m.deleted_at is null and m.status<>'inactive') then
      raise exception 'আপনি শেষ মালিক। আগে অন্য কাউকে মালিক করুন অথবা সমিতি বন্ধ করুন।';end if;
    ids:=array[p.member_id];
  end if;
  return jsonb_build_object('ok',true,'memberIds',to_jsonb(ids));
end $$;
revoke all on function public.preview_account_deletion(text,boolean,text) from public,anon;
grant execute on function public.preview_account_deletion(text,boolean,text) to authenticated;
do $$ declare d text;begin
  select pg_get_functiondef('public.delete_my_account(text,boolean,text)'::regprocedure) into d;
  if position('insert into account_file_cleanup(member_id)' in d)=0 then raise exception 'Unexpected deletion function';end if;
  d:=replace(d,'insert into account_file_cleanup(member_id)',
    'if exists(select 1 from storage.objects where bucket_id=''member-documents'' and split_part(name,''/'',1)=any(select unnest(v_ids)::text)) then
       raise exception ''ছবি পরিষ্কার করা শেষ হয়নি। আবার চেষ্টা করুন।'';
     end if;
     insert into account_file_cleanup(member_id)');
  d:=replace(d,'update members set name=',
    'update sms_logs set recipient_phone=''deleted'',recipient_name=null,message='''',response_data=null
       where somiti_id=p.somiti_id and (member_id=any(v_ids) or recipient_phone in(select phone_norm from members where id=any(v_ids)));
     update sms_logs set sent_by=null,sent_by_name=null where sent_by=any(v_users);
     delete from login_attempts where phone in(select phone_norm from members where id=any(v_ids));
     if p_close_society then update somiti_settings set info=info-''phone''-''email''-''address''-''bankAccountNo''-''bkashNo''-''nagadNo'' where somiti_id=p.somiti_id;end if;
     update members set name=');
  execute d;
end $$;
do $$ begin if to_regclass('public.amanot_schema_versions') is not null then insert into public.amanot_schema_versions(version) values('013') on conflict do nothing;end if;end $$;
notify pgrst,'reload schema';
commit;
