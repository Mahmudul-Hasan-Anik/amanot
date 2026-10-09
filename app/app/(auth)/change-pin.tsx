import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { isStrongPin, normalizePin } from '../../src/lib/pinPolicy';

export default function ChangePinScreen() {
  const auth = useAuthStore();
  const { l } = useLanguage();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  if (!auth.isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!auth.isPinVerified) return <Redirect href="/(auth)/pin" />;
  const save = async () => {
    if (saving) return;
    if (!isStrongPin(next) || normalizePin(next) !== normalizePin(confirmation)) {
      Alert.alert(l('Check PIN', 'পিন যাচাই করুন'), l('Use a matching 6-digit PIN. Avoid repeated or sequential digits.', 'একই ৬ সংখ্যার নতুন পিন দুইবার দিন। একই বা ধারাবাহিক সংখ্যা এড়িয়ে চলুন।'));
      return;
    }
    setSaving(true);
    try {
      await auth.setCustomPin(normalizePin(next), normalizePin(current));
      setCurrent(''); setNext(''); setConfirmation('');
      Alert.alert(l('PIN changed', 'পিন পরিবর্তিত হয়েছে'), l('Log in again with your new PIN.', 'নতুন পিন দিয়ে আবার লগইন করুন।'));
      router.replace('/(auth)/login');
    } catch (error: any) { Alert.alert(l('Change failed', 'পরিবর্তন ব্যর্থ'), error.message); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>{l('Secure your account', 'অ্যাকাউন্ট নিরাপদ করুন')}</Text>
    <Text style={styles.body}>{l('Choose a private 6-digit PIN before continuing. Temporary PINs expire after 72 hours. Never share your new PIN.', 'এগোনোর আগে নিজের গোপন ৬ সংখ্যার পিন বেছে নিন। Temporary PIN-এর মেয়াদ ৭২ ঘণ্টা। নতুন পিন কাউকে বলবেন না।')}</Text>
    {[[l('Current PIN', 'বর্তমান পিন'), current, setCurrent], [l('New 6-digit PIN', 'নতুন ৬ সংখ্যার পিন'), next, setNext], [l('Confirm new PIN', 'নতুন পিন আবার দিন'), confirmation, setConfirmation]].map(([label, value, setter], index) => <View key={index}>
      <Text style={styles.label}>{label as string}</Text>
      <TextInput accessibilityLabel={label as string} style={styles.input} value={value as string} onChangeText={text => (setter as (s:string)=>void)(normalizePin(text).replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" secureTextEntry maxLength={6} autoComplete="off" editable={!saving} />
    </View>)}
    <TouchableOpacity accessibilityRole="button" disabled={saving} style={styles.button} onPress={save}><Text style={styles.buttonText}>{saving ? l('Saving…','সংরক্ষণ হচ্ছে…') : l('Save PIN and sign out','পিন সংরক্ষণ করে লগআউট')}</Text></TouchableOpacity>
    <TouchableOpacity disabled={saving} onPress={()=>{auth.logout();router.replace('/(auth)/login');}}><Text style={styles.link}>{l('Sign out', 'লগআউট')}</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background}, content:{padding:24,gap:14},
  title:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.xxl,color:colors.text},
  body:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.base,color:colors.textSecondary},
  label:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.base,color:colors.text,marginBottom:6},
  input:{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:14,fontSize:typography.size.base,color:colors.text},
  button:{padding:16,borderRadius:14,backgroundColor:colors.primary,alignItems:'center'},
  buttonText:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.base,color:colors.textWhite},
  link:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.base,color:colors.primary,textAlign:'center',padding:12},
});
