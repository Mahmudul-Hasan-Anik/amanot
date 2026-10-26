// One-step savings return (approvals happen outside the app). No hosted data.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,deps={}){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports:out,require:n=>{if(n in deps)return deps[n];throw Error(n)}});return out;}
const digits={toEnglishDigits:s=>s.replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)))};
const domain=load('src/lib/investment.ts',{'./bengali':digits}),withdrawal=load('src/lib/withdrawal.ts'),ledger=load('src/lib/ledger.ts');
const today=domain.isoToday(),member={id:'m',name:'Fixture Member',code:'M-001',status:'paid',totalDeposit:20000,profitBalance:1000,totalWithdrawn:5000};
const request={id:'w',member_id:'m',member_name:member.name,member_code:member.code,amount:5000,preferred_method:'bank',status:'submitted',created_at:today+'T00:00:00Z',reason:'',decision_note:'',payment_note:'',reversal_reason:'',payment_reference:'',paid_transaction_id:'w',reversal_transaction_id:'rw',payment_date:today};
function fixture(role='cashier',memberView=false,status=null){
 let cursor=0,counter=0,gate=null,fail=false;const slots=[],calls=[],receipts=[];
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next]},useRef:v=>{const i=cursor++;return slots[i]??(slots[i]={current:v})},useEffect:()=>{}};
 const state={withdrawalRequests:status?[{...request,status}]:[],members:[member],transactions:[{id:'w',receiptNo:'1001',amount:5000,dateISO:today,type:'withdrawal'},{id:'rw',receiptNo:'1002',amount:5000,dateISO:today,type:'withdrawal_reversal'}],cashAccounts:[{type:'cashier',name:'Cash',amount:50000},{type:'bank',name:'Bank',amount:50000}],somitiInfo:{name:'Fixture'},
  recordWithdrawal:async p=>{calls.push(['record',p]);if(gate)await gate;if(fail)throw Error('Fixture network failure')},decideWithdrawal:async(...args)=>calls.push(['decision',...args]),payWithdrawal:async(...args)=>calls.push(['pay',...args]),reverseWithdrawal:async(...args)=>calls.push(['reverse',...args])};
 const useStore=f=>f(state);useStore.getState=()=>state;
 const auth={currentUser:member,actualRole:role,isPinVerified:true};const authStore=f=>f(auth);authStore.getState=()=>auth;
 const Screen=load('src/screens/Withdrawals.tsx',{react:React,'react-native':{View:'View',Text:'Text',Modal:'Modal',ScrollView:'Scroll',KeyboardAvoidingView:'Keyboard',Pressable:'Pressable',Platform:{OS:'web'},StyleSheet:{create:s=>s}},'expo-router':{useLocalSearchParams:()=>({})},'@expo/vector-icons/Ionicons':{default:'Icon'},
  '../components/MemberPicker':{MemberPicker:'MemberPicker'},'../components/Page':{Page:'Page',pageStyles:{}},'../components/Button':{Button:'Button'},'../components/Input':{Input:'Input'},'../components/SelectModal':{SelectModal:'Select'},'../components/DateField':{DateField:'DateField',formatHumanDate:d=>d},
  '../store/somitiStore':{REMOTE:false,useSomitiStore:useStore},'../features/auth/authStore':{useAuthStore:authStore},'../i18n/useLanguage':{useLanguage:()=>({l:en=>en,isBengali:false,formatMoneyPrecise:String})},'../lib/withdrawal':withdrawal,'../lib/investment':domain,'../lib/api':{uuid:()=>String(++counter)},'../utils/reportExport':{exportReport:async r=>receipts.push(r)},'../theme/colors':{colors:{}},'../theme/typography':{typography:{fontFamily:{}}}}).default;
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):t.type==='Modal'&&!t.props.visible?[]:[t,...nodes(t.props?.children)];
 const render=()=>{cursor=0;return nodes(Screen({memberView}))};
 return {render,calls,receipts,button:title=>render().find(n=>n.type==='Button'&&n.props.title===title),input:label=>render().find(n=>n.type==='Input'&&n.props.label===label),picker:()=>render().find(n=>n.type==='MemberPicker'),setGate:p=>gate=p,setFail:v=>fail=v};
}
async function main(){
 assert.equal(withdrawal.withdrawalAvailable(member,[{...request,status:'approved'}]),15000,'deposit and profit are both withdrawable');
 assert.equal(ledger.signedTransactionAmount({type:'withdrawal',amount:5000}),-5000);assert.equal(ledger.signedTransactionAmount({type:'withdrawal',amount:5000,voided:true}),0);
 assert.equal(fixture('member',true).button('Give savings back'),undefined,'members cannot request or record withdrawals');
 const f=fixture('cashier');f.button('Give savings back').props.onPress();
 for(const value of ['','abc','NaN','1.234']){f.picker().props.onSelect('m');f.input('Amount').props.onChangeText(value);await f.button('Save').props.onPress();assert.equal(f.calls.length,0);}
 f.input('Amount').props.onChangeText('20001');await f.button('Save').props.onPress();assert.equal(f.calls.length,0,'cannot return more than savings');
 f.input('Amount').props.onChangeText('১,২০০.৫০');f.setFail(true);await f.button('Save').props.onPress();const first=f.calls[0][1];assert.equal(first.amount,1200.5);assert.equal(first.memberId,'m');assert.equal(first.date,today);
 let release;f.setGate(new Promise(resolve=>release=resolve));f.setFail(false);const pending=f.button('Save').props.onPress();await f.button('Save').props.onPress();assert.equal(f.calls.length,2,'double tap cannot save twice');assert.equal(f.calls[1][1].id,first.id,'retry keeps the same operation ID');release();await pending;
 const cancel=fixture('cashier',false,'paid');cancel.button('Cancel').props.onPress();await cancel.button('Cancel entry').props.onPress();assert.equal(cancel.calls.length,0,'reason required');cancel.input('Why cancel?').props.onChangeText('Money came back');await cancel.button('Cancel entry').props.onPress();assert.equal(cancel.calls[0][0],'reverse');
 assert.equal(fixture('cashier',false,'submitted').button('Pay now'),undefined,'older requests are closed by an admin');
 const legacy=fixture('super_admin',false,'submitted');legacy.button('Pay now').props.onPress();await legacy.button('Save').props.onPress();assert.deepEqual(legacy.calls.map(c=>c[0]),['decision','pay']);
 const receipt=fixture('member',true,'paid');await receipt.button('Receipt').props.onPress();assert.ok(receipt.receipts[0].rows.some(r=>r[0]==='Amount'&&r[1]===5000));
 console.log('PASS withdrawal UI: one-step return, deposit+profit withdrawable, invalid/over-savings blocked, Bengali amounts, retry ID, double tap, cancel with reason, older requests, receipt.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
