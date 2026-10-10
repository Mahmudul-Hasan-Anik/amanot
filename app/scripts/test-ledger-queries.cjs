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
 const profile=await one('select somiti_id,member_id from profiles where id=$1',[owner]);
 await sql(`insert into transactions(id,somiti_id,receipt_no,member_id,party_name,party_code,date,amount,type,payment_method,created_at,months)
 select ('00000000-0000-4000-9000-'||lpad(i::text,12,'0'))::uuid,$1,'FIX-'||i,$2,'Fixture','SM-001','2026-10-10',10.25,'deposit','cash','2026-10-10T10:00:00Z',array['2026-09'] from generate_series(1,1001) i`,[profile.somiti_id,profile.member_id]);
 await sql(`insert into transactions(somiti_id,receipt_no,party_name,party_code,date,amount,type,payment_method) values
 ($1,'OLD','Fixture','EXP','2020-01-01',900,'expense','cash'),($1,'EXP','Fixture','EXP','2026-10-01',5.50,'expense','cash'),($1,'PROFIT','Fixture','PRJ','2026-10-31',20.75,'profit','cash'),($1,'TRANSFER','Fixture','TRF','2026-10-01',999,'transfer','cash'),($1,'BOUNDARY','Fixture','EXP','2026-11-01',77,'expense','cash')`,[profile.somiti_id]);
 await sql("insert into expenses(somiti_id,voucher_no,title,category,amount,payment_source,date,status) values($1,'V1','Fixture','Office',5.50,'cash','2026-10-01','approved'),($1,'V2','Fixture','Office',555,'cash','2026-10-01','pending')",[profile.somiti_id]);
 await as('authenticated',owner);
 await pass('keyset pages preserve 1001 tied timestamps without duplicates or omissions',async()=>{
   let cursor=null,ids=[];
   do {const page=(await one('select get_transaction_page(50,$1,$2,$3,$4) r',[cursor?.createdAt||null,cursor?.id||null,'2026-10-01','2026-11-01'])).r;
     assert.ok(page.rows.length<=50);ids.push(...page.rows.map(t=>t.id));if(!page.hasMore)break;cursor=page.cursor;
   }while(true);
   assert.equal(ids.length,1004);assert.equal(new Set(ids).size,1004);
 });
 await pass('server totals include every row, decimal cents, boundaries and approved categories',async()=>{
   const r=(await one("select get_ledger_summary('2026-10-01','2026-11-01') r")).r;
   assert.equal(Number(r.months[0].deposits),10260.25);assert.equal(Number(r.months[0].expenses),5.5);assert.equal(Number(r.months[0].profit),20.75);
   assert.equal(Number(r.collections[profile.member_id]),10260.25);assert.equal(Number(r.categories[0].amount),5.5);
 });
 await pass('paid-month lookup uses credited month rather than posting month',async()=>{
   const r=(await one('select get_transaction_page(50,null,null,null,null,$1,null,\'2026-09\') r',[profile.member_id])).r;
   assert.equal(r.rows.length,50);assert.equal(r.rows[0].date,'2026-10-10');assert.equal(r.hasMore,true);
 });
 await pass('invalid cursor, limit and report dates are rejected',async()=>{
   await assert.rejects(()=>sql('select get_transaction_page(201)'));await assert.rejects(()=>sql("select get_transaction_page(50,now())"));
   await assert.rejects(()=>sql("select get_ledger_summary('2026-11-01','2026-10-01')"));
 });
 await as('authenticated',other);
 await pass('cross-society member filter and report totals cannot expose another tenant',async()=>{
   assert.equal((await one('select get_transaction_page(50,null,null,null,null,$1) r',[profile.member_id])).r.rows.length,0);
   assert.deepEqual((await one("select get_ledger_summary('2026-10-01','2026-11-01') r")).r.months,[]);
 });
 await as('postgres');await sql("update profiles set role='member' where id=$1",[owner]);await as('authenticated',owner);
 await pass('member sees own transactions but cannot call staff reports',async()=>{
   const r=(await one('select get_transaction_page() r')).r;assert.ok(r.rows.every(t=>t.member_id===profile.member_id));
   await assert.rejects(()=>sql("select get_ledger_summary('2026-10-01','2026-11-01')"));
 });
 await as('anon');await pass('anonymous users cannot call either query',async()=>{
   await assert.rejects(()=>sql('select get_transaction_page()'));await assert.rejects(()=>sql("select get_ledger_summary('2026-10-01','2026-11-01')"));
 });
 console.log(checks+' ledger query checks passed (disposable SQL fixtures; no live data changed).');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
