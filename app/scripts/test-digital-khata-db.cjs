// Disposable Postgres fixture for the digital-khata migration. No hosted data is touched.
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const db=new PGlite(),root=path.resolve(__dirname,'..');let checks=0;
 const sql=(q,a)=>db.query(q,a),one=async(q,a)=>(await sql(q,a)).rows[0];
 const as=async(role,id='')=>{await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role);};
 const pass=async(name,f)=>{await f();checks++;console.log('PASS',name)};
 const owner='00000000-0000-4000-8000-000000000001';
 const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
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
 const load=f=>db.exec(fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8').replace('create extension if not exists pgcrypto with schema extensions;',''));
 const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^0\d\d_.*\.sql$/.test(f)).sort();
 for(const f of files.filter(f=>f<'012'))await load(f);
 await sql('insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,$2,$3::jsonb,md5($4))',[owner,'01711000001@member.amanot.app',JSON.stringify({phone:'01711000001',pin:'983725',name:'Owner',somiti_name:'Fixture',bootstrap:true}),'amanot:983725']);
 await sql('insert into auth.sessions(id,user_id) values($1,$1)',[owner]);
 for(const f of files.filter(f=>f>='012'))await load(f);
 for(const f of ['20261016092904_member_withdrawals.sql','20261016145733_withdrawal_summary_consistency.sql'])await load(f);
 const before=await one('select (select sum(total_deposit) from members) s,(select sum(amount) from cash_accounts) c,(select count(*) from transactions) t');
 await pass('migration applies twice without changing money',async()=>{await load('20261026120000_digital_khata.sql');await load('20261026120000_digital_khata.sql');
  assert.deepEqual(await one('select (select sum(total_deposit) from members) s,(select sum(amount) from cash_accounts) c,(select count(*) from transactions) t'),before);});
 const m=(await one('select member_id from profiles where id=$1',[owner])).member_id;
 const today=(await one('select investment_business_date()::text d')).d;
 await sql("update cash_accounts set amount=100000 where type='bank'");await sql("update cash_accounts set amount=50000 where type='cashier'");
 await as('authenticated',owner);
 const setRole=async role=>{await as('postgres');await sql('update profiles set role=$1 where id=$2',[role,owner]);await as('authenticated',owner)};
 const deposit=(n,amount,date=today)=>one("select * from record_deposit($1,array[]::text[],$2,0,$2,'bank','','',$3,$4::date)",[m,amount,id(n),date]);
 const money=()=>one("select (select total_deposit from members where id=$1) savings,(select status from members where id=$1) status,(select amount from cash_accounts where type='bank') bank,(select amount from cash_accounts where type='cashier') cash",[m]);
 await pass('cashier records deposit, withdrawal in one step; zero balance makes member inactive',async()=>{
  await setRole('cashier');await deposit(10,5000);
  await one('select * from record_withdrawal($1::jsonb)',[JSON.stringify({id:id(11),memberId:m,amount:2000,method:'bank',date:today,note:'Fixture'})]);
  let v=await money();assert.equal(Number(v.savings),3000);assert.equal(Number(v.bank),103000);
  await one('select * from record_withdrawal($1::jsonb)',[JSON.stringify({id:id(11),memberId:m,amount:2000,method:'bank',date:today,note:'Fixture'})]);
  await assert.rejects(()=>one('select * from record_withdrawal($1::jsonb)',[JSON.stringify({id:id(12),memberId:m,amount:3000.01,method:'bank'})]));
  await one('select * from record_withdrawal($1::jsonb)',[JSON.stringify({id:id(12),memberId:m,amount:3000,method:'bank'})]);
  v=await money();assert.equal(Number(v.savings),0);assert.equal(v.status,'paid','staff keep their login');
  assert.equal((await one("select status from withdrawal_requests where id=$1",[id(12)])).status,'paid');
  await deposit(13,4000);
  await as('postgres');const sid=(await one('select somiti_id from members where id=$1',[m])).somiti_id;
  const plain=(await one("insert into members(id,somiti_id,code,name,phone,member_category,member_number,total_deposit) values($1,$2,'x','Plain','01711099999','general','8888',0) returning id",[id(90),sid])).id;
  await as('authenticated',owner);
  await one("select * from record_deposit($1,array[]::text[],1000,0,1000,'bank','','',$2,$3::date)",[plain,id(91),today]);
  await one('select * from record_withdrawal($1::jsonb)',[JSON.stringify({id:id(92),memberId:plain,amount:1000,method:'bank'})]);
  assert.equal((await one('select status from members where id=$1',[plain])).status,'inactive');
  await one("select * from record_deposit($1,array[]::text[],500,0,500,'bank','','',$2,$3::date)",[plain,id(93),today]);
  assert.equal((await one('select status from members where id=$1',[plain])).status,'paid','deposit again reactivates');
 });
 await pass('void deposit reverses member and cash once; reports ignore it',async()=>{
  await deposit(14,1500);await one('select * from void_entry($1,$2,$3)',[id(14),id(15),'Wrong amount']);await one('select * from void_entry($1,$2,$3)',[id(14),id(15),'Wrong amount']);
  await assert.rejects(()=>one('select * from void_entry($1,$2,$3)',[id(14),id(16),'Again']));
  const v=await money();assert.equal(Number(v.savings),4000);
  const s=(await one('select get_ledger_summary($1::date,$1::date+1) v',[today])).v;assert.equal(Number(s.months[0].deposits),10500);
  const page=(await one('select get_transaction_page(50) v')).v;assert.equal(page.rows.find(r=>r.id===id(14)).voided,true);
 });
 await pass('add fund raises the account; other income is separate',async()=>{
  await one('select * from add_fund($1::jsonb)',[JSON.stringify({id:id(20),amount:7000,method:'cash',category:'opening',note:'Old khata'})]);
  await one('select * from add_fund($1::jsonb)',[JSON.stringify({id:id(21),amount:500,method:'cash',category:'other_income'})]);
  assert.equal(Number((await money()).cash),57500);
  const s=(await one('select get_ledger_summary($1::date,$1::date+1) v',[today])).v;assert.equal(Number(s.months[0].other_income),500);assert.equal(Number(s.months[0].funds),7000);
  await assert.rejects(()=>one('select * from add_fund($1::jsonb)',[JSON.stringify({id:id(22),amount:5,method:'cash',category:'loan'})]));
 });
 await pass('expense posts immediately for cashier (no approval)',async()=>{
  const e=await one("select * from add_expense('Rent','অফিস ভাড়া',12000,'bank','V-1','Fixture','approved')");assert.equal(e.status,'approved');
  assert.equal((await one("select count(*)::int n from approvals where status='pending'")).n,0);assert.equal(Number((await money()).bank),92500);
  const p={id:id(40),amount:300,method:'cash',category:'আপ্যায়ন',title:'Tea',spender:'Karim',date:today};
  const t=await one('select * from record_expense($1::jsonb)',[JSON.stringify(p)]);await one('select * from record_expense($1::jsonb)',[JSON.stringify(p)]);
  assert.equal(t.party_name,'Tea');assert.equal(Number((await money()).cash),57200);
  await one('select * from void_entry($1,$2,$3)',[t.id,id(41),'Typo']);assert.equal(Number((await money()).cash),57500);
  assert.equal((await one('select status from expenses where id=$1',[id(40)])).status,'rejected');
 });
 let inv;
 await pass('cashier creates investment without contacts/NID; edits terms before collection',async()=>{
  const p={id:id(30),recipientName:'Rahim',phone:'01712345678',principal:20000,profitPct:20,termMonths:10,disbursedDate:today,firstDueDate:today,paymentMethod:'cash',contacts:[]};
  inv=await one('select * from create_investment($1::jsonb)',[JSON.stringify(p)]);await one('select * from create_investment($1::jsonb)',[JSON.stringify(p)]);
  assert.equal(Number((await money()).cash),37500);
  await one('select * from update_investment_contract($1::jsonb)',[JSON.stringify({id:id(30),principal:15000,paymentMethod:'bank',address:'Village',reason:'Typo'})]);
  const c=await one('select principal,profit_amount,payment_method,address from investment_contracts where id=$1',[id(30)]);
  assert.equal(Number(c.principal),15000);assert.equal(Number(c.profit_amount),3000);assert.equal(c.payment_method,'bank');
  const v=await money();assert.equal(Number(v.cash),57500);assert.equal(Number(v.bank),77500);
  assert.equal(Number((await one('select invested_amount from projects where id=$1',[id(30)])).invested_amount),15000);
  await one('select * from collect_investment_payment($1::jsonb)',[JSON.stringify({id:id(31),projectId:id(30),amount:1800,date:today,paymentMethod:'bank',note:''})]);
  await assert.rejects(()=>one('select * from update_investment_contract($1::jsonb)',[JSON.stringify({id:id(30),principal:16000})]));
  await one('select * from update_investment_contract($1::jsonb)',[JSON.stringify({id:id(30),phone:'01812345678'})]);
  await one('select * from reverse_investment_payment($1,$2,$3)',[id(32),id(31),'Cashier fix']);
 });
 await pass('only admin changes member number, with reason; duplicates rejected',async()=>{
  const pm=id(90);await assert.rejects(()=>one('select change_member_number($1,$2,$3)',[pm,'555','Fix']));
  await setRole('super_admin');await assert.rejects(()=>one('select change_member_number($1,$2,$3)',[pm,'555','']));
  const r=(await one('select change_member_number($1,$2,$3) v',[pm,'555','Old khata number'])).v;assert.equal(r.code,'M-555');
  await as('postgres');await assert.rejects(()=>sql("update members set member_number='556' where id=$1",[pm]),/permanent/);await as('authenticated',owner);
 });
 await pass('taka-month profit: earlier money earns more; deposit counts from next month',async()=>{
  await as('postgres');
  // Fresh fixture year in the past: FY 2024 = Jul 2023–Jun 2024.
  await sql("update somiti_settings set info=info||'{\"fiscalYearStartMonth\":7}'::jsonb");
  const sid=(await one('select somiti_id from members where id=$1',[m])).somiti_id;
  const mk=async(n,name)=>(await one("insert into members(id,somiti_id,code,name,phone,member_category,member_number,total_deposit) values($1,$2,'x',$3,$4,'general',$5,0) returning id",[id(n),sid,name,'0171100'+String(n).padStart(4,'0'),String(9000+n)])).id;
  const a=await mk(401,'A'),b=await mk(402,'B'),c=await mk(403,'C');
  const dep=async(mid,amt,d,n)=>{await sql("insert into transactions(id,somiti_id,receipt_no,member_id,party_name,party_code,amount,type,payment_method,date) values($1,$2,$3,$4,'x','x',$5,'deposit','cash',$6)",[id(n),sid,'R'+n,mid,amt,d]);await sql('update members set total_deposit=total_deposit+$2 where id=$1',[mid,amt]);};
  await dep(a,50000,'2023-06-20',501);await dep(b,50000,'2024-02-10',502);await dep(c,50000,'2024-06-05',503);
  await sql("insert into transactions(id,somiti_id,receipt_no,party_name,party_code,amount,type,payment_method,date) values($1,$2,'R504','Income','FUND-INC',9000,'fund','cash','2024-03-01')",[id(504),sid]);
  await as('authenticated',owner);
  const v=(await one("select profit_preview_fy(2024,'full',0,0,0) v")).v;
  const share=x=>v.shares.find(s=>s.memberId===x);
  assert.equal(v.periodStart,'2023-07-01');assert.equal(Number(v.netProfit),9000);
  assert.equal(Number(share(a).takaMonths),600000);assert.equal(Number(share(b).takaMonths),200000);assert.equal(share(c),undefined);
  assert.equal(Number(share(a).share),6750);assert.equal(Number(share(b).share),2250);
  const r=(await one("select profit_preview_fy(2024,'rate',10,0,0) v")).v;
  assert.equal(Number(r.shares.find(s=>s.memberId===a).share),5000);assert.equal(r.exceedsProfit,false);
  const hi=(await one("select profit_preview_fy(2024,'rate',100,0,0) v")).v;assert.equal(hi.exceedsProfit,true);
  await assert.rejects(()=>one("select distribute_profit_fy(2024,'rate',100,0,0)"));
  await one("select distribute_profit_fy(2024,'full',0,0,0)");
  assert.equal(Number((await one('select total_deposit from members where id=$1',[a])).total_deposit),56750);
  // Closed period rejects new entries dated inside it.
  await assert.rejects(()=>one("select * from add_fund($1::jsonb)",[JSON.stringify({id:id(505),amount:1,method:'cash',category:'other_income',date:'2024-05-01'})]));
  // Next year: A's opening balance includes last year's share from July.
  const n=(await one("select profit_preview_fy(2025,'rate',12,0,0) v")).v;assert.equal(Number(n.shares.find(s=>s.memberId===a).takaMonths),56750*12);
 });
 console.log(checks+' digital-khata DB checks passed (disposable fixtures).');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e.message,e.where||"",e.position||"");process.exitCode=1});
