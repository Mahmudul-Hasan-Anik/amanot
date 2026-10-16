import React,{useMemo,useState} from 'react';
import {View,Text,FlatList,Pressable,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Button,Card,FilterChip,Input} from '../components';
import {useSomitiStore} from '../store/somitiStore';
import {useAuthStore} from '../features/auth/authStore';
import {useLanguage} from '../i18n/useLanguage';
import {investmentSchedule,roundMoney} from '../lib/investment';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';

export default function Investments(){
  const router=useRouter();const {l,formatMoneyPrecise:formatMoney,formatNum}=useLanguage();
  const projects=useSomitiStore(s=>s.projects),role=useAuthStore(s=>s.actualRole);
  const proposals=useSomitiStore(s=>s.investmentProposals);
  const canCreate=role==='admin'||role==='super_admin';
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const items=useMemo(()=>projects.map(p=>{
    const schedule=p.contract?investmentSchedule(p.contract,p.returnedAmount):[];
    const overdue=roundMoney(schedule.filter(s=>s.overdue).reduce((sum,s)=>sum+s.remaining,0));
    const next=schedule.find(s=>s.remaining>0);
    return {p,overdue,next,status:p.status==='completed'?'settled':overdue>0||p.status==='delayed'?'overdue':'active'};
  }),[projects]);
  const visible=items.filter(({p,status})=>(filter==='all'||filter===status)&&[p.name,p.contract?.number,p.contract?.phone,p.contract?.purpose,p.type].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const principal=projects.reduce((s,p)=>s+p.remainingAmount,0),profit=projects.reduce((s,p)=>s+p.netProfit,0),overdue=items.reduce((s,i)=>s+i.overdue,0);
  return <SafeAreaView edges={['top','left','right']} style={styles.root}>
    <View style={styles.header}><Text style={styles.title}>{l('Investments','বিনিয়োগ')}</Text><Text style={styles.muted}>{formatNum(projects.length)} {l('contracts and legacy investments','টি চুক্তি ও পুরোনো বিনিয়োগ')}</Text></View>
    <FlatList data={visible} keyExtractor={item=>item.p.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        {proposals.filter(p=>p.status!=='disbursed').length?<Text style={styles.name}>{l('Proposals and approvals','প্রস্তাব ও অনুমোদন')}</Text>:null}
        {proposals.filter(p=>p.status!=='disbursed'&&[p.payload.recipientName,p.payload.phone].join(' ').toLowerCase().includes(query.trim().toLowerCase())).map(p=><Pressable key={p.id} onPress={()=>router.push(('/(admin)/investment/proposal/'+p.id) as any)}><Card><Text style={styles.name}>{p.payload.recipientName}</Text><Text style={styles.value}>{formatMoney(p.payload.principal)}</Text><Text style={styles.muted}>{p.status==='submitted'?l('Awaiting approval','অনুমোদনের অপেক্ষায়'):p.status==='approved'?l('Approved · awaiting disbursement','অনুমোদিত · টাকা প্রদান বাকি'):l('Rejected','প্রত্যাখ্যাত')}</Text><Text style={styles.muted}>{l('No money deducted','কোনো টাকা কাটা হয়নি')}</Text></Card></Pressable>)}

        <Card><Text style={styles.muted}>{l('Principal outstanding','বাইরে থাকা মূলধন')}</Text><Text style={styles.amount}>{formatMoney(principal)}</Text>
          <View style={styles.row}><View style={{flex:1}}><Text style={styles.muted}>{l('Recognized profit','হিসাবে গণনাকৃত প্রফিট')}</Text><Text style={styles.value}>{formatMoney(profit)}</Text></View>
          <View style={{flex:1}}><Text style={styles.muted}>{l('Overdue installments','মেয়াদোত্তীর্ণ কিস্তি')}</Text><Text style={[styles.value,{color:colors.warning}]}>{formatMoney(overdue)}</Text></View></View>
        </Card>
        <Input value={query} onChangeText={setQuery} placeholder={l('Search name, phone or contract…','নাম, ফোন বা চুক্তি দিয়ে খুঁজুন…')} accessibilityLabel={l('Search investments','বিনিয়োগ খুঁজুন')}/>
        <View style={styles.filters}>{[['all',l('All','সব')],['active',l('Active','চলমান')],['overdue',l('Overdue','বকেয়া')],['settled',l('Settled','পরিশোধিত')]].map(([key,label])=><FilterChip key={key} label={label} selected={filter===key} onPress={()=>setFilter(key)}/>)}</View>
      </>}
      ListEmptyComponent={<Text style={[styles.muted,{textAlign:'center',paddingVertical:40}]}>{l('No investments found','কোনো বিনিয়োগ পাওয়া যায়নি')}</Text>}
      renderItem={({item:{p,overdue,next,status}})=><Pressable accessibilityRole="button" onPress={()=>router.push(`/(admin)/project/${p.id}` as any)}>
        <Card><View style={styles.row}><Text style={styles.name}>{p.name}</Text><Text style={[styles.badge,status==='overdue'&&{color:colors.warning,backgroundColor:colors.warningSoft}]}>{status==='settled'?l('Settled','পরিশোধিত'):status==='overdue'?l('Overdue','বকেয়া'):l('Active','চলমান')}</Text></View>
          <Text style={styles.muted}>{p.contract?`${p.contract.number} · ${p.contract.memberId?l('Member','সদস্য'):l('External recipient','বাইরের ব্যক্তি')}`:l('Previous investment','পুরোনো বিনিয়োগ')}</Text>
          <View style={styles.row}><Text style={styles.body}>{l('Disbursed','প্রদান')}: {formatMoney(p.investedAmount)}</Text><Text style={styles.body}>{l('Collected','আদায়')}: {formatMoney(p.returnedAmount)}</Text></View>
          {p.contract?<><Text style={styles.value}>{l('Outstanding','মোট বাকি')}: {formatMoney(Math.max(0,p.contract.principal+p.contract.profitAmount-p.returnedAmount))}</Text>
          {next?<Text style={styles.muted}>{l('Next installment','পরবর্তী কিস্তি')}: {next.dueDate} · {formatMoney(next.remaining)}</Text>:null}
          {overdue>0?<Text style={[styles.body,{color:colors.warning}]}>{l('Overdue installments','মেয়াদোত্তীর্ণ কিস্তি')}: {formatMoney(overdue)}</Text>:null}</>:<Text style={styles.value}>{l('Principal outstanding','মূলধন বাকি')}: {formatMoney(p.remainingAmount)}</Text>}
        </Card>
      </Pressable>}/>
    {canCreate?<View style={styles.footer}><Button testID="new-investment" title={l('+ New investment','+ নতুন বিনিয়োগ')} onPress={()=>router.push('/(admin)/investment/new' as any)}/></View>:null}
  </SafeAreaView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},header:{padding:20,paddingBottom:8},title:{fontFamily:typography.fontFamily.bold,fontSize:26,color:colors.text},content:{padding:16,paddingBottom:20},muted:{fontFamily:typography.fontFamily.regular,fontSize:13,color:colors.textSecondary,lineHeight:22},body:{fontFamily:typography.fontFamily.regular,fontSize:14,color:colors.text,flexShrink:1},name:{fontFamily:typography.fontFamily.bold,fontSize:18,color:colors.text,flex:1},value:{fontFamily:typography.fontFamily.semiBold,fontSize:16,color:colors.primary,marginVertical:4},amount:{fontFamily:typography.fontFamily.bold,fontSize:30,color:colors.primary,marginVertical:8},row:{flexDirection:'row',justifyContent:'space-between',gap:12,alignItems:'center',marginVertical:8},filters:{flexDirection:'row',gap:6,flexWrap:'wrap',marginBottom:16},badge:{fontFamily:typography.fontFamily.medium,fontSize:12,color:colors.primary,backgroundColor:colors.primarySoft,paddingVertical:4,paddingHorizontal:10,borderRadius:16},footer:{padding:12,borderTopWidth:1,borderTopColor:colors.border,backgroundColor:colors.bg}});
