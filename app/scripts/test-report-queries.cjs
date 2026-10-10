const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const ledger={};vm.runInNewContext(compile('lib/ledger.ts'),{exports:ledger});
const full=Array.from({length:1001},(_,i)=>({id:String(i),dateISO:'2026-10-10',date:'fixture',receiptNo:String(i),type:i===1000?'transfer':'deposit',memberId:'m',amount:10.25,paymentMethod:'cash'}));
const calls=[];let remote=true;
const out={};vm.runInNewContext(compile('utils/reportExport.ts'),{exports:out,Map,require:n=>{
 if(n==='react-native')return {Platform:{OS:'web'}};
 if(n.startsWith('expo-'))return {};if(n==='./pdfExport')return {escapeHtml:String};if(n==='../theme/colors')return {colors:{}};
 if(n==='../lib/supabase')return {isSupabaseConfigured:()=>remote};if(n==='../lib/ledger')return ledger;
 if(n==='../lib/api')return {fetchLedgerSummary:async(from,to)=>{calls.push({from,to,summary:true});return {collections:{m:10250}};},fetchTransactionHistory:async filter=>{calls.push(filter);return full;}};
 throw Error(n);
}});
async function main(){
 const state={members:[{id:'m',code:'SM-001',name:'Fixture',dueAmount:0}],transactions:full.slice(0,50),projects:[],cashAccounts:[]};
 const collection=await out.buildReportForExport(state,'1','2026-10');assert.equal(collection.rows[0][2],10250);
 const income=await out.buildReportForExport(state,'3','2026-10');assert.equal(income.rows.length,1000);
 const ledgerReport=await out.buildReportForExport(state,'9','2026-10');assert.equal(ledgerReport.rows.length,1001);assert.equal(ledgerReport.rows.at(-1)[2],'transfer');
 assert.ok(calls.every(c=>c.from==='2026-10-01'&&c.to==='2026-11-01'));
 const before=calls.length;await out.buildReportForExport(state,'4','2026-10');assert.equal(calls.length,before);
 assert.ok(out.reportCsv({columns:['x'],rows:[['=formula']]}).includes("'=formula"));
 remote=false;const demo=await out.buildReportForExport(state,'1','2026-10');assert.equal(demo.rows[0][2],512.5);
 console.log('PASS reports: authoritative collection totals, full scoped exports beyond login cache, transfers retained in ledger CSV, balance-only reports avoid ledger downloads, CSV escaping and demo fallback.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
