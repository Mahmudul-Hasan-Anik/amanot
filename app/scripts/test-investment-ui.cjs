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
function fixture(role='super_admin',params={},extra={}){
  const slots=[];let cursor=0,counter=0;const writes=[],updates=[],routes=[],scrolls=[];
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useMemo:f=>f(),useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next]},useRef:v=>{const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i]}};
  const state={members:[{id:'m',code:'M-001',name:'Member',phone:'01733000001',address:'Dhaka',fatherName:'Father',motherName:'Mother',status:'paid'}],cashAccounts:[{id:'cash',type:'cashier',name:'Cash',amount:50000},{id:'bank',type:'bank',name:'Bank',amount:1000000}],projects:extra.projects||[],createInvestment:async p=>writes.push(p),updateInvestment:async p=>updates.push(p)};
  const native={View:'View',Text:'Text',ScrollView:'Scroll',KeyboardAvoidingView:'Keyboard',Pressable:'Press',StyleSheet:{create:s=>s},Platform:{OS:'web'},Keyboard:{dismiss:()=>{}}};
  const Screen=load('src/screens/InvestmentNew.tsx',{
    react:React,'react-native':native,'react-native-safe-area-context':{SafeAreaView:'Safe'},'expo-router':{useLocalSearchParams:()=>params,useRouter:()=>({replace:r=>routes.push(r),push:r=>routes.push(r)})},'@expo/vector-icons/Ionicons':{default:'Icon'},
    '../components/MemberPicker':{MemberPicker:'MemberPicker'},'../components':{Button:'Button',Card:'Card',Input:'Input',SelectModal:'Select',DateField:'DateField',formatHumanDate:d=>d},'../i18n/useLanguage':{useLanguage:()=>({l:en=>en,isBengali:false,formatMoney:String,formatMoneyPrecise:String,formatNum:String})},
    '../store/somitiStore':{useSomitiStore:s=>s(state)},'../features/auth/authStore':{useAuthStore:s=>s({actualRole:role})},'../theme/colors':{colors:{}},'../theme/typography':{typography:{fontFamily:{}}},
    '../hooks/useFormValidation':load('src/hooks/useFormValidation.ts',{react:React,'react-native':native}),'../lib/api':{uuid:()=>`request-${++counter}`},'../utils/navigation':{safeBack:()=>{}},'../lib/investment':domain,
  }).default;
  const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
  const text=t=>typeof t==='string'?t:!t||typeof t!=='object'?'':Array.isArray(t)?t.map(text).join(''):text(t.props?.children);
  const render=()=>{cursor=0;const tree=nodes(Screen());tree.forEach((n,index)=>{const ref=n.props?.ref;if(typeof ref==='function')ref({measureLayout:(_relative,done)=>done(0,index*100)});else if(ref)ref.current=n.type==='Scroll'?{scrollTo:p=>scrolls.push(p)}:{};});return tree;};const button=title=>render().find(n=>n.type==='Button'&&n.props.title===title);
  const input=label=>render().find(n=>n.type==='Input'&&n.props.label===label);
  const press=label=>render().find(n=>n.type==='Press'&&text(n).includes(label));
  return{render,button,input,press,writes,updates,routes,scrolls,text};
}
const money=load('src/lib/money.ts');
const lang=load('src/i18n/useLanguage.ts',{'./languageStore':{useLanguageStore:()=>({language:'en',useBengaliDigits:false})},'../lib/money':money}).useLanguage();
assert.equal(lang.formatMoneyPrecise(91.66),'৳91.66');assert.equal(lang.formatMoneyPrecise(91.74),'৳91.74');
async function main(){
 const f=fixture();f.button('Check and save').props.onPress();assert.equal(f.writes.length,0);assert.ok(f.scrolls.length>0,'first invalid field revealed');
 f.press('Outside person').props.onPress();f.input('Full name').props.onChangeText('External');f.input('Mobile number').props.onChangeText('01733000001');
 f.input('Amount ৳').props.onChangeText('40000');f.input('Profit %').props.onChangeText('20');
 assert.equal(f.render().filter(n=>n.type==='Input'&&n.props.label==='Name').length,0,'emergency contacts start hidden (optional)');
 f.button('Check and save').props.onPress();assert.equal(f.writes.length,0,'review cannot post');assert.ok(f.button('Save investment'),'no NID, parents or contacts needed');
 await f.button('Save investment').props.onPress();assert.equal(f.writes.length,1);assert.equal(f.writes[0].contacts.length,0);assert.equal(f.writes[0].memberId,undefined);assert.equal(f.writes[0].profitPct,20);assert.equal(f.writes[0].paymentMethod,'cash');assert.ok(f.routes[0].includes('/project/'+f.writes[0].id),'opens the new contract straight away');
 const short=fixture();short.press('Outside person').props.onPress();short.input('Full name').props.onChangeText('X');short.input('Mobile number').props.onChangeText('01733000001');short.input('Amount ৳').props.onChangeText('60000');short.input('Profit %').props.onChangeText('10');
 assert.ok(short.press('+ Add money'),'shortage shown before saving with an add-money shortcut');short.button('Check and save').props.onPress();assert.equal(short.button('Save investment'),undefined);
 short.press('+ Add money').props.onPress();assert.ok(short.routes[0].includes('/fund/new?method=cash&amount=10000'));
 const contact=fixture();contact.press('+ Add emergency contact').props.onPress();assert.equal(contact.render().filter(n=>n.type==='Input'&&n.props.label==='Name').length,1);
 const slotErrors=domain.investmentFieldErrors({...f.writes[0],contacts:[{name:'',relation:'',phone:''},{name:'Second',relation:'',phone:''}]});assert.equal(slotErrors['contact.0.name'],undefined);assert.equal(slotErrors['contact.1.relation'],undefined,'relationship optional');assert.equal(slotErrors['contact.1.phone'],'phone');
 for(const key of ['nid','fatherName','motherName'])assert.equal(domain.validateNewInvestment({...f.writes[0],[key]:''}),null,key+' optional');
 assert.equal(domain.investmentFieldErrors({...f.writes[0],nid:'12ab'}).nid,'nid');
 const member=fixture();member.render().find(n=>n.type==='MemberPicker').props.onSelect('m');assert.equal(member.input('Mobile number').props.value,'01733000001');
 assert.ok(fixture('cashier').button('Check and save'),'cashier gives investments');assert.equal(fixture('member').button('Check and save'),undefined);
 const contract={...f.writes[0],number:'INV-1',profitAmount:8000,paymentMethod:'cash'};
 const locked=fixture('cashier',{edit:'p1'},{projects:[{id:'p1',returnedAmount:4800,contract}]});assert.equal(locked.input('Amount ৳').props.editable,false,'money terms locked after collections');
 locked.input('Mobile number').props.onChangeText('01733000009');locked.button('Check and save').props.onPress();await locked.button('Save changes').props.onPress();assert.equal(locked.updates[0].id,'p1');assert.equal(locked.updates[0].phone,'01733000009');assert.ok(locked.routes[0].includes('/project/p1'));
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
 console.log('PASS investment domain/UI: principal-first allocation, precise totals/rounding, month-end dates, private reminder content, strict amount parsing, one-page form, optional contacts/identity, shortage before saving, one-step save, cashier allowed, edit with money terms locked after collections, older proposals.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
