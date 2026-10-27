import React,{useEffect,useState} from 'react';
import {View,Text,FlatList,Pressable,StyleSheet,Alert,ScrollView} from 'react-native';
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
  const top=<View>
    {!scoped?<View style={s.top}>
      <Pressable accessibilityRole="button" style={s.month} onPress={()=>setPicker(true)}><Ionicons name="calendar-outline" size={16} color={colors.primary}/><Text style={s.monthText}>{monthLabel}</Text><Ionicons name="chevron-down" size={16} color={colors.textSecondary}/></Pressable>
      <View style={s.totals}>
        <View style={s.total}><Text style={s.tLabel} numberOfLines={1}>{l('In','জমা ও আয়')}</Text><Text style={[s.tValue,{color:colors.primary}]} numberOfLines={1} adjustsFontSizeToFit>{all?money(inSum):'…'}</Text></View>
        <View style={[s.total,s.totalLine]}><Text style={s.tLabel} numberOfLines={1}>{l('Out','খরচ ও ফেরত')}</Text><Text style={[s.tValue,{color:colors.warning}]} numberOfLines={1} adjustsFontSizeToFit>{all?money(outSum):'…'}</Text></View>
        <View style={[s.total,s.totalLine]}><Text style={s.tLabel} numberOfLines={1}>{l('Net','নিট')}</Text><Text style={s.tValue} numberOfLines={1} adjustsFontSizeToFit>{all?money(inSum-outSum):'…'}</Text></View>
      </View>
    </View>:null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipBar}>
      {filters.map(([key,label])=><Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:kind===key}} onPress={()=>setKind(key)} style={[s.chip,kind===key&&s.chipOn]}><Text style={[s.chipText,kind===key&&s.chipTextOn]}>{label}</Text></Pressable>)}
    </ScrollView>
  </View>;
  return <SafeAreaView edges={['top','left','right']} style={s.root}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={l('Back','ফিরুন')} onPress={()=>safeBack(router,'/(admin)/finance')} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={colors.text}/></Pressable>
      <Text style={s.title} numberOfLines={1}>{l('Khata','লেনদেনের খাতা')}</Text>
      <View style={s.iconBtn}>{!scoped?<Pressable accessibilityRole="button" accessibilityLabel={l('Download PDF','PDF ডাউনলোড')} disabled={!all||busy} onPress={pdf} hitSlop={8}><Ionicons name="download-outline" size={22} color={all?colors.text:colors.textSecondary}/></Pressable>:null}</View>
    </View>
    <FlatList data={rows} keyExtractor={t=>t.id} initialNumToRender={15} windowSize={7} contentContainerStyle={s.list}
      ListHeaderComponent={top}
      renderItem={({item:t,index})=><View style={[s.cell,index===0&&s.cellFirst,index===rows.length-1&&s.cellLast,index>0&&s.cellLine]}>
        <EntryRow entry={t} onPress={()=>t.type==='withdrawal'?router.push({pathname:'/(admin)/withdrawals',params:{requestId:t.id}}):t.projectId?router.push(`/(admin)/project/${t.projectId}` as any):setOpen(t)}/></View>}
      ListEmptyComponent={!ledger.loading&&!ledger.error?<View style={s.empty}><View style={s.emptyIcon}><Ionicons name="book-outline" size={26} color={colors.primary}/></View><Text style={s.emptyText}>{scoped?l('No entries yet.','এখনো কোনো এন্ট্রি নেই।'):l(`No entries in ${monthLabel}. Tap + on the home screen to add one.`,`${monthLabel} মাসে কোনো এন্ট্রি নেই। হোমের + চেপে এন্ট্রি দিন।`)}</Text></View>:null}
      ListFooterComponent={<View style={s.footer}><LedgerPaging {...ledger}/></View>}/>
    <SelectModal visible={picker} title={l('Select month','মাস নির্বাচন')} value={month} options={periods.map(p=>({value:p.key,label:isBengali?p.bn:p.en}))} onSelect={setMonth} onClose={()=>setPicker(false)}/>
    <EntryActions entry={open} onClose={()=>{setOpen(null);ledger.reload();}}/>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingTop:10,paddingBottom:8},
  iconBtn:{width:40,height:40,alignItems:'center',justifyContent:'center'},
  title:{flex:1,textAlign:'center',fontFamily:typography.fontFamily.bold,fontSize:typography.size.title,lineHeight:typography.lineHeight.title,color:colors.text},
  top:{gap:10,marginBottom:4},
  month:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',backgroundColor:colors.surface,borderRadius:12,paddingHorizontal:12,paddingVertical:7,borderWidth:1,borderColor:colors.border},
  monthText:{fontFamily:typography.fontFamily.semiBold,fontSize:14,color:colors.text},
  totals:{flexDirection:'row',backgroundColor:colors.surface,borderRadius:16,paddingVertical:14,shadowColor:colors.shadowColor,shadowOffset:{width:0,height:2},shadowOpacity:0.04,shadowRadius:8,elevation:2},
  total:{flex:1,alignItems:'center',paddingHorizontal:6},totalLine:{borderLeftWidth:1,borderLeftColor:colors.border},
  tLabel:{fontFamily:typography.fontFamily.regular,fontSize:12,lineHeight:18,color:colors.textSecondary},
  tValue:{fontFamily:typography.fontFamily.bold,fontSize:16,lineHeight:24,color:colors.text},
  chipBar:{flexGrow:0,marginHorizontal:-16,marginBottom:6},
  chips:{paddingHorizontal:16,gap:8,paddingVertical:8,alignItems:'center'},
  chip:{paddingHorizontal:14,paddingVertical:7,borderRadius:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  chipOn:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{fontFamily:typography.fontFamily.medium,fontSize:13,lineHeight:19,color:colors.text},chipTextOn:{color:colors.surface,fontFamily:typography.fontFamily.semiBold},
  list:{paddingHorizontal:16,paddingBottom:32},
  cell:{backgroundColor:colors.surface,paddingHorizontal:14},
  cellFirst:{borderTopLeftRadius:16,borderTopRightRadius:16,paddingTop:4},
  cellLast:{borderBottomLeftRadius:16,borderBottomRightRadius:16,paddingBottom:4},
  cellLine:{borderTopWidth:1,borderTopColor:colors.border},
  footer:{paddingTop:12,gap:8},
  empty:{alignItems:'center',gap:10,paddingVertical:36,paddingHorizontal:16},
  emptyIcon:{width:56,height:56,borderRadius:28,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
  emptyText:{fontFamily:typography.fontFamily.regular,fontSize:14,lineHeight:22,color:colors.textSecondary,textAlign:'center',maxWidth:280},
});
