const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), ts = require('typescript');
const memory = new Map();
const storage = { getItem: async k => memory.get(k) ?? null, setItem: async (k,v) => {memory.set(k,v)}, removeItem: async k => {memory.delete(k)} };
const member = { id:'member-test', name:'Test', phone:'01700000000', role:'member' };
let mustChangePin = false;
let signInFails = false, pinChangeFails = false, profileMissing = false, syncCalls = 0;
let signIns=0;
let registered=true,activations=0,signInWait=null,exists=true,bootstrapCalls=0,bootstrapWait=null,clearCalls=0;
let fetchedMember=member;
const api = {
  checkPhone: async () => ({exists,registered,initial:'T'}),
  bootstrapSomiti: async (name,adminName,phone,pin) => {bootstrapCalls++;assert.equal(name,'New society');assert.equal(adminName,'New admin');assert.equal(pin,'572849');if(bootstrapWait)await bootstrapWait;},
  signInWithPin: async () => {signIns++;if(signInWait)await signInWait;if(signInFails) throw Error('Invalid login');},
  activateWithPin:async()=>{activations++},
  fetchMyProfile: async () => profileMissing ? null : {profile:{role:'member',phone:fetchedMember.phone,must_change_pin:mustChangePin},member:fetchedMember},
  changeOwnPin: async () => {if(pinChangeFails) throw Error('offline');},
  resetMemberPin: async () => {throw Error('denied');},
  signOut: async () => {},
};
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/features/auth/authStore.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const result = {};
vm.runInNewContext(code, { exports:result, require: name => {
  if (name==='zustand' || name==='zustand/middleware') return require(name);
  if (name==='@react-native-async-storage/async-storage') return {default:storage};
  if (name==='../../mocks/mockData') return {mockMembers:[member]};
  if (name==='../../lib/bengali') return {toEnglishDigits:s=>s.replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c))};
  if (name==='react-native') return {Alert:{alert:()=>{}}};
  if (name==='../../lib/supabase') return {isSupabaseConfigured:()=>true,normalizePhone:s=>s};
  if (name==='../../lib/api') return api;
  if (name==='../../lib/phoneAuth') return {isValidPhone:s=>/^01[3-9]\d{8}$/.test(s)};
  if (name==='../../lib/authErrors') return {friendlyAuthError:s=>s};
  if (name==='../../lib/sessionStorage') return {sessionStorage:storage};
  if (name==='../../lib/pinPolicy') return {normalizePin:s=>s.replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c)).trim(),isStrongPin:s=>/^\d{6}$/.test(s),generateTemporaryPin:()=> '572849'};
  if (name==='../../store/somitiStore') return {useSomitiStore:{getState:()=>({syncFromServer:()=>{syncCalls++},clearLocalData:()=>{clearCalls++}})}};
  throw Error('Unexpected import '+name);
}});
async function main() {
  const store = result.useAuthStore;
  await store.persist.rehydrate();
  let auth=store.getState(); auth.loginAs(member.id,'admin');
  assert.equal(store.getState().isPinVerified,false);
  assert.equal(auth.verifyPin('1234'),false);
  assert.equal((await auth.loginWithPin('572849')).ok,false);assert.equal(signIns,0);
  assert.equal((await auth.continueWithPhone('')).found,false);assert.equal(signIns,0);
  await auth.continueWithPhone(member.phone);
  signInFails=true;
  assert.equal((await auth.loginWithPin('1234')).ok,false);
  assert.equal(store.getState().isPinVerified,false);
  signInFails=false; profileMissing=true;
  assert.equal((await auth.loginWithPin('1234')).ok,false);
  profileMissing=false;
  store.setState({phoneRegistered:false}); // stale cache must not trigger signup
  assert.equal((await auth.loginWithPin('১২৩৪')).ok,true);
  auth=store.getState(); assert.equal(auth.actualRole,'member'); assert.equal(syncCalls,1);
  auth.switchRole('admin'); assert.equal(store.getState().userRole,'member');
  pinChangeFails=true; await assert.rejects(()=>auth.setCustomPin('572849','1234'),/offline/);
  await assert.rejects(()=>auth.resetMemberPin(member.id),/denied/);
  mustChangePin=true;
  assert.equal((await auth.loginWithPin('572849')).ok,true);
  assert.equal(store.getState().mustChangePin,true);
  assert.equal(syncCalls,1);
  assert.equal(auth.verifyOtp('482700'),false);
  auth.lockApp(); assert.equal(store.getState().isPinVerified,false);
  const cached=JSON.parse(memory.get('amanot-auth-live')).state;
  for(const key of ['pin','customPins','lastGeneratedOtp','isPinVerified','currentUser','actualRole','mustChangePin']) assert.equal(key in cached,false);
  auth.logout();const before=signIns;assert.equal((await auth.loginWithPin('572849')).ok,false);assert.equal(signIns,before);
  registered=false;await auth.continueWithPhone(member.phone);
  assert.equal((await auth.loginWithPin('1234')).ok,false);assert.equal(activations,0);
  assert.equal((await auth.loginWithPin('572849')).ok,true);assert.equal(activations,1);
  registered=true;await auth.continueWithPhone(member.phone);
  let release;signInWait=new Promise(resolve=>release=resolve);
  const pending=auth.loginWithPin('572849');await Promise.resolve();await Promise.resolve();auth.logout();release();
  assert.equal((await pending).ok,false);assert.equal(store.getState().isAuthenticated,false);assert.equal(store.getState().isPinVerified,false);
  assert.equal((await auth.registerSomitiRemote('','New admin',member.phone,'572849')).ok,false);
  assert.equal((await auth.registerSomitiRemote('New society','New admin',member.phone,'572849')).ok,false);
  assert.equal(bootstrapCalls,0);
  exists=false;mustChangePin=false;
  const clearsBefore=clearCalls;
  assert.equal((await auth.registerSomitiRemote(' New society ',' New admin ',member.phone,'৫৭২৮৪৯')).ok,true);
  assert.equal(bootstrapCalls,1);assert.ok(clearCalls>clearsBefore);assert.equal(store.getState().isPinVerified,true);
  fetchedMember={...member,id:'other-society-member',phone:'01799000088'};
  const clearsBeforeSwitch=clearCalls;
  await auth.refreshProfile();
  assert.equal(store.getState().isPinVerified,false);assert.ok(clearCalls>clearsBeforeSwitch);
  fetchedMember=member;
  let finishBootstrap;bootstrapWait=new Promise(resolve=>finishBootstrap=resolve);
  const registering=auth.registerSomitiRemote('New society','New admin',member.phone,'572849');
  await Promise.resolve();await Promise.resolve();auth.logout();finishBootstrap();
  assert.equal((await registering).ok,false);assert.equal(store.getState().isPinVerified,false);
  console.log('PASS live auth regression: demo bypass denied, wrong PIN/profile denied, Bengali PIN, member role, failed changes, app lock, cache redaction');
}
main().catch(e=>{console.error(e);process.exitCode=1});
