const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), ts = require('typescript');
const memory = new Map();
const storage = { getItem: async k => memory.get(k) ?? null, setItem: async (k,v) => {memory.set(k,v)}, removeItem: async k => {memory.delete(k)} };
const member = { id:'member-test', name:'Test', phone:'01700000000', role:'member' };
let mustChangePin = false;
let signInFails = false, pinChangeFails = false, profileMissing = false, syncCalls = 0;
const api = {
  checkPhone: async () => ({exists:true,registered:true,initial:'T'}),
  signInWithPin: async () => {if(signInFails) throw Error('Invalid login');},
  fetchMyProfile: async () => profileMissing ? null : {profile:{role:'member',phone:member.phone,must_change_pin:mustChangePin},member},
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
  if (name==='../../lib/sessionStorage') return {sessionStorage:storage};
  if (name==='../../lib/pinPolicy') return {normalizePin:s=>s.replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c)).trim(),isStrongPin:s=>/^\d{6}$/.test(s),generateTemporaryPin:()=> '572849'};
  if (name==='../../store/somitiStore') return {useSomitiStore:{getState:()=>({syncFromServer:()=>{syncCalls++},clearLocalData:()=>{}})}};
  throw Error('Unexpected import '+name);
}});
async function main() {
  const store = result.useAuthStore;
  await store.persist.rehydrate();
  let auth=store.getState(); auth.loginAs(member.id,'admin');
  assert.equal(store.getState().isPinVerified,false);
  assert.equal(auth.verifyPin('1234'),false);
  await auth.continueWithPhone(member.phone);
  signInFails=true;
  assert.equal((await auth.loginWithPin('1234')).ok,false);
  assert.equal(store.getState().isPinVerified,false);
  signInFails=false; profileMissing=true;
  assert.equal((await auth.loginWithPin('1234')).ok,false);
  profileMissing=false;
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
  console.log('PASS live auth regression: demo bypass denied, wrong PIN/profile denied, Bengali PIN, member role, failed changes, app lock, cache redaction');
}
main().catch(e=>{console.error(e);process.exitCode=1});
