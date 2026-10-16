const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,dependencies={}){
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const exported={};vm.runInNewContext(code,{exports:exported,require:name=>{if(name in dependencies)return dependencies[name];throw Error('Unexpected import '+name)}});return exported;
}
const phone=load('phoneAuth.ts'),errors=load('authErrors.ts');
const calls=[];let sdkError=null;
const sdk=async payload=>{calls.push(payload);return {data:{session:{fixture:true}},error:sdkError}};
let gateOk=true,session=null,gateMessage='বেশি ভুল চেষ্টা হয়েছে।',rpcError=null;
const gateCalls=[];
const api=load('api.ts',{'./ledger':load('ledger.ts'),'./supabase':{...phone,supabase:{rpc:async(name,args)=>{gateCalls.push({name,args});if(rpcError)return {data:null,error:rpcError};if(gateMessage==='আবার লগইন করুন।'&&name==='confirm_pin_session'){gateMessage='বেশি ভুল চেষ্টা হয়েছে।';return {data:{ok:false,error:'আবার লগইন করুন।'},error:null}}return {data:{ok:gateOk,error:gateMessage},error:null};},auth:{getSession:async()=>({data:{session},error:null}),signUp:sdk,signInWithPassword:sdk,signOut:async()=>{session=null}}}},'./authErrors':errors,'./bengali':{BENGALI_MONTHS_FULL:[]},'./money':{},'react-native':{Platform:{OS:'web'}},'./profilePhoto':{}});
async function main(){
  for(const input of ['01700000000','1700000000','+880 1700-000000','008801700000000','০১৭০০০০০০০০']) {
    assert.equal(phone.normalizePhone(input),'01700000000');assert.equal(phone.phoneToEmail(input),'01700000000@member.amanot.app');
  }
  for(const input of ['', '123', '99901700000000','0001700000000','01200000000']) {
    assert.equal(phone.isValidPhone(input),false);assert.throws(()=>phone.phoneToEmail(input));
    await assert.rejects(()=>api.signInWithPin(input,'572849'));await assert.rejects(()=>api.activateWithPin(input,'572849'));
  }
  assert.equal(calls.length,0);
  await api.signInWithPin('+8801700000000','৫৭২৮৪৯');assert.equal(calls[0].email,'01700000000@member.amanot.app');assert.equal(calls[0].password,'amanot:572849');
  await api.activateWithPin('01700000000','572849');assert.equal(calls[1].options.data.phone,'01700000000');
  assert.equal(gateCalls[0].name,'verify_login_pin');assert.equal(gateCalls[1].name,'confirm_pin_session');
  gateOk=false;await assert.rejects(()=>api.signInWithPin('01700000000','572849'),/ভুল চেষ্টা/);assert.equal(calls.length,2);gateOk=true;
  sdkError={message:'Unable to validate email address: invalid format'};
  await assert.rejects(()=>api.activateWithPin('01700000000','572849'),error=>!error.message.includes('email')&&error.message.includes('মোবাইল'));
  for(const raw of ['Invalid login credentials','Network request failed','Too many requests / rate limit','Email not confirmed','Password should be at least 13 characters']) assert.equal(/[\u0980-\u09ff]/.test(errors.friendlyAuthError(raw)),true);
  sdkError=null;
  const candidate=()=>({user:{id:'fixture',email:'01700000000@member.amanot.app'},expires_at:Date.now()/1000+3600});
  session=candidate();let before=calls.length,start=gateCalls.length;
  assert.equal((await api.signInWithPin('01700000000','572849')).user.id,'fixture');assert.equal(calls.length,before);assert.equal(gateCalls.length-start,1);assert.equal(gateCalls.at(-1).name,'confirm_pin_session');
  gateOk=false;await assert.rejects(()=>api.signInWithPin('01700000000','572849'),/ভুল চেষ্টা/);assert.equal(calls.length,before,'Wrong PIN cannot fall back to password or count another attempt');gateOk=true;
  rpcError={code:'NETWORK',message:'Network request failed'};await assert.rejects(()=>api.signInWithPin('01700000000','572849'),/Network/);assert.equal(calls.length,before);rpcError=null;
  gateMessage='আবার লগইন করুন।';await api.signInWithPin('01700000000','572849');assert.equal(calls.length,++before,'Revoked session requires fresh authentication');
  session={...candidate(),expires_at:1};await api.signInWithPin('01700000000','572849');assert.equal(calls.length,++before,'Expired session requires fresh authentication');
  session={...candidate(),user:{id:'other',email:'other@member.amanot.app'}};await api.signInWithPin('01700000000','572849');assert.equal(calls.length,++before,'Another account cannot use warm unlock');
  const samples=api.getPerformanceSamples();assert.ok(samples.length>0&&samples.length<=40);assert.ok(samples.every(s=>Object.keys(s).sort().join(',')==='durationMs,ok,stage'));assert.ok(samples.some(s=>!s.ok));api.clearPerformanceSamples();assert.equal(api.getPerformanceSamples().length,0);
  console.log('PASS phone auth: supported BD formats, malformed/empty phone rejected before Auth SDK, actual login/activation payloads, Bengali PIN and friendly errors (mock SDK).');
}
main().catch(error=>{console.error(error);process.exitCode=1});
