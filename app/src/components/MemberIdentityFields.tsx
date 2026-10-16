import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { SelectModal } from './SelectModal';
import { MEMBER_CATEGORIES, MemberCategory, memberCode } from '../lib/memberIdentity';
import { toEnglishDigits } from '../lib/bengali';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
export function MemberIdentityFields({category,number,onCategory,onNumber,existingCode,locked=false,legacy=false}:{category:MemberCategory|'';number:string;onCategory:(value:MemberCategory)=>void;onNumber?:(value:string)=>void;existingCode?:string;locked?:boolean;legacy?:boolean}) {
  const {l}=useLanguage();const [open,setOpen]=useState(false);
  const selected=MEMBER_CATEGORIES.find(item=>item.value===category);
  let preview=existingCode || '—';try{preview=memberCode(category,number)}catch{}
  return <View style={s.group}>
    <Text style={s.label}>{l('Member Category *','সদস্যের ক্যাটাগরি *')}</Text>
    <Pressable testID="member-category-select" disabled={legacy} accessibilityRole="button" onPress={()=>setOpen(true)} style={s.input}><Text style={s.text}>{selected?l(selected.en,selected.bn):legacy?l('Legacy ID — category not assigned','পুরোনো ID — ক্যাটাগরি নির্ধারিত নয়'):l('Select category','ক্যাটাগরি নির্বাচন করুন')}</Text></Pressable>
    <Text style={s.label}>{l('Member Number *','সদস্য নম্বর *')}</Text>
    <TextInput testID="member-number-input" style={s.input} value={number} editable={!locked} onChangeText={value=>onNumber?.(toEnglishDigits(value))} keyboardType="number-pad" placeholder={l('e.g. 202001','যেমন: 202001')} placeholderTextColor={colors.textSecondary}/>
    <Text style={s.hint}>{legacy?l('Existing ID is preserved. Category/number mapping must be approved before conversion.','পুরোনো ID অপরিবর্তিত আছে। পরিবর্তনের আগে ক্যাটাগরি ও নম্বরের mapping নিশ্চিত করতে হবে।'):locked?l('Member number is permanent. Only the category prefix can change.','সদস্য নম্বর স্থায়ী। শুধু ক্যাটাগরির prefix বদলানো যাবে।'):l('Enter your society’s member number. It cannot be changed after saving.','সমিতির সদস্য নম্বর লিখুন। সংরক্ষণের পর নম্বর বদলানো যাবে না।')}</Text>
    <Text style={s.label}>{l('Member ID','সদস্য আইডি')}</Text><Text testID="member-id-preview" style={s.preview}>{preview}</Text>
    <SelectModal visible={open} title={l('Member category','সদস্যের ক্যাটাগরি')} value={category} options={MEMBER_CATEGORIES.map(item=>({value:item.value,label:`${l(item.en,item.bn)} (${item.prefix})`}))} onSelect={value=>onCategory(value as MemberCategory)} onClose={()=>setOpen(false)}/>
  </View>;
}
const s=StyleSheet.create({group:{marginBottom:16},label:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.base,color:colors.text,marginBottom:8,marginTop:12},input:{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:14,color:colors.text,fontFamily:typography.fontFamily.regular,fontSize:typography.size.base},text:{color:colors.text,fontFamily:typography.fontFamily.regular,fontSize:typography.size.base},hint:{color:colors.textSecondary,fontFamily:typography.fontFamily.regular,fontSize:typography.size.caption,marginTop:8},preview:{color:colors.primary,fontFamily:typography.fontFamily.bold,fontSize:typography.size.title}});
