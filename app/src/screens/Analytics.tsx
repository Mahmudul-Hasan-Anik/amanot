import React,{useState} from 'react';
import {View,Text,TouchableOpacity} from 'react-native';
import {useSomitiStore,REMOTE} from '../store/somitiStore';
import {useLanguage} from '../i18n/useLanguage';
import {Page,pageStyles as s} from '../components/Page';
import {recentMonths} from '../lib/months';
import {colors} from '../theme/colors';

export default function Analytics(){
  const {members,projects,transactions,somitiInfo,ledgerSummary}=useSomitiStore();const {l,formatMoney,formatNum,isBengali}=useLanguage();const [period,setPeriod]=useState(6);
  const months=recentMonths(period).reverse();
  const target=members.filter(m=>m.status!=='inactive').reduce((sum,m)=>sum+m.monthlyAmount,0);
  const series=months.map(m=>{const collected=REMOTE?Number(ledgerSummary.months.find(row=>row.month===m.key)?.deposits||0):transactions.filter(t=>t.type==='deposit'&&t.dateISO?.startsWith(m.key)).reduce((sum,t)=>sum+t.amount,0);return {...m,collected,pct:target>0?Math.min(100,Math.round(collected/target*100)):0};});
  const cutoff=months[0].key;
  const tx=transactions.filter(t=>t.dateISO&&t.dateISO.slice(0,7)>=cutoff);
  const selected=ledgerSummary.months.filter(row=>months.some(m=>m.key===row.month));
  const deposits=REMOTE?selected.reduce((sum,m)=>sum+Number(m.deposits),0):tx.filter(t=>t.type==='deposit').reduce((sum,t)=>sum+t.amount,0),expenses=REMOTE?selected.reduce((sum,m)=>sum+Number(m.expenses),0):tx.filter(t=>t.type==='expense').reduce((sum,t)=>sum+t.amount,0);
  return <Page title={l('Analytics','অ্যানালিটিক্স')} subtitle={l('Based on saved transactions','সংরক্ষিত লেনদেন থেকে হিসাব')}>
    <View style={s.chips}>{[3,6,12].map(n=><TouchableOpacity key={n} onPress={()=>setPeriod(n)} style={[s.chip,period===n&&{backgroundColor:colors.primary}]}><Text style={[s.text,period===n&&{color:colors.surface}]}>{formatNum(n)} {l('months','মাস')}</Text></TouchableOpacity>)}</View>
    <View style={s.card}><Text style={s.text}>{l('Current total fund','বর্তমান মোট তহবিল')}</Text><Text style={s.value}>{formatMoney(somitiInfo.totalFund)}</Text><View style={s.row}><Text style={s.text}>{l('Cash and bank','নগদ ও ব্যাংক')}</Text><Text style={s.title}>{formatMoney(somitiInfo.cashAndBank)}</Text></View></View>
    <View style={s.card}><Text style={s.title}>{l('Collection by month','মাসভিত্তিক আদায়')}</Text><Text style={s.text}>{l('Rates compared with current monthly target','হার বর্তমান মাসিক লক্ষ্যমাত্রার তুলনায়')}</Text>{series.map(m=><View key={m.key} style={{marginTop:16}}><View style={s.row}><Text style={s.text}>{isBengali?m.bn:m.en}</Text><Text style={s.title}>{formatMoney(m.collected)} · {formatNum(m.pct)}%</Text></View><View style={{height:8,borderRadius:8,backgroundColor:colors.surfaceMuted}}><View style={{height:8,borderRadius:8,width:`${m.pct}%`,backgroundColor:colors.primary}}/></View></View>)}</View>
    <View style={s.card}><Text style={s.title}>{l('Selected period','নির্বাচিত সময়কাল')}</Text><View style={s.row}><Text style={s.text}>{l('Deposits received','জমা আদায়')}</Text><Text style={s.title}>{formatMoney(deposits)}</Text></View><View style={s.row}><Text style={s.text}>{l('Operating expenses','পরিচালনা ব্যয়')}</Text><Text style={s.title}>{formatMoney(expenses)}</Text></View></View>
    <View style={s.card}><Text style={s.title}>{l('Investment performance','বিনিয়োগের অবস্থা')}</Text>{projects.length===0?<Text style={s.text}>{l('No projects yet','এখনো কোনো প্রজেক্ট নেই')}</Text>:projects.map(p=><View key={p.id} style={s.row}><View style={{flex:1}}><Text style={s.title}>{p.name}</Text><Text style={s.text}>{l('Capital remaining','অবশিষ্ট বিনিয়োগ')}: {formatMoney(p.remainingAmount)}</Text></View><Text style={[s.title,{color:p.netProfit<0?colors.warning:colors.primary}]}>{formatNum(p.roiPct)}%</Text></View>)}</View>
    <View style={s.card}><Text style={s.title}>{l('Dues to follow up','যাদের বকেয়া আছে')}</Text><Text style={s.value}>{formatMoney(members.reduce((sum,m)=>sum+m.dueAmount,0))}</Text><Text style={s.text}>{formatNum(members.filter(m=>m.dueAmount>0).length)} {l('members','জন সদস্য')}</Text></View>
  </Page>;
}
