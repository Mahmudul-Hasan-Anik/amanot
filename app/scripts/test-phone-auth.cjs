const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,dependencies={}){
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const exported={};vm.runInNewContext(code,{exports:exported,require:name=>{if(name in dependencies)return dependencies[name];throw Error('Unexpected import '+name)}});return exported;
}
const phone=load('phoneAuth.ts'),errors=load('authErrors.ts');
const calls=[];let sdkError=null;
const sdk=async payload=>{calls.push(payload);return {data:{session:{fixture:true}},error:sdkError}};
const api=load('api.ts',{'./supabase':{...phone,supabase:{auth:{signUp:sdk,signInWithPassword:sdk}}},'./authErrors':errors,'./bengali':{BENGALI_MONTHS_FULL:[]},'./money':{},'react-native':{Platform:{OS:'web'}},'./profilePhoto':{}});
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
  sdkError={message:'Unable to validate email address: invalid format'};
  await assert.rejects(()=>api.activateWithPin('01700000000','572849'),error=>!error.message.includes('email')&&error.message.includes('মোবাইল'));
  for(const raw of ['Invalid login credentials','Network request failed','Too many requests / rate limit','Email not confirmed','Password should be at least 13 characters']) assert.equal(/[\u0980-\u09ff]/.test(errors.friendlyAuthError(raw)),true);
  console.log('PASS phone auth: supported BD formats, malformed/empty phone rejected before Auth SDK, actual login/activation payloads, Bengali PIN and friendly errors (mock SDK).');
}
main().catch(error=>{console.error(error);process.exitCode=1});
