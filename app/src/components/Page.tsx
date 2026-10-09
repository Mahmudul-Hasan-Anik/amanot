import React from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { safeBack } from '../utils/navigation';

export function Page({title,subtitle,children,actions}: {title:string;subtitle?:string;children:React.ReactNode;actions?:React.ReactNode}) {
  const router=useRouter();const wide=useWindowDimensions().width>720;
  return <SafeAreaView style={styles.page}>
    <View style={[styles.header,{paddingHorizontal:wide?32:16}]}>
      <TouchableOpacity onPress={()=>safeBack(router,'/(admin)/(tabs)')} accessibilityLabel="Back" accessibilityRole="button" style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.text}/></TouchableOpacity>
      <View style={{flex:1}}><Text style={styles.title}>{title}</Text>{subtitle&&<Text style={styles.subtitle}>{subtitle}</Text>}</View>{actions}
    </View>
    <ScrollView contentContainerStyle={[styles.content,{padding:wide?32:16}]}>{children}</ScrollView>
  </SafeAreaView>;
}
export const pageStyles=StyleSheet.create({
  card:{backgroundColor:colors.surface,padding:20,borderRadius:20,marginBottom:16,borderWidth:1,borderColor:colors.borderLight},
  title:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.title,color:colors.text,marginBottom:8},
  text:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.base,color:colors.textSecondary,lineHeight:24},
  value:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.xxl,color:colors.primary},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12,gap:12},
  button:{backgroundColor:colors.primary,borderRadius:14,padding:14,alignItems:'center',marginBottom:12},
  buttonText:{fontFamily:typography.fontFamily.semiBold,color:colors.surface,fontSize:typography.size.base},
  chips:{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:16},
  chip:{paddingHorizontal:16,paddingVertical:10,borderRadius:14,backgroundColor:colors.surfaceMuted},
});
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},header:{paddingVertical:16,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:colors.borderLight},
  back:{padding:8},title:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.title,color:colors.text},subtitle:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.caption,color:colors.textSecondary,marginTop:4},content:{paddingBottom:40},
});
