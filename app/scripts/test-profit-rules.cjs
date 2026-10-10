const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();
function load(file,dependencies={}) {
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:name=>{
    if(name in dependencies)return dependencies[name];
    const target=path.resolve(path.dirname(file),name+'.ts');
    if(!cache.has(target))cache.set(target,load(target));
    return cache.get(target);
  }});return exports;
}
const allocation=load(path.join(__dirname,'../src/lib/profitAllocation.ts'));
const {calculateProfitAllocation:calc,parseProfitPercent:parse}=allocation;
assert.equal(parse('১২.৫০'),12.5);
for(const bad of ['', ' ', '-1', '101', '1.234', '1x', 'Infinity', 'NaN']) assert.equal(parse(bad),null,bad);
assert.equal(calc(1000,60,41),null);
assert.equal(calc(1000,0,0).distributed,1000);
assert.equal(calc(1000,100,0).distributed,0);
assert.equal(calc(1000,'১২.৫','৭.২৫').distributed,802.5);
const pennies=calc(0.03,10,10);
assert.equal(Math.round((pennies.reserveFund+pennies.managementFund+pennies.distributed)*100),3);
function fixture({remote=false,approved=false,role='super_admin'}={}) {
  const hooks=[],effects=[],alerts=[],writes=[],approvals=[];let cursor=0;
  const React={Fragment:'Fragment',createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:initial=>{const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],v=>hooks[i]=typeof v==='function'?v(hooks[i]):v]},useMemo:f=>f(),useEffect:f=>effects.push(f)};
  const snapshot={alreadyDistributed:true,reservePct:12.5,managementPct:7.25,projectProfit:1000,expenses:0,netProfit:1000,totalDeposit:1000,distributed:802.5,shares:[{memberId:'m',name:'Fixture',baseDeposit:1000,share:802.5}]};
  const state={members:[{id:'m',name:'Fixture',status:'paid',totalDeposit:1000}],projects:[{netProfit:1000}],somitiInfo:{name:'Fixture',monthlyExpense:0,...(approved?{demoProfitDistributions:{[new Date().getFullYear()]:snapshot}}:{})},updateSomitiInfo:async v=>writes.push(v),syncFromServer:async()=>{}};
  const store=()=>state;store.getState=()=>state;store.setState=v=>Object.assign(state,v);
  const screen=load(path.join(__dirname,'../app/(admin)/distribution.tsx'),{
    'react':{__esModule:true,default:React,...React},'react-native':{View:'View',Text:'Text',ScrollView:'Scroll',TouchableOpacity:'Touch',TextInput:'Input',SafeAreaView:'SafeAreaView',StatusBar:'StatusBar',StyleSheet:{create:s=>s},Alert:{alert:(...a)=>alerts.push(a)},Platform:{}},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    'expo-router':{useRouter:()=>({})},'@expo/vector-icons/Ionicons':{default:'Icon'},
    '../../src/store/somitiStore':{REMOTE:remote,useSomitiStore:store},'../../src/features/auth/authStore':{useAuthStore:f=>f({actualRole:role})},
    '../../src/i18n/useLanguage':{useLanguage:()=>({l:en=>en,formatMoney:n=>String(n),formatNum:n=>String(n),isBengali:false})},
    '../../src/utils/navigation':{safeBack:()=>{}},'../../src/lib/api':{profitPreview:()=>approvals.length ? new Promise(()=>{}) : Promise.resolve({alreadyDistributed:false,projectProfit:1000,expenses:0,netProfit:1000,totalDeposit:1000}),distributeProfit:async(...v)=>{approvals.push(v);return {distributed:802.5};}},
    '../../src/theme/colors':{colors:{avatarPastels:[{bg:'',text:''}]}},'../../src/theme/typography':{typography:{fontFamily:{},size:{},lineHeight:{}}},
    '../../src/utils/pdfExport':{exportAndShareReceipt:()=>{}},'../../src/components':{Button:'Button',Card:'Card'},'../../src/lib/profitAllocation':allocation,
  });
  function render(){cursor=0;effects.length=0;return screen.default()}
  function nodes(tree){if(!tree||typeof tree!=='object')return [];return [tree,...(tree.props.children||[]).flat(Infinity).flatMap(nodes)]}
  const input=label=>nodes(render()).find(n=>n.type==='Input'&&n.props.accessibilityLabel===label);
  const button=title=>nodes(render()).find(n=>n.props.title===title);
  const approve=()=>nodes(render()).find(n=>n.type==='Touch'&&JSON.stringify(n.props.children).includes('Give Approval'));
  return {render,input,button,approve,alerts,writes,approvals,effects};
}
async function main(){
 const f=fixture({remote:true});f.render();f.effects[0]();await Promise.resolve();await Promise.resolve();
 assert.equal(f.input('Reserve fund (%)').props.value,'0');
 f.input('Reserve fund (%)').props.onChangeText('12.5');f.input('Director share (%)').props.onChangeText('7.25');
 await f.button('Save somiti rules').props.onPress();assert.equal(f.writes[0].profitReservePct,12.5);assert.equal(f.writes[0].profitManagementPct,7.25);
 f.approve().props.onPress();const confirm=f.alerts.find(a=>a[0]==='Profit Distribution Approval');assert.ok(confirm[1].includes('802.5'));
 await confirm[2][1].onPress();assert.equal(f.approvals[0][1],12.5);assert.equal(f.approvals[0][2],7.25);
 assert.equal(f.input('Reserve fund (%)').props.value,'12.5','Approved rates remain visible while refreshing the server snapshot');
 const invalid=fixture();invalid.input('Reserve fund (%)').props.onChangeText('60');invalid.input('Director share (%)').props.onChangeText('41');assert.equal(invalid.approve().props.disabled,true);invalid.approve().props.onPress();assert.equal(invalid.alerts.length,0);
 const frozen=fixture({approved:true});assert.equal(frozen.input('Reserve fund (%)').props.value,'12.5');assert.equal(frozen.input('Reserve fund (%)').props.editable,false);assert.equal(frozen.button('Save somiti rules'),undefined);
 const cashier=fixture({role:'cashier'});assert.equal(cashier.input('Reserve fund (%)').props.editable,false);assert.equal(cashier.approve().props.disabled,true);
 console.log('PASS profit rules: zero/decimal/Bengali rates, invalid totals blocked, cents reconcile, settings persistence payload, selected rates sent to distribution API, approved snapshot locked, cashier read-only.');
}
main().catch(e=>{console.error(e);process.exitCode=1});

