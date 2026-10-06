import React, { useState, useMemo } from 'react';
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
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';

export default function ReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { l, formatNum } = useLanguage();
  const { members, somitiInfo } = useSomitiStore();

  const paramIds = params.memberIds ? String(params.memberIds).split(',').filter(Boolean) : [];
  const recipients = useMemo(() => {
    if (paramIds.length > 0) {
      return members.filter((m) => paramIds.includes(m.id));
    }
    return members.filter((m) => m.status === 'due' || m.status === 'partial' || m.dueAmount > 0);
  }, [members, paramIds]);

  const [pushSelected, setPushSelected] = useState(true);
  const [whatsappSelected, setWhatsappSelected] = useState(true);
  const [smsSelected, setSmsSelected] = useState(false);

  const templates = [
    {
      id: 'polite',
      name: l('Polite', 'নম্র তাগাদা'),
      text: `আসসালামু আলাইকুম {নাম} ভাই, আশা করি ভালো আছেন। আপনার {বকেয়া_মাস} মাসের কিস্তি (৳{বকেয়া_টাকা}) বকেয়া রয়েছে। সুবিধাজনক সময়ে সমিতির নম্বরে জমা দিতে অনুরোধ করছি। ধন্যবাদ, ${somitiInfo.name}।`,
    },
    {
      id: 'standard',
      name: l('Standard', 'সাধারণ কিস্তি'),
      text: `আসসালামু আলাইকুম {নাম}, আপনার বকেয়া কিস্তি ৳{বকেয়া_টাকা} জমা দেওয়া হয়নি। অনুগ্রহ করে দ্রুত পরিশোধ করুন। বিকাশ: ${somitiInfo.phone}। ধন্যবাদ, ${somitiInfo.name}।`,
    },
    {
      id: 'urgent',
      name: l('Urgent', 'জরুরি নোটিশ'),
      text: `জরুরি নোটিশ: জনাব {নাম}, আপনার একাউন্টে {বকেয়া_মাস} মাসের মোট ৳{বকেয়া_টাকা} বকেয়া পড়েছে। সমিতির নিয়মানুযায়ী আগামী ৩ দিনের মধ্যে পরিশোধ করতে অনুরোধ করা হচ্ছে। যোগাযোগ: ${somitiInfo.phone}।`,
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState('polite');
  const [message, setMessage] = useState(templates[0].text);

  const handleSelectTemplate = (tmpl: typeof templates[0]) => {
    setSelectedTemplate(tmpl.id);
    setMessage(tmpl.text);
  };

  const renderFor = (m: any) =>
    message
      .replace(/{নাম}/g, m.name)
      .replace(/{বকেয়া_টাকা}/g, String(m.dueAmount || 0))
      .replace(/{বকেয়া_মাস}/g, String(m.dueMonths || 0))
      .replace(/{মোট_জমা}/g, String(m.totalDeposit || 0))
      .replace(/{বিকাশ_নম্বর}/g, somitiInfo.bkashNo || somitiInfo.phone || '')
      .replace(/{সমিতির_নাম}/g, somitiInfo.name || '');

  const handleSend = () => {
    if (recipients.length === 0) {
      Alert.alert(l('No Recipients', 'কোনো প্রাপক নেই'), l('Please select at least one recipient.', 'অনুগ্রহ করে অন্তত একজন প্রাপক নির্বাচন করুন।'));
      return;
    }

    if (whatsappSelected && recipients.length > 0) {
      const first = recipients[0];
      const cleanPhone = (first.whatsapp || first.phone).replace(/[^0-9]/g, '');
      const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
      const renderedMsg = renderFor(first);
      Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(renderedMsg)}`);
    }

    Alert.alert(
      l('Success', 'সফল'),
      `${formatNum(recipients.length)} ${l('recipients received the reminder message successfully!', 'জনকে রিমাইন্ডার বার্তা সফলভাবে পাঠানো হয়েছে!')}`,
      [{ text: l('OK', 'ঠিক আছে'), onPress: () => safeBack(router, '/(admin)/due') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/due')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Send Reminder', 'রিমাইন্ডার পাঠান')}</Text>
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
              <Text style={styles.recipientsTitle}>{formatNum(recipients.length)} {l('Recipients', 'জন প্রাপক')}</Text>
            </View>
            <TouchableOpacity onPress={() => safeBack(router, '/(admin)/due')} activeOpacity={0.7}>
              <Text style={styles.changeLink}>{l('Change', 'বদলান')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.recipientsNames}>
            {recipients.map((r) => r.name).slice(0, 5).join(', ')}{recipients.length > 5 ? ` +${formatNum(recipients.length - 5)}` : ''}
          </Text>
        </View>

        {/* Section: মাধ্যম */}
        <Text style={styles.sectionHeader}>{l('Channel', 'মাধ্যম')}</Text>
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
              <Text style={styles.channelTitle}>{l('Push Notification', 'পুশ নোটিফিকেশন')}</Text>
              <Text style={styles.channelSub}>{l('App installed: 4 members · Free', 'অ্যাপ আছে ৪ জনের · বিনামূল্যে')}</Text>
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
              <Text style={styles.channelTitle}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
              <Text style={styles.channelSub}>{l('Message ready in direct chat', 'সরাসরি চ্যাটে বার্তা প্রস্তুত থাকবে')}</Text>
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
              <Text style={styles.channelTitle}>{l('SMS', 'এসএমএস')}</Text>
              <Text style={styles.channelSub}>{l('Standard SMS charges apply', 'প্রতি এসএমএসে চার্জ প্রযোজ্য')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: টেমপ্লেট */}
        <Text style={styles.sectionHeader}>{l('Select Template', 'টেমপ্লেট নির্বাচন করুন')}</Text>
        <View style={styles.templatePillsRow}>
          {templates.map((tmpl) => (
            <TouchableOpacity
              key={tmpl.id}
              style={[styles.templatePill, selectedTemplate === tmpl.id && styles.templatePillActive]}
              onPress={() => handleSelectTemplate(tmpl)}
              activeOpacity={0.8}
            >
              <Text style={[styles.templatePillText, selectedTemplate === tmpl.id && styles.templatePillTextActive]}>
                {tmpl.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: বার্তা */}
        <Text style={styles.sectionHeader}>{l('Message', 'বার্তা')}</Text>
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
        <Text style={styles.sectionHeader}>{l(`Preview · ${recipients[0]?.name || ''}`, `প্রিভিউ · ${recipients[0]?.name || ''}`)}</Text>
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>
            {recipients[0] ? renderFor(recipients[0]) : l('No due members to preview.', 'প্রিভিউ দেখানোর মতো বকেয়া সদস্য নেই।')}
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
          <Text style={styles.sendBtnText}>{l('Send to', 'পাঠান')} {formatNum(5)} {l('Members', 'জনকে')}</Text>
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
  templatePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  templatePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templatePillActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  templatePillText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  templatePillTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
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
