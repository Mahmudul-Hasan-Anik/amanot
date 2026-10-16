import React, { useRef, useState } from 'react';
import { View, Text, Modal, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Page, pageStyles as s } from '../components/Page';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SelectModal } from '../components/SelectModal';
import { useSomitiStore } from '../store/somitiStore';
import { useAuthStore } from '../features/auth/authStore';
import { useLanguage } from '../i18n/useLanguage';
import { Withdrawal, WithdrawalMethod, withdrawalAvailable, pendingDays } from '../lib/withdrawal';
import { MemberPicker } from '../components/MemberPicker';
import { MemberBalanceSummary } from '../components/MemberBalanceSummary';
import { isoToday, parseInvestmentAmount, validISODate } from '../lib/investment';
import { uuid, fetchTransactionByReference } from '../lib/api';
import { REMOTE } from '../store/somitiStore';
import { exportReport } from '../utils/reportExport';
import { colors } from '../theme/colors';

export default function Withdrawals({memberView=false}:{memberView?:boolean}){
 const params=useLocalSearchParams<{memberId?:string;requestId?:string}>();
 const {l,isBengali,formatMoneyPrecise:money}=useLanguage();
 const rows=useSomitiStore(s=>s.withdrawalRequests),members=useSomitiStore(s=>s.members),accounts=useSomitiStore(s=>s.cashAccounts),society=useSomitiStore(s=>s.somitiInfo);
 const current=useAuthStore(s=>s.currentUser),role=useAuthStore(s=>s.actualRole);
 const admin=!memberView&&['super_admin','admin'].includes(role),canPay=!memberView&&['super_admin','admin','cashier'].includes(role);
 const canChoose=!memberView&&['super_admin','admin','cashier'].includes(role);
 const [filter,setFilter]=useState('all'),[modal,setModal]=useState(''),[selected,setSelected]=useState<Withdrawal|null>(null);
 const [memberId,setMemberId]=useState(memberView?current?.id||'':String(params.memberId||current?.id||''));
 const [amount,setAmount]=useState(''),[reason,setReason]=useState(''),[method,setMethod]=useState<WithdrawalMethod>('cash'),[date,setDate]=useState(isoToday()),[reference,setReference]=useState('');
 const [picker,setPicker]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const locked=useRef(false),requestId=useRef(''),reversalId=useRef('');
 const formRef=useRef<ScrollView>(null);
 const showError=(message:string)=>{setError(message);formRef.current?.scrollTo({y:0,animated:true});};
 const syncing=useSomitiStore(s=>s.isSyncing);
 const own=rows.filter(r=>!memberView||r.member_id===current?.id);
 const visible=own.filter(r=>(!params.memberId||r.member_id===params.memberId)&&(!params.requestId||r.id===params.requestId||r.reversal_transaction_id===params.requestId)&&(filter==='all'||filter==='pending'&&['submitted','approved'].includes(r.status)||r.status===filter));
 const member=members.find(m=>m.id===memberId)||(memberView&&current?.id===memberId?current:null);
 const available=member?withdrawalAvailable(member,rows.filter(r=>r.member_id===memberId)):0;
 const reserved=own.filter(r=>r.status==='approved').reduce((sum,r)=>sum+r.amount,0);
 const methods:[WithdrawalMethod,string][]=[['cash',l('Cash','হাতে নগদ')],['bank',l('Bank','ব্যাংক')],['bkash','bKash'],['nagad',l('Nagad','নগদ')]];
 const status=(v:Withdrawal['status'])=>({submitted:l('Waiting for approval','অনুমোদনের অপেক্ষায়'),approved:l('Approved · payment pending','অনুমোদিত · টাকা প্রদান বাকি'),rejected:l('Rejected','প্রত্যাখ্যাত'),cancelled:l('Cancelled','বাতিল'),paid:l('Paid','প্রদান সম্পন্ন'),reversed:l('Reversed · savings restored','সংশোধিত · জমা ফেরত যুক্ত')}[v]);
 const open=(action:string,r:Withdrawal|null=null)=>{
  if(locked.current)return;setSelected(r);setModal(action);setError('');setReason('');setDate(isoToday());setReference('');setAmount('');setMethod(r?.preferred_method||'cash');requestId.current=uuid();reversalId.current=uuid();
 };
 const close=()=>{if(!locked.current){setModal('');setError('');setPicker('');}};
 const receipt=async(r:Withdrawal)=>{
  if(locked.current)return;locked.current=true;setBusy(true);setError('');
  try{
   const reversed=r.status==='reversed';
   const auth=useAuthStore.getState(),identity=`${auth.currentUser?.id}:${auth.actualRole}`;
   const lookup=async(id:string|undefined)=>id?(useSomitiStore.getState().transactions.find(t=>t.id===id)||(REMOTE?await fetchTransactionByReference(id):null)):null;
   const [paid,reversal]=await Promise.all([lookup(r.paid_transaction_id),reversed?lookup(r.reversal_transaction_id):Promise.resolve(null)]);
   const currentAuth=useAuthStore.getState();
   if(REMOTE&&(!currentAuth.isPinVerified||`${currentAuth.currentUser?.id}:${currentAuth.actualRole}`!==identity))return;
   if(!paid||(reversed&&!reversal))throw new Error(l('Receipt details unavailable. Refresh and try again.','রসিদের তথ্য পাওয়া যায়নি। আপডেট করে আবার চেষ্টা করুন।'));
   await exportReport({language:isBengali?'bn':'en',title:reversed?l('Withdrawal and reversal receipt','উত্তোলন ও সংশোধনের রসিদ'):l('Savings withdrawal receipt','সঞ্চয় উত্তোলনের রসিদ'),columns:[l('Item','বিবরণ'),l('Value','তথ্য')],rows:[
    [l('Receipt number','রসিদ নম্বর'),paid.receiptNo],
    [l('Request ID','আবেদন আইডি'),r.id],[l('Member','সদস্য'),r.member_name],[l('Member ID','সদস্য আইডি'),r.member_code],[l('Amount paid','প্রদান করা টাকা'),r.amount],
    [l('Date','তারিখ'),r.payment_date||''],[l('Method','মাধ্যম'),r.payment_method||''],[l('Reference','reference'),r.payment_reference||''],[l('Status','অবস্থা'),status(r.status)],
    ...(reversed?[[l('Reversal receipt','সংশোধনের রসিদ'),reversal!.receiptNo],[l('Reversal date','সংশোধনের তারিখ'),reversal!.dateISO||reversal!.date],[l('Reversal ID','সংশোধনের আইডি'),r.reversal_transaction_id||''],[l('Reversal reason','সংশোধনের কারণ'),r.reversal_reason]]:[])
   ]},society.name,r.payment_date||isoToday(),'PDF');
  }catch(e:any){setError(e.message);}finally{locked.current=false;setBusy(false);}
 };
 const save=async()=>{
  if(locked.current)return;setError('');
  const actions=useSomitiStore.getState(),value=parseInvestmentAmount(amount);
  if(modal==='new'&&(!member||!Number.isFinite(value)||value<=0||value>available)){showError(l('Choose a member and enter an amount within available savings.','সদস্য নির্বাচন করে উত্তোলনযোগ্য জমার মধ্যে পরিমাণ লিখুন।'));return;}
  if(['reject','cancel','reverse'].includes(modal)&&!reason.trim()){showError(l('Enter a reason.','কারণ লিখুন।'));return;}
  if(['pay','reverse'].includes(modal)&&(!validISODate(date)||date>isoToday())){showError(l('Enter a valid date, not in the future.','সঠিক তারিখ দিন; ভবিষ্যতের তারিখ নয়।'));return;}
  if(modal==='pay'&&method!=='cash'&&!reference.trim()){showError(l('Enter the payment reference.','টাকা প্রদানের reference দিন।'));return;}
  locked.current=true;setBusy(true);
  try{
   if(modal==='new')await actions.submitWithdrawal({id:requestId.current,memberId,amount:value!,method,reason:reason.trim()});
   else if(modal==='pay')await actions.payWithdrawal(selected!.id,method,date,reference,reason);
   else if(modal==='reverse')await actions.reverseWithdrawal(selected!.id,reversalId.current,date,reason);
   else await actions.decideWithdrawal(selected!.id,modal as 'approve'|'reject'|'cancel',reason);
   setSuccess(modal==='new'?l('Withdrawal request submitted. No money has been deducted.','উত্তোলনের আবেদন জমা হয়েছে। টাকা কাটা হয়নি।'):modal==='pay'?l('Payment recorded. Savings and account balances updated.','টাকা প্রদান রেকর্ড হয়েছে। জমা ও account balance সমন্বয় হয়েছে।'):modal==='reverse'?l('Reversal recorded. Confirm the money was returned to the same account.','সংশোধন রেকর্ড হয়েছে। টাকা একই হিসাবে ফেরত এসেছে নিশ্চিত করুন।'):l('Request updated.','আবেদন আপডেট হয়েছে।'));setModal('');
  }catch(e:any){showError(e.message||l('Operation failed','কাজটি সম্পন্ন হয়নি'));}finally{locked.current=false;setBusy(false);}
 };
 const modalTitle=modal==='new'?l('Request withdrawal','উত্তোলনের আবেদন'):modal==='pay'?l('Confirm money paid','টাকা প্রদান নিশ্চিত করুন'):modal==='approve'?l('Approve withdrawal','উত্তোলন অনুমোদন'):modal==='reject'?l('Reject withdrawal','উত্তোলন প্রত্যাখ্যান'):modal==='reverse'?l('Reverse recorded payment','প্রদান করা টাকা সংশোধন'):l('Cancel request','আবেদন বাতিল');
 return <Page title={l('Savings withdrawals','সঞ্চয় উত্তোলন')} backTo={memberView?'/(member)':'/(admin)/(tabs)'} subtitle={l('Request → approval → payment','আবেদন → অনুমোদন → টাকা প্রদান')}
  actions={<Button title={l('Refresh','আপডেট')} size="sm" variant="ghost" loading={syncing} disabled={busy} onPress={()=>{void useSomitiStore.getState().syncFromServer();}}/>}>
  {success?<Text accessibilityLiveRegion="polite" style={[s.text,{color:colors.primary,marginBottom:12}]}>{success}</Text>:null}
  {error&&!modal?<Text accessibilityRole="alert" style={{color:colors.danger,marginBottom:12}}>{error}</Text>:null}
  <View style={s.card}><Text style={s.text}>{l('Approved savings reserved','অনুমোদিত আবেদনে সংরক্ষিত জমা')}</Text><Text style={s.value}>{money(reserved)}</Text><Text style={s.text}>{l('Approval does not deduct money. Cash/bank availability is checked when payment is recorded.','অনুমোদনে টাকা কাটা হয় না। টাকা প্রদানের সময় cash/bank balance যাচাই হয়।')}</Text></View>
  {memberView&&member&&<MemberBalanceSummary member={member} requests={rows}/>}
  <Button title={l('New withdrawal request','নতুন উত্তোলনের আবেদন')} disabled={busy||(!canChoose&&!current?.id)} onPress={()=>open('new')}/>
  <View style={[s.chips,{marginTop:16}]}>{[['all',l('All','সব')],['pending',l('Pending','অপেক্ষমাণ')],['paid',l('Paid','প্রদত্ত')],['reversed',l('Reversed','সংশোধিত')]].map(([value,label])=><Button key={value} size="sm" variant={filter===value?'primary':'outline'} title={label} onPress={()=>setFilter(value)}/>)}</View>
  {!visible.length&&<Text style={s.text}>{l('No withdrawal requests for this selection.','এই তালিকায় উত্তোলনের আবেদন নেই।')}</Text>}
  {visible.map(r=><View key={r.id} style={s.card}>
   <Text style={s.title}>{r.member_name}</Text><Text style={s.text}>{r.member_code} · {r.created_at.slice(0,10)}</Text><Text style={s.value}>{money(r.amount)}</Text><Text style={[s.text,{color:colors.primary}]}>{status(r.status)}</Text>
   {['submitted','approved'].includes(r.status)&&<Text style={s.text}>{l('Waiting','অপেক্ষায়')}: {pendingDays(r.created_at)} {l('days','দিন')}</Text>}
   {r.reason?<Text style={s.text}>{l('Reason','কারণ')}: {r.reason}</Text>:null}{r.decision_note?<Text style={s.text}>{l('Decision note','সিদ্ধান্তের মন্তব্য')}: {r.decision_note}</Text>:null}
   {r.status==='submitted'&&admin&&<View style={styles.actions}><Button title={l('Approve','অনুমোদন')} size="sm" disabled={busy} onPress={()=>open('approve',r)}/><Button title={l('Reject','প্রত্যাখ্যান')} size="sm" variant="outline" disabled={busy} onPress={()=>open('reject',r)}/></View>}
   {r.status==='approved'&&canPay&&<Button title={l('Record money paid','টাকা প্রদান রেকর্ড করুন')} disabled={busy} onPress={()=>open('pay',r)}/>}
   {((r.status==='submitted'&&(admin||r.member_id===current?.id))||(r.status==='approved'&&admin))&&<Button title={l('Cancel request','আবেদন বাতিল')} variant="ghost" size="sm" disabled={busy} onPress={()=>open('cancel',r)}/>}
   {['paid','reversed'].includes(r.status)&&<Button title={l('Receipt PDF','রসিদ PDF')} variant="outline" size="sm" disabled={busy} onPress={()=>receipt(r)}/>}
   {r.status==='paid'&&admin&&<Button title={l('Correct by reversal','সংশোধনের জন্য reversal')} variant="ghost" size="sm" disabled={busy} onPress={()=>open('reverse',r)}/>}
  </View>)}
  <Modal visible={!!modal} transparent animationType="fade" onRequestClose={close}>
   <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS==='ios'?'padding':undefined}><View style={styles.panel}>
    <ScrollView ref={formRef} keyboardShouldPersistTaps="handled"><Text style={s.title}>{modalTitle}</Text>
     {error?<Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>:null}
     {selected&&<Text style={s.text}>{selected.member_name} · {selected.member_code} · {money(selected.amount)}</Text>}
     {modal==='new'&&<><Button variant="outline" title={member?`${member.name} · ${member.code}`:l('Choose member','সদস্য নির্বাচন')} disabled={!canChoose||busy} onPress={()=>setPicker('member')}/>
      <Text style={s.text}>{l('Available savings (excluding profit and reservations)','উত্তোলনযোগ্য জমা (লাভ ও সংরক্ষিত টাকা বাদে)')}: {money(available)}</Text>
      <Input label={l('Amount *','পরিমাণ *')} value={amount} keyboardType="decimal-pad" editable={!busy} onChangeText={v=>{setAmount(v);setError('');}}/>
     </>}
     {['new','pay'].includes(modal)&&<><Button variant="outline" disabled={busy} title={l('Payment method','টাকা পাওয়ার মাধ্যম')+': '+methods.find(([v])=>v===method)![1]} onPress={()=>setPicker('method')}/>
      {modal==='pay'&&<><Text style={s.text}>{l('Account','হিসাব')}: {accounts.find(a=>a.type===(method==='cash'?'cashier':method))?.name||method}</Text><Input label={l('Reference (required except cash)','reference (নগদ ছাড়া আবশ্যক)')} value={reference} maxLength={200} editable={!busy} onChangeText={setReference}/></>}
     </>}
     {['pay','reverse'].includes(modal)&&<Input label={l('Posting date (YYYY-MM-DD) *','লেনদেনের তারিখ (YYYY-MM-DD) *')} value={date} editable={!busy} onChangeText={setDate}/>}
     <Input label={['reject','cancel','reverse'].includes(modal)?l('Reason *','কারণ *'):l('Note (optional)','মন্তব্য (ঐচ্ছিক)')} value={reason} editable={!busy} maxLength={1000} multiline onChangeText={setReason}/>
     <Text style={s.text}>{modal==='approve'?l('This reserves savings. No cash will be deducted yet.','এতে জমা সংরক্ষিত হবে। এখনই cash থেকে টাকা কাটবে না।'):modal==='pay'?l('Confirm only after you have paid this exact amount to the member.','সদস্যকে ঠিক এই পরিমাণ টাকা দেওয়ার পরেই নিশ্চিত করুন।'):modal==='reverse'?l('Use only after the full amount has returned to the original payment account. This restores savings and adds money to that account.','পুরো টাকা আগের payment account-এ ফেরত আসলেই ব্যবহার করুন। এতে জমা ও ওই account-এ টাকা ফেরত যোগ হবে।'):l('Withdrawals do not close membership or withdraw distributed profit.','উত্তোলনে সদস্যপদ বন্ধ হয় না এবং বণ্টিত লাভ তোলা হয় না।')}</Text>
    </ScrollView>
    <View style={styles.actions}><Button title={l('Back','ফিরুন')} variant="outline" disabled={busy} onPress={close}/><Button title={modal==='pay'?l('Confirm payment','টাকা প্রদান নিশ্চিত'):modal==='reverse'?l('Confirm reversal','সংশোধন নিশ্চিত'):l('Confirm','নিশ্চিত করুন')} loading={busy} onPress={save}/></View>
   </View></KeyboardAvoidingView>
  </Modal>
  <MemberPicker visible={picker==='member'} activeOnly members={members} value={memberId} onSelect={value=>{setMemberId(value);setError('');}} onClose={()=>setPicker('')}/>
  <SelectModal visible={picker==='method'} title={l('Choose method','মাধ্যম নির্বাচন')} value={method} options={methods.map(([value,label])=>({value,label}))}
   onSelect={value=>{setMethod(value as WithdrawalMethod);setError('');}} onClose={()=>setPicker('')}/>
 </Page>;
}
const styles=StyleSheet.create({overlay:{flex:1,backgroundColor:colors.overlay,justifyContent:'center',padding:16},panel:{width:'100%',maxWidth:480,maxHeight:'90%',alignSelf:'center',backgroundColor:colors.surface,borderRadius:20,padding:20},actions:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:12},error:{color:colors.danger,marginVertical:12}});
