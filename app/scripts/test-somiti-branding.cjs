const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict'),path=require('node:path');
function load(file,deps){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)}});return exports;}
const branding=load('src/utils/somitiBranding.ts',{});
const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:v=>[v,()=>{}],useMemo:f=>f(),useCallback:f=>f};
const state={somitiInfo:{name:'N11 dfdf',nameEn:'Amanot Somiti'},members:[],approvals:[],investmentProposals:[],withdrawalRequests:[],projects:[],cashAccounts:[]};
let bengali=false;
const theme={colors:{},typography:{fontFamily:{},size:{},lineHeight:{}}};
const Screen=load('app/(admin)/(tabs)/index.tsx',{
 react:{__esModule:true,default:React,...React},'react-native':{Image:'Image',View:'View',Text:'Text',ScrollView:'Scroll',TouchableOpacity:'Touch',StatusBar:'Status',RefreshControl:'Refresh',StyleSheet:{create:s=>s}},
 'react-native-safe-area-context':{SafeAreaView:'SafeArea'},'expo-router':{useRouter:()=>({push:()=>{}})},'@expo/vector-icons/Ionicons':{default:'Icon'},
 '../../../src/components/InvestmentApprovalQueue':{InvestmentApprovalQueue:'Investments'},'../../../src/components/WithdrawalApprovalQueue':{WithdrawalApprovalQueue:'Withdrawals'},'../../../src/components/FAB':{FAB:'FAB'},'../../../src/components/Card':{Card:'Card'},
 '../../../src/store/somitiStore':{useSomitiStore:f=>f(state)},'../../../src/i18n/useLanguage':{useLanguage:()=>({l:(en,bn)=>bengali?bn:en,formatMoney:String,formatNum:String})},
 '../../../src/lib/bengali':{BENGALI_MONTHS_FULL:Array(12).fill('Month'),toBengaliDigits:String},'../../../src/theme/colors':theme,'../../../src/theme/typography':theme,
 '../../../src/utils/somitiBranding':branding,'../../../assets/logo-transparent.png':'amanot-logo',
}).default;
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
for(const language of [false,true]){
 bengali=language;const tree=nodes(Screen());
 assert.ok(tree.some(n=>n.type==='Text'&&n.props.children[0]==='N11 dfdf'),'Registered name overrides stale translation in either language');
 assert.ok(!tree.some(n=>n.props.children?.[0]==='Amanot Somiti'));
 assert.equal(tree.find(n=>n.type==='Image').props.source,'amanot-logo');
}
state.somitiInfo={name:'দ্বিতীয় সমিতি',nameEn:'Another stale name'};
assert.ok(nodes(Screen()).some(n=>n.props.children?.[0]==='দ্বিতীয় সমিতি'),'Account switch renders the new society name');
state.somitiInfo={name:'Updated society',nameEn:'Old English name'};
assert.ok(nodes(Screen()).some(n=>n.props.children?.[0]==='Updated society'),'Renaming is reflected without depending on translation');
console.log('PASS actual dashboard: Amanot image, canonical society name in both languages, stale translation ignored, society switch and rename reflected.');
