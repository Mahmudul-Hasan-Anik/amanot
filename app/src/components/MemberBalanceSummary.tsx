import React from 'react';
import { Text, View } from 'react-native';
import type { Member } from '../mocks/mockData';
import { Withdrawal, savingsBreakdown } from '../lib/withdrawal';
import { useLanguage } from '../i18n/useLanguage';
import { pageStyles as s } from './Page';
export function MemberBalanceSummary({member,requests}:{member:Member;requests:Withdrawal[]}){
 const {l,formatMoneyPrecise:money}=useLanguage(),b=savingsBreakdown(member,requests);
 const rows:[[string,string],number][]=[
  [['Savings paid in','মোট জমা দেওয়া সঞ্চয়'],b.paidIn],[['Net withdrawals','নিট উত্তোলন'],b.withdrawn],
  [['Remaining own savings','অবশিষ্ট নিজের জমা'],b.principal],[['Allocated profit','বণ্টিত লাভ'],b.profit],
  [['Total remaining balance','মোট অবশিষ্ট ব্যালেন্স'],b.balance],[['Reserved for approved requests','অনুমোদিত আবেদনে সংরক্ষিত'],b.reserved],
 ];
 return <View style={s.card}><Text style={s.title}>{l('Savings breakdown','সঞ্চয়ের বিস্তারিত')}</Text>{rows.map(([label,value])=><View key={label[0]} style={s.row}><Text style={[s.text,{flex:1}]}>{l(...label)}</Text><Text style={s.title}>{money(value)}</Text></View>)}
  <Text style={s.text}>{l('Available to withdraw','উত্তোলনযোগ্য জমা')}</Text><Text style={s.value}>{money(b.available)}</Text>
  <Text style={s.text}>{l('Allocated profit is separate and cannot be withdrawn here.','বণ্টিত লাভ আলাদা; এই প্রক্রিয়ায় তা তোলা যায় না।')}</Text>
 </View>;
}
