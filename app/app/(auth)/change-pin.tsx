import React, { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, Alert, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { normalizePin } from '../../src/lib/pinPolicy';
import { validatePinChange } from '../../src/lib/pinValidation';

export default function ChangePinScreen() {
  const auth = useAuthStore();
  const { l } = useLanguage();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const [error, setError] = useState('');
  const showError = (message: string) => { setError(message); scroll.current?.scrollTo({y:0,animated:true}); };
  if (!auth.isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!auth.isPinVerified) return <Redirect href="/(auth)/pin" />;
  const save = async () => {
    if (busy.current) return;
    const invalid = validatePinChange(current, next, confirmation);
    const messages = {
      current: l('Enter your current 6-digit PIN.', 'বর্তমান ৬ সংখ্যার পিন দিন।'),
      length: l('Your new PIN must contain exactly 6 digits.', 'নতুন পিনে ঠিক ৬টি সংখ্যা দিন।'),
      weak: l('Choose a less predictable PIN. Repeated digits (111111) and sequences (123456) are not allowed.', 'সহজে অনুমান করা যায় না এমন পিন দিন। একই সংখ্যা (১১১১১১) বা ধারাবাহিক সংখ্যা (১২৩৪৫৬) ব্যবহার করা যাবে না।'),
      confirmation: l('The two new PIN entries do not match. Enter the same new PIN in both fields.', 'নতুন পিন দুটি মেলেনি। নতুন পিন ও নিশ্চিতকরণ ঘরে একই পিন দিন।'),
      same: l('Choose a new PIN different from your current PIN.', 'বর্তমান পিনের থেকে আলাদা নতুন পিন দিন।'),
    };
    if (invalid) {
      showError(messages[invalid]);
      return;
    }
    busy.current = true;
    setError('');
    setSaving(true);
    try {
      await auth.setCustomPin(normalizePin(next), normalizePin(current));
      setCurrent(''); setNext(''); setConfirmation('');
      if (useAuthStore.getState().isAuthenticated) auth.logout();
      Alert.alert(l('PIN changed', 'পিন পরিবর্তিত হয়েছে'), l('Log in again with your new PIN.', 'নতুন পিন দিয়ে আবার লগইন করুন।'));
      router.replace('/(auth)/login');
    } catch (error: any) { showError(error?.message || l('Could not change PIN. Please try again.', 'পিন পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।')); }
    finally { busy.current = false; setSaving(false); }
  };
  return <SafeAreaView style={styles.page}><KeyboardAvoidingView style={styles.page} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <Text style={styles.title}>{l('Secure your account', 'অ্যাকাউন্ট নিরাপদ করুন')}</Text>
    <Text style={styles.body}>{l('Choose a private 6-digit PIN before continuing. Temporary PINs expire after 72 hours. Never share your new PIN.', 'এগোনোর আগে নিজের গোপন ৬ সংখ্যার পিন বেছে নিন। Temporary PIN-এর মেয়াদ ৭২ ঘণ্টা। নতুন পিন কাউকে বলবেন না।')}</Text>
    <Text style={styles.body}>{l('Use 6 digits, avoid repeated or sequential digits, and enter the same new PIN twice.', '৬টি সংখ্যা ব্যবহার করুন; একই বা ধারাবাহিক সংখ্যা এড়িয়ে নতুন পিন দুইবার একইভাবে লিখুন।')}</Text>
    {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}
    {[[l('Current PIN', 'বর্তমান পিন'), current, setCurrent], [l('New 6-digit PIN', 'নতুন ৬ সংখ্যার পিন'), next, setNext], [l('Confirm new PIN', 'নতুন পিন আবার দিন'), confirmation, setConfirmation]].map(([label, value, setter], index) => <View key={index}>
      <Text style={styles.label}>{label as string}</Text>
      <TextInput accessibilityLabel={label as string} style={styles.input} value={value as string} onChangeText={text => (setter as (s:string)=>void)(normalizePin(text).replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" secureTextEntry maxLength={6} autoComplete="off" editable={!saving} />
    </View>)}
    <TouchableOpacity accessibilityRole="button" disabled={saving} style={styles.button} onPress={save}><Text style={styles.buttonText}>{saving ? l('Saving…','সংরক্ষণ হচ্ছে…') : l('Save PIN and sign out','পিন সংরক্ষণ করে লগআউট')}</Text></TouchableOpacity>
    <TouchableOpacity disabled={saving} onPress={()=>{auth.logout();router.replace('/(auth)/login');}}><Text style={styles.link}>{l('Sign out', 'লগআউট')}</Text></TouchableOpacity>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background}, content:{padding:24,gap:14},
  title:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.xxl,color:colors.text},
  body:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.base,color:colors.textSecondary},
  error:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.base,lineHeight:24,color:colors.danger,backgroundColor:colors.warningSoft,borderRadius:12,padding:12,flexShrink:1},
  label:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.base,color:colors.text,marginBottom:6},
  input:{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:14,fontSize:typography.size.base,color:colors.text},
  button:{padding:16,borderRadius:14,backgroundColor:colors.primary,alignItems:'center'},
  buttonText:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.base,color:colors.textWhite},
  link:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.base,color:colors.primary,textAlign:'center',padding:12},
});
