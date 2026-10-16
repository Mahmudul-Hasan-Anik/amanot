import React, { useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, Share, StyleSheet } from 'react-native';
import { Button } from './Button';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type LoginMember={name:string;code:string;phone:string};
export function LoginPinCard({member,pin}:{member:LoginMember;pin:string}){
 const {l}=useLanguage();
 return <View style={styles.credentials}>
  <Text style={styles.label}>{l('Login mobile number','লগইনের মোবাইল নম্বর')}</Text>
  <Text selectable style={styles.phone}>{member.phone}</Text>
  <Text style={styles.label}>{l('Temporary login PIN','অস্থায়ী লগইন PIN')}</Text>
  <Text testID="temporary-login-pin" selectable accessibilityLabel={l('Temporary login PIN','অস্থায়ী লগইন PIN')} style={styles.pin}>{pin}</Text>
  <Text style={styles.help}>{l('Valid for 72 hours. The member must choose a new PIN at first login.','মেয়াদ ৭২ ঘণ্টা। প্রথম লগইনে সদস্যকে নিজের নতুন PIN সেট করতে হবে।')}</Text>
 </View>;
}

/** The caller mounts this only for staff allowed to issue this member's credentials. */
export function MemberLoginPin({member,onIssue,onClose}:{member:LoginMember;onIssue:()=>Promise<string>;onClose:()=>void}){
 const {l}=useLanguage(),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 const issue=async()=>{
  if(lock.current||pin)return;lock.current=true;setBusy(true);setError('');
  try{setPin(await onIssue());}catch(e:any){setError(e.message||l('Could not create PIN. Try again.','PIN তৈরি হয়নি। আবার চেষ্টা করুন।'));}finally{lock.current=false;setBusy(false);}
 };
 const close=()=>{if(!lock.current)onClose();};
 const share=async()=>{
  if(lock.current||!pin)return;lock.current=true;setBusy(true);setError('');
  try{await Share.share({message:l(`Amanot login for ${member.name}\nMember ID: ${member.code}\nMobile: ${member.phone}\nTemporary PIN: ${pin}\nLog in within 72 hours and choose your own PIN.`,`${member.name}-এর Amanot লগইন\nসদস্য ID: ${member.code}\nমোবাইল: ${member.phone}\nঅস্থায়ী PIN: ${pin}\n৭২ ঘণ্টার মধ্যে লগইন করে নিজের PIN সেট করুন।`)});}catch(e:any){setError(e.message);}finally{lock.current=false;setBusy(false);}
 };
 return <Modal visible transparent animationType="fade" onRequestClose={close}>
  <View style={styles.overlay}><View style={styles.panel} accessibilityViewIsModal>
   <ScrollView keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>{l('Member login PIN','সদস্যের লগইন PIN')}</Text>
    <Text style={styles.phone}>{member.name} · {member.code}</Text>
    {pin?<LoginPinCard member={member} pin={pin}/>:<Text style={styles.help}>{l('Verify the member’s identity, then create a temporary PIN. This replaces their previous PIN. Give it privately to this member.','সদস্যের পরিচয় যাচাই করে অস্থায়ী PIN তৈরি করুন। এতে আগের PIN বদলে যাবে। শুধু ওই সদস্যকে ব্যক্তিগতভাবে দিন।')}</Text>}
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!pin?<Button testID="generate-member-login-pin" title={l('Create temporary PIN','অস্থায়ী PIN তৈরি করুন')} loading={busy} onPress={issue}/>:<Button testID="share-member-login-pin" title={l('Share login details','লগইন তথ্য শেয়ার করুন')} loading={busy} onPress={share}/>}
    <Button title={pin?l('Done','সম্পন্ন'):l('Cancel','বাতিল')} variant="ghost" disabled={busy} onPress={close}/>
   </ScrollView>
  </View></View>
 </Modal>;
}
const styles=StyleSheet.create({
 overlay:{flex:1,backgroundColor:colors.overlay,padding:20,justifyContent:'center',alignItems:'center'},
 panel:{width:'100%',maxWidth:420,maxHeight:'85%',padding:20,borderRadius:20,backgroundColor:colors.surface},
 title:{fontFamily:typography.fontFamily.bold,fontSize:22,color:colors.text,marginBottom:12},
 credentials:{backgroundColor:colors.primarySoft,borderRadius:16,padding:16,marginVertical:16},
 label:{fontFamily:typography.fontFamily.medium,fontSize:14,color:colors.textSecondary},
 phone:{fontFamily:typography.fontFamily.semiBold,fontSize:18,color:colors.text,marginVertical:6},
 pin:{fontFamily:typography.fontFamily.bold,fontSize:36,letterSpacing:5,color:colors.primary,marginVertical:8,textAlign:'center'},
 help:{fontFamily:typography.fontFamily.regular,fontSize:15,lineHeight:23,color:colors.textSecondary,marginVertical:12},
 error:{color:colors.danger,marginBottom:12},
});
