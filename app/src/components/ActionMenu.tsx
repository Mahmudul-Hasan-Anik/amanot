import React from 'react';
import {Modal,View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {useLanguage} from '../i18n/useLanguage';
export function ActionMenu({visible,title,actions,onClose}:{visible:boolean;title:string;actions:ReadonlyArray<{text:string;style?:string;onPress?:()=>void|Promise<void>}>;onClose:()=>void}){
 const {l}=useLanguage();
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
 <View style={s.overlay}><Pressable accessibilityRole="button" accessibilityLabel={l('Close menu','মেনু বন্ধ করুন')} style={StyleSheet.absoluteFill} onPress={onClose}/>
 <View style={s.panel} accessibilityViewIsModal><View style={s.header}><Text style={s.title}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel={l('Close','বন্ধ করুন')} onPress={onClose} style={s.close}><Ionicons name="close" size={22} color={colors.text}/></Pressable></View>
 <ScrollView style={{flexShrink:1}} keyboardShouldPersistTaps="handled">{actions.filter(a=>a.style!=='cancel').map((a,i)=><Pressable key={a.text} accessibilityRole="button" onPress={()=>{onClose();void a.onPress?.();}} style={[s.row,i>0&&s.border]}><Text style={[s.label,a.style==='destructive'&&{color:colors.warning}]}>{a.text}</Text><Ionicons name="chevron-forward" size={17} color={a.style==='destructive'?colors.warning:colors.textSecondary}/></Pressable>)}</ScrollView>
 <Pressable accessibilityRole="button" onPress={onClose} style={s.cancel}><Text style={s.cancelText}>{l('Cancel','বাতিল')}</Text></Pressable></View></View>
 </Modal>;
}
const s=StyleSheet.create({overlay:{flex:1,backgroundColor:colors.overlay,justifyContent:'center',alignItems:'center',padding:20},panel:{width:'100%',maxWidth:420,maxHeight:'85%',borderRadius:20,padding:16,backgroundColor:colors.surface},header:{flexDirection:'row',alignItems:'center',paddingBottom:12},title:{flex:1,color:colors.text,fontFamily:typography.fontFamily.bold,fontSize:18},close:{padding:10},row:{minHeight:52,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,paddingHorizontal:6},border:{borderTopWidth:1,borderTopColor:colors.border},label:{flex:1,color:colors.text,fontFamily:typography.fontFamily.medium,fontSize:15,lineHeight:23},cancel:{padding:14,borderRadius:12,backgroundColor:colors.surfaceMuted,marginTop:12,alignItems:'center'},cancelText:{color:colors.text,fontFamily:typography.fontFamily.semiBold}});
