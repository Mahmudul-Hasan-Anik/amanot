// Exercise the actual screen handlers with synthetic auth and a minimal hook
// renderer. No requests, passwords, or production accounts are involved.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../app/(auth)/pin.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
function fixture(remote,{ok=true,mustChangePin=false,phone='01700000000',isAuthenticated=true,pending=null,reject=false}={}) {
  const hooks=[],alerts=[],logins=[],verifications=[],routes=[],timers=[];let cursor=0;
  const cleanups=[];
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:initial=>{const index=cursor++;return hooks[index]??(hooks[index]={current:initial})},useEffect:(fn,deps)=>{const index=cursor++;const previous=hooks[index];if(!previous||deps.some((d,i)=>d!==previous.deps[i])){previous?.cleanup?.();const cleanup=fn();hooks[index]={deps,cleanup};if(cleanup)cleanups.push(cleanup)}},useState:initial=>{const index=cursor++;if(!(index in hooks))hooks[index]=initial;return [hooks[index],value=>hooks[index]=typeof value==='function'?value(hooks[index]):value]}};
  const auth={isAuthenticated,phone,currentUser:null,phoneRegistered:true,userRole:'member',mustChangePin,verifyPin:pin=>{verifications.push(pin);return true},loginWithPin:async pin=>{logins.push(pin);if(pending)await pending;if(reject)throw Error('offline');return ok?{ok:true}:{ok:false,error:'Synthetic invalid PIN'}}};
  const useAuthStore=selector=>selector?selector(auth):auth;useAuthStore.getState=()=>auth;
  const exported={};
  vm.runInNewContext(code,{exports:exported,__DEV__:false,setTimeout:fn=>{timers.push(fn);return fn},clearTimeout:fn=>{const i=timers.indexOf(fn);if(i>=0)timers.splice(i,1)},require:name=>{
    if(name==='react')return {__esModule:true,default:React,...React};
    if(name==='react-native')return {Image:'Image',ActivityIndicator:'Spinner',View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',SafeAreaView:'SafeAreaView',StyleSheet:{create:s=>s},Alert:{alert:(...args)=>alerts.push(args)}};
    if(name.endsWith('/assets/logo-transparent.png'))return 'transparent-amanot-logo';
    if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
    if(name==='expo-router')return {Redirect:'Redirect',useRouter:()=>({replace:route=>routes.push(route)})};
    if(name.endsWith('/phoneAuth'))return {isValidPhone:s=>/^01[3-9]\d{8}$/.test(s)};
    if(name.endsWith('/authStore'))return {useAuthStore};
    if(name.endsWith('/supabase'))return {isSupabaseConfigured:()=>remote};
    if(name.endsWith('/CustomKeypad'))return {CustomKeypad:'Keypad'};
    if(name.endsWith('/useLanguage'))return {useLanguage:()=>({l:en=>en})};
    if(name.endsWith('/LanguageToggle'))return {LanguageToggle:'LanguageToggle'};
    if(name.endsWith('/colors'))return {colors:{}};
    if(name.endsWith('/typography'))return {typography:{size:{},lineHeight:{},fontFamily:{}}};
    throw Error('Unexpected import '+name);
  }});
  function render(){cursor=0;return exported.default()}
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of (node.props?.children||[]).flat(Infinity)){const found=find(child,predicate);if(found)return found}return null}
  const digit=d=>find(render(),n=>n.type==='Keypad').props.onPressDigit(d);
  const flush=()=>{for(const fn of timers.splice(0))fn()};
  return {digit,flush,alerts,logins,verifications,routes,render,find,unmount:()=>cleanups.forEach(fn=>fn()),legacy:()=>find(render(),n=>n.type==='TouchableOpacity'&&JSON.stringify(n.props.children).includes('I still have an old 4-digit PIN')).props.onPress()};
}
async function main(){
  for(const options of [{phone:''},{phone:'123'},{isAuthenticated:false}]) assert.equal(fixture(true,options).render().props.href,'/(auth)/login');
  const live=fixture(true);for(const digit of '5728')live.digit(digit);live.flush();
  assert.equal(live.find(live.render(),n=>n.type==='Image').props.source,'transparent-amanot-logo','PIN screen uses the real Amanot logo');
  assert.equal(live.logins.length,0);assert.equal(live.verifications.length,0);assert.equal(live.alerts.length,0);
  for(const digit of '49')live.digit(digit);await Promise.resolve();live.flush();
  assert.deepEqual(live.logins,['572849']);assert.equal(live.verifications.length,0);assert.equal(live.alerts.length,0);assert.deepEqual(live.routes,['/(member)']);
  assert.doesNotMatch(JSON.stringify(fixture(true).render()),/4-digit|4-Digit|old 4/,'No legacy four-digit prompt or toggle');
  const failed=fixture(true,{ok:false});for(const digit of '572849')failed.digit(digit);await Promise.resolve();failed.flush();assert.equal(failed.alerts.length,1);assert.equal(failed.alerts[0][1],'Synthetic invalid PIN');assert.equal(failed.verifications.length,0);
  const upgrade=fixture(true,{mustChangePin:true});for(const digit of '572849')upgrade.digit(digit);await Promise.resolve();assert.deepEqual(upgrade.routes,['/(auth)/change-pin']);
  const demo=fixture(false);for(const digit of '1234')demo.digit(digit);demo.flush();assert.deepEqual(demo.verifications,['1234']);assert.equal(demo.logins.length,0);
  let finish;const pending=new Promise(resolve=>finish=resolve);
  const busy=fixture(true,{pending});for(const digit of '572849')busy.digit(digit);
  assert.equal(busy.find(busy.render(),n=>n.type==='Keypad').props.disabled,true);
  assert.ok(busy.find(busy.render(),n=>n.type==='Spinner'));
  busy.digit('9');assert.equal(busy.logins.length,1,'Repeated taps cannot submit another PIN');
  busy.flush();assert.match(JSON.stringify(busy.render()),/longer than usual/);
  busy.unmount();finish();for(let i=0;i<8;i++)await Promise.resolve();assert.equal(busy.routes.length,0,'Unmounted screen cannot navigate after response');
  const thrown=fixture(true,{reject:true});for(const digit of '572849')thrown.digit(digit);for(let i=0;i<8;i++)await Promise.resolve();assert.equal(thrown.alerts.length,1);assert.equal(thrown.find(thrown.render(),n=>n.type==='Keypad').props.disabled,false,'Rejected request unlocks keypad');
  console.log('PASS PIN screen: six-digit live login, no legacy prompt/toggle, backend error, forced upgrade, pending/unmount guards and demo login.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
