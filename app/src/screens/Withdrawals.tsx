import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Page, pageStyles as s } from '../components/Page';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SelectModal } from '../components/SelectModal';
import { DateField, formatHumanDate } from '../components/DateField';
import { useSomitiStore, REMOTE } from '../store/somitiStore';
import { useAuthStore } from '../features/auth/authStore';
import { useLanguage } from '../i18n/useLanguage';
import { Withdrawal, WithdrawalMethod } from '../lib/withdrawal';
import { MemberPicker } from '../components/MemberPicker';
import { isoToday, parseInvestmentAmount } from '../lib/investment';
import { uuid, fetchTransactionByReference } from '../lib/api';
import { exportReport } from '../utils/reportExport';
import { receiptText, sendOnWhatsApp } from '../utils/whatsappReceipt';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

/**
 * Savings returned to a member. The decision is taken outside the app, so the
 * cashier records it in one step. Deposit and distributed profit can both be
 * returned. A wrong entry is cancelled with a reason (kept in the audit log).
 */
export default function Withdrawals({memberView=false}:{memberView?:boolean}){
 const params=useLocalSearchParams<{memberId?:string;requestId?:string;new?:string}>();
 const {l,isBengali,formatMoneyPrecise:money}=useLanguage();
 const rows=useSomitiStore(s=>s.withdrawalRequests),members=useSomitiStore(s=>s.members),accounts=useSomitiStore(s=>s.cashAccounts),society=useSomitiStore(s=>s.somitiInfo);
 const current=useAuthStore(s=>s.currentUser),role=useAuthStore(s=>s.actualRole);
 const staff=!memberView&&['super_admin','admin','cashier'].includes(role||'');
 const admin=!memberView&&['super_admin','admin'].includes(role||'');
 const [modal,setModal]=useState(''),[selected,setSelected]=useState<Withdrawal|null>(null);
 const [memberId,setMemberId]=useState(String(params.memberId||''));
 const [amount,setAmount]=useState(''),[note,setNote]=useState(''),[method,setMethod]=useState<WithdrawalMethod>('cash'),[date,setDate]=useState(isoToday()),[reference,setReference]=useState('');
 const [picker,setPicker]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState<Withdrawal|null>(null);
 const locked=useRef(false),requestId=useRef(uuid()),reversalId=useRef(uuid());
 const own=rows.filter(r=>!memberView||r.member_id===current?.id);
 const visible=own.filter(r=>(!params.memberId||r.member_id===params.memberId)&&(!params.requestId||r.id===params.requestId||r.reversal_transaction_id===params.requestId)&&(memberView?['paid','reversed'].includes(r.status):!['rejected','cancelled'].includes(r.status)));
 const member=members.find(m=>m.id===memberId);
 const savings=member?.totalDeposit||0;
 const account=accounts.find(a=>a.type===(method==='cash'?'cashier':method));
 const methods:[WithdrawalMethod,string][]=[['cash',l('Cash','হাতে নগদ')],['bank',l('Bank','ব্যাংক')],['bkash','bKash'],['nagad',l('Nagad','নগদ')]];
 const status=(v:Withdrawal['status'])=>({submitted:l('Old request · not paid','পুরনো আবেদন · টাকা দেওয়া হয়নি'),approved:l('Old request · not paid','পুরনো আবেদন · টাকা দেওয়া হয়নি'),rejected:l('Rejected','প্রত্যাখ্যাত'),cancelled:l('Cancelled','বাতিল'),paid:l('Paid','টাকা দেওয়া হয়েছে'),reversed:l('Cancelled · savings restored','বাতিল · সঞ্চয় ফেরত')}[v]);
 const openNew=()=>{if(locked.current)return;setSelected(null);setModal('new');setError('');setNote('');setDate(isoToday());setReference('');setAmount('');requestId.current=uuid();};
 useEffect(()=>{if(params.new&&staff)openNew();},[params.new]);// eslint-disable-line react-hooks/exhaustive-deps
 const close=()=>{if(!locked.current){setModal('');setError('');setPicker('');}};
 const receipt=async(r:Withdrawal)=>{
  if(locked.current)return;locked.current=true;setBusy(true);setError('');
  try{
   const reversed=r.status==='reversed';
   const lookup=async(id:string|undefined)=>id?(useSomitiStore.getState().transactions.find(t=>t.id===id)||(REMOTE?await fetchTransactionByReference(id):null)):null;
   const [paid,reversal]=await Promise.all([lookup(r.paid_transaction_id),reversed?lookup(r.reversal_transaction_id):Promise.resolve(null)]);
   if(!paid||(reversed&&!reversal))throw new Error(l('Receipt details unavailable. Refresh and try again.','রসিদের তথ্য পাওয়া যায়নি। আপডেট করে আবার চেষ্টা করুন।'));
   await exportReport({language:isBengali?'bn':'en',title:l('Savings return receipt','সঞ্চয় ফেরতের রসিদ'),columns:[l('Item','বিবরণ'),l('Value','তথ্য')],rows:[
    [l('Receipt number','রসিদ নম্বর'),paid.receiptNo],[l('Member','সদস্য'),r.member_name],[l('Member ID','সদস্য আইডি'),r.member_code],[l('Amount','টাকা'),r.amount],
    [l('Date','তারিখ'),r.payment_date||''],[l('Method','মাধ্যম'),r.payment_method||''],[l('Reference','রেফারেন্স'),r.payment_reference||''],[l('Status','অবস্থা'),status(r.status)],
    ...(reversed?[[l('Cancelled on','বাতিলের তারিখ'),reversal!.dateISO||reversal!.date],[l('Reason','কারণ'),r.reversal_reason]]:[])
   ]},society.name,r.payment_date||isoToday(),'PDF');
  }catch(e:any){setError(e.message);}finally{locked.current=false;setBusy(false);}
 };
 const save=async()=>{
  if(locked.current)return;setError('');
  const actions=useSomitiStore.getState(),value=parseInvestmentAmount(amount);
  if(modal==='new'){
   if(!member){setError(l('Choose a member.','সদস্য বাছুন।'));return;}
   if(!Number.isFinite(value)||value<=0){setError(l('Enter the amount you are giving back.','কত টাকা ফেরত দিচ্ছেন লিখুন।'));return;}
   if(value>savings){setError(l(`${member.name} has ${money(savings)} in savings.`,`${member.name}-এর সঞ্চয়ে ${money(savings)} আছে।`));return;}
   if(!account||account.amount<value){setError(l(`${account?.name||'This account'} has only ${money(account?.amount||0)}. Pick another account or add money.`,`${account?.name||'এই হিসাবে'} মাত্র ${money(account?.amount||0)} আছে। অন্য হিসাব বাছুন বা টাকা যোগ করুন।`));return;}
  }
  if(modal==='reverse'&&note.trim().length<3){setError(l('Write why this is being cancelled.','কেন বাতিল করছেন লিখুন।'));return;}
  locked.current=true;setBusy(true);
  try{
   if(modal==='new'){
    await actions.recordWithdrawal({id:requestId.current,memberId,amount:value,method,date,reference:reference.trim(),note:note.trim()});
    setDone(useSomitiStore.getState().withdrawalRequests.find(r=>r.id===requestId.current)||null);
   }else if(modal==='reverse')await actions.reverseWithdrawal(selected!.id,reversalId.current,isoToday(),note.trim());
   else if(modal==='legacy'){
    // Older requests made before approvals moved outside the app.
    if(selected!.status==='submitted')await actions.decideWithdrawal(selected!.id,'approve','');
    await actions.payWithdrawal(selected!.id,method,date,reference.trim()||'-',note.trim());
   }
   setModal('');
  }catch(e:any){setError(e.message||l('Could not save. Try again.','সংরক্ষণ হয়নি। আবার চেষ্টা করুন।'));}finally{locked.current=false;setBusy(false);}
 };
 const modalTitle=modal==='new'?l('Give savings back','টাকা ফেরত দিন'):modal==='reverse'?l('Cancel this return','এই ফেরত বাতিল'):l('Pay old request','পুরনো আবেদনের টাকা দিন');
 return <Page title={memberView?l('My withdrawals','আমার উত্তোলন'):l('Savings returned','সঞ্চয় ফেরত')} backTo={memberView?'/(member)':'/(admin)/(tabs)'}>
  {error&&!modal?<Text accessibilityRole="alert" style={{color:colors.danger,marginBottom:12}}>{error}</Text>:null}
  {done?<View style={[s.card,{backgroundColor:colors.primarySoft}]}><Text style={s.title}>{l('Saved','সংরক্ষণ হয়েছে')}</Text><Text style={s.text}>{done.member_name} · {money(done.amount)}</Text>
   <View style={styles.actions}><Button size="sm" title="WhatsApp" onPress={()=>{const m=members.find(x=>x.id===done.member_id);void sendOnWhatsApp(m?.whatsapp||m?.phone,receiptText({society:society.name,title:'সঞ্চয় ফেরতের রসিদ',name:done.member_name,code:done.member_code,amount:done.amount,date:done.payment_date||isoToday(),method:done.payment_method||'',balance:m?.totalDeposit},money));}}/><Button size="sm" variant="outline" title={l('Receipt PDF','রসিদ PDF')} onPress={()=>receipt(done)}/><Button size="sm" variant="outline" title={l('Another entry','আরেকটা এন্ট্রি')} onPress={()=>{setDone(null);setMemberId('');openNew();}}/></View></View>:null}
  {staff?<Button title={l('Give savings back','টাকা ফেরত দিন')} disabled={busy} onPress={openNew}/>:null}
  {!visible.length&&<Text style={[s.text,{marginTop:16}]}>{l('No savings returned yet.','এখনো কোনো সঞ্চয় ফেরত নেই।')}</Text>}
  <View style={{gap:10,marginTop:16}}>{visible.map(r=><View key={r.id} style={[s.card,r.status==='reversed'&&{opacity:0.6}]}>
   <View style={styles.row}><View style={{flex:1}}><Text style={s.title}>{r.member_name}</Text><Text style={s.text}>{r.member_code} · {formatHumanDate(r.payment_date||r.created_at.slice(0,10),isBengali)}</Text></View><Text style={[s.value,r.status==='reversed'&&{textDecorationLine:'line-through'}]}>{money(r.amount)}</Text></View>
   <Text style={[s.text,{color:['submitted','approved'].includes(r.status)?colors.warning:colors.primary}]}>{status(r.status)}</Text>
   {r.payment_note||r.reason?<Text style={s.text}>{r.payment_note||r.reason}</Text>:null}
   {r.status==='reversed'&&r.reversal_reason?<Text style={s.text}>{l('Reason','কারণ')}: {r.reversal_reason}</Text>:null}
   <View style={styles.actions}>
    {['paid','reversed'].includes(r.status)&&<Button title={l('Receipt','রসিদ')} variant="outline" size="sm" disabled={busy} onPress={()=>receipt(r)}/>}
    {r.status==='paid'&&staff&&<Button title={l('Cancel','বাতিল')} variant="ghost" size="sm" disabled={busy} onPress={()=>{setSelected(r);setNote('');setError('');reversalId.current=uuid();setModal('reverse');}}/>}
    {['submitted','approved'].includes(r.status)&&admin&&<Button title={l('Pay now','এখন টাকা দিন')} size="sm" disabled={busy} onPress={()=>{setSelected(r);setMethod(r.preferred_method);setDate(isoToday());setNote('');setReference('');setError('');setModal('legacy');}}/>}
    {['submitted','approved'].includes(r.status)&&admin&&<Button title={l('Close request','আবেদন বন্ধ')} size="sm" variant="ghost" disabled={busy} onPress={async()=>{try{await useSomitiStore.getState().decideWithdrawal(r.id,'cancel',l('Closed: approvals are outside the app','বন্ধ: অনুমোদন এখন অ্যাপের বাইরে'));}catch(e:any){setError(e.message);}}}/>}
   </View>
  </View>)}</View>
  <Modal visible={!!modal} transparent animationType="fade" onRequestClose={close}>
   <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS==='ios'?'padding':undefined}><View style={styles.panel}>
    <ScrollView keyboardShouldPersistTaps="handled"><Text style={s.title}>{modalTitle}</Text>
     {error?<Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>:null}
     {selected&&<Text style={s.text}>{selected.member_name} · {selected.member_code} · {money(selected.amount)}</Text>}
     {modal==='new'&&<>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>setPicker('member')} style={styles.pick}>
       <View style={{flex:1}}><Text style={styles.pickLabel}>{l('Member','সদস্য')}</Text><Text style={styles.pickValue}>{member?`${member.name} · ${member.code}`:l('Choose member','সদস্য বাছুন')}</Text></View><Ionicons name="chevron-down" size={18} color={colors.textSecondary}/></Pressable>
      {member?<Text style={[s.text,{marginBottom:10}]}>{l('Savings now','এখন সঞ্চয় আছে')}: <Text style={{color:colors.primary,fontFamily:typography.fontFamily.semiBold}}>{money(savings)}</Text></Text>:null}
      <Input label={l('Amount','টাকা')} value={amount} keyboardType="decimal-pad" editable={!busy} onChangeText={v=>{setAmount(v);setError('');}}/>
      {member&&savings>0?<Pressable onPress={()=>setAmount(String(savings))} style={{marginTop:-8,marginBottom:12}}><Text style={styles.link}>{l(`All savings (${money(savings)}) · member becomes inactive`,`পুরো সঞ্চয় (${money(savings)}) · সদস্য নিষ্ক্রিয় হবেন`)}</Text></Pressable>:null}
     </>}
     {['new','legacy'].includes(modal)&&<>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>setPicker('method')} style={styles.pick}>
       <View style={{flex:1}}><Text style={styles.pickLabel}>{l('Paid from','কোন হিসাব থেকে')}</Text><Text style={styles.pickValue}>{account?.name||methods.find(([v])=>v===method)![1]} · {money(account?.amount||0)}</Text></View><Ionicons name="chevron-down" size={18} color={colors.textSecondary}/></Pressable>
      <DateField label={l('Date','তারিখ')} value={date} max={isoToday()} onChange={setDate}/>
      {method!=='cash'?<Input label={l('Reference (optional)','রেফারেন্স (ঐচ্ছিক)')} value={reference} maxLength={200} editable={!busy} onChangeText={setReference}/>:null}
     </>}
     <Input label={modal==='reverse'?l('Why cancel?','কেন বাতিল?'):l('Note (optional)','মন্তব্য (ঐচ্ছিক)')} value={note} editable={!busy} maxLength={1000} multiline onChangeText={setNote}/>
     {modal==='reverse'?<Text style={s.text}>{l('Use when the money came back or the entry was wrong. Savings and the account are restored.','টাকা ফেরত এলে বা এন্ট্রি ভুল হলে ব্যবহার করুন। সঞ্চয় ও হিসাবে টাকা ফেরত যাবে।')}</Text>:null}
    </ScrollView>
    <View style={styles.actions}><Button title={l('Back','ফিরুন')} variant="outline" disabled={busy} onPress={close}/><Button title={modal==='reverse'?l('Cancel entry','বাতিল করুন'):l('Save','সংরক্ষণ করুন')} variant={modal==='reverse'?'danger':'primary'} loading={busy} onPress={save}/></View>
   </View></KeyboardAvoidingView>
  </Modal>
  <MemberPicker visible={picker==='member'} members={members.filter(m=>m.totalDeposit>0)} value={memberId} onSelect={value=>{setMemberId(value);setError('');}} onClose={()=>setPicker('')}/>
  <SelectModal visible={picker==='method'} title={l('Paid from','কোন হিসাব থেকে')} value={method} options={methods.map(([value,label])=>({value,label:`${accounts.find(a=>a.type===(value==='cash'?'cashier':value))?.name||label} · ${money(accounts.find(a=>a.type===(value==='cash'?'cashier':value))?.amount||0)}`}))}
   onSelect={value=>{setMethod(value as WithdrawalMethod);setError('');}} onClose={()=>setPicker('')}/>
 </Page>;
}
const styles=StyleSheet.create({overlay:{flex:1,backgroundColor:colors.overlay,justifyContent:'center',padding:16},panel:{width:'100%',maxWidth:480,maxHeight:'90%',alignSelf:'center',backgroundColor:colors.surface,borderRadius:20,padding:20},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:10},row:{flexDirection:'row',alignItems:'center',gap:10},error:{color:colors.danger,marginVertical:12},
 pick:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:14,paddingVertical:9,marginVertical:10},
 pickLabel:{fontFamily:typography.fontFamily.regular,fontSize:12,color:colors.textSecondary},pickValue:{fontFamily:typography.fontFamily.medium,fontSize:15,color:colors.text},link:{fontFamily:typography.fontFamily.semiBold,fontSize:13,color:colors.primary}});
