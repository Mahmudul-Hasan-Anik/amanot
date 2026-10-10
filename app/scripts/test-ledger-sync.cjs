const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const row=(id,date)=>({id,created_at:date,date:date.slice(0,10),receipt_no:id,member_id:'member',party_name:'Fixture',party_code:'SM-001',amount:100,type:'deposit',payment_method:'cash'});
const before=row('a','2026-10-10T10:00:00.000Z'),recent=row('b','2026-10-10T10:01:00.000Z'),late=row('c','2026-10-09T10:00:00.000Z');
let rows=[],requests=[];
const supabase={rpc:async n=>({data:n==='get_transaction_count'?rows.length:{},error:null}),storage:{},from:table=>{
 const filter={};const chain={select:()=>chain,order:()=>chain,is:()=>chain,eq:()=>chain,limit:()=>chain,maybeSingle:()=>chain,range:(a,b)=>{filter.range=[a,b];return chain;},gte:(_,v)=>{filter.since=v;return chain;},then:(resolve,reject)=>{
   let data=table==='transactions'?rows.filter(r=>!filter.since||r.created_at>=filter.since):[];
   if(filter.range)data=data.slice(filter.range[0],filter.range[1]+1);
   if(table==='somiti_settings')data={info:{name:'Fixture'}};
   requests.push({table,...filter});return Promise.resolve({data,error:null}).then(resolve,reject);
 }};return chain;
}};
const out={};vm.runInNewContext(code,{exports:out,Date,Map,Promise,require:n=>{
 if(n==='./supabase')return {supabase};if(n==='./bengali')return {BENGALI_MONTHS_FULL:[]};if(n==='./money')return {toBengaliDigits:String};if(n==='react-native')return {Platform:{OS:'web'}};if(n==='./profilePhoto'||n==='./authErrors')return {};throw Error(n);
}});
async function main(){
 rows=[before];let snapshot=await out.fetchAll(false);assert.equal(snapshot.transactions.length,1);
 requests=[];await out.fetchAll(false,snapshot.transactions);assert.equal(requests.some(r=>r.table==='transactions'),false);
 rows=[recent,before];requests=[];let next=await out.fetchAll(false,snapshot.transactions);assert.equal(next.transactions.length,2);assert.equal(requests.filter(r=>r.table==='transactions').length,1);assert.ok(requests.find(r=>r.table==='transactions').since);
 rows=[recent,before,late];requests=[];next=await out.fetchAll(false,snapshot.transactions);assert.equal(next.transactions.length,3);assert.equal(requests.filter(r=>r.table==='transactions').length,2);assert.equal(requests.filter(r=>r.table==='transactions')[1].since,undefined);
 rows=[before];requests=[];next=await out.fetchAll(false,snapshot.transactions);assert.equal(next.transactions.length,1);
 rows=Array.from({length:1001},(_,i)=>row(String(i),'2026-10-10T10:00:00.000Z'));requests=[];next=await out.fetchAll(false);assert.equal(next.transactions.length,1001);assert.equal(requests.filter(r=>r.table==='transactions').length,2);
 console.log('PASS ledger sync: unchanged ledger reused, append delta deduplicated, late commit outside overlap falls back to full history, 1001 rows paginated without truncation.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
