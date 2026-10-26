import React,{useState} from 'react';
import {View,Text,TouchableOpacity,FlatList,Pressable} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useLedgerPage} from '../../src/hooks/useLedgerPage';
import {LedgerPaging} from '../../src/components/LedgerPaging';
import {SelectModal} from '../../src/components/SelectModal';
import {EntryActions,EntryRow} from '../../src/components/EntryActions';
import {pageStyles as s} from '../../src/components/Page';
import {useLanguage} from '../../src/i18n/useLanguage';
import {monthRange} from '../../src/lib/ledger';
import {entryDisplay,EntryKind} from '../../src/lib/entryDisplay';
import {recentMonths} from '../../src/lib/months';
import {colors} from '../../src/theme/colors';
import {safeBack} from '../../src/utils/navigation';
import type {Transaction} from '../../src/store/somitiStore';

/** The khata: every entry with who paid and what for. Tap an entry to cancel or edit it. */
export default function LedgerScreen(){
  const router=useRouter();const params=useLocalSearchParams<{month?:string;memberId?:string;projectId?:string}>();
  const {l,isBengali}=useLanguage();const periods=recentMonths(12);
  const [month,setMonth]=useState(periods.some(p=>p.key===params.month)?params.month!:periods[0].key);
  const [picker,setPicker]=useState(false),[kind,setKind]=useState<'all'|EntryKind>('all'),[open,setOpen]=useState<Transaction|null>(null);
  const scoped=!!(params.memberId||params.projectId);
  const ledger=useLedgerPage(scoped?{memberId:params.memberId,projectId:params.projectId}:monthRange(month));
  const filters:[('all'|EntryKind),string][]=[['all',l('All','সব')],['deposit',l('Deposits','জমা')],['withdrawal',l('Returns','ফেরত')],['installment',l('Installments','কিস্তি')],['expense',l('Expenses','খরচ')],['fund',l('Money added','টাকা যোগ')]];
  const rows=ledger.rows.filter(t=>t.type!=='reversal'&&(kind==='all'||entryDisplay(t,l,isBengali).kind===kind));
  return <SafeAreaView style={{flex:1,backgroundColor:colors.bg}}>
    <View style={[s.row,{paddingHorizontal:20}]}>
      <TouchableOpacity accessibilityRole="button" onPress={()=>safeBack(router,'/(admin)/finance')}><Text style={s.text}>{l('Back','ফিরুন')}</Text></TouchableOpacity>
      <Text style={s.title}>{l('Khata','লেনদেনের খাতা')}</Text>
    </View>
    {!scoped&&<TouchableOpacity accessibilityRole="button" style={[s.chip,{alignSelf:'flex-start',marginHorizontal:20,marginBottom:8}]} onPress={()=>setPicker(true)}><Text style={s.text}>{isBengali?periods.find(p=>p.key===month)?.bn:periods.find(p=>p.key===month)?.en} ▾</Text></TouchableOpacity>}
    <View style={[s.chips,{paddingHorizontal:20,marginBottom:4}]}>{filters.map(([key,label])=><Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:kind===key}} onPress={()=>setKind(key)} style={[s.chip,{paddingVertical:6,paddingHorizontal:12},kind===key&&{backgroundColor:colors.primarySoft}]}><Text style={[s.text,{fontSize:14},kind===key&&{color:colors.primary}]}>{label}</Text></Pressable>)}</View>
    <FlatList data={rows} keyExtractor={t=>t.id} initialNumToRender={15} windowSize={7} contentContainerStyle={{paddingHorizontal:20,paddingBottom:24}}
      ItemSeparatorComponent={()=><View style={{height:1,backgroundColor:colors.borderLight}}/>}
      renderItem={({item:t})=><EntryRow entry={t} onPress={()=>t.type==='withdrawal'?router.push({pathname:'/(admin)/withdrawals',params:{requestId:t.id}}):t.projectId?router.push(`/(admin)/project/${t.projectId}` as any):setOpen(t)}/>}
      ListEmptyComponent={!ledger.loading&&!ledger.error?<Text style={s.text}>{l('No entries in this selection','এই সময়ে কোনো এন্ট্রি নেই')}</Text>:null}
      ListFooterComponent={<LedgerPaging {...ledger}/>}/>
    <SelectModal visible={picker} title={l('Select month','মাস নির্বাচন')} value={month} options={periods.map(p=>({value:p.key,label:isBengali?p.bn:p.en}))} onSelect={setMonth} onClose={()=>setPicker(false)}/>
    <EntryActions entry={open} onClose={()=>{setOpen(null);ledger.reload();}}/>
  </SafeAreaView>;
}
