const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,deps={}){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports:out,requestAnimationFrame:callback=>callback(),require:n=>{if(n in deps)return deps[n];throw Error('Missing fixture '+n)}});return out;}
const digits={toEnglishDigits:s=>s.replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)))};
const domain=load('src/lib/investment.ts',{'./bengali':digits});
const {contractAmounts,allocateInvestmentPayment,investmentSchedule,investmentReminder,parseInvestmentAmount}=domain;
const c={id:'c',number:'INV-001',recipientName:'Recipient',phone:'01733000001',whatsapp:'',principal:100000,profitPct:20,profitAmount:20000,termMonths:12,firstDueDate:'2026-01-31',contacts:[{name:'Private contact'}],nid:'PRIVATE-NID'};
assert.equal(contractAmounts(100000,20).total,120000);
assert.equal(allocateInvestmentPayment(100000,20000,10000,100000).profitPart,10000);
assert.throws(()=>allocateInvestmentPayment(100000,20000,119999,2));
assert.equal(investmentSchedule(c,15000,'2026-03-01')[1].paid,5000);
assert.equal(investmentSchedule(c,15000,'2026-03-01')[1].remaining,5000);
assert.equal(investmentSchedule(c,0)[1].dueDate,'2026-02-28');assert.equal(investmentSchedule(c,0)[2].dueDate,'2026-03-31');
const pennies=investmentSchedule({...c,principal:100,profitAmount:0,termMonths:3},0);
assert.equal(pennies[2].amount,33.34);assert.equal(pennies.reduce((s,i)=>s+Math.round(i.amount*100),0),10000);
const reminder=investmentReminder(c,0,'Society',false,'2026-02-01');assert.ok(reminder.url.startsWith('https://wa.me/8801733000001?text='));assert.ok(!reminder.text.includes('PRIVATE'));assert.equal(investmentReminder(c,120000,'Society',false),null);
assert.equal(parseInvestmentAmount('১,২০০.৫০'),1200.5);for(const bad of ['abc','1x2','1.234','-1','Infinity'])assert.ok(Number.isNaN(parseInvestmentAmount(bad)));
function fixture(role='super_admin',source){
  const slots=[];let cursor=0,counter=0;const writes=[],routes=[],scrolls=[];
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next]},useRef:v=>{const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i]}};
  const state={investmentProposals:source?[{id:'source',status:'withdrawn',payload:source}]:[],members:[{id:'m',code:'M-001',name:'Member',phone:'01733000001',address:'Dhaka',fatherName:'Father',motherName:'Mother',status:'paid'}],cashAccounts:[{id:'bank',type:'bank',name:'Bank',amount:1000000}],createInvestment:async p=>writes.push(p)};
  const native={View:'View',Text:'Text',ScrollView:'Scroll',KeyboardAvoidingView:'Keyboard',StyleSheet:{create:s=>s},Platform:{OS:'web'},Keyboard:{dismiss:()=>{}}};
  const Screen=load('src/screens/InvestmentNew.tsx',{
    react:React,'react-native':native,'react-native-safe-area-context':{SafeAreaView:'Safe'},'expo-router':{useLocalSearchParams:()=>({source:source?'source':undefined}),useRouter:()=>({replace:r=>routes.push(r)})},
    '../components/MemberPicker':{MemberPicker:'Select'},'../components':{Button:'Button',Card:'Card',Input:'Input',SelectModal:'Select'},'../i18n/useLanguage':{useLanguage:()=>({l:en=>en,formatMoney:String,formatMoneyPrecise:String,formatNum:String})},
    '../store/somitiStore':{useSomitiStore:s=>s(state)},'../features/auth/authStore':{useAuthStore:s=>s({actualRole:role})},'../theme/colors':{colors:{}},'../theme/typography':{typography:{fontFamily:{}}},
    '../hooks/useFormValidation':load('src/hooks/useFormValidation.ts',{react:React,'react-native':native}),'../lib/api':{uuid:()=>`request-${++counter}`},'../utils/navigation':{safeBack:()=>{}},'../lib/investment':domain,
  }).default;
  const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
  const render=()=>{cursor=0;const tree=nodes(Screen());tree.forEach((n,index)=>{const ref=n.props?.ref;if(typeof ref==='function')ref({measureLayout:(_relative,done)=>done(0,index*100)});else if(ref)ref.current=n.type==='Scroll'?{scrollTo:p=>scrolls.push(p)}:{};});return tree;};const button=title=>render().find(n=>n.type==='Button'&&n.props.title===title);
  const input=label=>render().find(n=>n.type==='Input'&&n.props.label===label);
  return{render,button,input,writes,routes,scrolls};
}
const money=load('src/lib/money.ts');
const lang=load('src/i18n/useLanguage.ts',{'./languageStore':{useLanguageStore:()=>({language:'en',useBengaliDigits:false})},'../lib/money':money}).useLanguage();
assert.equal(lang.formatMoneyPrecise(91.66),'৳91.66');assert.equal(lang.formatMoneyPrecise(91.74),'৳91.74');
async function main(){
 const f=fixture();f.button('Review investment').props.onPress();assert.equal(f.writes.length,0);assert.ok(f.scrolls.at(-1).y>0,'first invalid field should be revealed');assert.ok(f.input('NID number *').props.error);
 f.button('External person').props.onPress();f.input('Full name').props.onChangeText('External');f.input('Phone').props.onChangeText('01733000001');f.button('Review investment').props.onPress();assert.ok(f.input('NID number *').props.error);const nidAnchor=f.render().find(n=>n.type==='View'&&n.props.children?.[0]?.props?.label==='NID number *');assert.ok(nidAnchor);assert.ok(f.scrolls.at(-1).y>0);
 f.input('NID number *').props.onChangeText('1234567890');assert.equal(f.input('NID number *').props.error,undefined,'editing clears that field error');
 f.button('External person').props.onPress();f.input('Full name').props.onChangeText('External');f.input('Phone').props.onChangeText('01733000001');
 f.input('NID number *').props.onChangeText('1234567890');f.input("Father's name *").props.onChangeText('Father');f.input("Mother's name *").props.onChangeText('Mother');
 f.input('Principal to disburse').props.onChangeText('100000');f.input('Profit % for the whole contract').props.onChangeText('20');
 const contacts=()=>f.render().filter(n=>n.type==='Input'&&n.props.label==='Name');assert.equal(contacts().length,3);contacts()[0].props.onChangeText('Contact');
 f.render().filter(n=>n.type==='Input'&&n.props.label==='Relationship')[0].props.onChangeText('Brother');
 f.render().filter(n=>n.type==='Input'&&n.props.label==='Phone')[1].props.onChangeText('01733000002');
 f.button('Review investment').props.onPress();assert.equal(f.writes.length,0,'review cannot disburse');assert.ok(f.button('Submit proposal'));
 await f.button('Submit proposal').props.onPress();assert.equal(f.writes.length,1);assert.equal(f.writes[0].contacts.length,1);assert.equal(f.writes[0].memberId,undefined);assert.equal(f.writes[0].profitPct,20);assert.ok(f.routes[0].includes('/investment/proposal/'));assert.ok(f.routes[0].includes(f.writes[0].id));
 const slotErrors=domain.investmentFieldErrors({...f.writes[0],contacts:[{name:'',relation:'',phone:''},{name:'Second',relation:'',phone:''},{name:'',relation:'',phone:''}]});assert.equal(slotErrors['contact.0.name'],undefined);assert.equal(slotErrors['contact.1.relation'],'required');assert.equal(slotErrors['contact.1.phone'],'phone');
 for(const key of ['nid','fatherName','motherName'])assert.equal(domain.validateNewInvestment({...f.writes[0],[key]:' '}),'identity');
 const member=fixture();member.render().find(n=>n.type==='Select'&&n.props.title==='Select active member').props.onSelect('m');assert.equal(member.input('Full name').props.value,'Member');assert.equal(member.input("Father's name *").props.value,'Father');
 assert.equal(fixture('cashier').button('Review investment'),undefined);
 // Real component harness: the three financial states expose different actions.
 function proposalFixture(status){
  const slots=[];let cursor=0;const actions=[],routes=[];
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],n=>slots[i]=n]},useRef:v=>{const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i]}};
  const data=f.writes[0];const state={investmentProposals:[{id:data.id,payload:data,status,created_at:new Date().toISOString(),decision_note:''}],projects:[],cashAccounts:[{type:'bank',name:'Bank',amount:1000000}],decideInvestmentProposal:async(...a)=>actions.push(['decision',...a]),withdrawInvestmentProposal:async(...a)=>actions.push(['withdraw',...a]),disburseInvestmentProposal:async(...a)=>actions.push(['disburse',...a])};
  const Screen=load('src/screens/InvestmentProposal.tsx',{react:React,'react-native':{View:'View',Text:'Text',ScrollView:'Scroll',StyleSheet:{create:s=>s}},'react-native-safe-area-context':{SafeAreaView:'Safe'},'expo-router':{useLocalSearchParams:()=>({id:data.id}),useRouter:()=>({replace:r=>routes.push(r),push:r=>routes.push(r)})},'../components':{Button:'Button',Card:'Card',Input:'Input',SelectModal:'Select'},'../store/somitiStore':{useSomitiStore:s=>s(state)},'../features/auth/authStore':{useAuthStore:s=>s({actualRole:'super_admin'})},'../i18n/useLanguage':{useLanguage:()=>({l:en=>en,formatMoney:String,formatMoneyPrecise:String,formatNum:String})},'../lib/investment':domain,'../theme/colors':{colors:{}},'../theme/typography':{typography:{fontFamily:{}}},'../utils/navigation':{safeBack:()=>{}}}).default;
  const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
  const render=()=>{cursor=0;return nodes(Screen())};return{input:label=>render().find(n=>n.type==='Input'&&n.props.label===label),button:title=>render().find(n=>n.type==='Button'&&n.props.title===title),actions,routes};
 }
 const waiting=proposalFixture('submitted');assert.equal(waiting.button('Prepare disbursement'),undefined);await waiting.button('Approve proposal').props.onPress();assert.equal(waiting.actions[0][0],'decision');
 const approved=proposalFixture('approved');assert.equal(approved.button('Approve proposal'),undefined);assert.equal(approved.button('Confirm money paid'),undefined);approved.button('Prepare disbursement').props.onPress();await approved.button('Confirm money paid').props.onPress();assert.equal(approved.actions[0][0],'disburse');assert.ok(approved.routes[0].includes('/project/'));
 assert.equal(proposalFixture('rejected').button('Prepare disbursement'),undefined);
 const withdrawn=proposalFixture('approved');assert.equal(withdrawn.button('Withdraw proposal').props.disabled,true);withdrawn.input('Withdrawal reason').props.onChangeText('Correct terms');await withdrawn.button('Withdraw proposal').props.onPress();assert.equal(withdrawn.actions[0][0],'withdraw');
 const corrected=proposalFixture('withdrawn');corrected.button('Correct and submit a new proposal').props.onPress();assert.ok(corrected.routes[0].includes('/investment/new?source='));
 const cloned=fixture('super_admin',{...f.writes[0],id:'original'});assert.equal(cloned.input('Full name').props.value,'External');assert.equal(cloned.input('Principal to disburse').props.value,String(f.writes[0].principal));
 cloned.button('Review investment').props.onPress();await cloned.button('Submit proposal').props.onPress();assert.notEqual(cloned.writes[0].id,'original');
 console.log('PASS investment domain/UI: principal-first allocation, precise totals/rounding, month-end dates, partial installments, private reminder content, strict amount parsing, external/member form, one required contact, explicit review and admin-only disbursement.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
