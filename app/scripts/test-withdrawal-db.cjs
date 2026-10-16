// Disposable Postgres fixture. No live payments/accounts are touched.
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const db=new PGlite(),root=path.resolve(__dirname,'..');let checks=0;
 const sql=(q,a)=>db.query(q,a),one=async(q,a)=>(await sql(q,a)).rows[0];
 const as=async(role,id='')=>{await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role);};
 const pass=async(name,f)=>{await f();checks++;console.log('PASS',name)};
 const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
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
 for(const [uid,phone] of [[owner,'01711000001'],[other,'01711000002']])await sql('insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,$2,$3::jsonb,md5($4))',[uid,phone+'@member.amanot.app',JSON.stringify({phone,pin:'983725',name:phone,somiti_name:phone,bootstrap:true}),'amanot:983725']);
 await sql('insert into auth.sessions(id,user_id) values($1,$1),($2,$2)',[owner,other]);
 for(const f of files.filter(f=>f>='012'))await load(f);
 const migration='20261016092904_member_withdrawals.sql';
 const before=await one('select (select sum(total_deposit) from members) savings,(select sum(amount) from cash_accounts) cash,(select count(*) from transactions) tx');
 await pass('migration repeats without changing existing money or ledger',async()=>{await load(migration);await db.exec(fs.readFileSync(path.join(root,'supabase/deploy_023_withdrawals.sql'),'utf8'));assert.deepEqual(await one('select (select sum(total_deposit) from members) savings,(select sum(amount) from cash_accounts) cash,(select count(*) from transactions) tx'),before);assert.equal((await one("select has_schema_privilege('amanot_rpc','public','CREATE') v")).v,false);});
 const m=(await one('select member_id from profiles where id=$1',[owner])).member_id;
 await load('20261016145733_withdrawal_summary_consistency.sql');await load('20261016145733_withdrawal_summary_consistency.sql');
 await sql('update members set total_deposit=20000,profit_balance=1000 where id=$1',[m]);
 await sql("update cash_accounts set amount=30000 where type='bank'");
 const today=(await one('select investment_business_date()::text d')).d;
 const req=(n,amount=5000)=>({id:id(n),memberId:m,amount,method:'bank',reason:'Fixture'});
 const submit=p=>one('select * from submit_withdrawal($1::jsonb)',[JSON.stringify(p)]);
 const decide=(n,a,note='')=>one('select * from decide_withdrawal($1,$2,$3)',[id(n),a,note]);
 const pay=(n,method='bank',date=today,ref='REF',note='')=>one('select * from pay_withdrawal($1,$2,$3,$4,$5)',[id(n),method,date,ref,note]);
 const rev=(n,rn,reason='Payment returned')=>one('select * from reverse_withdrawal($1,$2,$3,$4)',[id(n),id(rn),today,reason]);
 const money=()=>one("select (select total_deposit from members where id=$1) savings,(select profit_balance from members where id=$1) profit,(select total_withdrawn from members where id=$1) withdrawn,(select amount from cash_accounts where type='bank') cash,(select count(*) from transactions where type='withdrawal') paid",[m]);
 await as('authenticated',owner);
 await pass('request and approval do not move money; identical retry is safe',async()=>{const balance=await money();await submit(req(101));await submit(req(101));await assert.rejects(()=>submit(req(101,5001)));await decide(101,'approve');await decide(101,'approve');assert.deepEqual(await money(),balance);});
 await pass('approved reservations and allocated profit cannot be withdrawn twice',async()=>{await assert.rejects(()=>submit(req(102,14001)));await submit(req(102,10000));await submit(req(103,10000));await decide(102,'approve');await assert.rejects(()=>decide(103,'approve'));await assert.rejects(()=>submit(req(104,4000.001)));await assert.rejects(()=>submit(req(104,-1)));});
 await pass('payment requires approval, reference and valid date',async()=>{await assert.rejects(()=>pay(103));await assert.rejects(()=>pay(101,'bank',today,''));await assert.rejects(()=>pay(101,'bank','2999-01-01'));await assert.rejects(()=>pay(101,'invalid'));await assert.rejects(()=>pay(101,'bank','2001-01-01'));});
 await pass('payment posts one debit, preserves profit, decreases future distribution base',async()=>{await pay(101);await pay(101);await assert.rejects(()=>pay(101,'bank',today,'OTHER'));const v=await money();assert.equal(Number(v.savings),15000);assert.equal(Number(v.profit),1000);assert.equal(Number(v.withdrawn),5000);assert.equal(Number(v.cash),25000);assert.equal(Number(v.paid),1);const preview=(await one('select profit_preview(extract(year from current_date)::int) v')).v;assert.equal(Number(preview.totalDeposit),15000);});
 await pass('withdrawal is not expense/profit; ledger and monthly fund growth reflect cash outflow',async()=>{const v=(await one('select get_ledger_summary($1::date,$1::date+1) v',[today])).v;assert.equal(Number(v.months[0].expenses),0);assert.equal(Number(v.months[0].profit),0);assert.equal(Number(v.months[0].withdrawals),5000);const summary=(await one('select get_somiti_summary() v')).v;assert.equal(Number(summary.monthlyWithdrawals),5000);assert.ok(Number(summary.monthlyFundGrowth)<0);const t=await one('select * from transactions where id=$1',[id(101)]);assert.equal(t.type,'withdrawal');assert.ok(t.receipt_no);});
 await pass('admin rejection/cancellation release reservations without moving money',async()=>{const balance=await money();await decide(102,'cancel','Member changed plan');await decide(103,'reject','Not approved');await assert.rejects(()=>decide(103,'approve'));await assert.rejects(()=>decide(101,'cancel','Already paid'));await submit(req(104,14000));assert.deepEqual(await money(),balance);});
 await pass('reversal is append-only and restores savings/cash once',async()=>{await rev(101,201);await rev(101,201);await assert.rejects(()=>rev(101,202));const v=await money();assert.equal(Number(v.savings),20000);assert.equal(Number(v.profit),1000);assert.equal(Number(v.withdrawn),0);assert.equal(Number(v.cash),30000);assert.equal(Number(v.paid),1);assert.equal((await one('select count(*)::int n from transactions where type=\'withdrawal_reversal\'')).n,1);});
 await pass('cross-society reads, decisions, payment and raw writes are denied',async()=>{await as('authenticated',other);assert.equal((await one('select count(*)::int n from withdrawal_requests')).n,0);await assert.rejects(()=>submit(req(105,1)));await assert.rejects(()=>decide(104,'approve'));await assert.rejects(()=>pay(104));await assert.rejects(()=>sql("insert into withdrawal_requests(id,member_id,member_name,member_code,amount,preferred_method,submitted_by) values($1,$2,'x','x',1,'cash',$3)",[id(999),m,other]));await assert.rejects(()=>sql("update withdrawal_requests set amount=1"));await as('authenticated',owner);});
 const setRole=async role=>{await as('postgres');await sql('update profiles set role=$1 where id=$2',[role,owner]);await as('authenticated',owner)};
 await pass('member can request/cancel own savings but cannot approve/pay/reverse',async()=>{await setRole('member');await submit(req(106,5));await decide(106,'cancel','Changed mind');await assert.rejects(()=>decide(104,'approve'));await assert.rejects(()=>pay(104));await assert.rejects(()=>rev(101,203));assert.ok((await one('select count(*)::int n from withdrawal_requests')).n>0);});
 await pass('cashier pays approved request but cannot approve or reverse',async()=>{await setRole('super_admin');await decide(104,'approve');await setRole('cashier');await assert.rejects(()=>decide(106,'approve'));await pay(104);await assert.rejects(()=>rev(104,204));await setRole('super_admin');});
 await pass('insufficient account funds roll back every financial change',async()=>{await submit(req(107,1000));await decide(107,'approve');await as('postgres');await sql("update cash_accounts set amount=100 where type='bank'");await as('authenticated',owner);const v=await money();await assert.rejects(()=>pay(107));assert.deepEqual(await money(),v);assert.equal((await one('select status from withdrawal_requests where id=$1',[id(107)])).status,'approved');});
 await pass('pending reservations are counted separately and schema capability is explicit',async()=>{const v=(await one('select get_somiti_summary() v')).v;assert.equal(v.backendVersion,23);assert.equal(Number(v.pendingWithdrawalAmount),1000);assert.equal((await one('select app_capabilities() v')).v.memberWithdrawals,true);});
 await pass('closed years reject new payment/reversal but completed retry remains idempotent',async()=>{await as('postgres');await sql("insert into profit_distributions(year,project_profit,expenses,net_profit,reserve_pct,management_pct,distributed,approved_by_name,somiti_id) select extract(year from current_date)::int,0,0,0,0,0,0,'Fixture',somiti_id from members where id=$1",[m]);await as('authenticated',owner);await assert.rejects(()=>pay(107));await assert.rejects(()=>rev(104,205));await pay(104);});
 await pass('locked/revoked session cannot read or mutate withdrawals',async()=>{await as('postgres');await sql('delete from auth.sessions where user_id=$1',[owner]);await as('authenticated',owner);assert.equal((await one('select count(*)::int n from withdrawal_requests')).n,0);await assert.rejects(()=>submit(req(108,1)));await assert.rejects(()=>decide(107,'cancel','No session'));await as('anon');await assert.rejects(()=>submit(req(108,1)));});
 await pass('same-society member sees only own requests and cannot act on another member',async()=>{
 await as('authenticated',other); // This owner's society is still open and its session valid.
 const p={id:id(310),name:'Second member',phone:'01711000003',initialPin:'948275',memberCategory:'general',memberNumber:'999023'};
 const second=await one('select * from add_member($1::jsonb)',[JSON.stringify(p)]);
 await as('postgres');await sql("select verify_login_pin('01711000003','948275')");
 await sql('insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,$2,$3::jsonb,md5($4))',[id(300),'01711000003@member.amanot.app',JSON.stringify({phone:'01711000003',pin:'948275'}),'amanot:948275']);
 await sql('update profiles set must_change_pin=false where id=$1',[id(300)]);await sql('update members set total_deposit=100 where id=$1',[second.id]);await sql('insert into auth.sessions(id,user_id) values($1,$1)',[id(300)]);
 await as('authenticated',other);const otherMember=(await one('select member_id from profiles where id=$1',[other])).member_id;
 await as('postgres');await sql('update members set total_deposit=100 where id=$1',[otherMember]);await as('authenticated',other);await submit({...req(312,1),memberId:otherMember});
 await as('authenticated',id(300));assert.equal((await one("select confirm_pin_session('948275') v")).v.ok,true);assert.equal((await one('select count(*)::int n from withdrawal_requests')).n,0);
 await submit({...req(311,1),memberId:second.id});assert.equal((await one('select count(*)::int n from withdrawal_requests')).n,1);await assert.rejects(()=>submit({...req(313,1),memberId:otherMember}));await assert.rejects(()=>decide(312,'approve'));await assert.rejects(()=>pay(312));
 });
 console.log(checks+' withdrawal DB checks passed (disposable fixtures; no hosted money moved).');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
