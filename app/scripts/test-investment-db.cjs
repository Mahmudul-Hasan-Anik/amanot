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


 for(const f of ['015_rpc_caller_identity.sql','016_member_identity.sql','017_member_parent_names_no_admission_fee.sql','018_voluntary_deposits.sql','019_deposit_date_and_comment.sql'])await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'));
 await db.exec('revoke create on schema public from amanot_rpc');
 const migration=fs.readFileSync(path.join(root,'supabase/migrations/020_investment_contracts.sql'),'utf8');
 await pass('contract migration applies twice without rewriting existing balances',async()=>{const before=await one('select sum(total_deposit) total from members');await db.exec(migration);await db.exec(migration);assert.deepEqual(await one('select sum(total_deposit) total from members'),before);assert.equal((await one("select has_schema_privilege('amanot_rpc','public','CREATE') allowed")).allowed,false);});
 await sql("update cash_accounts set amount=1000000 where type='bank'");
 await as('authenticated',owner);
 const today=new Date().toISOString().slice(0,10);
 const contract={id:'00000000-0000-4000-8000-000000000701',recipientName:'External recipient',phone:'01733000001',whatsapp:'',address:'Dhaka',nid:'1234567890',fatherName:'Father',motherName:'Mother',contacts:[{name:'Contact one',relation:'Brother',phone:'01733000002'}],principal:100000,profitPct:20,termMonths:12,disbursedDate:today,firstDueDate:today,purpose:'Business',paymentMethod:'bank'};
 const create=p=>one('select * from create_investment_contract($1::jsonb)',[JSON.stringify(p)]);
 const pay=p=>one('select * from collect_investment_payment($1::jsonb)',[JSON.stringify(p)]);
 let project;
 await pass('external recipient contract is atomic and does not create a savings member',async()=>{const before=await one('select count(*)::int n from members');project=await create(contract);assert.equal(Number(project.invested_amount),100000);assert.deepEqual(await one('select count(*)::int n from members'),before);const c=await one('select * from investment_contracts where id=$1',[contract.id]);assert.equal(Number(c.profit_amount),20000);assert.equal(c.member_id,null);assert.equal(c.emergency_contacts.length,1);assert.equal(Number((await one("select amount from cash_accounts where type='bank'")).amount),900000);});
 await pass('create retry is idempotent; altered retry, invalid contacts and funds rejected',async()=>{await create(contract);assert.equal(Number((await one("select amount from cash_accounts where type='bank'")).amount),900000);await assert.rejects(()=>create({...contract,profitPct:30}));for(const patch of [{contacts:[]},{contacts:[{name:'A',relation:'',phone:'01733000002'}]},{principal:9999999},{profitPct:-1},{termMonths:0}])await assert.rejects(()=>create({...contract,id:'00000000-0000-4000-8000-000000000702',...patch}));});
 const first={id:'00000000-0000-4000-8000-000000000711',projectId:contract.id,amount:10000,date:today,paymentMethod:'bank',note:'first'};
 await pass('partial repayment is principal first; retry does not add money twice',async()=>{await pay(first);await pay(first);const e=await one('select * from investment_payment_events where id=$1',[first.id]);assert.equal(Number(e.principal_part),10000);assert.equal(Number(e.profit_part),0);assert.equal(Number((await one('select returned_amount from projects where id=$1',[contract.id])).returned_amount),10000);await assert.rejects(()=>pay({...first,amount:20000}));});
 const second={...first,id:'00000000-0000-4000-8000-000000000712',amount:100000,note:'second'};
 await pass('crossing principal threshold recognizes only actual profit',async()=>{await pay(second);const e=await one('select * from investment_payment_events where id=$1',[second.id]);assert.equal(Number(e.principal_part),90000);assert.equal(Number(e.profit_part),10000);const p=await one('select * from projects where id=$1',[contract.id]);assert.equal(Number(p.net_profit),10000);assert.equal(p.status,'ongoing');assert.equal(Number(p.remaining_amount),0);const sum=await one("select project_profit_between($1::date,$1::date+1) profit",[today]);assert.equal(Number(sum.profit),10000);const v=await one('select profit_preview(extract(year from current_date)::int) v');assert.equal(Number(v.v.projectProfit),10000);});
 await pass('overpayment, obsolete RPC and cross-tenant operations denied',async()=>{await assert.rejects(()=>pay({...first,id:'00000000-0000-4000-8000-000000000713',amount:10001}));await assert.rejects(()=>one('select record_project_return($1,1,$2,$3)',[contract.id,'bank','obsolete']));await as('authenticated',other);assert.equal((await one('select count(*)::int n from investment_contracts')).n,0);await assert.rejects(()=>pay({...first,id:'00000000-0000-4000-8000-000000000714'}));await as('authenticated',owner);});
 const final={...first,id:'00000000-0000-4000-8000-000000000715',amount:10000,note:'final'};
 await pass('full settlement and audited reversal reconcile principal, profit and cash',async()=>{await pay(final);assert.equal((await one('select status from projects where id=$1',[contract.id])).status,'completed');const rid='00000000-0000-4000-8000-000000000716';await one('select reverse_investment_payment($1,$2,$3)',[rid,final.id,'Wrong receipt']);await one('select reverse_investment_payment($1,$2,$3)',[rid,final.id,'Wrong receipt']);const p=await one('select * from projects where id=$1',[contract.id]);assert.equal(p.status,'ongoing');assert.equal(Number(p.returned_amount),110000);assert.equal(Number(p.net_profit),10000);assert.equal(Number((await one("select project_profit_between($1::date,$1::date+1) profit",[today])).profit),10000);assert.equal(Number((await one("select amount from cash_accounts where type='bank'")).amount),1010000);});
 await pass('raw writes to contracts are forbidden',async()=>{await assert.rejects(()=>sql("update investment_contracts set profit_pct=90 where id=$1",[contract.id]));await assert.rejects(()=>sql('delete from investment_payment_events'));});

 await pass('new contracts cannot be edited through legacy upsert or mixed by equal names',async()=>{
  await assert.rejects(()=>one('select upsert_project($1::jsonb)',[JSON.stringify({id:contract.id,name:'Changed',investedAmount:100000})]));
  await create({...contract,id:'00000000-0000-4000-8000-000000000703',principal:1,profitPct:0,termMonths:3});
  const page=await one('select get_transaction_page(50,null,null,null,null,null,$1,null) v',[contract.id]);
  assert.ok(page.v.rows.every(t=>t.project_id===contract.id));
 });
 await pass('linked investment expenses keep approvals and reduce net profit exactly once',async()=>{
  const expense={id:'00000000-0000-4000-8000-000000000721',projectId:contract.id,amount:50,paymentMethod:'bank',note:'Contract expense'};
  const e=await one('select * from record_investment_expense($1::jsonb)',[JSON.stringify(expense)]);
  await one('select * from record_investment_expense($1::jsonb)',[JSON.stringify(expense)]);
  assert.equal(e.status,'approved');assert.equal((await one('select project_id from transactions where id=$1',[e.transaction_id])).project_id,contract.id);
  const v=(await one('select profit_preview(extract(year from current_date)::int) v')).v;assert.equal(Number(v.projectProfit),10000);assert.equal(Number(v.netProfit),9950);
 });
 await as('postgres');await sql("update profiles set role='cashier' where id=$1",[owner]);await as('authenticated',owner);
 await pass('cashier can collect but cannot disburse or reverse, and expense requires approval',async()=>{
  await assert.rejects(()=>create({...contract,id:'00000000-0000-4000-8000-000000000704'}));
  await assert.rejects(()=>one('select reverse_investment_payment($1,$2,$3)',['00000000-0000-4000-8000-000000000722',second.id,'not authorized']));
  const e=await one('select * from record_investment_expense($1::jsonb)',[JSON.stringify({id:'00000000-0000-4000-8000-000000000723',projectId:contract.id,amount:5,paymentMethod:'bank',note:'Needs approval'})]);assert.equal(e.status,'pending');assert.equal(e.transaction_id,null);
 });
 await as('postgres');await sql("update profiles set role='member' where id=$1",[owner]);await as('authenticated',owner);
 await pass('ordinary member cannot read recipient private contacts or financial events',async()=>{assert.equal((await one('select count(*)::int n from investment_contracts')).n,0);assert.equal((await one('select count(*)::int n from investment_payment_events')).n,0);await assert.rejects(()=>pay({...first,id:'00000000-0000-4000-8000-000000000724',amount:1}));});
 await as('postgres');await sql("update profiles set role='super_admin' where id=$1",[owner]);await as('authenticated',owner);
 await pass('monthly analytics show profit instead of gross repayment',async()=>{const row=await one("select get_ledger_summary(date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month')::date) v");assert.equal(Number(row.v.months[0].profit),10000);});
 await pass('workflow migration preserves live-style financial data and applies twice',async()=>{
 await as('postgres');const before=await one('select (select sum(amount) from cash_accounts) cash,(select count(*) from transactions) ledger,(select sum(total_deposit) from members) savings');
 const next=fs.readFileSync(path.join(root,'supabase/migrations/021_investment_workflow.sql'),'utf8');await db.exec(next);await db.exec(next);
 assert.deepEqual(await one('select (select sum(amount) from cash_accounts) cash,(select count(*) from transactions) ledger,(select sum(total_deposit) from members) savings'),before);
 assert.equal((await one("select has_schema_privilege('amanot_rpc','public','CREATE') allowed")).allowed,false);await as('authenticated',owner);
 });
 const proposed={...contract,id:'00000000-0000-4000-8000-000000000750',principal:100};
 const submit=p=>one('select * from submit_investment_proposal($1::jsonb)',[JSON.stringify(p)]);
 const decide=(id,approve,note='')=>one('select * from decide_investment_proposal($1,$2,$3)',[id,approve,note]);
 const disburse=(id,date=today)=>one('select * from disburse_investment_proposal($1,$2,$3,$4)',[id,date,today,'bank']);
 await pass('required identity, immutable proposals and no money movement before disbursement',async()=>{
 const before=await one("select amount from cash_accounts where type='bank'");
 for(const key of ['nid','fatherName','motherName'])await assert.rejects(()=>submit({...proposed,[key]:' '}));
 await assert.rejects(()=>submit({...proposed,nid:'not-a-number'}));
 await submit(proposed);await submit(proposed);await assert.rejects(()=>submit({...proposed,principal:101}));
 await assert.rejects(()=>disburse(proposed.id));await assert.rejects(()=>create({...proposed,id:'00000000-0000-4000-8000-000000000751'}));
 await assert.rejects(()=>one('select post_approved_investment($1::jsonb)',[JSON.stringify(proposed)]));
 assert.deepEqual(await one("select amount from cash_accounts where type='bank'"),before);
 assert.equal((await one('select count(*)::int n from projects where id=$1',[proposed.id])).n,0);
 await decide(proposed.id,true);await decide(proposed.id,true);
 assert.deepEqual(await one("select amount from cash_accounts where type='bank'"),before);
 await disburse(proposed.id);await disburse(proposed.id);
 assert.equal(Number((await one("select amount from cash_accounts where type='bank'")).amount),Number(before.amount)-100);
 await assert.rejects(()=>disburse(proposed.id,'2020-01-01'));
 assert.equal((await one('select status from investment_proposals where id=$1',[proposed.id])).status,'disbursed');
 });
 await pass('future plans and insufficient funds never create premature financial entries',async()=>{
 const before=await one("select amount from cash_accounts where type='bank'");
 const future={...proposed,id:'00000000-0000-4000-8000-000000000754',disbursedDate:'2099-01-01',firstDueDate:'2099-02-01'};
 await submit(future);await decide(future.id,true);await assert.rejects(()=>one('select disburse_investment_proposal($1,$2,$3,$4)',[future.id,'2099-01-01','2099-02-01','bank']));
 const huge={...proposed,id:'00000000-0000-4000-8000-000000000755',principal:999999999};await submit(huge);await decide(huge.id,true);await assert.rejects(()=>disburse(huge.id));
 assert.equal((await one('select status from investment_proposals where id=$1',[huge.id])).status,'approved');assert.equal((await one('select count(*)::int n from projects where id=$1',[huge.id])).n,0);assert.deepEqual(await one("select amount from cash_accounts where type='bank'"),before);
 });
 await pass('rejection, tenant boundary and cashier cannot approve or disburse',async()=>{
 const rejected={...proposed,id:'00000000-0000-4000-8000-000000000752'};await submit(rejected);
 await assert.rejects(()=>decide(rejected.id,false));await decide(rejected.id,false,'Incomplete evidence');await assert.rejects(()=>disburse(rejected.id));
 await as('authenticated',other);assert.equal((await one('select count(*)::int n from investment_proposals')).n,0);await assert.rejects(()=>decide(proposed.id,true));await as('postgres');
 await sql("update profiles set role='cashier' where id=$1",[owner]);await as('authenticated',owner);await assert.rejects(()=>submit({...proposed,id:'00000000-0000-4000-8000-000000000753'}));await assert.rejects(()=>decide(rejected.id,true));await assert.rejects(()=>disburse(proposed.id));
 await assert.rejects(()=>sql("update investment_proposals set status='approved'"));await as('postgres');await sql("update profiles set role='super_admin' where id=$1",[owner]);await as('authenticated',owner);
 });
 await pass('closed distribution years block new postings',async()=>{await as('postgres');await sql('insert into profit_distributions(somiti_id,year,project_profit,expenses,net_profit,reserve_pct,management_pct,distributed,approved_by_name) values((select somiti_id from profiles where id=$1),extract(year from current_date)::int,0,0,0,0,0,0,$2)',[owner,'fixture']);await as('authenticated',owner);await assert.rejects(()=>pay({...first,id:'00000000-0000-4000-8000-000000000725',amount:1}),/বন্ধ/);});
 await pass('production workflow deployment guard preserves financial data',async()=>{await as('postgres');await db.exec(fs.readFileSync(path.join(root,'supabase/deploy_021_investments.sql'),'utf8'));});
 console.log(checks+' investment database checks passed');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
