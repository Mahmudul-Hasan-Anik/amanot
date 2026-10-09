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
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,encrypted_password text,updated_at timestamptz);
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key,name text,bucket_id text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
      create function extensions.gen_salt(text) returns text language sql as $$ select 'test-salt'::text $$;
      create function extensions.crypt(text,text) returns text language sql as $$ select md5($1) $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
    let schema=fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8').replace('create extension if not exists pgcrypto with schema extensions;','');
    await db.exec(schema);
    for(const f of fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
      await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'));console.log('Loaded',f);
    }
    await pass('migration 005 can be applied twice',()=>db.exec(fs.readFileSync(path.join(root,'supabase/migrations/005_accounting_integrity.sql'),'utf8')));
    await sql(`insert into auth.users(id,email,raw_user_meta_data) values($1,'admin@member.amanot.app','{"phone":"01711000001","pin":"1234","name":"Admin","bootstrap":true}')`,[admin]);
    await sql(`select set_config('request.jwt.claim.sub',$1,false)`,[admin]);
    const today=await one(`select extract(year from current_date)::int as "year",to_char(current_date,'YYYY-MM') as "month",to_char(date_trunc('year',current_date),'YYYY-MM-DD') as joined`);
    const member=(await one(`select * from public.add_member($1::jsonb)`,[JSON.stringify({name:'Test member',phone:'01799000002',monthlyAmount:1000,joinDate:today.joined})])).id;
    const depositId='00000000-0000-4000-8000-000000000011';
    await pass('deposit posts once and excludes late fees from savings',async()=>{
      const args=[member,[today.month],1000,100,1100,'cash',depositId];
      await sql(`select public.record_deposit($1,$2,$3,$4,$5,$6,null,null,$7)`,args);
      await sql(`select public.record_deposit($1,$2,$3,$4,$5,$6,null,null,$7)`,args);
      assert.equal(Number((await one('select total_deposit from members where id=$1',[member])).total_deposit),1000);
      assert.equal(Number((await one("select amount from cash_accounts where id='ca2'")).amount),1100);
      assert.equal(Number((await one('select count(*) n from transactions where id=$1',[depositId])).n),1);
    });
    await pass('duplicate month and invalid accounting are rejected',async()=>{
      await denied('select record_deposit($1,$2,1000,0,1000,\'cash\')',[member,[today.month]]);
      await denied('select record_deposit($1,$2,1000,100,500,\'cash\')',[member,[]]);
      await denied('select record_deposit($1,$2,1000,0,1000,\'invalid\')',[member,[]]);
    });
    await pass('partial payments without month selection are retained as credit',async()=>{
      await sql('select record_deposit($1,array[]::text[],250,0,250,\'cash\')',[member]);
      assert.equal(Number((await one('select partial_credit from members where id=$1',[member])).partial_credit),250);
    });
    await pass('month status remains distinct across years',async()=>{
      const key=`${today.year-1}-01`;
      await sql(`update members set dues_start_month=make_date($2-1,1,1),months_status=jsonb_build_object($3::text,'paid') where id=$1`,[member,today.year,key]);
      await sql('select refresh_member_dues($1)',[member]);
      const ms=(await one('select months_status from members where id=$1',[member])).months_status;
      assert.equal(ms[key],'paid');assert.notEqual(ms[`${today.year}-01`],'paid');
    });
    await db.exec(`update somiti_settings set info=info||'{"autoApproveEnabled":false,"autoApproveThreshold":5000}'::jsonb; update cash_accounts set amount=10000 where id='ca2';`);
    const exp=(await one(`select * from add_expense('Office','Rent',1000,'cash','TEST-EXP',null,'pending')`)).id;
    await pass('approved expense deducts cash exactly once',async()=>{
      const request=(await one('select id from approvals where expense_id=$1',[exp])).id;
      await sql('select approve_request($1)',[request]);await sql('select post_expense($1)',[exp]);
      assert.equal(Number((await one("select amount from cash_accounts where id='ca2'")).amount),9000);
      assert.equal(Number((await one("select count(*) n from transactions where receipt_no='TEST-EXP'")).n),1);
    });
    await pass('expenses cannot overdraw accounts',()=>denied("select add_expense('Large expense','Rent',999999,'cash','TEST-LARGE',null,'approved')"));
    await pass('batch approval respects disabled setting',()=>denied('select auto_approve_eligible()'));
    await db.exec(`update somiti_settings set info=info||'{"autoApproveEnabled":true}'::jsonb;update cash_accounts set amount=10000 where id='ca1';`);
    const p=(await one('select * from upsert_project($1::jsonb)',[JSON.stringify({name:'Investment',investedAmount:2000,paymentSource:'bank'})])).id;
    await sql("select record_project_return($1,4000,'bank')",[p]);
    await pass('annual preview counts profit after capital recovery',async()=>{
      const v=(await one('select profit_preview($1) v',[today.year])).v;assert.equal(Number(v.projectProfit),2000);assert.equal(Number(v.expenses),1000);
    });
    await pass('asset summary excludes returned investment principal',async()=>{
      const v=(await one('select get_somiti_summary() v')).v;
      const balances=await one('select (select sum(amount) from cash_accounts) cash,(select sum(remaining_amount) from projects) invested');
      assert.equal(Number(v.totalFund),Number(balances.cash)+Number(balances.invested));
      assert.equal(Number(v.projectInvested),0);
    });
    await pass('last super administrator cannot be demoted or deleted',async()=>{
      const id=(await one('select member_id from profiles where id=$1',[admin])).member_id;
      await denied("select set_member_app_role($1,'member')",[id]);
      await denied('select delete_member($1)',[id]);
    });
    await pass('document paths must belong to the selected member',async()=>{
      await denied("select set_member_documents($1,'other/avatar.jpg',null)",[member]);
      await sql('select set_member_documents($1,$2,null)',[member,member+'/avatar.jpg']);
      assert.equal((await one('select avatar_path from members where id=$1',[member])).avatar_path,member+'/avatar.jpg');
    });
    await pass('profit is credited, rounded totals reconcile, repeated distribution rejected',async()=>{
      await sql('select distribute_profit($1,10,10)',[today.year]);
      const x=await one('select d.distributed,(select sum(share) from profit_shares s where s.year=d.year) allocated from profit_distributions d where year=$1',[today.year]);
      assert.equal(Number(x.distributed),Number(x.allocated));
      assert.equal(Number((await one('select profit_balance from members where id=$1',[member])).profit_balance),800);
      await denied('select distribute_profit($1,10,10)',[today.year]);
    });
    await pass('transaction ledger is immutable',()=>denied('update transactions set amount=1 where id=$1',[depositId]));
    await pass('member roles cannot call staff accounting RPCs',async()=>{
      await db.exec('set role authenticated');await sql("select set_config('request.jwt.claim.sub','',false)");
      await denied("select add_expense('Illegal','Rent',1,'cash','UNAUTHORIZED')");await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
    });
    await pass('anonymous users cannot invoke SMS or automatic approval',async()=>{
      await db.exec('set role anon');await denied('select auto_approve_eligible()');await denied("select log_sms('01711000002','hello')");await db.exec('reset role');
    });
    console.log(`\n${checks} accounting checks passed.`);
  } finally {await db.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});

