import React,{useState} from 'react';
import {SafeAreaView,View,Text,TouchableOpacity,FlatList} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useLedgerPage} from '../../src/hooks/useLedgerPage';
import {LedgerPaging} from '../../src/components/LedgerPaging';
import {SelectModal} from '../../src/components/SelectModal';
import {pageStyles as s} from '../../src/components/Page';
import {useLanguage} from '../../src/i18n/useLanguage';
import {monthRange} from '../../src/lib/ledger';
import {recentMonths} from '../../src/lib/months';
import {colors} from '../../src/theme/colors';
import {safeBack} from '../../src/utils/navigation';

export default function LedgerScreen(){
  const router=useRouter();const params=useLocalSearchParams<{month?:string;memberId?:string;projectId?:string}>();
  const {l,isBengali,formatMoney}=useLanguage();const periods=recentMonths(12);
  const [month,setMonth]=useState(periods.some(p=>p.key===params.month)?params.month!:periods[0].key);
  const [picker,setPicker]=useState(false);
  const scoped=!!(params.memberId||params.projectId);
  const ledger=useLedgerPage(scoped?{memberId:params.memberId,projectId:params.projectId}:monthRange(month));
  return <SafeAreaView style={{flex:1,backgroundColor:colors.bg}}>
    <View style={[s.row,{paddingHorizontal:20}]}>
      <TouchableOpacity accessibilityRole="button" onPress={()=>safeBack(router,'/(admin)/finance')}><Text style={s.text}>{l('Back','ফিরুন')}</Text></TouchableOpacity>
      <Text style={s.title}>{l('Transactions','লেনদেন')}</Text>
    </View>
    {!scoped&&<TouchableOpacity accessibilityRole="button" style={[s.chip,{alignSelf:'flex-start',marginHorizontal:20,marginBottom:12}]} onPress={()=>setPicker(true)}><Text style={s.text}>{isBengali?periods.find(p=>p.key===month)?.bn:periods.find(p=>p.key===month)?.en} ▾</Text></TouchableOpacity>}
    <FlatList data={ledger.rows} keyExtractor={t=>t.id} initialNumToRender={10} windowSize={7} contentContainerStyle={{padding:20}}
      renderItem={({item:t})=><TouchableOpacity style={s.card} disabled={t.type!=='deposit'} accessibilityRole={t.type==='deposit'?'button':undefined} onPress={()=>router.push(`/(admin)/receipt/${t.id}`)}>
        <Text style={s.title}>{t.memberName}</Text><Text style={s.text}>{t.receiptNo} · {t.date}</Text>
        <Text style={s.text}>{t.note||t.type} · {t.paymentMethod}</Text><Text style={s.value}>{t.type==='expense'?'−':''}{formatMoney(t.amount)}</Text>
      </TouchableOpacity>}
      ListEmptyComponent={!ledger.loading&&!ledger.error?<Text style={s.text}>{l('No transactions in this selection','এই সময়ে কোনো লেনদেন নেই')}</Text>:null}
      ListFooterComponent={<LedgerPaging {...ledger}/>}/>
    <SelectModal visible={picker} title={l('Select month','মাস নির্বাচন')} value={month} options={periods.map(p=>({value:p.key,label:isBengali?p.bn:p.en}))} onSelect={setMonth} onClose={()=>setPicker(false)}/>
  </SafeAreaView>;
}
