const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const cache={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/queryCache.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:cache,Map,Promise,Error});
async function main(){
 let calls=0,finish;const load=()=>{calls++;return new Promise(resolve=>finish=resolve)};
 const a=cache.cachedQuery('owner:revision:month',load),b=cache.cachedQuery('owner:revision:month',load);assert.equal(calls,1);assert.equal(a,b);
 finish({total:10});await a;await cache.cachedQuery('owner:revision:month',load);assert.equal(calls,1);
 const manual=cache.cachedQuery('owner:revision:month',load,true);assert.equal(calls,2);finish({total:20});await manual;assert.equal(cache.readQueryCache('owner:revision:month').data.total,20);
 const stale=cache.cachedQuery('old-session',load);cache.clearQueryCache();finish({private:true});await assert.rejects(()=>stale,/invalidated/);assert.equal(cache.readQueryCache('old-session'),undefined);
 for(let n=0;n<65;n++)cache.writeQueryCache(String(n),n);assert.equal(cache.readQueryCache('0'),undefined);assert.equal(cache.readQueryCache('64').data,64);
 await assert.rejects(()=>cache.cachedQuery('error',()=>Promise.reject(Error('offline'))),/offline/);assert.equal(cache.readQueryCache('error'),undefined);
 assert.equal(await cache.cachedQuery('error',()=>Promise.resolve('retry')),'retry');
 console.log('PASS query cache: request coalescing, reuse, explicit refresh, logout invalidation, bounded memory, failed requests retry.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
