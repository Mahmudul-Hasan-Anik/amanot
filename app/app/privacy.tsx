import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '../src/i18n/useLanguage';
import { useSomitiStore } from '../src/store/somitiStore';
import { useAuthStore } from '../src/features/auth/authStore';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

export default function PrivacyScreen() {
  const { l } = useLanguage();
  const router = useRouter();
  const { somitiInfo } = useSomitiStore();
  const authenticated = useAuthStore(s=>s.isPinVerified&&!s.mustChangePin);
  const sections = [
    [l('Delete your account','আপনার account মুছুন'),l('Use Delete account in Profile or Settings. Your current PIN and explicit confirmation are required. Login credentials, NID, contact/address, nominee details and profile photos are removed. Historical financial records, receipt names and audit history remain for the association’s accounting retention period. The last owner must transfer ownership or close the society, ending access for everyone.','Profile বা Settings থেকে Account মুছুন বেছে নিন। বর্তমান PIN ও স্পষ্ট নিশ্চিতকরণ লাগবে। Login, NID, যোগাযোগ/ঠিকানা, নমিনির তথ্য ও profile ছবি মুছবে। সমিতির নির্ধারিত সংরক্ষণকাল অনুযায়ী পুরোনো আর্থিক রেকর্ড, রসিদে লেখা নাম ও audit history থাকবে। শেষ মালিককে মালিকানা হস্তান্তর করতে হবে অথবা সমিতি বন্ধ করে সবার প্রবেশ বন্ধ করতে হবে।')],
    [l('Information collected','যে তথ্য নেওয়া হয়'), l('Member name, phone, address, NID number, nominee details and association savings/accounting records. A profile photo is optional, up to 120 KB. We do not collect NID images.','সদস্যের নাম, ফোন, ঠিকানা, NID নম্বর, নমিনির তথ্য এবং সমিতির সঞ্চয় ও হিসাবের রেকর্ড নেওয়া হয়। Profile photo ঐচ্ছিক, সর্বোচ্চ ১২০ KB। NID-এর ছবি নেওয়া হয় না।')],
    [l('Purpose and access','ব্যবহার ও access'),l('The association uses this information for membership, accounting, receipts and support. Authorized staff can access records for their duties; members can access their own account and shared association information. An NID number alone is not government identity verification.','সমিতি সদস্যপদ, হিসাব, রসিদ ও সহায়তার জন্য তথ্য ব্যবহার করে। দায়িত্ব অনুযায়ী অনুমোদিত staff রেকর্ড দেখতে পারেন; সদস্য নিজের হিসাব ও সমিতির সাধারণ তথ্য দেখতে পারেন। শুধু NID নম্বর নেওয়া সরকারি পরিচয় যাচাই নয়।')],
    [l('Storage and device','সংরক্ষণ ও ডিভাইস'),l('Account data is stored in the association’s Supabase project. Profile photos use private storage. The Android app stores its session in protected device storage; live financial/NID records are kept in memory while the app is running. Sign out on shared devices.','তথ্য সমিতির Supabase project-এ থাকে। Profile photo private storage-এ থাকে। Android app session ডিভাইসের সুরক্ষিত storage-এ রাখে; live আর্থিক/NID তথ্য app চলার সময় memory-তে থাকে। অন্যের ডিভাইসে ব্যবহার শেষে logout করুন।')],
    [l('Sharing and messages','শেয়ার ও বার্তা'),l('PDF/CSV exports and WhatsApp drafts leave the app only when you choose a recipient or share action. Check the destination before sharing personal or financial information. SMS is currently simulated and sends no message.','PDF/CSV ও WhatsApp draft share করার সময় প্রাপক আপনি বেছে নেন। ব্যক্তিগত বা আর্থিক তথ্য পাঠানোর আগে প্রাপক যাচাই করুন। SMS এখন simulated; কোনো SMS পাঠানো হয় না।')],
    [l('Correction, closure and retention','সংশোধন, বন্ধ ও সংরক্ষণ'),l('Contact your association administrator to correct personal details, request account closure or ask about retention. Financial ledger records are retained for accounting history; closing an account does not erase historical transactions. The association must communicate its retention period and handle each request.','ব্যক্তিগত তথ্য সংশোধন, account বন্ধ বা তথ্য কতদিন থাকবে জানতে সমিতির অ্যাডমিনের সাথে যোগাযোগ করুন। হিসাবের ইতিহাসের জন্য ledger থাকে; account বন্ধ করলে পুরোনো transaction মুছে যায় না। সমিতি সংরক্ষণের সময়সীমা জানাবে এবং প্রতিটি অনুরোধের ব্যবস্থা করবে।')],
  ];
  const phone = authenticated ? String(somitiInfo.phone||'').replace(/[^+\d]/g,'') : '';
  const email = authenticated ? String(somitiInfo.email||'').trim() : '';
  const open = async (url:string) => { try { await Linking.openURL(url); } catch { Alert.alert(l('Could not open','খোলা যায়নি'),l('Contact your association administrator.','সমিতির অ্যাডমিনের সাথে যোগাযোগ করুন।')); } };
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" onPress={()=>router.canGoBack()?router.back():router.replace('/(auth)/login')}><Text style={styles.link}>{l('Back','ফিরুন')}</Text></TouchableOpacity>
    <Text style={styles.title}>{l('Privacy and support','গোপনীয়তা ও সহায়তা')}</Text>
    {authenticated&&<TouchableOpacity accessibilityRole="link" onPress={()=>router.push('/account-deletion')}><Text style={styles.link}>{l('Delete account','Account মুছুন')}</Text></TouchableOpacity>}
    <Text style={styles.text}>{l('Updated 9 October 2026','হালনাগাদ: ৯ অক্টোবর ২০২৬')}</Text>
    {sections.map(([title,body])=><View style={styles.card} key={title}><Text style={styles.heading}>{title}</Text><Text style={styles.text}>{body}</Text></View>)}
    <View style={styles.card}><Text style={styles.heading}>{l('Get support','সহায়তা নিন')}</Text>
      <Text style={styles.text}>{l('Your association administrator handles PIN recovery after identity verification. Never send your PIN to support.','পরিচয় যাচাইয়ের পর সমিতির অ্যাডমিন PIN recovery করবেন। সহায়তার জন্য কাউকে আপনার পিন পাঠাবেন না।')}</Text>
      {phone && <TouchableOpacity onPress={()=>open(`tel:${phone}`)}><Text style={styles.link}>{phone}</Text></TouchableOpacity>}
      {email && <TouchableOpacity onPress={()=>open(`mailto:${email}`)}><Text style={styles.link}>{email}</Text></TouchableOpacity>}
      {!phone&&!email&&<Text style={styles.text}>{l('Ask your association administrator for the official support contact.','সমিতির অ্যাডমিনের কাছ থেকে সহায়তার আনুষ্ঠানিক যোগাযোগ নম্বর নিন।')}</Text>}
    </View>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.background},content:{padding:20,gap:16},title:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.xxl,color:colors.text},heading:{fontFamily:typography.fontFamily.bold,fontSize:typography.size.title,color:colors.text,marginBottom:8},text:{fontFamily:typography.fontFamily.regular,fontSize:typography.size.base,color:colors.textSecondary,lineHeight:typography.lineHeight.base},link:{fontFamily:typography.fontFamily.medium,fontSize:typography.size.base,color:colors.primary,paddingVertical:10},card:{backgroundColor:colors.surface,borderRadius:16,padding:18}});
