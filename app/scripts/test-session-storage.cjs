const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const secure=new Map(),plain=new Map();let fail=false;
const storage={getItem:async k=>plain.get(k)||null,setItem:async(k,v)=>plain.set(k,v),removeItem:async k=>plain.delete(k)};
const native={WHEN_UNLOCKED_THIS_DEVICE_ONLY:1,getItemAsync:async k=>secure.get(k)||null,setItemAsync:async(k,v)=>{if(fail&&!k.endsWith('.manifest'))throw Error('keystore write failed');assert.ok(Buffer.byteLength(v)<=2000);secure.set(k,v);},deleteItemAsync:async k=>secure.delete(k)};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/sessionStorage.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exported={};vm.runInNewContext(code,{exports:exported,require:n=>n==='expo-secure-store'?native:n==='react-native'?{Platform:{OS:'android'}}:n==='@react-native-async-storage/async-storage'?{__esModule:true,default:storage}:require(n)});
async function main(){
  const s=exported.sessionStorage,k='sb-fixture-auth-token';plain.set(k,'legacy plaintext');
  assert.equal(await s.getItem(k),null);assert.equal(plain.has(k),false);
  const value='a'.repeat(499)+'🙂বাংলা'.repeat(1300);
  await s.setItem(k,value);assert.equal(await s.getItem(k),value);assert.equal(plain.has(k),false);
  fail=true;await assert.rejects(()=>s.setItem(k,'replacement'),/keystore/);fail=false;assert.equal(await s.getItem(k),value);
  await s.removeItem(k);assert.equal(await s.getItem(k),null);assert.equal(secure.size,0);
  await Promise.all([s.setItem(k,'token fixture'),s.removeItem(k)]);assert.equal(await s.getItem(k),null);
  console.log('PASS protected session adapter: no plaintext fallback, Unicode chunk round trip, write failure preserves prior session, logout cleanup, serialized writes (mock keystore).');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
