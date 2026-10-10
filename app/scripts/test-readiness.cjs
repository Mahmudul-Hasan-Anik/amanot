const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let checks=0;
async function main(){
 const db=new PGlite(); const sql=(q,a)=>db.query(q,a),one=async(q,a)=>(await sql(q,a)).rows[0];
 const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',memberUser='00000000-0000-4000-8000-000000000003';
 const pass=async(name,f)=>{await f();checks++;console.log('PASS',name);};
 const as=async(role,id='')=>{await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role);};
 const session=async(id)=>{await as('postgres');await sql('delete from auth.sessions where user_id=$1',[id]);await sql('insert into auth.sessions(id,user_id) values($1,$1)',[id]);await as('authenticated',id);};
 const register=async(id,phone,name,bootstrap=true,pin='983725')=>sql('insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,$2,$3::jsonb,md5($4))',[id,phone+'@member.amanot.app',JSON.stringify({phone,pin,name,somiti_name:name,bootstrap}),'amanot:'+pin]);
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema extensions;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('session_id',nullif(current_setting('request.jwt.claim.sub',true),'')) $$;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,encrypted_password text,updated_at timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default clock_timestamp());
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,name text,bucket_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
 create function extensions.gen_salt(text,int default 10) returns text language sql as $$ select 'fixture'::text $$;
 create function extensions.crypt(text,text) returns text language sql as $$ select md5($1) $$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid(),auth.jwt() to anon,authenticated;
 alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
 await db.exec(fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8').replace('create extension if not exists pgcrypto with schema extensions;',''));
 for(const f of fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')&&f<'012').sort())await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'));
 await register(owner,'01711000001','First society');await register(other,'01711000002','Second society');
 await sql('insert into auth.sessions(id,user_id) values($1,$1),($2,$2)',[owner,other]);
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/012_client_readiness.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/013_deletion_file_order.sql'),'utf8'));
 await as('authenticated',owner);
 await pass('already-issued session remains usable; direct new Auth session needs PIN grant',async()=>{
   assert.equal((await one('select session_ready() r')).r,true);
   await session(owner);assert.equal((await one('select session_ready() r')).r,false);
   await assert.rejects(()=>sql('select get_somiti_summary()'));
 });
 await as('anon');
 await pass('five failures persist across requests and lock even the correct PIN',async()=>{
   for(let i=0;i<5;i++)assert.equal((await one("select verify_login_pin('01711000001','000000') r")).r.ok,false);
   assert.match((await one("select verify_login_pin('01711000001','983725') r")).r.error,/১৫/);
   await assert.rejects(()=>sql('select * from login_attempts'));await assert.rejects(()=>sql("update login_attempts set failures=0"));
   await as('authenticated',owner);assert.equal((await one("select confirm_pin_session('983725') r")).r.ok,false);
   assert.equal((await one('select session_ready() r')).r,false);
 });
 await as('postgres');await sql("update login_attempts set locked_until=now()-interval '1 second'");
 await as('authenticated',owner);
 await pass('expired lock can recover and server grant is session-bound',async()=>{
   assert.equal((await one("select confirm_pin_session('983725') r")).r.ok,true);
   assert.equal((await one('select session_ready() r')).r,true);
   await session(owner);assert.equal((await one('select session_ready() r')).r,false);
   assert.equal((await one("select confirm_pin_session('983725') r")).r.ok,true);
 });
 const member=await one('select * from add_member($1::jsonb)',[JSON.stringify({name:'Private fixture',phone:'01711000003',initialPin:'948275',nid:'fixture-private',address:'Private address',nomineeName:'Private nominee'})]);
 await sql('select record_deposit($1,array[]::text[],100,0,100,\'cash\')',[member.id]);
 const fingerprint=(await one("select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) h from transactions t")).h;
 await as('postgres');
 await pass('invited activation requires recent successful PIN gate',async()=>{
   await assert.rejects(()=>register(memberUser,'01711000003','Member',false,'948275'),/পিন যাচাই/);
   await as('anon');assert.equal((await one("select verify_login_pin('01711000003','948275') r")).r.ok,true);
   await as('postgres');await register(memberUser,'01711000003','Member',false,'948275');
 });
 await session(memberUser);await one("select confirm_pin_session('948275') r");
 await one("select change_own_pin('948275','572849') r");await session(memberUser);await one("select confirm_pin_session('572849') r");
 await pass('wrong PIN cannot delete account or erase data',async()=>{
   assert.equal((await one("select delete_my_account('000000',false,'DELETE') r")).r.ok,false);
   assert.equal((await one('select count(*) n from members')).n,1);
   await assert.rejects(()=>sql("select delete_my_account('572849',true,'First society')"));
 });
 await pass('photo cleanup must finish before Auth deletion; preview cannot target another society',async()=>{
   const plan=(await one("select preview_account_deletion('572849',false,'DELETE') r")).r;
   assert.deepEqual(plan.memberIds,[member.id]);
   await as('postgres');await sql("insert into storage.objects(id,bucket_id,name) values('00000000-0000-4000-8000-000000000098','member-documents',$1)",[member.id+'/avatar.jpg']);
   await as('authenticated',memberUser);await assert.rejects(()=>sql("select delete_my_account('572849',false,'DELETE')"),/ছবি/);
   await as('postgres');assert.equal((await one('select count(*) n from auth.users where id=$1',[memberUser])).n,1);
   // Simulate successful Storage API removal, never use SQL metadata deletion live.
   await sql("delete from storage.objects where name=$1",[member.id+'/avatar.jpg']);await as('authenticated',memberUser);
 });
 await pass('self deletion scrubs profile, revokes Auth, retains immutable ledger and queues photos',async()=>{
   assert.equal((await one("select delete_my_account('572849',false,'DELETE') r")).r.ok,true);
   assert.equal((await one('select session_ready() r')).r,false);
   await as('postgres');assert.equal((await one('select count(*) n from auth.users where id=$1',[memberUser])).n,0);
   const m=await one('select * from members where id=$1',[member.id]);assert.equal(m.nid,null);assert.equal(m.address,'');assert.equal(m.nominee_name,'');assert.equal(m.user_id,null);assert.ok(m.deleted_at);
   assert.equal((await one("select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) h from transactions t")).h,fingerprint);
   assert.equal((await one('select member_id from account_file_cleanup')).member_id,member.id);
   await assert.rejects(()=>sql('update transactions set amount=1'));
 });
 await as('authenticated',owner);
 await pass('last owner cannot leave society without transfer or explicit closure',async()=>{
   await assert.rejects(()=>sql("select delete_my_account('983725',false,'DELETE')"),/শেষ মালিক/);
   await assert.rejects(()=>sql("select delete_my_account('983725',true,'wrong')"),/হুবহু/);
   assert.equal((await one('select get_transaction_count() n')).n,1);
 });
 await pass('closure targets caller society only; account and ledger access end',async()=>{
   assert.equal((await one("select delete_my_account('983725',true,'First society') r")).r.ok,true);
   assert.equal((await one('select session_ready() r')).r,false);
   await as('postgres');assert.equal((await one('select count(*) n from auth.users')).n,1);
   assert.equal((await one('select id from auth.users')).id,other);
   await as('authenticated',other);assert.equal((await one('select session_ready() r')).r,true);
   assert.equal((await one('select get_transaction_count() n')).n,0);
   await assert.rejects(()=>sql('select * from account_file_cleanup'));
 });
 console.log(checks+' readiness checks passed (local Auth/crypto scaffolding; no hosted accounts deleted).');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
