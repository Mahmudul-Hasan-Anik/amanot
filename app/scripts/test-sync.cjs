const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const memory=new Map(),storage={getItem:async k=>memory.get(k)||null,setItem:async(k,v)=>memory.set(k,v),removeItem:async k=>memory.delete(k)};
let auth={isPinVerified:true,mustChangePin:false,currentUser:{id:'fixture-member'},actualRole:'member'};
let revision='2026-10-09:1',calls=0,release=null,revisionGate=null;
let now=Date.now();
class TestDate extends Date { static now(){return now;} }
const data={somitiInfo:{name:'Fixture'},members:[{id:'fixture-member',nid:'fixture-private'}],projects:[],cashAccounts:[],transactions:[],expenses:[],approvals:[],approvedApprovals:[],rejectedApprovals:[],notices:[{id:'notice'}],auditLogs:[{id:'audit'}]};
const rejectedWrite=async()=>{throw Error('fixture server denied write')};
const api={fetchSyncRevision:async()=>{if(revisionGate)await revisionGate;return revision},fetchAll:async()=>{calls++;if(release)await release;return data;},addNotice:rejectedWrite,deleteNotice:rejectedWrite,updateMember:rejectedWrite,deleteMember:rejectedWrite,setMemberRole:rejectedWrite,updateSomitiInfo:rejectedWrite};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/store/somitiStore.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exported={};vm.runInNewContext(code,{exports:exported,Date:TestDate,Promise,require:n=>{
  if(n==='zustand'||n==='zustand/middleware')return require(n);
  if(n==='@react-native-async-storage/async-storage')return {__esModule:true,default:storage};
  if(n==='../mocks/mockData')return {mockSomitiInfo:{dueBreakdown:{}},mockMembers:[],mockProjects:[],mockPendingApprovals:[],mockApprovedApprovals:[],mockRejectedApprovals:[],mockCashAccounts:[]};
  if(n==='../lib/bengali')return {toBengaliDigits:s=>s};
  if(n==='react-native')return {Alert:{alert:()=>{}}};
  if(n==='../lib/supabase')return {isSupabaseConfigured:()=>true};
  if(n==='../lib/api')return api;
  if(n==='../lib/ledger')return {emptyLedgerSummary:{months:[],categories:[],collections:{}}};
  if(n==='../services/smsGateway')return {smsGateway:{}};
  if(n==='../features/auth/authStore')return {useAuthStore:{getState:()=>auth}};
  throw Error('Unexpected dependency '+n);
}});
async function main(){
  const store=exported.useSomitiStore;await store.persist.rehydrate();
  await store.getState().syncFromServer(false);assert.equal(calls,1);
  await store.getState().syncFromServer(false);assert.equal(calls,1);
  revision='2026-10-09:2';await store.getState().syncFromServer(false);assert.equal(calls,2);
  await store.getState().syncFromServer();assert.equal(calls,3);
  const fullAt=store.getState().lastFullSyncedAt;
  now+=30*60*1000;revision='changed-at-30-minutes';await store.getState().syncFromServer(false);
  assert.equal(store.getState().lastFullSyncedAt,fullAt);
  const beforePeriodic=calls;now+=16*60*1000;await store.getState().syncFromServer(false);
  assert.equal(calls,beforePeriodic+1);assert.equal(store.getState().lastFullSyncedAt,now);
  assert.deepEqual(JSON.parse(memory.get('amanot-somiti-cache')).state,{});
  const before=store.getState();
  for(const action of [()=>store.getState().addNotice('Title','Body'),()=>store.getState().deleteNotice('notice'),()=>store.getState().updateMember('fixture-member',{name:'Wrong'}),()=>store.getState().deleteMember('fixture-member'),()=>store.getState().setMemberRole('fixture-member','admin'),()=>store.getState().updateSomitiInfo({name:'Wrong'})]) await assert.rejects(action,/server denied/);
  assert.equal(store.getState().members,before.members);assert.equal(store.getState().notices,before.notices);assert.equal(store.getState().somitiInfo,before.somitiInfo);
  let finish;release=new Promise(resolve=>finish=resolve);
  const request=store.getState().syncFromServer();await Promise.resolve();await Promise.resolve();
  auth={...auth,isPinVerified:false};store.getState().clearLocalData();finish();await request;release=null;
  assert.equal(store.getState().members.length,0);assert.equal(store.getState().notices.length,0);assert.equal(store.getState().auditLogs.length,0);
  assert.equal(store.getState().lastFullSyncedAt,null);
  // Logout and re-login as the same person must also discard the old snapshot.
  auth={...auth,isPinVerified:true};release=new Promise(resolve=>finish=resolve);
  const stale=store.getState().syncFromServer();await Promise.resolve();await Promise.resolve();
  store.getState().clearLocalData();finish();await stale;release=null;
  assert.equal(store.getState().members.length,0);
  auth={...auth,isPinVerified:true,mustChangePin:true};await store.getState().syncFromServer();assert.equal(store.getState().members.length,0);
  auth={...auth,mustChangePin:false};
  let finishRevision;revisionGate=new Promise(resolve=>finishRevision=resolve);
  const beforeParallel=calls;const cold=store.getState().syncFromServer();
  for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(calls,beforeParallel+1,'Full snapshot starts while revision is still pending');
  const joined=store.getState().syncFromServer(false);finishRevision();await Promise.all([cold,joined]);revisionGate=null;
  assert.equal(calls,beforeParallel+1,'Initial auto-sync joins login without a second full snapshot');
  console.log('PASS sync: unchanged revision reuse, independent 45-minute snapshot refresh, force refetch, no persisted financial data, stale responses discarded even after same-user re-login, PIN gate enforced.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
