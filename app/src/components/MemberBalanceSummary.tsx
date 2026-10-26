import React from 'react';
import { Text, View } from 'react-native';
import type { Member } from '../mocks/mockData';
import { Withdrawal, savingsBreakdown } from '../lib/withdrawal';
import { useLanguage } from '../i18n/useLanguage';
import { pageStyles as s } from './Page';
/** Savings in khata terms. `showProfit=false` hides profit (member app, society setting). */
export function MemberBalanceSummary({member,requests,showProfit=true}:{member:Member;requests:Withdrawal[];showProfit?:boolean}){
 const {l,formatMoneyPrecise:money}=useLanguage(),b=savingsBreakdown(member,requests);
 const rows:[[string,string],number][]=showProfit?[
  [['Deposited','মোট জমা'],b.paidIn],[['Withdrawn','মোট উত্তোলন'],b.withdrawn],[['Profit received','মুনাফা পেয়েছেন'],b.profit],
 ]:[[['Deposited','মোট জমা'],b.paidIn],[['Withdrawn','মোট উত্তোলন'],b.withdrawn]];
 const balance=showProfit?b.balance:Math.max(0,Math.round((b.paidIn-b.withdrawn)*100)/100);
 return <View style={s.card}><Text style={s.text}>{l('Savings now','এখন সঞ্চয়')}</Text><Text style={s.value}>{money(balance)}</Text>
  {rows.map(([label,value])=><View key={label[0]} style={s.row}><Text style={[s.text,{flex:1}]}>{l(...label)}</Text><Text style={s.title}>{money(value)}</Text></View>)}
 </View>;
}
