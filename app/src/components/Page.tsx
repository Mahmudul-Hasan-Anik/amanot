import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { safeBack } from '../utils/navigation';

/**
 * Standard screen shell: centered app bar (back · title · action), cream canvas,
 * optional sticky footer for the main action. Matches the original design language.
 */
export function Page({title,subtitle,children,actions,backTo='/(admin)/(tabs)',scrollRef,footer}: {title:string;subtitle?:string;children:React.ReactNode;actions?:React.ReactNode;backTo?:string;scrollRef?:React.Ref<ScrollView>;footer?:React.ReactNode}) {
  const router=useRouter();const wide=useWindowDimensions().width>720;const insets=useSafeAreaInsets();
  return <SafeAreaView edges={['top','left','right']} style={styles.page}>
    <View style={[styles.header,{paddingHorizontal:wide?28:12}]}>
      <TouchableOpacity onPress={()=>safeBack(router,backTo)} accessibilityLabel="Back" accessibilityRole="button" style={styles.iconBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}><Ionicons name="arrow-back" size={24} color={colors.text}/></TouchableOpacity>
      <View style={styles.titleBox}><Text style={styles.title} numberOfLines={1}>{title}</Text>{subtitle?<Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>:null}</View>
      <View style={styles.actions}>{actions}</View>
    </View>
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content,{paddingHorizontal:wide?32:16,paddingBottom:footer?24:Math.max(insets.bottom,16)+24}]}>{children}</ScrollView>
    {footer?<View style={[styles.footer,{paddingBottom:Math.max(insets.bottom,14),paddingHorizontal:wide?32:16}]}>{footer}</View>:null}
  </SafeAreaView>;
}
/** Small round icon button for the app bar's right slot. */
export function HeaderIcon({icon,onPress,label}:{icon:React.ComponentProps<typeof Ionicons>['name'];onPress:()=>void;label:string}){
  return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}><Ionicons name={icon} size={22} color={colors.text}/></TouchableOpacity>;
}
export const pageStyles=StyleSheet.create({
  card:{backgroundColor:colors.surface,padding:16,borderRadius:16,marginBottom:12,shadowColor:colors.shadowColor,shadowOffset:{width:0,height:2},shadowOpacity:0.04,shadowRadius:8,elevation:2},
  title:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.base,lineHeight:typography.lineHeight.base,color:colors.text,marginBottom:8},
  text:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.sm,color:colors.textSecondary,lineHeight:22},
  value:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.xxl,lineHeight:typography.lineHeight.xxl,color:colors.primary},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12,gap:12},
  button:{backgroundColor:colors.primary,borderRadius:14,padding:14,alignItems:'center',marginBottom:12},
  buttonText:{fontFamily:typography.fontFamily.semiBold,color:colors.surface,fontSize:typography.size.base},
  chips:{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:16},
  chip:{paddingHorizontal:16,paddingVertical:10,borderRadius:14,backgroundColor:colors.surfaceMuted},
  hero:{backgroundColor:colors.primary,borderRadius:20,padding:20,marginBottom:16},
  heroLabel:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.subhead,lineHeight:typography.lineHeight.subhead,color:colors.surface,opacity:0.9},
  heroValue:{...typography.displayAmount,color:colors.surface,marginVertical:8},
  heroSub:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.xs,lineHeight:typography.lineHeight.xs,color:colors.surface,opacity:0.85},
  warnHero:{backgroundColor:colors.warningSoft,borderRadius:20,padding:20,marginBottom:16},
  section:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.base,lineHeight:typography.lineHeight.base,color:colors.text,marginTop:8,marginBottom:10},
  divider:{borderTopWidth:1,borderTopColor:colors.border},
});
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  header:{paddingTop:10,paddingBottom:8,flexDirection:'row',alignItems:'center',backgroundColor:colors.background},
  iconBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  titleBox:{flex:1,alignItems:'center',minWidth:0,paddingHorizontal:4},
  actions:{minWidth:40,flexDirection:'row',alignItems:'center',justifyContent:'flex-end'},
  title:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.title,lineHeight:typography.lineHeight.title,color:colors.text},
  subtitle:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.xs,lineHeight:typography.lineHeight.xs,color:colors.textSecondary},
  content:{paddingTop:8},
  footer:{backgroundColor:colors.surface,borderTopWidth:1,borderTopColor:colors.borderLight,paddingTop:12,shadowColor:colors.shadowColor,shadowOffset:{width:0,height:-2},shadowOpacity:0.05,shadowRadius:6,elevation:8},
});
