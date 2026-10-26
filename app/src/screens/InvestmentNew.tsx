import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFormValidation } from '../hooks/useFormValidation';
import { Button, Card, Input, SelectModal, DateField, formatHumanDate } from '../components';
import { MemberPicker } from '../components/MemberPicker';
import { useLanguage } from '../i18n/useLanguage';
import { useSomitiStore } from '../store/somitiStore';
import { useAuthStore } from '../features/auth/authStore';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { uuid } from '../lib/api';
import { safeBack } from '../utils/navigation';
import { EmergencyContact, NewInvestment, contractAmounts, investmentSchedule, isoToday, monthDate, parseInvestmentAmount, investmentFieldErrors, roundMoney } from '../lib/investment';

const EMPTY_CONTACT: EmergencyContact = { name: '', relation: '', phone: '' };

/**
 * One-page investment form. Saving posts the money straight away: the decision
 * is taken in the society meeting, outside the app. With ?edit=<id> it edits.
 */
export default function InvestmentNew(){
  const {l,isBengali,formatMoneyPrecise:formatMoney,formatNum}=useLanguage();const router=useRouter();
  const members=useSomitiStore(s=>s.members),accounts=useSomitiStore(s=>s.cashAccounts);
  const create=useSomitiStore(s=>s.createInvestment),update=useSomitiStore(s=>s.updateInvestment);
  const role=useAuthStore(s=>s.actualRole);const allowed=['admin','super_admin','cashier'].includes(role||'');
  const params=useLocalSearchParams<{edit?:string;memberId?:string}>();
  const editing=useSomitiStore(s=>params.edit?s.projects.find(p=>p.id===params.edit):undefined);
  const c=editing?.contract;const moneyLocked=!!editing&&editing.returnedAmount>0;
  const request=useRef(uuid());const validation=useFormValidation();
  const presetMember=!c&&params.memberId?members.find(m=>m.id===params.memberId):undefined;
  const [kind,setKind]=useState<'member'|'external'>(c?(c.memberId?'member':'external'):'member');
  const [memberId,setMemberId]=useState(c?.memberId||presetMember?.id||'');
  const [selector,setSelector]=useState('');
  const [fields,setFields]=useState({
    recipientName:c?.recipientName||presetMember?.name||'',phone:c?.phone||presetMember?.phone||'',whatsapp:c?.whatsapp||presetMember?.whatsapp||'',
    address:c?.address||presetMember?.address||'',nid:c?.nid||presetMember?.nid||'',fatherName:c?.fatherName||presetMember?.fatherName||'',motherName:c?.motherName||presetMember?.motherName||'',
    purpose:c?.purpose||'',principal:c?String(c.principal):'',profitPct:c?String(c.profitPct):'',termMonths:c?String(c.termMonths):'12',
    disbursedDate:c?.disbursedDate||isoToday(),firstDueDate:c?.firstDueDate||monthDate(isoToday(),1),reason:''});
  const [customDue,setCustomDue]=useState(!!c);
  const [contacts,setContacts]=useState<EmergencyContact[]>(c?.contacts?.length?c.contacts:[]);
  const [moreOpen,setMoreOpen]=useState(!!c&&!!(c.address||c.nid||c.purpose||c.whatsapp));
  const [method,setMethod]=useState<NewInvestment['paymentMethod']>(c?.paymentMethod||'cash');
  const [review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=(key:keyof typeof fields)=>(value:string)=>{request.current=uuid();setFields(s=>{
    const next={...s,[key]:value};
    if(key==='disbursedDate'&&!customDue)next.firstDueDate=monthDate(value,1);
    return next;});validation.clear(key);setError('');};
  const principal=parseInvestmentAmount(fields.principal),pct=parseInvestmentAmount(fields.profitPct),term=parseInvestmentAmount(fields.termMonths);
  const amounts=contractAmounts(Number.isFinite(principal)?principal:0,Number.isFinite(pct)?pct:0);
  const installment=Number.isInteger(term)&&term>0?roundMoney(amounts.total/term):0;
  const account=accounts.find(a=>a.type===(method==='cash'?'cashier':method));
  // When editing, the old principal returns to its account first.
  const available=(account?.amount||0)+(c&&c.paymentMethod===method?c.principal:0);
  const shortage=Number.isFinite(principal)&&principal>available?roundMoney(principal-available):0;
  const payload=():NewInvestment=>({id:c?.id||request.current,memberId:kind==='member'?memberId:undefined,
    recipientName:fields.recipientName,phone:fields.phone,whatsapp:fields.whatsapp,address:fields.address,nid:fields.nid,fatherName:fields.fatherName,motherName:fields.motherName,
    purpose:fields.purpose,principal,profitPct:pct,termMonths:term,disbursedDate:fields.disbursedDate,firstDueDate:fields.firstDueDate,paymentMethod:method,
    contacts:contacts.filter(x=>x.name.trim()||x.relation.trim()||x.phone.trim()).map(x=>({name:x.name.trim(),relation:x.relation.trim(),phone:x.phone.trim()}))});
  const messages:Record<string,string>={required:l('This field is required.','এই তথ্যটি আবশ্যক।'),member:l('Select a member.','সদস্য নির্বাচন করুন।'),phone:l('Enter a valid mobile number.','সঠিক মোবাইল নম্বর দিন।'),nid:l('NID uses digits only.','NID শুধু সংখ্যায় দিন।'),amount:l('Enter the amount you are giving.','কত টাকা দিচ্ছেন লিখুন।'),rate:l('Enter a profit % from 0 to 100.','০ থেকে ১০০ এর মধ্যে প্রফিট % দিন।'),duration:l('Enter 1–120 months.','১–১২০ মাস দিন।'),date:l('Pick a date.','তারিখ বাছুন।'),dueDate:l('First installment cannot be before the money is given.','প্রথম কিস্তি টাকা দেওয়ার আগে হতে পারে না।'),contacts:l('At most three emergency contacts.','সর্বোচ্চ তিনজন জরুরি যোগাযোগ।')};
  const check=()=>{
    const codes=investmentFieldErrors({...payload(),contacts});
    if(kind==='member'&&!memberId){delete codes.recipientName;codes.memberId='member';}
    if(fields.disbursedDate>isoToday())codes.disbursedDate='date';
    const shown=Object.fromEntries(Object.entries(codes).map(([k,v])=>[k,messages[v]||v]));
    if(Object.keys(shown).some(k=>['nid','whatsapp'].includes(k)))setMoreOpen(true);
    validation.show(shown);
    if(Object.keys(shown).length){setError(l('Please fix the highlighted fields.','চিহ্নিত তথ্যগুলো ঠিক করে দিন।'));return false;}
    if(shortage>0){setError(l(`${account?.name||'This account'} is short by ${formatMoney(shortage)}. Add money or pick another account.`,`${account?.name||'এই হিসাবে'} ${formatMoney(shortage)} কম আছে। টাকা যোগ করুন বা অন্য হিসাব বাছুন।`));return false;}
    setError('');return true;
  };
  const save=async()=>{
    if(busy)return;setBusy(true);setError('');
    try{
      const data=payload();
      if(c&&editing){await update({...data,id:editing.id,reason:fields.reason.trim()});router.replace(`/(admin)/project/${editing.id}` as any);}
      else{await create(data);router.replace(`/(admin)/project/${data.id}` as any);}
    }catch(e:any){setError(e.message);}
    finally{setBusy(false);}
  };
  const schedule=useMemo(()=>review?investmentSchedule({...payload(),profitAmount:amounts.profit,number:''},0):[],[review]);// eslint-disable-line react-hooks/exhaustive-deps
  if(!allowed)return <SafeAreaView style={styles.root}><Text style={styles.body}>{l('Only an administrator or cashier can give investments.','শুধু admin বা ক্যাশিয়ার বিনিয়োগ দিতে পারবেন।')}</Text><Button title={l('Back','ফিরুন')} onPress={()=>safeBack(router)}/></SafeAreaView>;
  const field=(key:keyof typeof fields,label:string,extra:any={})=><View {...validation.fieldProps(key)} style={extra.half?{flex:1}:undefined}><Input error={validation.errors[key]} label={label} value={fields[key]} onChangeText={change(key)} editable={!extra.locked} {...extra.input}/></View>;
  return <SafeAreaView style={styles.root} edges={['top','left','right','bottom']}>
    <View style={styles.header}><Button variant="ghost" title={l('Back','ফিরুন')} onPress={()=>review?setReview(false):safeBack(router)}/><Text style={styles.title}>{review?l('Check before saving','সংরক্ষণের আগে দেখে নিন'):c?l('Edit investment','বিনিয়োগ এডিট'):l('New investment','নতুন বিনিয়োগ')}</Text></View>
    {error?<Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView ref={validation.scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View ref={validation.contentRef} collapsable={false}>
      {review?<>
        <Card><Text style={styles.heading}>{fields.recipientName}</Text>
          <Text style={styles.body}>{fields.phone} · {kind==='member'?l('Society member','সমিতির সদস্য'):l('Outside person','বাইরের ব্যক্তি')}</Text>
          {[[l('Giving now','এখন দিচ্ছেন'),formatMoney(principal)],[l('From account','কোন হিসাব থেকে'),account?.name||method],[l('Date','তারিখ'),formatHumanDate(fields.disbursedDate,isBengali)],
            [l('Profit','প্রফিট'),`${formatNum(pct)}% · ${formatMoney(amounts.profit)}`],[l('Total to get back','মোট ফেরত পাবেন'),formatMoney(amounts.total)],
            [l('Installments','কিস্তি'),`${formatMoney(installment)} × ${formatNum(term)}`]].map(([label,value])=><View style={styles.row} key={label}><Text style={styles.body}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
          {payload().contacts.length?<Text style={styles.hint}>{l('Emergency contacts','জরুরি যোগাযোগ')}: {payload().contacts.map(x=>x.name).join(', ')}</Text>:null}
        </Card>
        <Card><Text style={styles.heading}>{l('Installment dates','কিস্তির তারিখ')}</Text>{schedule.map(s=><View key={s.number} style={styles.row}><Text style={styles.body}>{formatNum(s.number)} · {formatHumanDate(s.dueDate,isBengali)}</Text><Text style={styles.value}>{formatMoney(s.amount)}</Text></View>)}</Card>
        {c?<Input label={l('Reason for the change (optional)','এডিটের কারণ (ঐচ্ছিক)')} value={fields.reason} onChangeText={change('reason')}/>:null}
        <Text style={styles.hint}>{c?l('Saving updates the contract. Every change is kept in the audit log.','সংরক্ষণ করলে চুক্তি আপডেট হবে। প্রতিটা পরিবর্তন অডিট লগে থাকবে।'):l(`Saving takes ${formatMoney(principal)} out of ${account?.name||'the account'}.`,`সংরক্ষণ করলে ${account?.name||'হিসাব'} থেকে ${formatMoney(principal)} কাটা হবে।`)}</Text>
        <Button testID="confirm-investment" title={c?l('Save changes','পরিবর্তন সংরক্ষণ করুন'):l('Save investment','বিনিয়োগ সংরক্ষণ করুন')} loading={busy} onPress={save}/>
      </>:<>
        {!c?<View style={styles.segment}>{(['member','external'] as const).map(k=><Pressable key={k} accessibilityRole="button" accessibilityState={{selected:kind===k}} style={[styles.segItem,kind===k&&styles.segOn]}
          onPress={()=>{setKind(k);setMemberId('');validation.clear();setError('');setFields(s=>({...s,recipientName:'',phone:'',whatsapp:'',address:'',nid:'',fatherName:'',motherName:''}));request.current=uuid();}}>
          <Text style={[styles.segText,kind===k&&styles.segTextOn]}>{k==='member'?l('Society member','সদস্য'):l('Outside person','বাইরের ব্যক্তি')}</Text></Pressable>)}</View>:null}
        {kind==='member'?<View {...validation.fieldProps('memberId')}><Pressable accessibilityRole="button" disabled={!!c} onPress={()=>setSelector('member')} style={[styles.pick,!!validation.errors.memberId&&{borderColor:colors.warning}]}>
          <View style={{flex:1}}><Text style={styles.pickLabel}>{l('Member','সদস্য')}</Text><Text style={styles.pickValue}>{memberId?`${fields.recipientName} · ${members.find(m=>m.id===memberId)?.code||''}`:l('Select a member','সদস্য বাছুন')}</Text></View>
          {!c?<Text style={styles.link}>{memberId?l('Change','বদলান'):l('Select','বাছুন')}</Text>:null}</Pressable>
          {validation.errors.memberId?<Text style={styles.fieldError}>{validation.errors.memberId}</Text>:null}</View>
          :field('recipientName',l('Full name','পূর্ণ নাম'))}
        {field('phone',l('Mobile number','মোবাইল নম্বর'),{input:{keyboardType:'phone-pad'}})}
        {moneyLocked?<Text style={styles.lockNote}>{l('Installments have been collected, so the money terms are locked. Reverse the collections first to change them.','কিস্তি নেওয়া শুরু হয়েছে, তাই টাকার শর্ত বদলানো যাবে না। বদলাতে আগে কিস্তি বাতিল করুন।')}</Text>:null}
        <View style={styles.two}>{field('principal',l('Amount ৳','মূলধন ৳'),{half:true,locked:moneyLocked,input:{keyboardType:'decimal-pad',testID:'investment-principal'}})}{field('profitPct',l('Profit %','প্রফিট %'),{half:true,locked:moneyLocked,input:{keyboardType:'decimal-pad',testID:'investment-profit-pct'}})}</View>
        <View style={styles.two}>{field('termMonths',l('Months','মেয়াদ (মাস)'),{half:true,locked:moneyLocked,input:{keyboardType:'number-pad'}})}
          <View style={{flex:1}} {...validation.fieldProps('disbursedDate')}>{moneyLocked?<Input label={l('Given on','দেওয়ার তারিখ')} value={formatHumanDate(fields.disbursedDate,isBengali)} editable={false}/>:<DateField label={l('Given on','দেওয়ার তারিখ')} value={fields.disbursedDate} max={isoToday()} error={validation.errors.disbursedDate} onChange={change('disbursedDate')}/>}</View></View>
        <Pressable accessibilityRole="button" disabled={moneyLocked} onPress={()=>setSelector('account')} style={styles.pick}>
          <View style={{flex:1}}><Text style={styles.pickLabel}>{l('From account','কোন হিসাব থেকে')}</Text><Text style={styles.pickValue}>{account?.name||method} · {formatMoney(available)} {l('available','আছে')}</Text></View>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary}/></Pressable>
        {shortage>0&&!moneyLocked?<View style={styles.short}><Text style={styles.shortText}>{l(`${formatMoney(shortage)} short`,`${formatMoney(shortage)} কম আছে`)}</Text>
          <Pressable accessibilityRole="button" onPress={()=>router.push(`/(admin)/fund/new?method=${method}&amount=${shortage}` as any)} style={styles.shortBtn}><Text style={styles.shortBtnText}>{l('+ Add money','+ টাকা যোগ')}</Text></Pressable></View>:null}
        <View style={styles.calc}>
          <View style={styles.row}><Text style={styles.body}>{l('Total to get back','মোট ফেরত পাবেন')}</Text><Text style={styles.big}>{formatMoney(amounts.total)}</Text></View>
          <View style={styles.row}><Text style={styles.body}>{l('Monthly installment','মাসিক কিস্তি')} × {formatNum(Number.isFinite(term)?term:0)}</Text><Text style={styles.value}>{formatMoney(installment)}</Text></View>
          {customDue&&!moneyLocked?<DateField label={l('First installment','প্রথম কিস্তি')} value={fields.firstDueDate} min={fields.disbursedDate} error={validation.errors.firstDueDate} onChange={change('firstDueDate')}/>
          :<View style={styles.row}><Text style={styles.hint}>{l('First installment','প্রথম কিস্তি')}: {formatHumanDate(fields.firstDueDate,isBengali)}</Text>{!moneyLocked?<Pressable onPress={()=>setCustomDue(true)}><Text style={styles.link}>{l('Change','বদলান')}</Text></Pressable>:null}</View>}
        </View>
        {contacts.map((contact,index)=><Card key={index}><View style={styles.row}><Text style={styles.value}>{l('Emergency contact','জরুরি যোগাযোগ')} {formatNum(index+1)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={l('Remove','সরান')} onPress={()=>{request.current=uuid();setContacts(list=>list.filter((_,i)=>i!==index));}}><Ionicons name="close" size={20} color={colors.textSecondary}/></Pressable></View>
          {(['name','relation','phone'] as const).map(key=><View key={key} {...validation.fieldProps('contact.'+index+'.'+key)}><Input error={validation.errors['contact.'+index+'.'+key]} label={key==='name'?l('Name','নাম'):key==='relation'?l('Relationship (optional)','সম্পর্ক (ঐচ্ছিক)'):l('Phone','ফোন')} value={contact[key]} keyboardType={key==='phone'?'phone-pad':'default'}
            onChangeText={v=>{request.current=uuid();validation.clear('contact.'+index+'.'+key);setError('');setContacts(list=>list.map((x,i)=>i===index?{...x,[key]:v}:x));}}/></View>)}</Card>)}
        {contacts.length<3?<Pressable accessibilityRole="button" onPress={()=>setContacts(list=>[...list,{...EMPTY_CONTACT}])} style={styles.add}><Text style={styles.link}>{l('+ Add emergency contact (optional)','+ জরুরি যোগাযোগ যোগ করুন (ঐচ্ছিক)')}</Text></Pressable>:null}
        <Pressable accessibilityRole="button" accessibilityState={{expanded:moreOpen}} onPress={()=>setMoreOpen(v=>!v)} style={styles.add}><Text style={styles.link}>{moreOpen?l('− Hide more details','− আরও তথ্য লুকান'):l('+ More details: WhatsApp, address, NID, parents, purpose','+ আরও তথ্য: WhatsApp, ঠিকানা, NID, বাবা-মা, উদ্দেশ্য')}</Text></Pressable>
        {moreOpen?<Card>
          {field('whatsapp',l('WhatsApp number','WhatsApp নম্বর'),{input:{keyboardType:'phone-pad'}})}
          {field('address',l('Address','ঠিকানা'),{input:{multiline:true}})}
          {field('nid',l('NID number','NID নম্বর'),{input:{keyboardType:'number-pad'}})}
          {field('fatherName',l("Father's name","বাবার নাম"))}
          {field('motherName',l("Mother's name","মায়ের নাম"))}
          {field('purpose',l('Purpose','উদ্দেশ্য'))}
        </Card>:null}
        <Button title={l('Check and save','যাচাই করুন')} onPress={()=>{if(check())setReview(true);}}/>
      </>}
      </View>
    </ScrollView></KeyboardAvoidingView>
    <MemberPicker visible={selector==='member'} title={l('Select member','সদস্য বাছুন')} value={memberId} members={members} onClose={()=>setSelector('')} onSelect={id=>{const m=members.find(m=>m.id===id);if(!m)return;request.current=uuid();validation.clear();setError('');setMemberId(id);setFields(s=>({...s,recipientName:m.name,phone:m.phone,whatsapp:m.whatsapp||'',address:m.address,nid:m.nid||'',fatherName:m.fatherName||'',motherName:m.motherName||''}));}}/>
    <SelectModal visible={selector==='account'} title={l('From account','কোন হিসাব থেকে')} value={method} options={accounts.filter(a=>['bank','cashier','bkash','nagad'].includes(a.type||'')).map(a=>({value:a.type==='cashier'?'cash':a.type!,label:`${a.name} · ${formatMoney(a.amount)}`}))} onClose={()=>setSelector('')} onSelect={v=>{request.current=uuid();setMethod(v as NewInvestment['paymentMethod']);}}/>
  </SafeAreaView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},header:{paddingHorizontal:12,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8},title:{flex:1,fontSize:21,fontFamily:typography.fontFamily.bold,color:colors.text},content:{padding:16,paddingBottom:32},
 heading:{fontFamily:typography.fontFamily.bold,fontSize:18,color:colors.text,marginBottom:8},body:{fontFamily:typography.fontFamily.regular,fontSize:14,color:colors.text,flexShrink:1},value:{fontFamily:typography.fontFamily.semiBold,fontSize:15,color:colors.primary,flexShrink:1,textAlign:'right'},
 big:{fontFamily:typography.fontFamily.bold,fontSize:18,color:colors.primary},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,paddingVertical:6},two:{flexDirection:'row',gap:10},
 hint:{fontFamily:typography.fontFamily.regular,fontSize:13,lineHeight:21,color:colors.textSecondary,marginVertical:6},segment:{flexDirection:'row',backgroundColor:colors.surfaceMuted,borderRadius:12,padding:3,marginBottom:14},
 segItem:{flex:1,paddingVertical:9,alignItems:'center',borderRadius:10},segOn:{backgroundColor:colors.surface},segText:{fontFamily:typography.fontFamily.medium,color:colors.textSecondary,fontSize:14},segTextOn:{color:colors.primary,fontFamily:typography.fontFamily.semiBold},
 pick:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:14,paddingVertical:9,marginBottom:16},
 pickLabel:{fontFamily:typography.fontFamily.regular,fontSize:12,color:colors.textSecondary},pickValue:{fontFamily:typography.fontFamily.medium,fontSize:15,color:colors.text},link:{fontFamily:typography.fontFamily.semiBold,fontSize:14,color:colors.primary},
 short:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.warningSoft,borderRadius:12,padding:10,marginTop:-8,marginBottom:16,gap:10},shortText:{fontFamily:typography.fontFamily.semiBold,color:colors.warning,fontSize:14,flexShrink:1},
 shortBtn:{backgroundColor:colors.warning,borderRadius:8,paddingHorizontal:10,paddingVertical:6},shortBtnText:{fontFamily:typography.fontFamily.semiBold,color:'#FFFFFF',fontSize:13},
 calc:{backgroundColor:colors.primarySoft,borderRadius:14,padding:12,marginBottom:12},add:{paddingVertical:10},lockNote:{fontFamily:typography.fontFamily.regular,fontSize:13,lineHeight:21,color:colors.warning,backgroundColor:colors.warningSoft,borderRadius:12,padding:10,marginBottom:12},
 fieldError:{fontFamily:typography.fontFamily.regular,color:colors.warning,fontSize:13,marginTop:-10,marginBottom:12},error:{fontFamily:typography.fontFamily.regular,color:colors.warning,padding:12,marginHorizontal:16,marginBottom:6,backgroundColor:colors.warningSoft,borderRadius:12}});
