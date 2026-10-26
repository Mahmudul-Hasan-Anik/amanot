import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, Linking, Share, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActionMenu } from '../components/ActionMenu';
import { formatHumanDate } from '../components/DateField';
import { Button, Card, Input, SelectModal, DateField } from '../components';
import { LedgerPaging } from '../components/LedgerPaging';
import { Project } from '../mocks/mockData';
import { Transaction, useSomitiStore } from '../store/somitiStore';
import { useAuthStore } from '../features/auth/authStore';
import { useLanguage } from '../i18n/useLanguage';
import { useLedgerPage } from '../hooks/useLedgerPage';
import { allocateInvestmentPayment, investmentReminder, investmentSchedule, isoToday, parseInvestmentAmount, roundMoney, validISODate, NewInvestment } from '../lib/investment';
import { uuid, recordInvestmentReminder, fetchLastInvestmentReminder, recordInvestmentExpense } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { cachedQuery } from '../lib/queryCache';
import { exportReport, Report } from '../utils/reportExport';
import { receiptText, sendOnWhatsApp } from '../utils/whatsappReceipt';
import { safeBack } from '../utils/navigation';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function InvestmentDetail({project}:{project:Project}){
  const c=project.contract!;const router=useRouter();const {l,isBengali,formatMoneyPrecise:formatMoney,formatNum}=useLanguage();
  const collect=useSomitiStore(s=>s.collectInvestment),reverse=useSomitiStore(s=>s.reverseInvestment),accounts=useSomitiStore(s=>s.cashAccounts),society=useSomitiStore(s=>s.somitiInfo);
  const role=useAuthStore(s=>s.actualRole),identity=useAuthStore(s=>s.currentUser?.id),revision=useSomitiStore(s=>s.dataVersion);
  const history=useLedgerPage({projectId:project.id});
  const [modal,setModal]=useState(''),[allSchedule,setAllSchedule]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [amount,setAmount]=useState(''),[date,setDate]=useState(isoToday()),[note,setNote]=useState(''),[method,setMethod]=useState<NewInvestment['paymentMethod']>('cash'),[selectAccount,setSelectAccount]=useState(false);
  const [receipt,setReceipt]=useState<Transaction|null>(null),[reason,setReason]=useState(''),[target,setTarget]=useState<Transaction|null>(null);
  const [lastReminder,setLastReminder]=useState<string|null>(null);const operation=useRef(uuid());
  const params=useLocalSearchParams<{action?:string}>();const [tab,setTab]=useState<'schedule'|'history'|'info'>('schedule');const [menu,setMenu]=useState(false);
  const canEnter=['admin','super_admin','cashier'].includes(role||'');
  useEffect(()=>{if(params.action==='collect'){setAmount('');setDate(isoToday());setNote('');operation.current=uuid();setModal('collect');}},[params.action]);
  const schedule=investmentSchedule(c,project.returnedAmount),outstanding=roundMoney(c.principal+c.profitAmount-project.returnedAmount);
  const overdue=roundMoney(schedule.filter(s=>s.overdue).reduce((sum,s)=>sum+s.remaining,0)),next=schedule.find(s=>s.remaining>0);
  const reminder=investmentReminder(c,project.returnedAmount,society.name,isBengali),value=parseInvestmentAmount(amount);
  let allocation:{principalPart:number;profitPart:number}|null=null;
  try{allocation=allocateInvestmentPayment(c.principal,c.profitAmount,project.returnedAmount,value);}catch{}
  useEffect(()=>{let active=true;if(isSupabaseConfigured())cachedQuery(JSON.stringify(['investment-reminder',c.id,identity,revision]),()=>fetchLastInvestmentReminder(c.id)).then(r=>{if(active)setLastReminder(r?.created_at||null);},()=>{});return()=>{active=false;};},[c.id,identity,revision]);
  const close=()=>{if(!busy){setModal('');setError('');}};
  const edit=()=>{operation.current=uuid();setError('');};
  const receive=async()=>{
    if(busy)return;
    if(!allocation||!validISODate(date)||date>isoToday()||date<c.disbursedDate){setError(l('Check the amount and collection date.','আদায়ের টাকা ও তারিখ যাচাই করুন।'));return;}
    setBusy(true);setError('');
    try{const t=await collect({id:operation.current,projectId:project.id,amount:value,date,paymentMethod:method,note});setReceipt(t);setModal('receipt');history.reload();}
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const openReminder=async()=>{
    if(!reminder?.url||busy)return;setBusy(true);setError('');
    try{await Linking.openURL(reminder.url);if(isSupabaseConfigured())await recordInvestmentReminder(operation.current,c.id);setLastReminder(new Date().toISOString());setModal('');}
    catch{setError(l('WhatsApp or reminder logging failed. You can share the message instead.','WhatsApp খোলা বা reminder রেকর্ড হয়নি। message শেয়ার করতে পারেন।'));}finally{setBusy(false);}
  };
  const undo=async()=>{
    if(!target||busy)return;if(reason.trim().length<3){setError(l('Enter a correction reason.','সংশোধনের কারণ দিন।'));return;}
    setBusy(true);setError('');try{await reverse(operation.current,target.id,reason.trim());setModal('');history.reload();}catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const expense=async()=>{
    if(busy)return;if(!Number.isFinite(value)||value<=0||!note.trim()){setError(l('Enter the expense amount and description.','খরচের টাকা ও বিবরণ দিন।'));return;}
    setBusy(true);setError('');
    try{
      let status='approved';
      if(isSupabaseConfigured()){const saved:any=await recordInvestmentExpense({id:operation.current,projectId:project.id,amount:value,paymentMethod:method,note:note.trim()});status=saved.status;await useSomitiStore.getState().syncFromServer();}
      else{const saved=await useSomitiStore.getState().addExpense({projectId:project.id,title:note.trim(),category:'বিনিয়োগ খরচ',amount:value,paymentSource:method,voucherNo:'INV-EXP-'+operation.current});status=saved.status;}
      setModal('');setError(status==='pending'?l('Expense submitted for approval.','খরচ অনুমোদনের জন্য জমা হয়েছে।'):'');history.reload();
    }catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const report=(t:Transaction):Report=>({title:l('Investment payment receipt','বিনিয়োগ আদায়ের রশিদ'),columns:[l('Details','বিবরণ'),l('Value','পরিমাণ / তথ্য')],rows:[
    [l('Receipt','রশিদ'),t.receiptNo],[l('Status','অবস্থা'),t.investmentPaymentReversed?l('Cancelled','বাতিল'):l('Recorded','রেকর্ডকৃত')],[l('Contract','চুক্তি'),c.number],[l('Recipient','গ্রহীতা'),c.recipientName],[l('Date','তারিখ'),t.dateISO||t.date],
    [l('Received','মোট আদায়'),t.amount],[l('Principal recovered','মূলধন ফেরত'),t.principalPart||0],[l('Profit received','প্রফিট আদায়'),t.profitPart||0],[l('Method','মাধ্যম'),t.paymentMethod],[l('Note','মন্তব্য'),t.note||'']]});
  const exportReceipt=async()=>{if(!receipt)return;try{await exportReport(report(receipt),society.name,c.number,'PDF');}catch(e:any){setError(e.message);}};
  const statement=async()=>{try{await exportReport({title:l('Investment statement','বিনিয়োগ স্টেটমেন্ট'),columns:[l('Details','বিবরণ'),l('Value','পরিমাণ / তথ্য')],rows:[
    [l('Contract','চুক্তি'),c.number],[l('Recipient','গ্রহীতা'),c.recipientName],[l('Principal','মূলধন'),c.principal],[l('Whole-contract profit %','চুক্তির প্রফিট %'),c.profitPct],
    [l('Agreed profit','চুক্তির প্রফিট'),c.profitAmount],[l('Collected','মোট আদায়'),project.returnedAmount],[l('Principal outstanding','মূলধন বাকি'),project.remainingAmount],
    [l('Recognized profit','আদায়কৃত প্রফিট'),project.netProfit],[l('Total outstanding','মোট বাকি'),outstanding],[l('Overdue installments','মেয়াদোত্তীর্ণ কিস্তি'),overdue],
    ...schedule.map(s=>[`${l('Installment','কিস্তি')} ${s.number} · ${s.dueDate}`,`${l('Expected / paid / remaining','নির্ধারিত / আদায় / বাকি')}: ${formatMoney(s.amount)} / ${formatMoney(s.paid)} / ${formatMoney(s.remaining)}`])]},society.name,c.number,'PDF');}catch(e:any){setError(e.message);}};
  const moneyRows:Array<[string,number]>=[[l('Principal disbursed','প্রদত্ত মূলধন'),c.principal],[l('Principal recovered','মূলধন ফেরত'),Math.min(c.principal,project.returnedAmount)],
    [l('Principal outstanding','মূলধন বাকি'),project.remainingAmount],[l('Agreed profit','চুক্তির প্রফিট'),c.profitAmount],[l('Profit received','আদায়কৃত প্রফিট'),project.netProfit],
    [l('Total collected','মোট আদায়'),project.returnedAmount],[l('Overdue installments','মেয়াদোত্তীর্ণ কিস্তি'),overdue]];
  return <SafeAreaView edges={['top','bottom','left','right']} style={s.root}>
    <View style={s.header}><Button variant="ghost" title={l('Back','ফিরুন')} onPress={()=>safeBack(router,'/(admin)/(tabs)/projects')}/><Text style={[s.heading,{flex:1}]} numberOfLines={1}>{c.recipientName||l('Investment','বিনিয়োগ')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={l('More actions','আরও কাজ')} hitSlop={10} onPress={()=>setMenu(true)} style={{padding:8}}><Ionicons name="ellipsis-vertical" size={20} color={colors.primary}/></Pressable></View>
    <ScrollView contentContainerStyle={s.content}>
      {error&&!modal?<Text style={s.error}>{error}</Text>:null}
      <View style={s.pills}><Text style={s.pill}>{c.memberId?l('Member','সদস্য'):l('Outside person','বাইরের ব্যক্তি')}</Text>
        {overdue>0?<Text style={[s.pill,s.pillWarn]}>{l(`${formatNum(schedule.filter(i=>i.overdue).length)} overdue`,`${formatNum(schedule.filter(i=>i.overdue).length)} কিস্তি বাকি`)}</Text>:outstanding<=0?<Text style={s.pill}>{l('Fully paid','সম্পূর্ণ পরিশোধিত')}</Text>:null}
        <Text style={[s.muted,{marginLeft:'auto'}]}>{c.number}</Text></View>
      <Card><Text style={s.muted}>{l('Still to collect','মোট বাকি')}</Text><Text style={s.amount}>{formatMoney(outstanding)}</Text>
        <View style={s.bar}><View style={[s.barFill,{width:`${Math.min(100,Math.round(project.returnedAmount/Math.max(1,c.principal+c.profitAmount)*100))}%`}]}/></View>
        <View style={s.row}><Text style={s.muted}>{l('Collected','পেয়েছেন')} {formatMoney(project.returnedAmount)}</Text><Text style={s.muted}>{l('Total','মোট')} {formatMoney(c.principal+c.profitAmount)}</Text></View>
        {next?<Text style={s.body}>{l('Next installment','পরবর্তী কিস্তি')}: {formatHumanDate(next.dueDate,isBengali)} · {formatMoney(next.remaining)}</Text>:null}</Card>
      {outstanding>0?<View style={s.actions}><Button style={{flex:1}} title={l('Collect installment','কিস্তি নিন')} onPress={()=>{setAmount('');setDate(isoToday());setNote('');edit();setModal('collect');}}/><Button style={{flex:1}} variant="outline" title="WhatsApp" onPress={()=>{edit();setModal('reminder');}}/></View>:null}
      {lastReminder?<Text style={s.muted}>{l('Last WhatsApp opened','সর্বশেষ WhatsApp খোলা হয়েছে')}: {new Date(lastReminder).toLocaleString(isBengali?'bn-BD':'en-BD')}</Text>:null}
      <View style={s.tabs}>{([['schedule',l('Installments','কিস্তি')],['history',l('Transactions','লেনদেন')],['info',l('Details','তথ্য')]] as const).map(([key,label])=><Pressable key={key} accessibilityRole="tab" accessibilityState={{selected:tab===key}} onPress={()=>setTab(key)} style={[s.tab,tab===key&&s.tabOn]}><Text style={[s.tabText,tab===key&&s.tabTextOn]}>{label}</Text></Pressable>)}</View>
      {tab==='schedule'?<View style={{gap:8}}>{(allSchedule?schedule:[...schedule.filter(i=>i.remaining===0).slice(-2),...schedule.filter(i=>i.remaining>0).slice(0,6)]).map(i=><View style={[s.inst,i.overdue&&{backgroundColor:colors.warningSoft},i.remaining===0&&{opacity:0.6}]} key={i.number}>
          <View style={{flex:1}}><Text style={s.instTitle}>{l('Installment','কিস্তি')} {formatNum(i.number)}</Text><Text style={[s.muted,i.overdue&&{color:colors.warning}]}>{formatHumanDate(i.dueDate,isBengali)} · {i.remaining===0?l('Paid','পরিশোধিত'):i.overdue?l('Overdue','মেয়াদ পার'):i.paid>0?l('Part paid','আংশিক'):l('Pending','বাকি')}</Text></View>
          <Text style={s.instAmount}>{formatMoney(i.remaining===0?i.amount:i.remaining)}</Text></View>)}
        <Button variant="ghost" title={allSchedule?l('Show less','কম দেখুন'):l('Show all installments','সব কিস্তি দেখুন')} onPress={()=>setAllSchedule(!allSchedule)}/></View>:null}
      {tab==='history'?<Card>{history.rows.map(t=><View style={s.line} key={t.id}><Text style={s.value}>{t.receiptNo} · {formatMoney(t.amount)}</Text><Text style={s.muted}>{t.dateISO?formatHumanDate(t.dateISO,isBengali):t.date} · {t.paymentMethod}</Text>{t.note?<Text style={s.body}>{t.note}</Text>:null}
        {t.principalPart!==undefined?<Text style={s.body}>{t.investmentReversal||t.investmentPaymentReversed?l('Reversed','বাতিল'):l('Received','আদায়')} · {l('Principal','মূলধন')} {formatMoney(t.principalPart)} · {l('Profit','প্রফিট')} {formatMoney(t.profitPart||0)}</Text>:null}
        {t.type==='profit'&&t.principalPart!==undefined?<View style={s.actions}><Button variant="ghost" size="sm" title={l('View receipt','রশিদ দেখুন')} onPress={()=>{setReceipt(t);setModal('receipt');}}/>{canEnter&&!t.investmentPaymentReversed?<Button variant="ghost" size="sm" title={l('Cancel this collection','এই আদায় বাতিল')} onPress={()=>{setTarget(t);setReason('');edit();setModal('reverse');}}/>:null}</View>:null}</View>)}{!history.loading&&!history.error&&!history.rows.length?<Text style={s.muted}>{l('No transactions','কোনো লেনদেন নেই')}</Text>:null}<LedgerPaging {...history}/></Card>:null}
      {tab==='info'?<Card>
        {moneyRows.map(([label,money])=><View style={s.row} key={label}><Text style={s.body}>{label}</Text><Text style={s.value}>{formatMoney(money)}</Text></View>)}
        <Text style={s.muted}>{formatNum(c.profitPct)}% {l('for the whole contract','পুরো চুক্তির জন্য')} · {formatNum(c.termMonths)} {l('months','মাস')} · {l('Given','প্রদান')} {formatHumanDate(c.disbursedDate,isBengali)}</Text>{c.purpose?<Text style={s.body}>{c.purpose}</Text>:null}
        <Text style={s.heading}>{l('Recipient','গ্রহীতা')}</Text><Text style={s.body}>{c.phone}{c.whatsapp?` · WhatsApp ${c.whatsapp}`:''}</Text>{c.address?<Text style={s.body}>{c.address}</Text>:null}{c.nid?<Text style={s.body}>NID: {c.nid}</Text>:null}{c.fatherName?<Text style={s.body}>{l('Father','বাবা')}: {c.fatherName}</Text>:null}{c.motherName?<Text style={s.body}>{l('Mother','মা')}: {c.motherName}</Text>:null}
        <Button size="sm" variant="ghost" title={l('Call recipient','গ্রহীতাকে ফোন')} onPress={()=>Linking.openURL(`tel:${c.phone}`).catch(()=>setError(l('Could not open phone app.','ফোন app খোলা যায়নি।')))}/>
        {c.contacts.length?<><Text style={s.heading}>{l('Emergency contacts','জরুরি যোগাযোগ')}</Text>{c.contacts.map((contact,i)=><View style={s.line} key={i}><Text style={s.value}>{contact.name}{contact.relation?` · ${contact.relation}`:''}</Text><Text style={s.body}>{contact.phone}</Text></View>)}</>:null}
      </Card>:null}
    </ScrollView>
    <ActionMenu visible={menu} title={c.recipientName} onClose={()=>setMenu(false)} actions={[
      ...(canEnter?[{text:l('Edit investment','বিনিয়োগ এডিট করুন'),onPress:()=>router.push(`/(admin)/investment/new?edit=${project.id}` as any)}]:[]),
      {text:l('Record related expense','বিনিয়োগের খরচ লিখুন'),onPress:()=>{setAmount('');setNote('');edit();setModal('expense');}},
      {text:l('Statement PDF','স্টেটমেন্ট PDF'),onPress:statement}]}/>
    <Modal visible={!!modal} animationType="slide" onRequestClose={close}><SafeAreaView style={s.root} edges={['top','bottom','left','right']}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Button variant="ghost" title={l('Close','বন্ধ করুন')} disabled={busy} onPress={close}/><Text style={s.heading}>{modal==='collect'?l('Collect payment','কিস্তি গ্রহণ'):modal==='reminder'?l('Reminder preview','রিমাইন্ডার preview'):modal==='reverse'?l('Reverse payment','আদায় বাতিল'):modal==='expense'?l('Investment expense','বিনিয়োগের খরচ'):l('Payment receipt','আদায়ের রশিদ')}</Text><Text style={s.muted}>{c.recipientName} · {c.number}</Text>{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
      {modal==='collect'?<><Text style={s.body}>{l('Outstanding','মোট বাকি')}: {formatMoney(outstanding)}{next?` · ${l('Next installment','পরবর্তী কিস্তি')} ${formatMoney(next.remaining)}`:''}</Text>
        <Input label={l('Amount actually received','যত টাকা পাওয়া গেছে')} value={amount} editable={!busy} keyboardType="decimal-pad" onChangeText={v=>{edit();setAmount(v);}}/>
        <DateField label={l('Collection date','আদায়ের তারিখ')} value={date} max={isoToday()} min={c.disbursedDate} onChange={v=>{edit();setDate(v);}}/><Input label={l('Note','মন্তব্য')} value={note} editable={!busy} onChangeText={v=>{edit();setNote(v);}}/>
        <Button variant="outline" disabled={busy} title={`${l('Receiving account','জমার হিসাব')}: ${accounts.find(a=>a.type===(method==='cash'?'cashier':method))?.name||method}`} onPress={()=>setSelectAccount(true)}/>
        {allocation?<Card><Text style={s.body}>{l('Principal recovered','মূলধন ফেরত')}: {formatMoney(allocation.principalPart)}</Text><Text style={s.body}>{l('Profit received','প্রফিট আদায়')}: {formatMoney(allocation.profitPart)}</Text><Text style={s.value}>{l('Remaining after collection','আদায়ের পর বাকি')}: {formatMoney(roundMoney(outstanding-value))}</Text></Card>:null}<Button title={l('Confirm collection','আদায় নিশ্চিত করুন')} disabled={!allocation} loading={busy} onPress={receive}/></>
      :modal==='expense'?<><Input label={l('Expense amount','খরচের টাকা')} value={amount} editable={!busy} keyboardType="decimal-pad" onChangeText={v=>{edit();setAmount(v);}}/><Input label={l('Description','বিবরণ')} value={note} editable={!busy} onChangeText={v=>{edit();setNote(v);}}/><Button variant="outline" disabled={busy} title={l('Choose payment account','টাকা দেওয়ার হিসাব নির্বাচন')} onPress={()=>setSelectAccount(true)}/><Text style={s.body}>{accounts.find(a=>a.type===(method==='cash'?'cashier':method))?.name||method}</Text><Button title={l('Save expense','খরচ সংরক্ষণ')} loading={busy} onPress={expense}/></>
      :modal==='reminder'?<><Card><Text style={s.body}>{reminder?.text||l('No unpaid installments.','সব কিস্তি পরিশোধিত।')}</Text></Card><Text style={s.muted}>{l('WhatsApp opens with this message. Press Send there. Opening does not confirm delivery.','এই message নিয়ে WhatsApp খুলবে। সেখানে Send চাপুন। খোলা মানে পৌঁছেছে নয়।')}</Text><Button title={l('Open WhatsApp','WhatsApp খুলুন')} disabled={!reminder?.url} loading={busy} onPress={openReminder}/><Button variant="outline" title={l('Share message instead','message শেয়ার করুন')} disabled={!reminder||busy} onPress={()=>Share.share({message:reminder?.text||''}).catch(e=>setError(e.message))}/></>
      :modal==='reverse'?<><Card><Text style={s.body}>{target?.receiptNo}</Text><Text style={s.error}>{l('This refunds money from the original account and reopens the balance. Only the latest active payment can be reversed.','এতে মূল জমার হিসাব থেকে টাকা ফেরত যাবে এবং বাকি বাড়বে। শুধু সর্বশেষ সক্রিয় আদায় বাতিল করা যাবে।')}</Text><Text style={s.amount}>{formatMoney(target?.amount||0)}</Text></Card><Input label={l('Reason','কারণ')} value={reason} editable={!busy} onChangeText={v=>{edit();setReason(v);}}/><Button variant="danger" title={l('Confirm reversal and refund','বাতিল ও টাকা ফেরত নিশ্চিত করুন')} loading={busy} onPress={undo}/></>
      :modal==='receipt'&&receipt?<><Card>{report(receipt).rows.map(([label,v])=><View style={s.row} key={String(label)}><Text style={s.body}>{label}</Text><Text style={s.value}>{typeof v==='number'?formatMoney(v):v}</Text></View>)}</Card><Button title={l('Share receipt PDF','রশিদ PDF শেয়ার')} onPress={exportReceipt}/><Button variant="outline" title={l('Send on WhatsApp','WhatsApp-এ পাঠান')} onPress={()=>void sendOnWhatsApp(c.whatsapp||c.phone,receiptText({society:society.name,title:'কিস্তি আদায়ের রসিদ',name:c.recipientName,code:c.number,amount:receipt.amount,date:receipt.dateISO||receipt.date,receiptNo:receipt.receiptNo,extra:`মোট বাকি: ${formatMoney(outstanding)}`},formatMoney))}/></>:null}
    </ScrollView></KeyboardAvoidingView><SelectModal visible={selectAccount} title={l('Receiving account','জমার হিসাব')} value={method} options={accounts.filter(a=>['bank','cashier','bkash','nagad'].includes(a.type||'')).map(a=>({value:a.type==='cashier'?'cash':a.type!,label:a.name}))} onClose={()=>setSelectAccount(false)} onSelect={v=>{edit();setMethod(v as NewInvestment['paymentMethod']);}}/></SafeAreaView></Modal>
  </SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},header:{paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},content:{padding:16,paddingBottom:32,gap:12},heading:{fontFamily:typography.fontFamily.bold,fontSize:19,color:colors.text,marginVertical:8},title:{fontFamily:typography.fontFamily.bold,fontSize:26,color:colors.text},muted:{fontFamily:typography.fontFamily.regular,fontSize:13,color:colors.textSecondary,lineHeight:22},body:{fontFamily:typography.fontFamily.regular,fontSize:14,lineHeight:23,color:colors.text,flexShrink:1},value:{fontFamily:typography.fontFamily.semiBold,fontSize:14,color:colors.primary,flexShrink:1},amount:{fontFamily:typography.fontFamily.bold,fontSize:30,color:colors.primary,marginVertical:10},row:{flexDirection:'row',justifyContent:'space-between',gap:16,paddingVertical:6},line:{borderTopWidth:1,borderTopColor:colors.borderLight,paddingVertical:12,gap:5},actions:{flexDirection:'row',gap:8,flexWrap:'wrap'},error:{fontFamily:typography.fontFamily.regular,color:colors.warning,lineHeight:23,backgroundColor:colors.warningSoft,padding:12,borderRadius:12},
 pills:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},pill:{fontFamily:typography.fontFamily.semiBold,fontSize:12,color:colors.primary,backgroundColor:colors.primarySoft,paddingHorizontal:10,paddingVertical:3,borderRadius:16,overflow:'hidden'},pillWarn:{color:colors.warning,backgroundColor:colors.warningSoft},
 bar:{height:8,borderRadius:6,backgroundColor:colors.surfaceMuted,overflow:'hidden',marginBottom:6},barFill:{height:'100%',backgroundColor:colors.primary},
 tabs:{flexDirection:'row',gap:18,borderBottomWidth:1,borderBottomColor:colors.border},tab:{paddingVertical:8},tabOn:{borderBottomWidth:2,borderBottomColor:colors.primary},tabText:{fontFamily:typography.fontFamily.medium,color:colors.textSecondary,fontSize:15},tabTextOn:{color:colors.primary,fontFamily:typography.fontFamily.semiBold},
 inst:{flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderRadius:12,padding:12,gap:10},instTitle:{fontFamily:typography.fontFamily.semiBold,fontSize:15,color:colors.text},instAmount:{fontFamily:typography.fontFamily.bold,fontSize:15,color:colors.text}});
