const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,deps={}){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:out,require:n=>{if(n in deps)return deps[n];throw Error(n)}});return out;}
const naming=load('utils/exportFilename.ts');
const moves=[],writes=[],shares=[],printed=[];let platform='android';
const common={'react-native':{Platform:{get OS(){return platform}},Alert:{alert:()=>{}},Linking:{}},'expo-print':{printToFileAsync:async options=>{printed.push(options);return{uri:'file:///cache/random.pdf'}}},'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async(...args)=>shares.push(args)},'expo-file-system/legacy':{cacheDirectory:'file:///cache/',moveAsync:async p=>moves.push(p),writeAsStringAsync:async(...p)=>writes.push(p)},'./exportFilename':naming};
const pdf=load('utils/pdfExport.ts',{...common,'../lib/money':{toBengaliDigits:String}});
const reports=load('utils/reportExport.ts',{...common,'./pdfExport':pdf,'../i18n/financeLabels':{financeNote:String},'../theme/colors':{colors:{}},'../lib/supabase':{isSupabaseConfigured:()=>false},'../lib/api':{},'../lib/investment':{},'../lib/ledger':{}});
async function main(){
 const filename=naming.exportFilename(['Amanot','নতুন সমিতি','Monthly / ledger','2026-10'],'pdf',new Date('2026-10-17T06:30:00Z'));
 assert.match(filename,/নতুন-সমিতি/);assert.match(filename,/Monthly---ledger/);assert.ok(filename.endsWith('.pdf'));assert.doesNotMatch(filename,/[<>:"/\\|?*\u0000-\u001f]/);assert.notEqual(naming.exportFilename(['a'],'pdf',new Date(0)),naming.exportFilename(['a'],'pdf',new Date(1)));
 assert.ok(Buffer.byteLength(naming.exportFilename(Array(8).fill('বাংলা'.repeat(40)),'pdf'),'utf8')<255,'Long Bengali filenames fit Android filesystem limits');
 const report={title:'Monthly ledger',language:'en',columns:['Amount'],rows:[[100]]};
 await reports.exportReport(report,'N11','2026-10','PDF');assert.match(moves[0].to,/Amanot_N11_Monthly-ledger_2026-10_.*\.pdf$/);assert.equal(shares[0][0],moves[0].to);assert.equal(shares[0][1].mimeType,'application/pdf');
 await reports.exportReport(report,'N11','2026-10','CSV');assert.match(writes[0][0],/Monthly-ledger_2026-10_.*\.csv$/);assert.equal(shares[1][0],writes[0][0]);assert.equal(shares[1][1].mimeType,'text/csv');assert.ok(writes[0][1].startsWith('\ufeff'));
 await pdf.exportAndShareReceipt({somitiName:'N11',receiptNo:'R/007',memberCode:'SM-003',memberName:'Fixture',amount:100,date:'2026-10-17',paymentMethod:'cash'});assert.match(moves[1].to,/Amanot_N11_Receipt_R-007_SM-003_2026-10-17_.*\.pdf$/);assert.equal(shares[2][0],moves[1].to);assert.ok(printed[1].html.includes('<title>Amanot_N11_Receipt_R-007'));
 console.log('PASS export files: readable Bengali names, reserved characters removed, unique timestamp, report PDF/CSV and receipt PDFs renamed before sharing with correct MIME types.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
