const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let slots=[],index=0,effects=[],focused=true,version=0,requests=[];
let auth={isPinVerified:true,mustChangePin:false,currentUser:{id:'owner'},actualRole:'admin'};
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const react={
 useState(initial){const i=index++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}];},
 useRef(initial){const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
 useEffect(fn,deps){const i=index++;if(!equal(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/hooks/useRemoteQuery.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const out={};vm.runInNewContext(code,{exports:out,require:n=>{
 if(n==='react')return react;if(n==='expo-router')return {useIsFocused:()=>focused};
 if(n==='../store/somitiStore')return {REMOTE:true,useSomitiStore:fn=>fn({syncRevision:'1',dataVersion:version})};
 if(n==='../features/auth/authStore')return {useAuthStore:fn=>fn(auth)};throw Error(n);
}});
const load=()=>new Promise((resolve,reject)=>requests.push({resolve,reject}));
const render=(name='month-a',enabled=true)=>{index=0;const view=out.useRemoteQuery(name,load,enabled);const run=effects;effects=[];run.forEach(f=>f());return view;};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
async function main(){
 focused=false;render();assert.equal(requests.length,0,'Hidden screens do not request reports');
 focused=true;let view=render();assert.equal(view.loading,true);assert.equal(view.data,undefined);assert.equal(requests.length,1);
 render('month-b');requests[0].resolve('wrong-month');await flush();view=render('month-b');assert.equal(view.data,undefined);
 requests[1].resolve('correct-month');await flush();view=render('month-b');assert.equal(view.data,'correct-month');
 version++;view=render('month-b');assert.equal(view.data,undefined,'Edits invalidate old financial results');assert.equal(requests.length,3);
 requests[2].reject(Error('offline'));await flush();view=render('month-b');assert.equal(view.error,'offline');
 view.reload();render('month-b');assert.equal(requests.length,4);requests[3].resolve('retry-ok');await flush();view=render('month-b');assert.equal(view.data,'retry-ok');
 view.reload();render('month-b');auth={...auth,isPinVerified:false};view=render('month-b');assert.equal(view.data,undefined);
 requests[4].resolve('stale-lock');await flush();view=render('month-b');assert.equal(view.data,undefined);assert.equal(requests.length,5);
 auth={...auth,isPinVerified:true};render('month-b');requests[5].resolve('fresh');await flush();view=render('month-b');assert.equal(view.data,'fresh');
 focused=false;render('month-b');version++;render('month-b');assert.equal(requests.length,6);
 focused=true;render('month-b');assert.equal(requests.length,7);requests[6].resolve('resume');await flush();
 render('history',false);assert.equal(requests.length,7,'Pending approval tab does not request history');
 render('history',true);assert.equal(requests.length,8);
 console.log('PASS remote queries: focused loading, no false empty totals, stale month/edit rejection, error/retry, lock redaction, fresh unlock and optional history.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
