// Real Edge Function handler, with synthetic HTTP/provider responses only.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../supabase/functions/send-sms/index.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
async function exercise({staff=true,recipients=[],provider='greenweb',authenticated=true}={}){
  let handler;const calls=[];
  vm.runInNewContext(code,{Response,Request,URLSearchParams,AbortSignal,Deno:{serve:fn=>handler=fn,env:{get:key=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'fixture',SMS_PROVIDER:provider,SMS_API_KEY:'fixture'})[key]}},fetch:async(url,options)=>{
    calls.push(url);
    if(url.endsWith('/rpc/is_staff'))return Response.json(staff);
    if(url.includes('/rest/v1/members?'))return Response.json(recipients);
    if(url.includes('greenweb.com.bd'))return Response.json([{status:'SENT'}]);
    if(url.endsWith('/rpc/log_sms'))return Response.json(null);
    throw Error('Unexpected fixture request');
  }});
  const response=await handler(new Request('https://fixture.invalid/send-sms',{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer fixture'}:{})},body:JSON.stringify({phone:'01799000066',memberId:'00000000-0000-4000-8000-000000000066',message:'Synthetic test'})}));
  return {response,calls};
}
async function main(){
  let x=await exercise({authenticated:false});assert.equal(x.response.status,401);assert.equal(x.calls.length,0);
  x=await exercise({staff:false});assert.equal(x.response.status,403);assert.equal(x.calls.length,1);
  x=await exercise();assert.equal(x.response.status,403);assert.equal(x.calls.some(u=>u.includes('greenweb.com.bd')),false);assert.equal(x.calls.some(u=>u.endsWith('/rpc/log_sms')),false);
  x=await exercise({recipients:[{phone:'01799000055'}]});assert.equal(x.response.status,403);assert.equal(x.calls.some(u=>u.includes('greenweb.com.bd')),false);
  x=await exercise({recipients:[{phone:'01799000066'}]});assert.equal(x.response.status,200);assert.equal(x.calls.filter(u=>u.includes('greenweb.com.bd')).length,1);assert.equal((await x.response.json()).auditSaved,true);
  console.log('PASS SMS scope: login/staff required, foreign or mismatched member blocked before provider, own recipient accepted (mock HTTP only).');
}
main().catch(error=>{console.error(error);process.exitCode=1});
