import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { Member } from '../mocks/mockData';
import { Withdrawal, savingsBreakdown } from '../lib/withdrawal';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
/** Savings in khata terms. `showProfit=false` hides profit (member app, society setting). */
export function MemberBalanceSummary({member,requests,showProfit=true}:{member:Member;requests:Withdrawal[];showProfit?:boolean}){
 const {l,formatMoneyPrecise:money}=useLanguage(),b=savingsBreakdown(member,requests);
 const rows:[[string,string],number][]=showProfit?[
  [['Deposited','মোট জমা'],b.paidIn],[['Withdrawn','মোট উত্তোলন'],b.withdrawn],[['Profit','মুনাফা'],b.profit],
 ]:[[['Deposited','মোট জমা'],b.paidIn],[['Withdrawn','মোট উত্তোলন'],b.withdrawn]];
 const balance=showProfit?b.balance:Math.max(0,Math.round((b.paidIn-b.withdrawn)*100)/100);
 return <View style={st.hero}>
  <Text style={st.label}>{l('Savings now','এখন সঞ্চয়')}</Text>
  <Text style={st.value}>{money(balance)}</Text>
  <View style={st.cols}>{rows.map(([label,value],i)=><View key={label[0]} style={[st.col,i>0&&st.colLine]}>
   <Text style={st.colLabel} numberOfLines={1}>{l(...label)}</Text><Text style={st.colValue} numberOfLines={1} adjustsFontSizeToFit>{money(value)}</Text></View>)}</View>
 </View>;
}
const st=StyleSheet.create({
 hero:{backgroundColor:colors.primary,borderRadius:20,padding:20,marginBottom:12,shadowColor:colors.primary,shadowOffset:{width:0,height:6},shadowOpacity:0.18,shadowRadius:12,elevation:4},
 label:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.subhead,lineHeight:typography.lineHeight.subhead,color:colors.surface,opacity:0.9},
 value:{...typography.displayAmount,color:colors.surface,marginTop:6,marginBottom:14},
 cols:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.12)',borderRadius:14,paddingVertical:10},
 col:{flex:1,alignItems:'center',paddingHorizontal:6},colLine:{borderLeftWidth:1,borderLeftColor:'rgba(255,255,255,0.2)'},
 colLabel:{fontFamily:typography.fontFamily.regular,fontSize:12,lineHeight:18,color:colors.surface,opacity:0.85},
 colValue:{fontFamily:typography.fontFamily.bold,fontSize:15,lineHeight:22,color:colors.surface},
});
