import React,{useRef,useState} from 'react';
import {useFormValidation} from '../hooks/useFormValidation';
import {View,Text,ScrollView,StyleSheet,Alert,KeyboardAvoidingView,Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {Button,Card,Input,SelectModal} from '../components';
import {MemberPicker} from '../components/MemberPicker';
import {useLanguage} from '../i18n/useLanguage';
import {useSomitiStore} from '../store/somitiStore';
import {useAuthStore} from '../features/auth/authStore';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {uuid} from '../lib/api';
import {safeBack} from '../utils/navigation';
import {EmergencyContact,NewInvestment,contractAmounts,investmentSchedule,isoToday,monthDate,parseInvestmentAmount,investmentFieldErrors} from '../lib/investment';

export default function InvestmentNew(){
  const {l,formatMoneyPrecise:formatMoney,formatNum}=useLanguage();const router=useRouter();
  const members=useSomitiStore(s=>s.members),accounts=useSomitiStore(s=>s.cashAccounts),create=useSomitiStore(s=>s.createInvestment);
  const role=useAuthStore(s=>s.actualRole);const allowed=role==='admin'||role==='super_admin';
  const params=useLocalSearchParams<{source?:string}>();
  const source=(useSomitiStore(s=>s.investmentProposals)||[]).find(p=>p.id===params.source&&['rejected','withdrawn'].includes(p.status))?.payload;
  const request=useRef(uuid());const validation=useFormValidation();
  const [kind,setKind]=useState(source&&!source.memberId?'external':'member'),[memberId,setMemberId]=useState(source?.memberId||''),[selector,setSelector]=useState('');
  const [fields,setFields]=useState({recipientName:'',phone:'',whatsapp:'',address:'',nid:'',fatherName:'',motherName:'',purpose:'',principal:'',profitPct:'',termMonths:'12',disbursedDate:isoToday(),firstDueDate:monthDate(isoToday(),1),...(source?Object.fromEntries(Object.entries(source).filter(([key])=>['recipientName','phone','whatsapp','address','nid','fatherName','motherName','purpose','principal','profitPct','termMonths','disbursedDate','firstDueDate'].includes(key)).map(([key,value])=>[key,String(value)])): {})});
  const [contacts,setContacts]=useState<EmergencyContact[]>(Array.from({length:3},(_,i)=>source?.contacts[i]||({name:'',relation:'',phone:''})));
  const [method,setMethod]=useState<NewInvestment['paymentMethod']>(source?.paymentMethod||'bank');
  const [review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=(key:keyof typeof fields)=>(value:string)=>{request.current=uuid();setFields(s=>({...s,[key]:value}));validation.clear(key);setError('');};
  const principal=parseInvestmentAmount(fields.principal),pct=parseInvestmentAmount(fields.profitPct),term=parseInvestmentAmount(fields.termMonths);
  const amounts=contractAmounts(principal||0,pct||0);
  const payload=():NewInvestment=>({id:request.current,memberId:kind==='member'?memberId:undefined,...fields,principal,profitPct:pct,termMonths:term,paymentMethod:method,
    contacts:contacts.filter(c=>c.name.trim()||c.relation.trim()||c.phone.trim()).map(c=>({name:c.name.trim(),relation:c.relation.trim(),phone:c.phone.trim()}))});
  const preview=()=>{
    const codes=investmentFieldErrors({...payload(),contacts});
    if(kind==='member'&&!memberId){delete codes.recipientName;codes.memberId='member';}
    const messages:Record<string,string>={required:l('This field is required.','এই তথ্যটি আবশ্যক।'),member:l('Select a member.','সদস্য নির্বাচন করুন।'),phone:l('Enter a valid mobile number.','সঠিক মোবাইল নম্বর দিন।'),nid:l('Enter an NID number using digits only.','শুধু সংখ্যা দিয়ে NID নম্বর দিন।'),amount:l('Enter a positive principal amount.','শূন্যের বেশি মূলধন দিন।'),rate:l('Enter a profit rate from 0 to 100%.','০ থেকে ১০০% প্রফিট হার দিন।'),duration:l('Enter 1–120 whole months; each installment must be at least 0.01.','১–১২০ পূর্ণ মাস দিন; প্রতি কিস্তি অন্তত ০.০১ হতে হবে।'),date:l('Enter a valid date in YYYY-MM-DD format.','YYYY-MM-DD ফরম্যাটে সঠিক তারিখ দিন।'),dueDate:l('First installment cannot precede disbursement.','প্রথম কিস্তি টাকা প্রদানের আগে হতে পারবে না।'),contacts:l('Use at most three emergency contacts.','সর্বোচ্চ তিনজন জরুরি যোগাযোগ দিন।')};
    const ordered=kind==='member'&&!memberId?{memberId:messages.member,...Object.fromEntries(Object.entries(codes).filter(([key])=>key!=='memberId').map(([key,code])=>[key,messages[code]]))}:Object.fromEntries(Object.entries(codes).map(([key,code])=>[key,messages[code]]));
    validation.show(ordered);
    if(Object.keys(ordered).length){setError(l('Please fix the highlighted fields.','চিহ্নিত তথ্যগুলো ঠিক করে দিন।'));return;}
    setError('');setReview(true);
  };
  const save=async()=>{
    if(busy)return;setBusy(true);setError('');
    try{const data=payload();await create(data);router.replace(`/(admin)/investment/proposal/${data.id}` as any);}
    catch(e:any){const missing=/Could not find the function|does not exist/.test(e.message||'');setError(missing?l('Investment backend update is not deployed yet. No money was posted.','বিনিয়োগের backend update এখনো deploy হয়নি। কোনো টাকা রেকর্ড হয়নি।'):e.message);}
    finally{setBusy(false);}
  };
  if(!allowed)return <SafeAreaView style={styles.root}><Text style={styles.body}>{l('Only an administrator can disburse investments.','শুধু admin বিনিয়োগ প্রদান করতে পারবেন।')}</Text><Button title={l('Back','ফিরুন')} onPress={()=>safeBack(router)}/></SafeAreaView>;
  const schedule=review?investmentSchedule({...payload(),profitAmount:amounts.profit,number:''},0):[];
  return <SafeAreaView style={styles.root} edges={['top','left','right','bottom']}>
    <View style={styles.header}><Button variant="ghost" title={l('Back','ফিরুন')} onPress={()=>review?setReview(false):safeBack(router)}/><Text style={styles.title}>{review?l('Review investment','বিনিয়োগ যাচাই'):l('New investment','নতুন বিনিয়োগ')}</Text></View>
    {error?<Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView ref={validation.scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View ref={validation.contentRef} collapsable={false}>
      <Text style={styles.hint}>{l('1. Proposal → 2. Approval → 3. Disbursement. Submitting does not deduct any money.','১. প্রস্তাব → ২. অনুমোদন → ৩. টাকা প্রদান। প্রস্তাব জমা দিলে টাকা কাটবে না।')}</Text>
      {review?<>
        <Card><Text style={styles.heading}>{fields.recipientName}</Text><Text style={styles.body}>{fields.phone} · {kind==='member'?l('Society member','সমিতির সদস্য'):l('External recipient','বাইরের ব্যক্তি')}</Text>
          <Text style={styles.body}>NID: {fields.nid}</Text><Text style={styles.body}>{l('Father','বাবা')}: {fields.fatherName}</Text><Text style={styles.body}>{l('Mother','মা')}: {fields.motherName}</Text><Text style={styles.body}>{fields.address}</Text>
          <Text style={styles.body}>{l('Emergency contacts:','জরুরি যোগাযোগ:')} {formatNum(payload().contacts.length)}</Text>{payload().contacts.map((c,i)=><Text style={styles.body} key={i}>{c.name} · {c.relation} · {c.phone}</Text>)}</Card>
        <Card><Text style={styles.heading}>{l('Contract terms','চুক্তির শর্ত')}</Text>
          {[[l('Proposed principal','প্রস্তাবিত মূলধন'),formatMoney(principal)],[l('Whole-contract profit','পুরো চুক্তির প্রফিট'),`${formatNum(pct)}% · ${formatMoney(amounts.profit)}`],
            [l('Total receivable','মোট ফেরতযোগ্য'),formatMoney(amounts.total)],[l('Duration','মেয়াদ'),`${formatNum(term)} ${l('months','মাস')}`],
            [l('Planned disbursement date','প্রস্তাবিত টাকা প্রদানের তারিখ'),fields.disbursedDate],[l('Funding account','টাকা দেওয়ার হিসাব'),accounts.find(a=>a.type===(method==='cash'?'cashier':method))?.name||method]].map(([label,value])=><View style={styles.row} key={label}><Text style={styles.body}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
          <Text style={styles.hint}>{l('Principal is recovered first, then profit. No automatic late fee or compounding.','আগে মূলধন ফেরত, তারপর প্রফিট। স্বয়ংক্রিয় বিলম্ব ফি বা চক্রবৃদ্ধি নেই।')}</Text></Card>
        <Card><Text style={styles.heading}>{l('Monthly installments','মাসিক কিস্তি')}</Text>{schedule.map(s=><View key={s.number} style={styles.row}><Text style={styles.body}>{formatNum(s.number)} · {s.dueDate}</Text><Text style={styles.value}>{formatMoney(s.amount)}</Text></View>)}</Card>
        <Button testID="confirm-investment" title={l('Submit proposal','প্রস্তাব জমা দিন')} loading={busy} onPress={save}/>
      </>:<>
        <Card><Text style={styles.heading}>{l('Recipient','বিনিয়োগগ্রহীতা')}</Text>
          <View style={styles.actions}>{['member','external'].map(k=><Button key={k} size="sm" variant={kind===k?'primary':'outline'} title={k==='member'?l('Society member','সমিতির সদস্য'):l('External person','বাইরের ব্যক্তি')} onPress={()=>{setKind(k);setMemberId('');validation.clear();setError('');setFields(s=>({...s,recipientName:'',phone:'',whatsapp:'',address:'',nid:'',fatherName:'',motherName:''}));request.current=uuid();}}/>)}</View>
          {kind==='member'?<View {...validation.fieldProps('memberId')}><Button variant="outline" title={memberId?`${fields.recipientName} · ${members.find(m=>m.id===memberId)?.code}`:l('Select member','সদস্য নির্বাচন')} onPress={()=>setSelector('member')}/>{validation.errors.memberId?<Text style={styles.fieldError}>{validation.errors.memberId}</Text>:null}</View>:null}
          <View {...validation.fieldProps('recipientName')}><Input error={validation.errors.recipientName} label={l('Full name','পূর্ণ নাম')} value={fields.recipientName} editable={kind==='external'} onChangeText={change('recipientName')}/></View>
          <View {...validation.fieldProps('phone')}><Input error={validation.errors.phone} label={l('Phone','মোবাইল নম্বর')} keyboardType="phone-pad" value={fields.phone} onChangeText={change('phone')}/></View>
          <View {...validation.fieldProps('whatsapp')}><Input error={validation.errors.whatsapp} label={l('WhatsApp number (optional)','WhatsApp নম্বর (ঐচ্ছিক)')} keyboardType="phone-pad" value={fields.whatsapp} onChangeText={change('whatsapp')}/></View>
          <View {...validation.fieldProps('address')}><Input error={validation.errors.address} label={l('Address','ঠিকানা')} value={fields.address} multiline onChangeText={change('address')}/></View>
          <View {...validation.fieldProps('nid')}><Input error={validation.errors.nid} label={l('NID number *','NID নম্বর *')} value={fields.nid} keyboardType="number-pad" onChangeText={change('nid')}/></View>
          <View {...validation.fieldProps('fatherName')}><Input error={validation.errors.fatherName} label={l("Father's name *",'বাবার নাম *')} value={fields.fatherName} onChangeText={change('fatherName')}/></View>
          <View {...validation.fieldProps('motherName')}><Input error={validation.errors.motherName} label={l("Mother's name *",'মায়ের নাম *')} value={fields.motherName} onChangeText={change('motherName')}/></View>
        </Card>
        <Card><Text style={styles.heading}>{l('Emergency contacts','জরুরি যোগাযোগ')}</Text><Text style={styles.hint}>{l('At least one required. These contacts are not guarantors.','অন্তত একজন আবশ্যক। এরা জামিনদার নন।')}</Text>
          {contacts.map((contact,index)=><View key={index} style={styles.contact}><Text style={styles.value}>{l('Person','ব্যক্তি')} {formatNum(index+1)} {index>0?l('(optional)','(ঐচ্ছিক)'):''}</Text>
            {(['name','relation','phone'] as const).map(key=><View key={key} {...validation.fieldProps('contact.'+index+'.'+key)}><Input error={validation.errors['contact.'+index+'.'+key]} key={key} label={key==='name'?l('Name','নাম'):key==='relation'?l('Relationship','সম্পর্ক'):l('Phone','ফোন')} value={contact[key]} keyboardType={key==='phone'?'phone-pad':'default'} onChangeText={v=>{request.current=uuid();validation.clear('contact.'+index+'.'+key);setError('');setContacts(c=>c.map((x,i)=>i===index?{...x,[key]:v}:x));}}/></View>)}</View>)}
        </Card>
        <Card><Text style={styles.heading}>{l('Investment terms','বিনিয়োগের শর্ত')}</Text>
          <View {...validation.fieldProps('purpose')}><Input error={validation.errors.purpose} label={l('Purpose','উদ্দেশ্য')} value={fields.purpose} onChangeText={change('purpose')}/></View>
          <View {...validation.fieldProps('principal')}><Input error={validation.errors.principal} testID="investment-principal" label={l('Principal to disburse','প্রদানের মূলধন')} keyboardType="decimal-pad" value={fields.principal} onChangeText={change('principal')}/></View>
          <View {...validation.fieldProps('profitPct')}><Input error={validation.errors.profitPct} testID="investment-profit-pct" label={l('Profit % for the whole contract','পুরো চুক্তির প্রফিট %')} helper={l('This is not an annual or monthly rate.','এটি বার্ষিক বা মাসিক হার নয়।')} keyboardType="decimal-pad" value={fields.profitPct} onChangeText={change('profitPct')}/></View>
          <View {...validation.fieldProps('termMonths')}><Input error={validation.errors.termMonths} label={l('Duration in months','মেয়াদ (মাস)')} keyboardType="number-pad" value={fields.termMonths} onChangeText={change('termMonths')}/></View>
          <View {...validation.fieldProps('disbursedDate')}><Input error={validation.errors.disbursedDate} label={l('Planned disbursement date (YYYY-MM-DD)','প্রস্তাবিত প্রদানের তারিখ (YYYY-MM-DD)')} value={fields.disbursedDate} onChangeText={change('disbursedDate')}/></View>
          <View {...validation.fieldProps('firstDueDate')}><Input error={validation.errors.firstDueDate} label={l('First installment date (YYYY-MM-DD)','প্রথম কিস্তির তারিখ (YYYY-MM-DD)')} value={fields.firstDueDate} onChangeText={change('firstDueDate')}/></View>
          <Button variant="outline" title={`${l('Funding account','টাকা দেওয়ার হিসাব')}: ${accounts.find(a=>a.type===(method==='cash'?'cashier':method))?.name||method}`} onPress={()=>setSelector('account')}/>
          <Text style={styles.hint}>{l('Agreed profit','চুক্তির প্রফিট')}: {formatMoney(amounts.profit)} · {l('Total receivable','মোট ফেরতযোগ্য')}: {formatMoney(amounts.total)}</Text>
        </Card>
        <Button title={l('Review investment','বিনিয়োগ যাচাই করুন')} onPress={preview}/>
      </>}
      </View>
    </ScrollView></KeyboardAvoidingView>
    <MemberPicker visible={selector==='member'} title={l('Select active member','সক্রিয় সদস্য নির্বাচন')} value={memberId} members={members} activeOnly onClose={()=>setSelector('')} onSelect={id=>{const m=members.find(m=>m.id===id);if(!m)return;request.current=uuid();validation.clear();setError('');setMemberId(id);setFields(s=>({...s,recipientName:m.name,phone:m.phone,whatsapp:m.whatsapp||'',address:m.address,nid:m.nid||'',fatherName:m.fatherName||'',motherName:m.motherName||''}));}}/>
    <SelectModal visible={selector==='account'} title={l('Funding account','টাকা দেওয়ার হিসাব')} value={method} options={accounts.filter(a=>['bank','cashier','bkash','nagad'].includes(a.type||'')).map(a=>({value:a.type==='cashier'?'cash':a.type!,label:`${a.name} · ${formatMoney(a.amount)}`}))} onClose={()=>setSelector('')} onSelect={v=>{request.current=uuid();setMethod(v as NewInvestment['paymentMethod']);}}/>
  </SafeAreaView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},header:{paddingHorizontal:12,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8},title:{flex:1,fontSize:21,fontFamily:typography.fontFamily.bold,color:colors.text},content:{padding:16,paddingBottom:32},heading:{fontFamily:typography.fontFamily.bold,fontSize:18,color:colors.text,marginBottom:12},body:{fontFamily:typography.fontFamily.regular,fontSize:14,color:colors.text,flexShrink:1},value:{fontFamily:typography.fontFamily.semiBold,fontSize:15,color:colors.primary,flexShrink:1,textAlign:'right'},row:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:9},actions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},hint:{fontFamily:typography.fontFamily.regular,fontSize:13,lineHeight:21,color:colors.textSecondary,marginVertical:10},contact:{paddingTop:12,marginTop:8,borderTopWidth:1,borderTopColor:colors.border},fieldError:{fontFamily:typography.fontFamily.regular,color:colors.warning,fontSize:13,marginTop:6},error:{fontFamily:typography.fontFamily.regular,color:colors.warning,padding:12,marginBottom:10,backgroundColor:colors.warningSoft,borderRadius:12}});
