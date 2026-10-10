// Exercise the actual screen handlers with synthetic auth and a minimal hook
// renderer. No requests, passwords, or production accounts are involved.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../app/(auth)/pin.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
function fixture(remote,{ok=true,mustChangePin=false,phone='01700000000',isAuthenticated=true}={}) {
  const hooks=[],alerts=[],logins=[],verifications=[],routes=[],timers=[];let cursor=0;
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:initial=>{const index=cursor++;if(!(index in hooks))hooks[index]=initial;return [hooks[index],value=>hooks[index]=typeof value==='function'?value(hooks[index]):value]}};
  const auth={isAuthenticated,phone,currentUser:null,phoneRegistered:true,userRole:'member',mustChangePin,verifyPin:pin=>{verifications.push(pin);return true},loginWithPin:async pin=>{logins.push(pin);return ok?{ok:true}:{ok:false,error:'Synthetic invalid PIN'}}};
  const useAuthStore=()=>auth;useAuthStore.getState=()=>auth;
  const exported={};
  vm.runInNewContext(code,{exports:exported,__DEV__:false,setTimeout:fn=>timers.push(fn),require:name=>{
    if(name==='react')return {__esModule:true,default:React,...React};
    if(name==='react-native')return {View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',SafeAreaView:'SafeAreaView',StyleSheet:{create:s=>s},Alert:{alert:(...args)=>alerts.push(args)}};
    if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
    if(name==='expo-router')return {Redirect:'Redirect',useRouter:()=>({replace:route=>routes.push(route)})};
    if(name.endsWith('/phoneAuth'))return {isValidPhone:s=>/^01[3-9]\d{8}$/.test(s)};
    if(name.endsWith('/authStore'))return {useAuthStore};
    if(name.endsWith('/supabase'))return {isSupabaseConfigured:()=>remote};
    if(name.endsWith('/CustomKeypad'))return {CustomKeypad:'Keypad'};
    if(name.endsWith('/useLanguage'))return {useLanguage:()=>({l:en=>en})};
    if(name.endsWith('/LanguageToggle'))return {LanguageToggle:'LanguageToggle'};
    if(name.endsWith('/colors'))return {colors:{}};
    if(name.endsWith('/typography'))return {typography:{size:{},lineHeight:{}}};
    throw Error('Unexpected import '+name);
  }});
  function render(){cursor=0;return exported.default()}
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of (node.props?.children||[]).flat(Infinity)){const found=find(child,predicate);if(found)return found}return null}
  const digit=d=>find(render(),n=>n.type==='Keypad').props.onPressDigit(d);
  const flush=()=>{for(const fn of timers.splice(0))fn()};
  return {digit,flush,alerts,logins,verifications,routes,render,legacy:()=>find(render(),n=>n.type==='TouchableOpacity'&&JSON.stringify(n.props.children).includes('I still have an old 4-digit PIN')).props.onPress()};
}
async function main(){
  for(const options of [{phone:''},{phone:'123'},{isAuthenticated:false}]) assert.equal(fixture(true,options).render().props.href,'/(auth)/login');
  const live=fixture(true);for(const digit of '5728')live.digit(digit);live.flush();
  assert.equal(live.logins.length,0);assert.equal(live.verifications.length,0);assert.equal(live.alerts.length,0);
  for(const digit of '49')live.digit(digit);await Promise.resolve();live.flush();
  assert.deepEqual(live.logins,['572849']);assert.equal(live.verifications.length,0);assert.equal(live.alerts.length,0);assert.deepEqual(live.routes,['/(member)']);
  const legacy=fixture(true);legacy.legacy();for(const digit of '5728')legacy.digit(digit);await Promise.resolve();legacy.flush();
  assert.deepEqual(legacy.logins,['5728']);assert.equal(legacy.verifications.length,0);
  const failed=fixture(true,{ok:false});for(const digit of '572849')failed.digit(digit);await Promise.resolve();failed.flush();assert.equal(failed.alerts.length,1);assert.equal(failed.alerts[0][1],'Synthetic invalid PIN');assert.equal(failed.verifications.length,0);
  const upgrade=fixture(true,{mustChangePin:true});for(const digit of '572849')upgrade.digit(digit);await Promise.resolve();assert.deepEqual(upgrade.routes,['/(auth)/change-pin']);
  const demo=fixture(false);for(const digit of '1234')demo.digit(digit);demo.flush();assert.deepEqual(demo.verifications,['1234']);assert.equal(demo.logins.length,0);
  console.log('PASS PIN screen: live waits for six digits, no demo alert/verification, explicit legacy four-digit login, backend error, forced upgrade and demo login.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
