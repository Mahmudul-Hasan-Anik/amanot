import React,{useEffect,useState} from 'react';
import {View,Text,FlatList,Pressable,StyleSheet,Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useLedgerPage} from '../../src/hooks/useLedgerPage';
import {LedgerPaging} from '../../src/components/LedgerPaging';
import {SelectModal} from '../../src/components/SelectModal';
import {EntryActions,EntryRow} from '../../src/components/EntryActions';
import {useLanguage} from '../../src/i18n/useLanguage';
import {monthRange,signedTransactionAmount} from '../../src/lib/ledger';
import {entryDisplay,EntryKind} from '../../src/lib/entryDisplay';
import {recentMonths} from '../../src/lib/months';
import {fetchTransactionHistory} from '../../src/lib/api';
import {exportReport} from '../../src/utils/reportExport';
import {colors} from '../../src/theme/colors';
import {typography} from '../../src/theme/typography';
import {safeBack} from '../../src/utils/navigation';
import {useSomitiStore,REMOTE,Transaction} from '../../src/store/somitiStore';

/** The khata: every entry with who paid and what for, month totals and a PDF for the meeting. Tap an entry to cancel or edit it. */
export default function LedgerScreen(){
  const router=useRouter();const params=useLocalSearchParams<{month?:string;memberId?:string;projectId?:string}>();
  const {l,isBengali,formatMoneyPrecise:money}=useLanguage();const periods=recentMonths(12);
  const society=useSomitiStore(s=>s.somitiInfo),storeTx=useSomitiStore(s=>s.transactions);
  const [month,setMonth]=useState(periods.some(p=>p.key===params.month)?params.month!:periods[0].key);
  const [picker,setPicker]=useState(false),[kind,setKind]=useState<'all'|EntryKind>('all'),[open,setOpen]=useState<Transaction|null>(null),[busy,setBusy]=useState(false);
  const scoped=!!(params.memberId||params.projectId);
  const range=monthRange(month);
  const ledger=useLedgerPage(scoped?{memberId:params.memberId,projectId:params.projectId}:range);
  // Month totals use the whole month, not just the loaded page.
  const [all,setAll]=useState<Transaction[]|null>(null);
  useEffect(()=>{let live=true;setAll(null);if(scoped)return;
    if(!REMOTE){setAll(storeTx.filter(t=>t.dateISO&&t.dateISO>=range.from&&t.dateISO<range.to));return;}
    fetchTransactionHistory(range).then(r=>{if(live)setAll(r);},()=>{});return()=>{live=false;};},[month,scoped,storeTx.length]);// eslint-disable-line react-hooks/exhaustive-deps
  const effective=(all||[]).filter(t=>t.type!=='reversal'&&!t.voided);
  const inSum=effective.reduce((s,t)=>s+Math.max(0,signedTransactionAmount(t)),0),outSum=effective.reduce((s,t)=>s+Math.max(0,-signedTransactionAmount(t)),0);
  const filters:[('all'|EntryKind),string][]=[['all',l('All','সব')],['deposit',l('Deposits','জমা')],['withdrawal',l('Returns','ফেরত')],['installment',l('Installments','কিস্তি')],['expense',l('Expenses','খরচ')],['fund',l('Money added','টাকা যোগ')]];
  const rows=ledger.rows.filter(t=>t.type!=='reversal'&&(kind==='all'||entryDisplay(t,l,isBengali).kind===kind));
  const monthLabel=isBengali?periods.find(p=>p.key===month)?.bn:periods.find(p=>p.key===month)?.en;
  const pdf=async()=>{
    if(!all||busy)return;setBusy(true);
    try{await exportReport({language:isBengali?'bn':'en',title:l(`Khata ${monthLabel}`,`মাসিক খাতা ${monthLabel}`),columns:[l('Date','তারিখ'),l('Name','নাম'),l('Details','বিবরণ'),l('In','জমা/আয়'),l('Out','খরচ/ফেরত')],
      rows:[...[...effective].sort((a,b)=>(a.dateISO||'').localeCompare(b.dateISO||'')).map(t=>{const d=entryDisplay(t,l,isBengali),v=signedTransactionAmount(t);return [t.dateISO||t.date,d.title,d.detail,v>0?v:'',v<0?-v:''];}),
        [l('Total','মোট'),'','',inSum,outSum],[l('Net','নিট'),'','',inSum-outSum,'']]},society.name,month,'PDF');}
    catch(e:any){Alert.alert(l('Export failed','ডাউনলোড ব্যর্থ'),e.message);}finally{setBusy(false);}
  };
  return <SafeAreaView style={s.root}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={l('Back','ফিরুন')} onPress={()=>safeBack(router,'/(admin)/finance')} style={{padding:8}}><Ionicons name="arrow-back" size={24} color={colors.text}/></Pressable>
      <Text style={s.title}>{l('Khata','লেনদেনের খাতা')}</Text>
      {!scoped?<Pressable accessibilityRole="button" accessibilityLabel={l('Download PDF','PDF ডাউনলোড')} disabled={!all||busy} onPress={pdf} style={{padding:8}}><Ionicons name="download-outline" size={22} color={all?colors.primary:colors.textSecondary}/></Pressable>:null}
    </View>
    {!scoped?<View style={s.top}>
      <Pressable accessibilityRole="button" style={s.month} onPress={()=>setPicker(true)}><Ionicons name="calendar-outline" size={16} color={colors.primary}/><Text style={s.monthText}>{monthLabel}</Text><Ionicons name="chevron-down" size={16} color={colors.textSecondary}/></Pressable>
      <View style={s.totals}>
        <View style={s.total}><Text style={s.tLabel}>{l('In','জমা ও আয়')}</Text><Text style={[s.tValue,{color:colors.primary}]}>{all?money(inSum):'…'}</Text></View>
        <View style={s.total}><Text style={s.tLabel}>{l('Out','খরচ ও ফেরত')}</Text><Text style={[s.tValue,{color:colors.warning}]}>{all?money(outSum):'…'}</Text></View>
        <View style={s.total}><Text style={s.tLabel}>{l('Net','নিট')}</Text><Text style={s.tValue}>{all?money(inSum-outSum):'…'}</Text></View>
      </View>
    </View>:null}
    <FlatList horizontal data={filters} keyExtractor={f=>f[0]} showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={s.chips}
      renderItem={({item:[key,label]})=><Pressable accessibilityRole="radio" accessibilityState={{checked:kind===key}} onPress={()=>setKind(key)} style={[s.chip,kind===key&&s.chipOn]}><Text style={[s.chipText,kind===key&&s.chipTextOn]}>{label}</Text></Pressable>}/>
    <FlatList data={rows} keyExtractor={t=>t.id} initialNumToRender={15} windowSize={7} contentContainerStyle={s.list}
      ItemSeparatorComponent={()=><View style={{height:1,backgroundColor:colors.borderLight}}/>}
      renderItem={({item:t})=><EntryRow entry={t} onPress={()=>t.type==='withdrawal'?router.push({pathname:'/(admin)/withdrawals',params:{requestId:t.id}}):t.projectId?router.push(`/(admin)/project/${t.projectId}` as any):setOpen(t)}/>}
      ListEmptyComponent={!ledger.loading&&!ledger.error?<View style={s.empty}><Ionicons name="book-outline" size={28} color={colors.textSecondary}/><Text style={s.emptyText}>{l(`No entries in ${monthLabel}. Tap + on the home screen to add one.`,`${monthLabel} মাসে কোনো এন্ট্রি নেই। হোমের + চেপে এন্ট্রি দিন।`)}</Text></View>:null}
      ListFooterComponent={<LedgerPaging {...ledger}/>}/>
    <SelectModal visible={picker} title={l('Select month','মাস নির্বাচন')} value={month} options={periods.map(p=>({value:p.key,label:isBengali?p.bn:p.en}))} onSelect={setMonth} onClose={()=>setPicker(false)}/>
    <EntryActions entry={open} onClose={()=>{setOpen(null);ledger.reload();}}/>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  header:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:8},
  title:{flex:1,fontFamily:typography.fontFamily.bold,fontSize:19,color:colors.text},
  top:{paddingHorizontal:16,gap:10,marginBottom:6},
  month:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',backgroundColor:colors.surface,borderRadius:12,paddingHorizontal:12,paddingVertical:7,borderWidth:1,borderColor:colors.border},
  monthText:{fontFamily:typography.fontFamily.semiBold,fontSize:14,color:colors.text},
  totals:{flexDirection:'row',backgroundColor:colors.surface,borderRadius:16,padding:12},
  total:{flex:1,alignItems:'center'},
  tLabel:{fontFamily:typography.fontFamily.regular,fontSize:12,color:colors.textSecondary},
  tValue:{fontFamily:typography.fontFamily.bold,fontSize:15,color:colors.text},
  chips:{paddingHorizontal:16,gap:8,paddingVertical:6},
  chip:{paddingHorizontal:12,paddingVertical:6,borderRadius:16,backgroundColor:colors.surfaceMuted},
  chipOn:{backgroundColor:colors.primarySoft},chipText:{fontFamily:typography.fontFamily.medium,fontSize:13,color:colors.textSecondary},chipTextOn:{color:colors.primary},
  list:{paddingHorizontal:16,paddingBottom:24},
  empty:{alignItems:'center',gap:8,paddingVertical:40},emptyText:{fontFamily:typography.fontFamily.regular,fontSize:14,color:colors.textSecondary,textAlign:'center',maxWidth:280},
});
