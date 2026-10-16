import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Member } from '../mocks/mockData';
import { MEMBER_CATEGORIES } from '../lib/memberIdentity';
import { SelectModal } from './SelectModal';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
export function MemberPicker({visible,members,value,onSelect,onClose,activeOnly=false,title}:{visible:boolean;members:Member[];value:string;onSelect:(id:string)=>void;onClose:()=>void;activeOnly?:boolean;title?:string}){
 const {l}=useLanguage(),[category,setCategory]=useState('all');
 const filters=[{value:'all',en:'All',bn:'সব'},...MEMBER_CATEGORIES];
 const close=()=>{setCategory('all');onClose();};
 return <SelectModal visible={visible} title={title||l('Choose member','সদস্য নির্বাচন')} value={value} searchable
  searchPlaceholder={l('Name, member number or phone','নাম, সদস্য নম্বর বা ফোন')}
  header={<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>{filters.map(f=><Pressable key={f.value} accessibilityRole="radio" accessibilityState={{checked:category===f.value}} onPress={()=>setCategory(f.value)} style={{padding:10,borderRadius:12,backgroundColor:category===f.value?colors.primarySoft:colors.surfaceMuted}}><Text style={{color:colors.text}}>{l(f.en,f.bn)}</Text></Pressable>)}</View>}
  options={members.filter(m=>(!activeOnly||m.status!=='inactive')&&(category==='all'||m.memberCategory===category)).map(m=>({value:m.id,label:`${m.name} · ${m.code}`,searchText:`${m.name} ${m.nameEn||''} ${m.code} ${m.memberNumber||''} ${m.phone} ${m.fatherName||''} ${m.motherName||''}`}))}
  onSelect={onSelect} onClose={close}/>;
}
