const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let supported=false,parentsSupported=true,creates=0,columnsRead=[];
const member={id:'member',name:'Fixture',code:'SM-003',join_date:'2026-01-01'};
const sdk={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},rpc:async(name,args)=>{
 if(name==='session_ready')return {data:true,error:null};if(name==='add_member'){creates++;return {data:{...member,member_category:args.p.memberCategory,member_number:args.p.memberNumber,code:'S-'+args.p.memberNumber},error:null}};return {data:{},error:null};
},from:table=>{let columns='';const q={select:value=>{columns=value;columnsRead.push(value);return q},eq:()=>q,maybeSingle:()=>q,limit:()=>q,then:(resolve,reject)=>{
 const missing=!supported && /member_category/.test(columns);
 const missingParents=!parentsSupported && /father_name/.test(columns);
 const data=table==='somiti_settings'?{info:{depositMode:'voluntary'}}:table==='profiles'?{id:'owner',member_id:'member',phone:'01700000000',is_active:true,must_change_pin:false,member}:[];
 return Promise.resolve({data:missing||missingParents?null:data,error:missing?{code:'42703',message:'column member_category does not exist'}:missingParents?{code:'42703',message:'column father_name does not exist'}:null}).then(resolve,reject);
 }};return q}};
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:out,require:n=>{
 if(n==='./supabase')return {supabase:sdk};if(n==='./ledger')return {};if(n==='./bengali')return {BENGALI_MONTHS_FULL:Array(12).fill('Month')};if(n==='./money')return {toBengaliDigits:String};if(n==='react-native')return {Platform:{OS:'web'}};if(n==='./profilePhoto'||n==='./authErrors')return {};throw Error(n)
}});
async function main(){
 assert.equal((await out.fetchMyProfile('owner')).member.code,'SM-003');assert.equal(columnsRead.length,2,'Old backend retries the permitted legacy columns');
 await assert.rejects(()=>out.addMember({memberCategory:'shareholder',memberNumber:'00202001'}),/migration/);assert.equal(creates,0,'Old RPC cannot silently auto-generate an ID');
 supported=true;const added=await out.addMember({memberCategory:'shareholder',memberNumber:'00202001'});assert.equal(added.code,'S-00202001');assert.equal(creates,1);
 const mapped=out.mapMember(added);assert.equal(mapped.memberCategory,'shareholder');assert.equal(mapped.memberNumber,'00202001');
 parentsSupported=false;
 assert.equal((await out.fetchMyProfile('owner')).member.code,'SM-003','Missing parent columns cannot break existing login');
 await assert.rejects(()=>out.addMember({memberCategory:'general',memberNumber:'101',fatherName:'Father'}),/migration/);assert.equal(creates,1,'Missing schema cannot silently discard parent names');
 await assert.rejects(()=>out.updateMember('member',{motherName:'Mother'}),/migration/);
 parentsSupported=true;await out.addMember({memberCategory:'general',memberNumber:'101',fatherName:'Father',motherName:'Mother'});assert.equal(creates,2);
 const parents=out.mapMember({...added,father_name:'Father',mother_name:'Mother'});assert.equal(parents.fatherName,'Father');assert.equal(parents.motherName,'Mother');
 console.log('PASS member identity API: pending migration keeps legacy login working, blocks unsafe old-RPC creation, then enables manual identities and maps category/number.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
