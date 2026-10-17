import React, {useEffect, useState} from 'react';
import {Alert, type AlertButton, type AlertOptions, Platform, Modal, View, Text, Pressable, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {useLanguage} from '../i18n/useLanguage';

type Notice = {title:string; message?:string; buttons?:AlertButton[]; options?:AlertOptions};
const queue: Notice[] = [];
let update: (()=>void) | undefined;
// Install before child screens mount, retaining notices during navigation.
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons, options) => {
    queue.push({title,message,buttons,options});
    update?.();
  };
}
export function WebAlertHost() {
  const [,rerender] = useState(0);
  const {l} = useLanguage();
  useEffect(()=>{update=()=>rerender(n=>n+1);update();return ()=>{update=undefined};},[]);
  if (Platform.OS !== 'web' || !queue.length) return null;
  const notice=queue[0];
  const close=()=>{queue.shift();update?.();};
  const dismiss=()=>{if(notice.options?.cancelable){close();notice.options.onDismiss?.();}};
  const buttons=notice.buttons?.length?notice.buttons:[{text:l('OK','ঠিক আছে')}];
  return <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
    <SafeAreaView style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessible={false}/>
      <View style={styles.card} accessibilityViewIsModal>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>{notice.title}</Text>
          {!!notice.message&&<Text accessibilityRole="alert" style={styles.message}>{notice.message}</Text>}
          <View style={styles.actions}>{buttons.map((button,i)=><Pressable key={i} accessibilityRole="button" style={styles.button} onPress={()=>{close();button.onPress?.();}}>
            <Text style={[styles.buttonText,button.style==='destructive'&&{color:colors.danger}]}>{button.text||l('OK','ঠিক আছে')}</Text>
          </Pressable>)}</View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({
  overlay:{flex:1,justifyContent:'center',alignItems:'center',padding:20,backgroundColor:'rgba(0,0,0,0.5)'},
  card:{width:'100%',maxWidth:420,maxHeight:'85%',borderRadius:20,padding:20,backgroundColor:colors.surface},
  title:{fontFamily:typography.fontFamily.bold,fontSize:20,lineHeight:28,color:colors.text,marginBottom:12},
  message:{fontFamily:typography.fontFamily.regular,fontSize:16,lineHeight:25,color:colors.text,flexShrink:1},
  actions:{marginTop:20,gap:8},button:{minHeight:48,padding:12,borderRadius:12,backgroundColor:colors.primarySoft,justifyContent:'center'},
  buttonText:{fontFamily:typography.fontFamily.semiBold,fontSize:16,lineHeight:24,color:colors.primary,textAlign:'center'},
});
