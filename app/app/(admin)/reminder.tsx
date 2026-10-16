import React,{useState} from 'react';
import {View,Text,Pressable,Alert,Linking} from 'react-native';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {useSomitiStore} from '../../src/store/somitiStore';
import {useLanguage} from '../../src/i18n/useLanguage';
import {Page,pageStyles as s} from '../../src/components/Page';
import {investmentSchedule,normalizeContactPhone} from '../../src/lib/investment';
import {colors} from '../../src/theme/colors';
export default function Reminder(){
 const router=useRouter(),params=useLocalSearchParams<{memberIds?:string}>(),{l,formatMoney}=useLanguage();
 const projects=useSomitiStore(s=>s.projects),members=useSomitiStore(s=>s.members),society=useSomitiStore(s=>s.somitiInfo);
 const [mode,setMode]=useState(params.memberIds?'notice':'investment');
 const ids=String(params.memberIds||'').split(',');
 const due=projects.filter(p=>p.contract).map(p=>({p,amount:investmentSchedule(p.contract!,p.returnedAmount).filter(r=>r.overdue).reduce((sum,r)=>sum+r.remaining,0)})).filter(r=>r.amount>0).sort((a,b)=>b.amount-a.amount);
 const prepare=(m:typeof members[number])=>{
  const phone=normalizeContactPhone(m.whatsapp||m.phone);if(!phone){Alert.alert(l('Invalid number','সঠিক নম্বর নেই'));return;}
  const text=l('Hello '+m.name+', you may make a voluntary savings deposit at your convenience. There is no fixed monthly amount or late fee. — '+society.name,'আসসালামু আলাইকুম '+m.name+', সুবিধামতো সমিতিতে সঞ্চয় জমা দিতে পারেন। নির্দিষ্ট মাসিক অঙ্ক বা বিলম্ব ফি নেই। — '+society.name);
  Alert.alert(l('Message preview','বার্তার প্রিভিউ'),text,[{text:l('Cancel','বাতিল'),style:'cancel'},{text:l('Open WhatsApp','WhatsApp খুলুন'),onPress:()=>{Linking.openURL('https://wa.me/'+phone+'?text='+encodeURIComponent(text)).catch(()=>Alert.alert(l('Could not open WhatsApp','WhatsApp খোলা যায়নি')));}}]);
 };
 return <Page title={l('Reminders','রিমাইন্ডার')} subtitle={l('WhatsApp opens a draft; you decide whether to send.','WhatsApp-এ খসড়া খুলবে; পাঠাবেন কি না আপনি ঠিক করবেন।')}>
 <View style={s.chips}>{[['investment',l('Investment installments','বিনিয়োগের কিস্তি')],['notice',l('Voluntary savings notice','ইচ্ছামতো সঞ্চয়ের নোটিশ')]].map(([key,label])=><Pressable key={key} onPress={()=>setMode(key)} style={[s.chip,mode===key&&{backgroundColor:colors.primary}]}><Text style={[s.text,mode===key&&{color:colors.surface}]}>{label}</Text></Pressable>)}</View>
 {mode==='investment'?due.length?due.map(({p,amount})=><Pressable key={p.id} style={s.card} onPress={()=>router.push(('/(admin)/project/'+p.id) as any)}><Text style={s.title}>{p.name} · {p.contract!.number}</Text><Text style={s.text}>{p.contract!.memberId?l('Member','সদস্য'):l('External recipient','বাইরের ব্যক্তি')} · {l('Overdue','বকেয়া')}: {formatMoney(amount)}</Text><Text style={{color:colors.primary}}>{l('Open contract and preview reminder','চুক্তি খুলে রিমাইন্ডারের প্রিভিউ দেখুন')}</Text></Pressable>):<Text style={s.text}>{l('No overdue investment installments.','বিনিয়োগের কোনো মেয়াদোত্তীর্ণ কিস্তি নেই।')}</Text>:
 <><Text style={s.text}>{l('This is an optional savings notice, not a demand for overdue money.','এটি ঐচ্ছিক সঞ্চয়ের নোটিশ; বকেয়া টাকা আদায়ের তাগাদা নয়।')}</Text>{members.filter(m=>m.status!=='inactive'&&(!params.memberIds||ids.includes(m.id))).map(m=><Pressable key={m.id} style={s.card} onPress={()=>prepare(m)}><Text style={s.title}>{m.name} · {m.code}</Text><Text style={{color:colors.primary}}>{l('Preview notice','নোটিশের প্রিভিউ')}</Text></Pressable>)}</>}
 </Page>;
}
