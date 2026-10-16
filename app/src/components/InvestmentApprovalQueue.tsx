import React from 'react';
import {Text,View,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {useSomitiStore} from '../store/somitiStore';
import {useLanguage} from '../i18n/useLanguage';
import {colors} from '../theme/colors';
export function InvestmentApprovalQueue({tab='pending',hideEmpty=false}:{tab?:'pending'|'approved'|'rejected';hideEmpty?:boolean}){
 const router=useRouter(),{l,formatMoney,formatNum}=useLanguage();
 const rows=useSomitiStore(s=>s.investmentProposals).filter(p=>tab==='pending'?['submitted','approved'].includes(p.status):tab==='approved'?p.status==='disbursed':['rejected','withdrawn'].includes(p.status));
 if(hideEmpty&&!rows.length)return null;
 return <View style={{padding:16,gap:10}}><Text style={{fontWeight:'bold',color:colors.text}}>{l('Investment requests','বিনিয়োগের অনুরোধ')} · {formatNum(rows.length)}</Text>
 {rows.length===0?<Text style={{color:colors.textSecondary}}>{l('No matching requests','কোনো অনুরোধ নেই')}</Text>:rows.map(p=><Pressable key={p.id} accessibilityRole="button" onPress={()=>router.push(('/(admin)/investment/proposal/'+p.id) as any)} style={{padding:14,borderRadius:12,backgroundColor:colors.surface}}><Text style={{color:colors.text}}>{p.payload.recipientName} · {formatMoney(p.payload.principal)}</Text><Text style={{color:colors.primary}}>{p.status==='submitted'?l('Approval needed','অনুমোদন প্রয়োজন'):p.status==='approved'?l('Money payment pending','টাকা প্রদান বাকি'):p.status==='withdrawn'?l('Withdrawn','প্রত্যাহৃত'):p.status==='rejected'?l('Rejected','প্রত্যাখ্যাত'):l('Disbursed','প্রদান সম্পন্ন')}</Text></Pressable>)}
 </View>;
}
