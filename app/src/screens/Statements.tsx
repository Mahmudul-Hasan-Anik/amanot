import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSomitiStore } from '../store/somitiStore';
import { useLanguage } from '../i18n/useLanguage';
import { Page, pageStyles as s } from '../components/Page';
import { exportReport, Report } from '../utils/reportExport';
import { colors } from '../theme/colors';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchMemberStatementSnapshot, fetchMemberBalancesSnapshot } from '../lib/api';
import { buildMemberStatement } from '../lib/memberStatement';
import { MemberPicker } from '../components/MemberPicker';
import { MemberBalanceSummary } from '../components/MemberBalanceSummary';
import { useAuthStore } from '../features/auth/authStore';

export default function Statements(){
  const state=useSomitiStore();const {l,formatMoney,formatNum,isBengali}=useLanguage();
  const params=useLocalSearchParams<{memberId?:string}>();
  const [target,setTarget]=useState<'all'|'single'>(params.memberId?'single':'all');const [memberId,setMemberId]=useState(String(params.memberId||''));
  useEffect(()=>{if(params.memberId){setTarget('single');setMemberId(String(params.memberId));}},[params.memberId]);
  const [busy,setBusy]=useState(false),[visibleCount,setVisibleCount]=useState(20);
  const [picker,setPicker]=useState(false),[error,setError]=useState('');const lock=useRef(false);
  const scrollRef=useRef<ScrollView>(null);
  const members=state.members.filter(m=>target==='all'||target==='single'&&m.id===memberId);
  const total=members.reduce((sum,m)=>sum+m.totalDeposit,0);
  const exportStatement=async(format:'PDF'|'CSV')=>{
    if(lock.current)return;if(!members.length){setError(l('Select a member','সদস্য নির্বাচন করুন'));return;}
    lock.current=true;setBusy(true);setError('');const auth=useAuthStore.getState(),identity=`${auth.currentUser?.id}:${auth.actualRole}`;
    try{
    const fresh=target==='single'&&isSupabaseConfigured()?await fetchMemberStatementSnapshot(memberId):null;
    const balances=target==='all'&&isSupabaseConfigured()?await fetchMemberBalancesSnapshot():members;
    const active=useAuthStore.getState();
    if(isSupabaseConfigured()&&(!active.isPinVerified||`${active.currentUser?.id}:${active.actualRole}`!==identity))return;
    const report:Report=target==='single'?buildMemberStatement(fresh?.member||members[0],fresh?.transactions||state.transactions,isBengali?'bn':'en'):
      {title:l('Member statements','সদস্যদের স্টেটমেন্ট'),columns:[l('ID','আইডি'),l('Member','সদস্য'),l('Phone','ফোন'),l('Remaining balance','অবশিষ্ট ব্যালেন্স'),l('Profit balance','লাভের ব্যালেন্স'),l('Net withdrawals','নিট উত্তোলন')],rows:balances.map(m=>[m.code,m.name,m.phone,m.totalDeposit,m.profitBalance||0,m.totalWithdrawn||0])};
    await exportReport(report,state.somitiInfo.name,new Date().toISOString().slice(0,10),format);}catch(e:any){setError(e.message);scrollRef.current?.scrollTo({y:0,animated:true});}finally{lock.current=false;setBusy(false);}
  };
  return <Page scrollRef={scrollRef} title={l('Member Statements','সদস্য স্টেটমেন্ট')} subtitle={l('Export balances and transaction history','ব্যালেন্স ও লেনদেনের বিস্তারিত এক্সপোর্ট করুন')}>
    <View style={s.chips}>{(['all','single'] as const).map(t=><TouchableOpacity key={t} style={[s.chip,target===t&&{backgroundColor:colors.primary}]} onPress={()=>setTarget(t)}><Text style={[s.text,target===t&&{color:colors.surface}]}>{t==='all'?l('All members','সব সদস্য'):l('One member','একজন সদস্য')}</Text></TouchableOpacity>)}</View>
    {error?<Text accessibilityRole="alert" style={{color:colors.danger,marginBottom:12}}>{error}</Text>:null}
    {target==='single'&&<TouchableOpacity disabled={busy} style={s.card} onPress={()=>setPicker(true)} accessibilityRole="button"><Text style={s.text}>{state.members.find(m=>m.id===memberId)?.name||l('Choose member','সদস্য নির্বাচন')} ▾</Text></TouchableOpacity>}
    <MemberPicker visible={picker} members={state.members} value={memberId} onSelect={id=>{setMemberId(id);setError('');}} onClose={()=>setPicker(false)}/>
    <View style={s.card}><Text style={s.title}>{l('Selected balances','নির্বাচিত হিসাব')}</Text><Text style={s.text}>{formatNum(members.length)} {l('members','জন সদস্য')}</Text><View style={s.row}><Text style={s.text}>{l('Total savings','মোট সঞ্চয়')}</Text><Text style={s.value}>{formatMoney(total)}</Text></View></View>
    <TouchableOpacity disabled={busy} style={[s.button,busy&&{opacity:0.5}]} onPress={()=>exportStatement('PDF')}><Text style={s.buttonText}>{busy?l('Preparing…','প্রস্তুত হচ্ছে…'):l('Download / Share PDF','PDF ডাউনলোড / শেয়ার')}</Text></TouchableOpacity>
    <TouchableOpacity disabled={busy} style={[s.button,{backgroundColor:colors.text}]} onPress={()=>exportStatement('CSV')}><Text style={s.buttonText}>{l('Export CSV for Excel','Excel-এর জন্য CSV এক্সপোর্ট')}</Text></TouchableOpacity>
    {members.length===0&&<Text style={s.text}>{l('No members match this selection.','এই তালিকায় কোনো সদস্য নেই।')}</Text>}
    {target==='single'?members.map(m=><MemberBalanceSummary key={m.id} member={m} requests={state.withdrawalRequests}/>):<>
      {members.slice(0,visibleCount).map(m=><TouchableOpacity key={m.id} style={s.card} accessibilityRole="button" onPress={()=>{setMemberId(m.id);setTarget('single');}}><Text style={s.title}>{m.name} · {m.code}</Text><Text style={s.text}>{l('Remaining balance','অবশিষ্ট ব্যালেন্স')}: {formatMoney(m.totalDeposit)}</Text></TouchableOpacity>)}
      {visibleCount<members.length&&<TouchableOpacity style={s.button} onPress={()=>setVisibleCount(n=>n+20)} accessibilityRole="button"><Text style={s.buttonText}>{l('Show more members','আরও সদস্য দেখুন')}</Text></TouchableOpacity>}
    </>}
  </Page>;
}
