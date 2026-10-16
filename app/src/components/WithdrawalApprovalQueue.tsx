import React from 'react';
import {Text,View,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {useSomitiStore} from '../store/somitiStore';
import {useLanguage} from '../i18n/useLanguage';
import {colors} from '../theme/colors';
export function WithdrawalApprovalQueue({tab='pending',hideEmpty=false}:{tab?:'pending'|'approved'|'rejected';hideEmpty?:boolean}){
 const router=useRouter(),{l,formatMoney,formatNum}=useLanguage();
 const rows=useSomitiStore(s=>s.withdrawalRequests).filter(r=>tab==='pending'?['submitted','approved'].includes(r.status):tab==='approved'?['paid','reversed'].includes(r.status):['rejected','cancelled'].includes(r.status));
 if(hideEmpty&&!rows.length)return null;
 return <View style={{padding:16,gap:10}}><Text style={{fontWeight:'bold',color:colors.text}}>{l('Savings withdrawal requests','সঞ্চয় উত্তোলনের আবেদন')} · {formatNum(rows.length)}</Text>
 {rows.map(r=><Pressable key={r.id} accessibilityRole="button" onPress={()=>router.push({pathname:'/(admin)/withdrawals',params:{requestId:r.id}})} style={{padding:14,borderRadius:12,backgroundColor:colors.surface}}><Text>{r.member_name} · {r.member_code} · {formatMoney(r.amount)}</Text><Text style={{color:colors.primary}}>{r.status==='submitted'?l('Approval needed','অনুমোদন প্রয়োজন'):r.status==='approved'?l('Payment pending','টাকা প্রদান বাকি'):r.status==='paid'?l('Paid','প্রদত্ত'):r.status==='reversed'?l('Reversed','সংশোধিত'):l('Rejected/cancelled','প্রত্যাখ্যাত/বাতিল')}</Text></Pressable>)}
 </View>;
}
