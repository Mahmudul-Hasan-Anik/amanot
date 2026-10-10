const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../supabase/functions/delete-account/index.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const member='00000000-0000-4000-8000-000000000003';
async function exercise({authenticated=true,allowed=true,storageFails=false,body={pin:'572849',closeSociety:false,confirmation:'DELETE',memberId:'foreign'}}={}){
 let handler,listed=false;const calls=[];
 vm.runInNewContext(code,{Request,Response,Date,Deno:{serve:f=>handler=f,env:{get:k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'public-fixture',SUPABASE_SERVICE_ROLE_KEY:'private-fixture'})[k]}},fetch:async(url,options)=>{
   calls.push({url,options});
   if(url.endsWith('/auth/v1/user'))return Response.json({id:'fixture'},{status:authenticated?200:401});
   if(url.endsWith('/rpc/preview_account_deletion')||url.endsWith('/rpc/delete_my_account'))return Response.json(allowed?{ok:true,memberIds:[member]}:{ok:false,error:'Wrong PIN'});
   if(url.includes('/object/list/')){if(storageFails)return Response.json({}, {status:503});const files=listed?[]:[{name:'avatar.jpg'}];listed=true;return Response.json(files);}
   if(url.includes('/object/member-documents'))return Response.json({});
   if(url.includes('/account_file_cleanup?'))return Response.json(null);
   throw Error('Unexpected request '+url);
 }});
 const response=await handler(new Request('https://fixture.invalid/delete-account',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {response,calls,data:await response.json()};
}
async function main(){
 let x=await exercise({authenticated:false});assert.equal(x.response.status,401);assert.equal(x.calls.length,1);
 x=await exercise({allowed:false});assert.equal(x.response.status,400);assert.equal(x.calls.length,2);
 x=await exercise({body:{pin:'123456',closeSociety:'true',confirmation:'DELETE'}});assert.equal(x.response.status,400);assert.equal(x.calls.length,1);
 x=await exercise();assert.equal(x.data.ok,true);assert.equal(x.data.cleanupPending,false);
 const rpc=x.calls.find(c=>c.url.endsWith('/rpc/preview_account_deletion'));assert.equal(JSON.parse(rpc.options.body).memberId,undefined);assert.equal(rpc.options.headers.apikey,'public-fixture');
 const removed=x.calls.find(c=>c.options.method==='DELETE');assert.deepEqual(JSON.parse(removed.options.body).prefixes,[member+'/avatar.jpg']);assert.equal(removed.options.headers.apikey,'private-fixture');
 assert.equal(JSON.stringify(x.data).includes('private-fixture'),false);
 x=await exercise({storageFails:true});assert.equal(x.response.status,503);assert.equal(x.calls.some(c=>c.url.endsWith('/rpc/delete_my_account')),false);assert.equal(x.calls.some(c=>c.url.includes('/account_file_cleanup?')),false);
 x=await exercise();assert.ok(x.calls.findIndex(c=>c.options.method==='DELETE')<x.calls.findIndex(c=>c.url.endsWith('/rpc/delete_my_account')));
 console.log('PASS deletion HTTP: Auth/PIN validation before deletion, caller-derived targets, server-only storage key, photo removal and retry acknowledgement (mock HTTP).');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
