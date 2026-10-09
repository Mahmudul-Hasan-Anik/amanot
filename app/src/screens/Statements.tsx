import React,{useState} from 'react';
import {Text,View,TouchableOpacity,TextInput,Alert} from 'react-native';
import {useSomitiStore} from '../store/somitiStore';
import {useLanguage} from '../i18n/useLanguage';
import {Page,pageStyles as s} from '../components/Page';
import {exportReport,Report} from '../utils/reportExport';
import {colors} from '../theme/colors';

export default function Statements(){
  const state=useSomitiStore();const {l,formatMoney}=useLanguage();
  const [target,setTarget]=useState<'all'|'due'|'single'>('all');const [memberId,setMemberId]=useState('');const [query,setQuery]=useState('');const [busy,setBusy]=useState(false);
  const members=state.members.filter(m=>target==='all'||target==='due'&&m.dueAmount>0||target==='single'&&m.id===memberId);
  const total=members.reduce((sum,m)=>sum+m.totalDeposit,0),due=members.reduce((sum,m)=>sum+m.dueAmount,0);
  const exportStatement=async(format:'PDF'|'CSV')=>{
    if(busy)return;if(!members.length){Alert.alert(l('Select a member','সদস্য নির্বাচন করুন'));return;}
    const report:Report=target==='single'?{
      title:`${l('Statement','স্টেটমেন্ট')} · ${members[0].name} (${members[0].code})`,columns:[l('Date','তারিখ'),l('Receipt','রসিদ'),l('Description','বিবরণ'),l('Amount','পরিমাণ')],
      rows:state.transactions.filter(t=>t.memberId===memberId).map(t=>[t.date,t.receiptNo,t.note||t.type,t.amount]),
    }:{title:l('Member statements','সদস্যদের স্টেটমেন্ট'),columns:['আইডি','সদস্য','ফোন','মোট সঞ্চয়','বকেয়া','লাভের ব্যালেন্স'],rows:members.map(m=>[m.code,m.name,m.phone,m.totalDeposit,m.dueAmount,m.profitBalance||0])};
    setBusy(true);try{await exportReport(report,state.somitiInfo.name,new Date().toISOString().slice(0,10),format);}catch(e:any){Alert.alert(l('Export failed','এক্সপোর্ট ব্যর্থ'),e.message);}finally{setBusy(false);}
  };
  return <Page title={l('Member Statements','সদস্য স্টেটমেন্ট')} subtitle={l('Export balances and transaction history','ব্যালেন্স ও লেনদেনের বিস্তারিত এক্সপোর্ট করুন')}>
    <View style={s.chips}>{(['all','due','single'] as const).map(t=><TouchableOpacity key={t} style={[s.chip,target===t&&{backgroundColor:colors.primary}]} onPress={()=>setTarget(t)}><Text style={[s.text,target===t&&{color:colors.surface}]}>{t==='all'?l('All members','সব সদস্য'):t==='due'?l('Overdue','বকেয়া সদস্য'):l('One member','একজন সদস্য')}</Text></TouchableOpacity>)}</View>
    {target==='single'&&<View style={s.card}><TextInput placeholder={l('Search name or member code','নাম বা সদস্য আইডি খুঁজুন')} value={query} onChangeText={setQuery} style={[s.text,{borderBottomWidth:1,borderBottomColor:colors.border,padding:12}]} />
      {state.members.filter(m=>`${m.name} ${m.code}`.toLowerCase().includes(query.toLowerCase())).map(m=><TouchableOpacity key={m.id} onPress={()=>setMemberId(m.id)} style={s.row}><Text style={s.text}>{m.name} · {m.code}</Text><Text style={{color:colors.primary}}>{memberId===m.id?'✓':''}</Text></TouchableOpacity>)}
    </View>}
    <View style={s.card}><Text style={s.title}>{l('Selected balances','নির্বাচিত হিসাব')}</Text><Text style={s.text}>{members.length} {l('members','জন সদস্য')}</Text><View style={s.row}><Text style={s.text}>{l('Total savings','মোট সঞ্চয়')}</Text><Text style={s.value}>{formatMoney(total)}</Text></View><View style={s.row}><Text style={s.text}>{l('Outstanding dues','মোট বকেয়া')}</Text><Text style={[s.value,{color:colors.warning}]}>{formatMoney(due)}</Text></View></View>
    <TouchableOpacity disabled={busy} style={[s.button,busy&&{opacity:0.5}]} onPress={()=>exportStatement('PDF')}><Text style={s.buttonText}>{busy?l('Preparing…','প্রস্তুত হচ্ছে…'):l('Download / Share PDF','PDF ডাউনলোড / শেয়ার')}</Text></TouchableOpacity>
    <TouchableOpacity disabled={busy} style={[s.button,{backgroundColor:colors.text}]} onPress={()=>exportStatement('CSV')}><Text style={s.buttonText}>{l('Export CSV for Excel','Excel-এর জন্য CSV এক্সপোর্ট')}</Text></TouchableOpacity>
    {members.length===0&&<Text style={s.text}>{l('No members match this selection.','এই তালিকায় কোনো সদস্য নেই।')}</Text>}
    {members.map(m=><View key={m.id} style={s.card}><Text style={s.title}>{m.name}</Text><Text style={s.text}>{m.code} · {m.phone}</Text><View style={s.row}><Text style={s.text}>{l('Savings','সঞ্চয়')}</Text><Text style={s.title}>{formatMoney(m.totalDeposit)}</Text></View><View style={s.row}><Text style={s.text}>{l('Dues','বকেয়া')}</Text><Text style={s.title}>{formatMoney(m.dueAmount)}</Text></View></View>)}
  </Page>;
}
