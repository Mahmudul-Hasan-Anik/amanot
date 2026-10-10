const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let userReads=0,memberReads=0,ready=true,active=true,gate=null;
const sdk={auth:{getUser:async()=>{userReads++;return {data:{user:{id:'fresh-user'}}}}},rpc:async name=>{assert.equal(name,'session_ready');if(gate)await gate;return {data:ready,error:null}},from:table=>{
 const q={select:()=>q,eq:()=>q,maybeSingle:()=>q,then:(resolve,reject)=>{
  if(table==='members')memberReads++;
  return Promise.resolve({data:table==='profiles'?{id:'fresh-user',member_id:'member',phone:'01700000000',role:'member',is_active:active,must_change_pin:false}:{id:'member',name:'Fixture',join_date:'2026-01-01',months_status:{}},error:null}).then(resolve,reject);
 }};return q;
}};
const exportsFixture={};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(code,{exports:exportsFixture,require:n=>{
 if(n==='./supabase')return {supabase:sdk};if(n==='./ledger')return {};if(n==='./bengali')return {BENGALI_MONTHS_FULL:Array(12).fill('Month')};if(n==='./money')return {toBengaliDigits:String};if(n==='react-native')return {Platform:{OS:'android'}};if(n==='./profilePhoto'||n==='./authErrors')return {};throw Error(n);
}});
async function main(){
 let release;gate=new Promise(r=>release=r);
 const fresh=exportsFixture.fetchMyProfile('fresh-user');
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(userReads,0);assert.equal(memberReads,1,'Member request starts before session readiness resolves');
 release();assert.equal((await fresh).profile.role,'member');gate=null;
 await exportsFixture.fetchMyProfile();assert.equal(userReads,1,'Regular refresh still validates Auth user');
 ready=false;assert.equal(await exportsFixture.fetchMyProfile('fresh-user'),null,'Invalid session cannot load account');
 ready=true;active=false;const before=memberReads;assert.equal(await exportsFixture.fetchMyProfile('fresh-user'),null);assert.equal(memberReads,before);
 console.log('PASS profile loading: fresh server sign-in avoids duplicate Auth lookup, member/readiness checks run concurrently, refresh revalidates Auth and inactive/unverified accounts remain blocked.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
