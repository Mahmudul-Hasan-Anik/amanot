const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,deps={}){
 const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>{if(n in deps)return deps[n];throw Error('Missing fixture '+n)}});return exports;
}
const money=load('src/lib/money.ts');
const labels=load('src/i18n/financeLabels.ts');
const lang={l:(en)=>en,isBengali:false,formatMoney:String,formatNum:String,defaultMonthlyDeposit:2000,gracePeriodDays:5,lateFeeAmount:100};
const native={View:'View',Text:'Text',Modal:'Modal',KeyboardAvoidingView:'Keyboard',ScrollView:'Scroll',TouchableOpacity:'Touch',Switch:'Switch',StatusBar:'Status',Platform:{OS:'android'},StyleSheet:{create:s=>s},Alert:{alert:()=>{}}};
const theme={'../theme/colors':{colors:{avatarPastels:[{bg:'',text:''}]}},'../theme/typography':{typography:{fontFamily:{},size:{},lineHeight:{}}}};
function hooks(){let i=0;const values=[];return {React:{createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:initial=>{const at=i++;if(!(at in values))values[at]=initial;return [values[at],v=>{values[at]=v}]}},reset:()=>{i=0}};}
function nodes(t){return t&&typeof t==='object'?[t,...(t.props?.children||[]).flat(Infinity).flatMap(nodes)]:[];}
function texts(t){return typeof t==='string'?t:(t?.props?.children||[]).flat(Infinity).map(texts).join(' ');}
async function main(){
 let writes=[],closed=0,fail=false;const h=hooks();
 const Editor=load('src/components/NumberSettingModal.tsx',{'react':{__esModule:true,default:h.React,...h.React},'react-native':native,'./Input':{Input:'Input'},'./Button':{Button:'Button'},'../i18n/useLanguage':{useLanguage:()=>lang},'../lib/money':money,...theme}).NumberSettingModal;
 let props={title:'Grace',value:5,min:0,max:365,integer:true,onSave:async v=>{if(fail)throw Error('offline');writes.push(v)},onClose:()=>closed++};
 const render=()=>{h.reset();return Editor(props)};
 const input=()=>nodes(render()).find(n=>n.type==='Input');
 const save=()=>nodes(render()).find(n=>n.type==='Button'&&n.props.title==='Save').props.onPress();
 for(const invalid of ['', '-1','1.2','366','2x','Infinity']){input().props.onChangeText(invalid);await save();assert.equal(writes.length,0);assert.ok(input().props.error);}
 input().props.onChangeText('০');await save();assert.equal(writes[0],0);assert.equal(closed,1);
 props={...props,title:'Late fee',min:0,max:100000000,integer:false};
 fail=true;input().props.onChangeText('১২৩.৫০');await save();assert.equal(closed,1);assert.equal(input().props.error,'offline');
 fail=false;await save();assert.equal(writes[1],123.5);assert.equal(closed,2);
 // Real settings handlers: opening does not save, server rejection keeps modal open.
 const sh=hooks(),routes=[],saved=[],locals=[];let reject=false;
 const state={somitiInfo:{graceDays:9,lateFee:75.5,defaultMonthly:3500},approvals:[],updateSomitiInfo:async p=>{if(reject)throw Error('server denied');saved.push(p)}};
 const store=f=>f?f(state):state;
 const useLang=()=>({...lang,setGracePeriodDays:v=>locals.push(v),setLateFeeAmount:v=>locals.push(v),setDefaultMonthlyDeposit:v=>locals.push(v)});
 const Settings=load('app/(admin)/settings.tsx',{'react':{__esModule:true,default:sh.React,...sh.React},'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeArea'},'expo-router':{useRouter:()=>({push:p=>routes.push(p)})},'@expo/vector-icons/Ionicons':{default:'Icon'},'../../src/features/auth/authStore':{useAuthStore:()=>({logout:()=>{}})},'../../src/store/somitiStore':{REMOTE:true,useSomitiStore:store},'../../src/i18n/useLanguage':{useLanguage:useLang},'../../src/utils/navigation':{},'../../src/components/NumberSettingModal':{NumberSettingModal:'Editor'},'../../src/theme/colors':theme['../theme/colors'],'../../src/theme/typography':theme['../theme/typography']}).default;
 const settings=()=>{sh.reset();return Settings()};
 for(const [label,key,value] of [['Grace Period','graceDays',9],['Late Fee','lateFee',75.5],['Default Monthly Deposit','defaultMonthly',3500]]){
  nodes(settings()).find(n=>n.type==='Touch'&&texts(n).includes(label)).props.onPress();
  const editor=nodes(settings()).find(n=>n.type==='Editor');assert.equal(editor.props.value,value);assert.equal(saved.length,locals.length);
  reject=true;await assert.rejects(()=>editor.props.onSave(123),/server denied/);assert.equal(saved.length,locals.length);
  reject=false;await editor.props.onSave(123);assert.equal(saved.at(-1)[key],123);assert.equal(locals.at(-1),123);editor.props.onClose();
 }
 nodes(settings()).find(n=>n.type==='Touch'&&texts(n).includes('Distribution Method')).props.onPress();assert.equal(routes.at(-1),'/(admin)/distribution');
 const More=load('app/(admin)/(tabs)/more.tsx',{'react':{__esModule:true,default:sh.React,...sh.React},'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeArea'},'expo-router':{useRouter:()=>({})},'@expo/vector-icons/Ionicons':{default:'Icon'},'../../../src/features/auth/authStore':{useAuthStore:()=>({currentUser:{name:'Fixture'}})},'../../../src/store/somitiStore':{useSomitiStore:store},'../../../src/i18n/useLanguage':{useLanguage:useLang},'../../../src/theme/colors':theme['../theme/colors'],'../../../src/theme/typography':theme['../theme/typography']}).default;
 const approvalRow=()=>nodes(More()).find(n=>n.type==='Touch'&&texts(n).includes('Approvals'));
 assert.equal(texts(approvalRow()).includes('3'),false);state.approvals=[{id:'p1'},{id:'p2'}];assert.match(texts(approvalRow()),/2/);state.approvals=[];assert.equal(texts(approvalRow()).includes('2'),false);
 for(const [bn,en] of [['অফিস ভাড়া','Office Rent'],['বিকাশ','bKash'],['কোষাধ্যক্ষের হাতে','Cash with Treasurer']]){assert.equal(labels.financeLabel(bn,false),en);assert.equal(labels.financeLabel(en,true),bn)}
 assert.equal(labels.financeNote('অফিস ভাড়া: নিজের লেখা',false),'Office Rent: নিজের লেখা');assert.equal(labels.financeLabel('সদস্যের নাম',false),'সদস্যের নাম');assert.match(labels.financeDate('2026-10-10','',false),/Oct/);assert.equal(/[০-৯]/.test(labels.financeDate('2026-10-10','',false)),false);
 console.log('PASS settings UI: real input handlers, Bengali/decimal/zero validation, invalid values blocked, failed saves remain open, live setting payloads, distribution navigation, finance labels/dates and custom text preservation.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
