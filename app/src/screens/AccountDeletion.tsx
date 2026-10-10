import React,{useState} from 'react';
import {Text,View,Alert} from 'react-native';
import {useRouter} from 'expo-router';
import {Page,pageStyles as s} from '../components/Page';
import {Button} from '../components/Button';
import {Input} from '../components/Input';
import {Checkbox} from '../components/Checkbox';
import {SessionGuard} from '../components/SessionGuard';
import {useLanguage} from '../i18n/useLanguage';
import {useAuthStore} from '../features/auth/authStore';
import {useSomitiStore,REMOTE} from '../store/somitiStore';
import {deleteMyAccount} from '../lib/api';
import {normalizePin} from '../lib/pinPolicy';

export default function AccountDeletion(){
  const {l}=useLanguage(); const router=useRouter();
  const {actualRole,logout}=useAuthStore(); const {somitiInfo}=useSomitiStore();
  const [close,setClose]=useState(false),[ack,setAck]=useState(false),[pin,setPin]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const expected=close?somitiInfo.name:'DELETE';
  const submit=()=>{
    if(busy||!ack||confirmation.trim()!==expected)return;
    Alert.alert(l('Permanent deletion','স্থায়ীভাবে মুছে ফেলা'),close
      ? l('This closes the society and deletes login accounts and profile details for all its members. Financial records remain. This cannot be undone.','সমিতি বন্ধ হবে এবং সব সদস্যের login account ও profile তথ্য মুছবে। আর্থিক রেকর্ড থাকবে। এটি ফিরিয়ে আনা যাবে না।')
      : l('Your login account and profile details will be deleted. Financial records remain. This cannot be undone.','আপনার login account ও profile তথ্য মুছবে। আর্থিক রেকর্ড থাকবে। এটি ফিরিয়ে আনা যাবে না।'),[
      {text:l('Cancel','বাতিল'),style:'cancel'},
      {text:l('Delete permanently','স্থায়ীভাবে মুছুন'),style:'destructive',onPress:async()=>{
        setBusy(true);setError('');
        try {
          if(!REMOTE){setError(l('Demo preview: deletion is disabled.','ডেমো preview-তে মুছে ফেলা বন্ধ আছে।'));return;}
          const result=await deleteMyAccount(normalizePin(pin),close,confirmation.trim());
          logout();router.replace('/(auth)/login');
          Alert.alert(l('Account deleted','Account মুছে ফেলা হয়েছে'),result.cleanupPending
            ? l('Access has ended. Photo cleanup is queued for retry. Retained financial records are described in Privacy.','Account-এর প্রবেশ বন্ধ হয়েছে। ছবি মুছতে পুনরায় চেষ্টা করা হবে। সংরক্ষিত আর্থিক রেকর্ডের বিবরণ গোপনীয়তা পাতায় আছে।')
            : l('Login and profile details have been removed. Accounting records are retained.','Login ও profile তথ্য মুছে ফেলা হয়েছে। হিসাবের রেকর্ড সংরক্ষিত আছে।'));
        }catch(e:any){setError(e.message);}finally{setBusy(false);setPin('');}
      }}]);
  };
  return <SessionGuard><Page title={l('Delete account','Account মুছুন')}>
    {!REMOTE&&<Text style={s.text}>{l('Demo preview: account deletion is disabled.','ডেমো preview: account মুছে ফেলা বন্ধ আছে।')}</Text>}
    <View style={s.card}>
      <Text style={s.text}>{l('Your login account, NID, contact, address, nominee details and profile photos will be removed. Historical financial records, receipts and audit history remain with the society, including names recorded on those records.','আপনার login account, NID, যোগাযোগ, ঠিকানা, নমিনির তথ্য ও profile ছবি মুছে ফেলা হবে। পুরোনো আর্থিক রেকর্ড, রসিদ ও audit history সমিতিতে থাকবে; সেসব রেকর্ডে লেখা নামও থাকবে।')}</Text>
      <Text style={s.text}>{l('The last owner must appoint another owner before leaving, or close the entire society. Closing a society ends access for all its members.','শেষ মালিককে আগে অন্য কাউকে মালিক করতে হবে, অথবা পুরো সমিতি বন্ধ করতে হবে। সমিতি বন্ধ করলে সব সদস্যের প্রবেশ বন্ধ হবে।')}</Text>
      {actualRole==='super_admin'&&<Checkbox checked={close} disabled={busy} onPress={()=>{setClose(!close);setConfirmation('');setAck(false);}} label={l('Close the entire society','পুরো সমিতি বন্ধ করুন')}/>}
    </View>
    <Input label={l('Current PIN','বর্তমান পিন')} accessibilityLabel={l('Current PIN','বর্তমান পিন')} secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={setPin} editable={!busy} autoComplete="off"/>
    <Input label={l(`Type ${expected} to confirm`,`নিশ্চিত করতে ${expected} লিখুন`)} accessibilityLabel={l('Confirmation','নিশ্চিতকরণ')} value={confirmation} onChangeText={setConfirmation} editable={!busy} autoCapitalize="none" autoCorrect={false}/>
    <Checkbox checked={ack} disabled={busy} onPress={()=>setAck(!ack)} label={l('I understand deletion is permanent and financial records are retained.','আমি বুঝেছি এটি স্থায়ী এবং আর্থিক রেকর্ড সংরক্ষিত থাকবে।')}/>
    {!!error&&<Text accessibilityRole="alert" style={s.text}>{error}</Text>}
    <Button title={close?l('Close society permanently','সমিতি স্থায়ীভাবে বন্ধ করুন'):l('Delete my account','আমার account মুছুন')} variant="danger" loading={busy} disabled={!REMOTE||!ack||confirmation.trim()!==expected||!/^(\d{4}|\d{6})$/.test(normalizePin(pin))} onPress={submit} style={{marginTop:20}}/>
  </Page></SessionGuard>;
}
