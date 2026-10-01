import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReminderScreen() {
  const router = useRouter();

  const [pushSelected, setPushSelected] = useState(true);
  const [whatsappSelected, setWhatsappSelected] = useState(true);
  const [smsSelected, setSmsSelected] = useState(false);

  const [message, setMessage] = useState(
    'আসসালামু আলাইকুম {নাম}, আপনার {বকেয়া_মাস} মাসের জমা {বকেয়া_টাকা} টাকা এখনো বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। বিকাশ: {বিকাশ_নম্বর}। ধন্যবাদ, [সমিতির নাম]'
  );

  const handleSend = () => {
    Alert.alert('সফল', '৫ জনকে রিমাইন্ডার পাঠানো হয়েছে!', [
      { text: 'ঠিক আছে', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>রিমাইন্ডার পাঠান</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Recipients Card */}
        <View style={styles.recipientsCard}>
          <View style={styles.recipientsTop}>
            <View style={styles.recipientsLeft}>
              <Ionicons name="people-outline" size={18} color="#1E293B" />
              <Text style={styles.recipientsTitle}>৫ জন প্রাপক</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.changeLink}>বদলান</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.recipientsNames}>
            রফিকুল, করিম, তানভীর, নাসরিন, ফারুক
          </Text>
        </View>

        {/* Section: মাধ্যম */}
        <Text style={styles.sectionHeader}>মাধ্যম</Text>
        <View style={styles.channelsCard}>
          {/* Push */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => setPushSelected(!pushSelected)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, pushSelected && styles.checkboxBoxActive]}>
              {pushSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Ionicons name="notifications-outline" size={20} color="#1E293B" style={styles.channelIcon} />
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>পুশ নোটিফিকেশন</Text>
              <Text style={styles.channelSub}>অ্যাপ আছে ৪ জনের · বিনামূল্যে</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.channelDivider} />

          {/* WhatsApp */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => setWhatsappSelected(!whatsappSelected)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, whatsappSelected && styles.checkboxBoxActive]}>
              {whatsappSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Ionicons name="chatbubble-outline" size={20} color="#1E293B" style={styles.channelIcon} />
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>হোয়াটসঅ্যাপ</Text>
              <Text style={styles.channelSub}>সরাসরি চ্যাটে বার্তা প্রস্তুত থাকবে</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.channelDivider} />

          {/* SMS */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => setSmsSelected(!smsSelected)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, smsSelected && styles.checkboxBoxActive]}>
              {smsSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Ionicons name="mail-outline" size={20} color="#1E293B" style={styles.channelIcon} />
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>এসএমএস</Text>
              <Text style={styles.channelSub}>প্রতি এসএমএসে চার্জ প্রযোজ্য</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: টেমপ্লেট */}
        <Text style={styles.sectionHeader}>টেমপ্লেট</Text>
        <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.8}>
          <Text style={styles.dropdownText}>বকেয়া অনুস্মারক (বাংলা)</Text>
          <Ionicons name="chevron-down" size={18} color="#64748B" />
        </TouchableOpacity>

        {/* Section: বার্তা */}
        <Text style={styles.sectionHeader}>বার্তা</Text>
        <View style={styles.messageBox}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Variable Pills */}
        <View style={styles.variablePillsRow}>
          {['{নাম}', '{বকেয়া_টাকা}', '{বকেয়া_মাস}', '{মোট_জমা}', '{বিকাশ_নম্বর}'].map(
            (tag, idx) => (
              <View key={idx} style={styles.variablePill}>
                <Text style={styles.variablePillText}>{tag}</Text>
              </View>
            )
          )}
        </View>

        {/* Section: প্রিভিউ · রফিকুল ইসলাম */}
        <Text style={styles.sectionHeader}>প্রিভিউ · রফিকুল ইসলাম</Text>
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>
            আসসালামু আলাইকুম রফিকুল ইসলাম, আপনার জুলাই–সেপ্টেম্বর মাসের জমা ৳৬,৩০০ টাকা এখনো বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। বিকাশ: [বিকাশ নম্বর]। ধন্যবাদ, [সমিতির নাম]
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>৫ জনকে পাঠান</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  recipientsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recipientsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recipientsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientsTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  changeLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  recipientsNames: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  sectionHeader: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  channelsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  channelDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxBoxActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  channelIcon: {
    marginRight: 10,
  },
  channelTextCol: {
    flex: 1,
  },
  channelTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  channelSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dropdownText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  messageBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  messageInput: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  variablePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  variablePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  variablePillText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#334155',
  },
  previewBox: {
    backgroundColor: '#E6F4F1',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 16,
  },
  previewText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#134E4A',
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F6F7F2',
  },
  sendBtn: {
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  sendBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
