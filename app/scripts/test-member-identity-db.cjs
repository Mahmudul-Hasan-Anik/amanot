const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const db=new PGlite(),root=path.resolve(__dirname,'..');let checks=0;
 const sql=(q,a)=>db.query(q,a),one=async(q,a)=>(await sql(q,a)).rows[0];
 const as=async(role,id='')=>{await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role);};
 const pass=async(name,f)=>{await f();checks++;console.log('PASS',name);};
 const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema extensions;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',nullif(current_setting('request.jwt.claim.sub',true),''))$$;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,encrypted_password text,updated_at timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default clock_timestamp());
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,name text,bucket_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 create function extensions.gen_salt(text,int default 10) returns text language sql as $$select 'fixture'::text$$;
 create function extensions.crypt(text,text) returns text language sql as $$select md5($1)$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid(),auth.jwt() to anon,authenticated;
 alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
 await db.exec(fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8').replace('create extension if not exists pgcrypto with schema extensions;',''));
 const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')&&f<'012').sort();
 for(const f of files)await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'));
 for(const [id,phone] of [[owner,'01711000001'],[other,'01711000002']])await sql('insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,$2,$3::jsonb,md5($4))',[id,phone+'@member.amanot.app',JSON.stringify({phone,pin:'983725',name:phone,somiti_name:phone,bootstrap:true}),'amanot:983725']);
 await sql('insert into auth.sessions(id,user_id) values($1,$1),($2,$2)',[owner,other]);
 for(const f of ['012_client_readiness.sql','013_deletion_file_order.sql','014_ledger_queries.sql'])await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/014_ledger_queries.sql'),'utf8'));

 const identityMigration=fs.readFileSync(path.join(root,'supabase/migrations/016_member_identity.sql'),'utf8');
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/015_rpc_caller_identity.sql'),'utf8'));
 await pass('identity migration applies and is repeatable',async()=>{await db.exec(identityMigration);await db.exec(identityMigration)});
 const detailsMigration=fs.readFileSync(path.join(root,'supabase/migrations/017_member_parent_names_no_admission_fee.sql'),'utf8');
 await pass('parent names migration applies and is repeatable',async()=>{await db.exec(detailsMigration);await db.exec(detailsMigration)});
 const legacy=await one('select member_id from profiles where id=$1',[owner]);
 const add=async(number,category='general',phone='01722000001')=>(await one('select * from public.add_member($1::jsonb)',[JSON.stringify({name:'Identity fixture',fatherName:'  Father fixture  ',motherName:'Mother fixture',phone,memberCategory:category,memberNumber:number,initialPin:'983725',monthlyAmount:2000,admissionFee:100,joinDate:'2026-01-01'})]));
 await as('authenticated',owner);
 let member;
 await pass('manual number preserves zeros and server derives prefix',async()=>{member=await add('00202001');assert.equal(member.code,'M-00202001');assert.equal(member.member_number,'00202001');assert.equal(member.member_category,'general');assert.equal(member.pin_hash,null);assert.equal(member.app_role,'member')});
 await pass('parent names persist and obsolete admission fee cannot create money',async()=>{
  assert.equal(member.father_name,'Father fixture');assert.equal(member.mother_name,'Mother fixture');assert.equal(Number(member.total_deposit),0);
  assert.equal((await one('select count(*)::int n from transactions where member_id=$1',[member.id])).n,0);
  const changed=await one('select * from update_member($1,$2::jsonb)',[member.id,JSON.stringify({fatherName:'Updated father',motherName:''})]);
  assert.equal(changed.father_name,'Updated father');assert.equal(changed.mother_name,null);
  const unchanged=await one('select * from update_member($1,$2::jsonb)',[member.id,JSON.stringify({name:'Other edit'})]);assert.equal(unchanged.father_name,'Updated father');
 });
 await pass('voluntary migration clears obligations and preserves recorded money',async()=>{
  const post=async(amount,id,fee=0)=>one('select * from record_deposit($1,$2::text[],$3,$4,$5,$6,$7,$8,$9)',[member.id,[],amount-fee,fee,amount,'cash',null,'fixture',id]);
  await post(333,'00000000-0000-4000-8000-000000000101');
  await as('postgres');
  const ledger=await one('select jsonb_agg(to_jsonb(t) order by id) rows from transactions t');
  const balances=await one('select jsonb_agg(jsonb_build_object(\'id\',id,\'amount\',amount) order by id) rows from cash_accounts');
  const migration=fs.readFileSync(path.join(root,'supabase/migrations/018_voluntary_deposits.sql'),'utf8');await db.exec(migration);await db.exec(migration);
  assert.deepEqual(await one('select jsonb_agg(to_jsonb(t) order by id) rows from transactions t'),ledger);
  assert.deepEqual(await one('select jsonb_agg(jsonb_build_object(\'id\',id,\'amount\',amount) order by id) rows from cash_accounts'),balances);
  assert.equal((await one('select count(*)::int n from members where monthly_amount<>0 or due_amount<>0 or due_months<>0')).n,0);
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/019_deposit_date_and_comment.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/019_deposit_date_and_comment.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/deploy_018_019_deposits.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/deploy_018_019_deposits.sql'),'utf8'));
  assert.equal((await one("select has_schema_privilege('amanot_rpc','public','CREATE') allowed")).allowed,false);
  await as('authenticated',other);
  await assert.rejects(()=>one('select * from record_deposit($1,$2::text[],$3,$4,$5,$6,$7,$8,$9,$10::date)',[member.id,[],10,0,10,'cash',null,'foreign','00000000-0000-4000-8000-000000000105','2026-01-15']),/সক্রিয় সদস্য/);
  await as('authenticated',owner);
  await post(125.50,'00000000-0000-4000-8000-000000000102');const dated=await one('select * from record_deposit($1,$2::text[],$3,$4,$5,$6,$7,$8,$9,$10::date)',[member.id,[],400,0,400,'cash',null,'dated comment','00000000-0000-4000-8000-000000000103','2026-01-15']);assert.equal(dated.note,'dated comment');assert.equal(new Date(dated.date).toISOString().slice(0,10),'2026-01-15');
  await post(400,'00000000-0000-4000-8000-000000000103');
  await assert.rejects(()=>post(100,'00000000-0000-4000-8000-000000000104',10),/Late fees|বিলম্ব ফি/);
  member=await one('select id,total_deposit,due_amount from members where id=$1',[member.id]);assert.equal(Number(member.total_deposit),858.50);assert.equal(Number(member.due_amount),0);
  assert.equal((await one('select count(*)::int n from transactions where member_id=$1',[member.id])).n,3);
  const changed=await one('select * from update_member($1,$2::jsonb)',[member.id,JSON.stringify({monthlyAmount:9999})]);assert.equal(Number(changed.monthly_amount),0);
  const created=await add('VOL'.replace('VOL','777'),'general','01722000009');assert.equal(Number(created.monthly_amount),0);assert.equal(Number(created.due_amount),0);
 });
 await pass('missing, malformed category/number and old auto-code payload fail',async()=>{
  await assert.rejects(()=>add(undefined,'general','01722000002'));await assert.rejects(()=>add('abc','general','01722000002'));await assert.rejects(()=>add('202002','admin','01722000002'));
  await assert.rejects(()=>one('select add_member($1::jsonb)',[JSON.stringify({name:'Old client',phone:'01722000002',code:'SM-900',initialPin:'983725'})]));
 });
 await pass('same number across categories and reserved legacy suffix rejected',async()=>{await assert.rejects(()=>add('00202001','director','01722000002'),/unique|duplicate/);await assert.rejects(()=>add('001','shareholder','01722000002'),/unique|duplicate/)});
 const before=await one('select count(*)::int n,sum(amount) amount from transactions where member_id=$1',[member.id]);
 await pass('category changes preserve UUID, number, balances and permission',async()=>{
  const updated=await one('select * from update_member($1,$2::jsonb)',[member.id,JSON.stringify({memberCategory:'director'})]);
  assert.equal(updated.id,member.id);assert.equal(updated.member_number,'00202001');assert.equal(updated.code,'D-00202001');assert.equal(updated.app_role,'member');assert.equal(updated.total_deposit,member.total_deposit);
  assert.deepEqual(await one('select count(*)::int n,sum(amount) amount from transactions where member_id=$1',[member.id]),before);
  assert.equal((await one("select count(*)::int n from audit_logs where action='member_category_changed' and details->>'member_id'=$1",[member.id])).n,1);
 });
 await pass('number/code edits and invalid category denied by RPC',async()=>{
  for(const patch of [{memberNumber:'202099'},{code:'M-99'},{memberCategory:'admin'},{memberCategory:null}])await assert.rejects(()=>one('select update_member($1,$2::jsonb)',[member.id,JSON.stringify(patch)]));
 });
 await pass('legacy rows remain readable/editable but identity conversion is not guessed',async()=>{
  const old=await one('select code,member_number,member_category from members where id=$1',[legacy.member_id]);assert.equal(old.code,'SM-001');assert.equal(old.member_number,null);assert.equal(old.member_category,null);
  await one('select update_member($1,$2::jsonb)',[legacy.member_id,JSON.stringify({name:'Legacy renamed'})]);
  await assert.rejects(()=>one('select update_member($1,$2::jsonb)',[legacy.member_id,JSON.stringify({memberCategory:'general'})]));
 });
 await as('authenticated',other);
 await pass('different society may use same number; foreign update is denied',async()=>{const second=await add('00202001','shareholder','01722000003');assert.equal(second.code,'S-00202001');await assert.rejects(()=>one('select update_member($1,$2::jsonb)',[member.id,JSON.stringify({memberCategory:'general'})]));});
 await as('postgres');
 await pass('database trigger blocks number changes outside RPC',async()=>{await assert.rejects(()=>sql('update members set member_number=$1 where id=$2',['999',member.id]),/permanent/)});
 await sql("update members set deleted_at=now() where id=$1",[member.id]);await as('authenticated',owner);
 await pass('deleted member number cannot be reused',async()=>{await assert.rejects(()=>add('00202001','general','01722000004'),/unique|duplicate/)});
 await as('postgres');await sql("update profiles set role='member' where id=$1",[other]);await as('authenticated',other);
 await pass('ordinary members cannot create or change category',async()=>{await assert.rejects(()=>add('333','director','01722000005'));await assert.rejects(()=>one('select update_member($1,$2::jsonb)',[legacy.member_id,JSON.stringify({memberCategory:'director'})]));});
 await as('anon');await pass('anonymous writes denied',async()=>{await assert.rejects(()=>add('444','general','01722000006'))});
 console.log(checks+' member identity SQL checks passed; no live data touched.');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
