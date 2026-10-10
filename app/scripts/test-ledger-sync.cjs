const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib',file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const ledger={};vm.runInNewContext(compile('ledger.ts'),{exports:ledger});
let rows=[],requests=[],revision=1,revisionCalls=0,changing=false;
let photoRequests=0,photoGate=null;
const summary={months:[{month:'2026-10',deposits:123456,profit:0,expenses:0,transaction_count:1001}],categories:[],collections:{}};
const supabase={rpc:async(name,args={})=>{
 requests.push({name,args});
 if(name==='get_sync_revision'){revisionCalls++;return {data:String(changing?revisionCalls:revision),error:null};}
 if(name==='get_ledger_summary')return {data:summary,error:null};
 if(name==='get_transaction_page'){
   const filtered=rows.filter(r=>(!args.p_from||r.date>=args.p_from)&&(!args.p_to||r.date<args.p_to)&&(!args.p_member_id||r.member_id===args.p_member_id));
   const index=args.p_before_id?filtered.findIndex(r=>r.id===args.p_before_id)+1:0;
   const page=filtered.slice(index,index+args.p_limit),last=page.at(-1);
   return {data:{rows:page,hasMore:filtered.length>index+args.p_limit,cursor:last?{createdAt:last.created_at,id:last.id}:null},error:null};
 }
 return {data:{},error:null};
},storage:{from:()=>({createSignedUrls:async paths=>{photoRequests++;if(photoGate)await photoGate;return {data:paths.map(path=>({path,signedUrl:'signed:'+path+':'+photoRequests}))}}})},from:table=>{
 const filter={};const chain={in:(key,value)=>{filter[key]=value.join(',');return chain;},select:()=>chain,order:()=>chain,is:()=>chain,eq:(key,value)=>{filter[key]=value;return chain;},limit:n=>{filter.limit=n;return chain;},maybeSingle:()=>chain,range:(a,b)=>{filter.range=[a,b];return chain;},then:(resolve,reject)=>{
   let data=table==='somiti_settings'?{info:{name:'Fixture'}}:[];
   requests.push({table,...filter});return Promise.resolve({data,error:null}).then(resolve,reject);
 }};return chain;
}};
const out={};vm.runInNewContext(compile('api.ts'),{exports:out,Date,Map,Promise,require:n=>{
 if(n==='./ledger')return ledger;if(n==='./supabase')return {supabase};if(n==='./bengali')return {BENGALI_MONTHS_FULL:[]};if(n==='./money')return {toBengaliDigits:String};if(n==='react-native')return {Platform:{OS:'web'}};if(n==='./profilePhoto'||n==='./authErrors')return {};throw Error(n);
}});
async function main(){
 rows=Array.from({length:1001},(_,i)=>({id:String(i),created_at:'2026-10-10T10:00:00.000Z',date:'2026-10-10',receipt_no:String(i),member_id:i<500?'member-a':'member-b',party_name:'Fixture',party_code:'SM-001',amount:10.25,type:'deposit',payment_method:'cash'}));
 let snapshot=await out.fetchAll(true);assert.equal(snapshot.transactions.length,50);assert.equal(snapshot.ledgerSummary.months.length,0);assert.equal(requests.some(r=>r.name==='get_ledger_summary'||r.table==='audit_logs'),false);assert.equal(requests.find(r=>r.table==='approvals').status,'pending');assert.equal((await out.fetchLedgerSummary('2026-10-01','2026-11-01')).months[0].deposits,123456);
 assert.equal(requests.some(r=>r.table==='transactions'),false);assert.equal(requests.find(r=>r.table==='expenses').limit,50);
 requests=[];const history=await out.fetchTransactionHistory({from:'2026-10-01',to:'2026-11-01'});
 assert.equal(history.length,1001);assert.equal(new Set(history.map(t=>t.id)).size,1001);assert.equal(requests.filter(r=>r.name==='get_transaction_page').length,6);
 assert.ok(requests.filter(r=>r.name==='get_transaction_page').every(r=>r.args.p_limit===200&&r.args.p_from==='2026-10-01'));
 const own=await out.fetchTransactionHistory({memberId:'member-a'});assert.equal(own.length,500);assert.ok(own.every(t=>t.memberId==='member-a'));
 changing=true;await assert.rejects(()=>out.fetchTransactionHistory(),/পরিবর্তন/);changing=false;
 const first=await out.signedPhotoUrls(['a','a'],'owner');assert.equal(photoRequests,1);
 const cached=await out.signedPhotoUrls(['a'],'owner');assert.equal(photoRequests,1);assert.equal(cached.get('a'),first.get('a'));
 await out.signedPhotoUrls(['a'],'other');assert.equal(photoRequests,2);
 out.clearPhotoCache();let finishPhoto;photoGate=new Promise(resolve=>finishPhoto=resolve);
 const stalePhoto=out.signedPhotoUrls(['b'],'owner');out.clearPhotoCache();finishPhoto();assert.equal((await stalePhoto).size,0);photoGate=null;
 await out.signedPhotoUrls(['b'],'owner');assert.equal(photoRequests,4,'Logout invalidates even same-user in-flight URLs');
 console.log('PASS private photo URLs: duplicate paths/reloads reuse cache; account switch and logout invalidate it.');
 assert.equal(ledger.monthRange('2026-12').to,'2027-01-01');assert.throws(()=>ledger.monthRange('2026-13'));
 console.log('PASS ledger loading: bounded 50-row login snapshot, independent server totals, full 1001-row scoped export, member filtering, revision-change rejection and year boundary.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
