const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const admin='00000000-0000-4000-8000-000000000001';
let checks=0;
async function main(){
  const db=new PGlite();
  const sql=(q,args)=>db.query(q,args);
  const one=async(q,args)=>(await sql(q,args)).rows[0];
  async function pass(name,fn){await fn();checks++;console.log('PASS',name);}
  async function denied(q,args){await assert.rejects(()=>sql(q,args));}
  try {
    // Supabase's auth/storage schemas are supplied by the hosted platform.
    // PGlite has no pgcrypto: test-only stubs allow loading auth triggers.
    // Password hashing/provider behavior is deliberately outside this test.
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema extensions;
      create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('iat',coalesce(nullif(current_setting('request.jwt.iat',true),''),'9999999999')::bigint,'session_id',nullif(current_setting('request.jwt.claim.sub',true),'')) $$;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,encrypted_password text,updated_at timestamptz);
      create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default clock_timestamp());
      create function auth.test_create_session() returns trigger language plpgsql as $$ begin insert into auth.sessions(id,user_id) values(new.id,new.id); return new; end; $$;
      create trigger test_session after insert on auth.users for each row execute function auth.test_create_session();
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key,name text,bucket_id text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
      create function extensions.gen_salt(text,int) returns text language sql as $$ select 'test-salt'::text $$;
      create function extensions.gen_salt(text) returns text language sql as $$ select 'test-salt'::text $$;
      create function extensions.crypt(text,text) returns text language sql as $$ select md5($1) $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
    let schema=fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8').replace('create extension if not exists pgcrypto with schema extensions;','');
    await db.exec(schema);
    for(const f of fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
      await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'));console.log('Loaded',f);
    }
    await pass('security migration is repeatable',()=>db.exec(fs.readFileSync(path.join(root,'supabase/migrations/009_pin_security.sql'),'utf8')));
    await sql(`insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,'01711000001@member.amanot.app','{"phone":"01711000001","pin":"983725","name":"Admin","bootstrap":true}',md5('amanot:983725'))`,[admin]);
    await sql(`select set_config('request.jwt.claim.sub',$1,false)`,[admin]);
    const user='00000000-0000-4000-8000-000000000051';
    const add=async(phone,pin='948275')=>one('select * from add_member($1::jsonb)',[JSON.stringify({name:'Security fixture',phone,initialPin:pin})]);
    const member=await add('01799000052');
    await pass('new members require a non-default six-digit credential and return no hash',async()=>{
      assert.equal(member.pin_hash,null);
      for(const pin of ['1234','123456','111111','987654','']) await denied('select add_member($1::jsonb)',[JSON.stringify({name:'Bad',phone:'01799000053',initialPin:pin})]);
    });
    await pass('activation rejects mismatched password and phone/email',async()=>{
      await denied(`insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,'01799000052@member.amanot.app','{"phone":"01799000052","pin":"948275"}',md5('wrong'))`,[user]);
      await denied(`insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,'different@example.com','{"phone":"01799000052","pin":"948275"}',md5('amanot:948275'))`,[user]);
    });
    await sql(`insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,'01799000052@member.amanot.app','{"phone":"01799000052","pin":"948275"}',md5('amanot:948275'))`,[user]);
    assert.equal('pin' in (await one('select raw_user_meta_data m from auth.users where id=$1',[user])).m,false);
    await db.exec('set role authenticated');await sql("select set_config('request.jwt.claim.sub',$1,false)",[user]);
    await pass('initial login cannot bypass mandatory PIN change via table or RPC',async()=>{
      assert.equal((await one('select session_ready() ok')).ok,false);
      assert.equal(Number((await one('select count(*) n from members')).n),0);
      assert.equal((await one('select must_change_pin from profiles where id=$1',[user])).must_change_pin,true);
      await denied('select get_somiti_summary()');await denied('select get_sync_revision()');
      await denied("select set_member_app_role($1,'super_admin')",[member.id]);
      await sql('update profiles set must_change_pin=false where id=$1',[user]);
      assert.equal((await one('select must_change_pin from profiles where id=$1',[user])).must_change_pin,true);
    });
    await pass('five wrong current PIN attempts persist and lock change for 15 minutes',async()=>{
      for(let i=0;i<5;i++) assert.equal((await one("select change_own_pin('000000','572849') r")).r.ok,false);
      const p=await one('select pin_change_failures,pin_change_locked_until>now() locked from profiles where id=$1',[user]);
      assert.equal(p.pin_change_failures,5);assert.equal(p.locked,true);
      assert.equal((await one("select change_own_pin('948275','572849') r")).r.ok,false);
    });
    await db.exec('reset role');await sql("update profiles set pin_change_locked_until=now()-interval '1 second' where id=$1",[user]);
    await db.exec('set role authenticated');
    await pass('verified change unlocks member, revokes old token and denies other members',async()=>{
      assert.equal((await one("select change_own_pin('948275','572849') r")).r.ok,true);
      await sql("select set_config('request.jwt.iat','1',false)");assert.equal((await one('select session_ready() ok')).ok,false);
      await denied("select change_own_pin('572849','614297')");
      await db.exec('reset role');await sql('insert into auth.sessions(id,user_id) values($1,$1)',[user]);await db.exec('set role authenticated');
      await sql("select set_config('request.jwt.iat','9999999999',false)");
      assert.equal((await one('select session_ready() ok')).ok,true);
      assert.equal(Number((await one('select count(*) n from members')).n),1);
      await denied('select pin_hash from members');
      await denied("select admin_reset_member_pin($1,'614297')",[member.id]);
    });
    await pass('member photo permission excludes another member and NID paths',async()=>{
      const mine=member.id+'/avatar.jpg',other='00000000-0000-4000-8000-000000000091/avatar.jpg';
      await db.exec('reset role');await sql("insert into storage.objects(id,name,bucket_id) values('00000000-0000-4000-8000-000000000092',$1,'member-documents'),('00000000-0000-4000-8000-000000000093',$2,'member-documents')",[mine,other]);
      await db.exec('grant usage on schema storage to authenticated; grant select on storage.objects to authenticated; set role authenticated');
      assert.deepEqual((await sql('select name from storage.objects')).rows.map(r=>r.name),[mine]);
    });
    await pass('inactive profiles and inactive/deleted members lose access',async()=>{
      await db.exec('reset role');await sql('update profiles set is_active=false where id=$1',[user]);await db.exec('set role authenticated');
      assert.equal((await one('select my_member_id() id')).id,null);assert.equal(Number((await one('select count(*) n from storage.objects')).n),0);
      await db.exec('reset role');await sql('update profiles set is_active=true where id=$1',[user]);await sql("update members set status='inactive' where id=$1",[member.id]);await db.exec('set role authenticated');
      assert.equal(Number((await one('select count(*) n from members')).n),0);
      await db.exec('reset role');await sql("update members set status='paid' where id=$1",[member.id]);await db.exec('set role authenticated');
    });
    await pass('direct auth password change cannot remove the upgrade gate',async()=>{
      await db.exec('reset role');await sql("update auth.users set encrypted_password=md5('amanot:614297') where id=$1",[user]);await db.exec('set role authenticated');
      assert.equal((await one('select session_ready() ok')).ok,false);
      await denied("select change_own_pin('614297','572849')");
      await db.exec('reset role');await sql('update auth.sessions set created_at=clock_timestamp() where user_id=$1',[user]);await db.exec('set role authenticated');
      assert.equal((await one("select change_own_pin('614297','572849') r")).r.ok,true);
    });
    await pass('reset requires admin, prevents self reset and expires temporary credentials',async()=>{
      await sql("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
      const adminMember=(await one('select member_id from profiles where id=$1',[admin])).member_id;
      await denied("select admin_reset_member_pin($1,'614297')",[adminMember]);
      await sql("select admin_reset_member_pin($1,'614297')",[member.id]);
      await sql("select set_config('request.jwt.claim.sub',$1,false)",[user]);assert.equal((await one('select session_ready() ok')).ok,false);
      await db.exec('reset role');await sql('insert into auth.sessions(id,user_id) values($1,$1)',[user]);await sql("update profiles set temporary_pin_expires_at=now()-interval '1 second' where id=$1",[user]);await db.exec('set role authenticated');
      assert.equal((await one("select change_own_pin('614297','572849') r")).r.ok,false);
    });
    await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
    await pass('revision ignores timestamp-only touches and records business changes',async()=>{
      const before=(await one('select get_sync_revision() r')).r;
      await sql('update members set updated_at=now() where id=$1',[member.id]);assert.equal((await one('select get_sync_revision() r')).r,before);
      await sql("update members set address='Changed fixture' where id=$1",[member.id]);assert.notEqual((await one('select get_sync_revision() r')).r,before);
      await db.exec('set role anon');await denied('select get_sync_revision()');await db.exec('reset role');
    });
    console.log(`\n${checks} security checks passed (disposable DB; hashing is stubbed).`);
  } finally { await db.close(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
