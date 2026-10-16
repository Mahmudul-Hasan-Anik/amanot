import React from 'react';
import {Text,View,Pressable,StyleSheet} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Card} from './Card';
import {useRouter} from 'expo-router';
import {useSomitiStore} from '../store/somitiStore';
import {useLanguage} from '../i18n/useLanguage';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
export function InvestmentApprovalQueue({tab='pending',hideEmpty=false,compact=false}:{tab?:'pending'|'approved'|'rejected';hideEmpty?:boolean;compact?:boolean}){
 const router=useRouter(),{l,formatMoney,formatNum}=useLanguage();
 const rows=useSomitiStore(s=>s.investmentProposals).filter(p=>tab==='pending'?['submitted','approved'].includes(p.status):tab==='approved'?p.status==='disbursed':['rejected','withdrawn'].includes(p.status));
 if(hideEmpty&&!rows.length)return null;
 const visible=compact?rows.slice(0,3):rows;
 return <Card style={styles.card}>
  <View style={styles.header}>
   <View style={styles.heading}><Ionicons name="briefcase-outline" size={19} color={colors.primary}/><Text accessibilityRole="header" style={styles.title}>{l('Investment requests','বিনিয়োগের অনুরোধ')}</Text><View style={styles.count}><Text style={styles.countText}>{formatNum(rows.length)}</Text></View></View>
   {compact&&rows.length>0&&<Pressable accessibilityRole="button" accessibilityLabel={l('View all investment requests','সব বিনিয়োগের অনুরোধ দেখুন')} onPress={()=>router.push('/(admin)/approvals')} hitSlop={8}><Text style={styles.link}>{l('View all','সব দেখুন')}</Text></Pressable>}
  </View>
  {!rows.length?<Text style={styles.empty}>{l('No investment requests in this list','এই তালিকায় বিনিয়োগের কোনো অনুরোধ নেই')}</Text>:visible.map((p,index)=>{
   const pending=['submitted','approved'].includes(p.status);
   const label=p.status==='submitted'?l('Approval needed','অনুমোদন প্রয়োজন'):p.status==='approved'?l('Payment pending','টাকা প্রদান বাকি'):p.status==='withdrawn'?l('Withdrawn','প্রত্যাহৃত'):p.status==='rejected'?l('Rejected','প্রত্যাখ্যাত'):l('Disbursed','প্রদান সম্পন্ন');
   return <Pressable key={p.id} testID={'investment-request-'+p.id} accessibilityRole="button" accessibilityLabel={`${p.payload.recipientName}, ${formatMoney(p.payload.principal)}, ${label}`} onPress={()=>router.push(('/(admin)/investment/proposal/'+p.id) as any)} style={({pressed})=>[styles.request,index>0&&styles.divider,pressed&&styles.pressed]}>
    <View style={styles.row}><Text style={styles.name}>{p.payload.recipientName}</Text><Ionicons name="chevron-forward" size={18} color={colors.textSecondary}/></View>
    <Text style={styles.amount}>{formatMoney(p.payload.principal)}</Text>
    <View style={styles.footer}><View style={[styles.status,{backgroundColor:pending?colors.warningSoft:colors.primarySoft}]}><Text style={[styles.statusText,{color:pending?colors.warning:colors.primary}]}>{label}</Text></View><Text style={styles.link}>{l('Details','বিস্তারিত')}</Text></View>
   </Pressable>;
  })}
 </Card>;
}
const styles=StyleSheet.create({
 card:{borderRadius:20,marginBottom:16},
 header:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:4},
 heading:{flexDirection:'row',alignItems:'center',flex:1,minWidth:0,gap:8},
 title:{flexShrink:1,fontFamily:typography.fontFamily.bold,fontSize:16,lineHeight:24,color:colors.text},
 count:{backgroundColor:colors.primarySoft,borderRadius:20,minWidth:24,paddingHorizontal:6,alignItems:'center'},
 countText:{fontFamily:typography.fontFamily.semiBold,fontSize:13,lineHeight:22,color:colors.primary},
 request:{paddingTop:14,paddingBottom:4,borderRadius:8},
 divider:{borderTopWidth:1,borderTopColor:colors.borderLight,marginTop:12},
 pressed:{backgroundColor:colors.surfaceMuted},
 row:{flexDirection:'row',alignItems:'center',gap:10},
 name:{flex:1,minWidth:0,fontFamily:typography.fontFamily.semiBold,fontSize:16,lineHeight:24,color:colors.text},
 amount:{fontFamily:typography.fontFamily.bold,fontSize:22,lineHeight:30,color:colors.text,marginTop:4,marginBottom:10},
 footer:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10,justifyContent:'space-between'},
 status:{borderRadius:20,paddingVertical:4,paddingHorizontal:10,maxWidth:'100%'},
 statusText:{fontFamily:typography.fontFamily.medium,fontSize:13,lineHeight:20},
 link:{fontFamily:typography.fontFamily.semiBold,fontSize:13,lineHeight:22,color:colors.primary},
 empty:{fontFamily:typography.fontFamily.regular,fontSize:14,lineHeight:22,color:colors.textSecondary,paddingVertical:20,textAlign:'center'},
});
