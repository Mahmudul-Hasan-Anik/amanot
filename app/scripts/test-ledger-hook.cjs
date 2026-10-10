const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const queryCache={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/queryCache.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:queryCache,Map,Promise,Error});
let slots=[],index=0,effects=[],auth={isPinVerified:true,mustChangePin:false,currentUser:{id:'owner'},actualRole:'admin'},revision='1',requests=[],focused=true;
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const react={
 useState(initial){const i=index++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}];},
 useRef(initial){const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
 useCallback(fn){index++;return fn;},
 useEffect(fn,deps){const i=index++;if(!equal(slots[i]?.deps,deps)){effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
};
const api={fetchTransactionPage:(filter,cursor)=>new Promise((resolve,reject)=>requests.push({filter,cursor,resolve,reject}))};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/hooks/useLedgerPage.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const out={};vm.runInNewContext(code,{exports:out,Map,JSON,require:n=>{
 if(n==='expo-router')return {useIsFocused:()=>focused};if(n==='../lib/queryCache')return queryCache;if(n==='react')return react;if(n==='../lib/api')return api;if(n==='../lib/supabase')return {isSupabaseConfigured:()=>true};
 if(n==='../store/somitiStore')return {useSomitiStore:fn=>fn({transactions:[],syncRevision:revision})};
 if(n==='../features/auth/authStore')return {useAuthStore:fn=>fn(auth)};throw Error(n);
}});
const render=(filter={})=>{index=0;const result=out.useLedgerPage(filter);const run=effects;effects=[];run.forEach(f=>f());return result;};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
const page=(ids,more=false)=>({rows:ids.map(id=>({id})),hasMore:more,cursor:ids.length?{id:ids.at(-1),createdAt:'fixture'}:null});
async function main(){
 let view=render({memberId:'a'});assert.equal(requests.length,1);
 render({memberId:'b'});assert.equal(requests.length,2);
 requests[0].resolve(page(['wrong']));await flush();view=render({memberId:'b'});assert.equal(view.rows.length,0);
 requests[1].resolve(page(['b1'],true));await flush();view=render({memberId:'b'});assert.equal(view.rows[0].id,'b1');
 view.loadMore();view.loadMore();assert.equal(requests.length,3);assert.equal(requests[2].cursor.id,'b1');
 requests[2].resolve(page(['b1','b2']));await flush();view=render({memberId:'b'});assert.equal(view.rows.length,2);assert.equal(view.hasMore,false);
 focused=false;render({memberId:'b'});focused=true;view=render({memberId:'b'});await flush();assert.equal(requests.length,3);view=render({memberId:'b'});assert.equal(view.rows.length,2,'Menu return preserves appended pages');
 slots.forEach(slot=>slot?.cleanup?.());slots=[];view=render({memberId:'b'});await flush();assert.equal(requests.length,3,'Remount reuses ledger cache');view=render({memberId:'b'});assert.equal(view.rows.length,2);
 view.reload();requests[3].reject(Error('offline'));await flush();view=render({memberId:'b'});assert.equal(view.error,'offline');
 view.reload();requests[4].resolve(page(['retry']));await flush();view=render({memberId:'b'});assert.equal(view.rows[0].id,'retry');
 view.reload();queryCache.clearQueryCache();auth={...auth,isPinVerified:false};view=render({memberId:'b'});assert.equal(view.rows.length,0);
 requests[5].resolve(page(['stale-after-lock']));await flush();view=render({memberId:'b'});assert.equal(view.rows.length,0);assert.equal(requests.length,6);
 auth={...auth,isPinVerified:true};view=render({memberId:'b'});assert.equal(requests.length,7);
 requests[6].resolve(page(['fresh']));await flush();view=render({memberId:'b'});assert.equal(view.rows[0].id,'fresh');
 focused=false;render({memberId:'b'});revision='hidden-change';render({memberId:'b'});assert.equal(requests.length,7);
 focused=true;render({memberId:'b'});assert.equal(requests.length,8);requests[7].resolve(page(['resume']));await flush();
 console.log('PASS ledger hook: filter race rejection, keyset load-more, deduplication, duplicate-click suppression, error/retry, lock redaction and fresh same-user login.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
