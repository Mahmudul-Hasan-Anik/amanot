import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { mockMembers } from '../../src/mocks/mockData';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { smsGateway } from '../../src/services/smsGateway';

interface TemplateItem {
  id: string;
  name: string;
  nameEn: string;
  textBn: string;
  textEn: string;
}

export default function ReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { l, isBengali, formatNum, formatMoney } = useLanguage();
  const { members, somitiInfo } = useSomitiStore();

  const allMembers = useMemo(() => {
    return members;
  }, [members]);

  const paramIds = useMemo(() => {
    return params.memberIds ? String(params.memberIds).split(',').filter(Boolean) : [];
  }, [params.memberIds]);

  const preferredIds = useMemo(() => ['6', '2', '10', '4', '11'], []);

  const recipients = useMemo(() => {
    if (paramIds.length > 0) {
      const selected = allMembers.filter((m) => paramIds.includes(m.id));
      if (selected.length > 0) {
        return [...selected].sort((a, b) => {
          const ai = preferredIds.indexOf(a.id);
          const bi = preferredIds.indexOf(b.id);
          if (ai !== -1 && bi !== -1) return ai - bi;
          return 0;
        });
      }
    }
    return allMembers.filter(m=>m.status!=='inactive' && m.dueAmount>0);
  }, [allMembers, paramIds, preferredIds]);

  const [pushSelected, setPushSelected] = useState(false);
  const [whatsappSelected, setWhatsappSelected] = useState(true);
  const [smsSelected, setSmsSelected] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const templates: TemplateItem[] = useMemo(() => [
    {
      id: 'default',
      name: 'বকেয়া অনুস্মারক (বাংলা)',
      nameEn: 'Overdue Reminder (Bangla)',
      textBn: 'আসসালামু আলাইকুম {নাম}, আপনার {বকেয়া_মাস} মাসের জমা {বকেয়া_টাকা} টাকা এখনো বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। বিকাশ: {বিকাশ_নম্বর}। ধন্যবাদ, [সমিতির নাম]',
      textEn: 'Assalamu Alaikum {name}, your deposit of {due_amount} for {due_months} is still pending. Please pay at your earliest convenience. bKash: {bkash_no}. Thank you, [Somiti Name]',
    },
    {
      id: 'polite',
      name: 'নম্র তাগাদা',
      nameEn: 'Polite Reminder',
      textBn: 'আসসালামু আলাইকুম {নাম} ভাই, আশা করি ভালো আছেন। আপনার {বকেয়া_মাস} মাসের কিস্তি {বকেয়া_টাকা} টাকা বকেয়া রয়েছে। সুবিধাজনক সময়ে সমিতির নম্বরে জমা দিতে অনুরোধ করছি। বিকাশ: {বিকাশ_নম্বর}। ধন্যবাদ, [সমিতির নাম]',
      textEn: 'Assalamu Alaikum {name}, hope you are doing well. Your installment of {due_amount} for {due_months} is overdue. Please deposit at your convenience. bKash: {bkash_no}. Thank you, [Somiti Name]',
    },
    {
      id: 'urgent',
      name: 'জরুরি নোটিশ',
      nameEn: 'Urgent Notice',
      textBn: 'জরুরি নোটিশ: জনাব {নাম}, আপনার একাউন্টে {বকেয়া_মাস} মাসের মোট {বকেয়া_টাকা} টাকা বকেয়া পড়েছে। সমিতির নিয়মানুযায়ী দ্রুত পরিশোধ করতে অনুরোধ করা হচ্ছে। বিকাশ: {বিকাশ_নম্বর}। ধন্যবাদ, [সমিতির নাম]',
      textEn: 'Urgent Notice: Dear {name}, a total of {due_amount} for {due_months} is pending on your account. Please settle urgently per somiti rules. bKash: {bkash_no}. Thank you, [Somiti Name]',
    },
  ], []);

  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [message, setMessage] = useState(() => isBengali ? templates[0].textBn : templates[0].textEn);

  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  const handleSelectTemplate = (tmpl: TemplateItem) => {
    setSelectedTemplateId(tmpl.id);
    setMessage(isBengali ? tmpl.textBn : tmpl.textEn);
    setIsTemplateModalOpen(false);
  };

  const handleInsertTag = (tag: string) => {
    setMessage((prev) => prev + ' ' + tag);
  };

  const renderFor = (m: (typeof allMembers)[0]) => {
    if (!m) return '';

    const monthsText = `${formatNum(m.dueMonths)} ${l('months','মাস')}`;

    const nameVal = isBengali ? m.name : (m.nameEn || m.name);
    const dueAmountVal = formatMoney(m.dueAmount || 0);
    const totalDepositVal = formatMoney(m.totalDeposit || 0);

    return message
      .replace(/{নাম}/g, nameVal)
      .replace(/{name}/g, nameVal)
      .replace(/{বকেয়া_টাকা}/g, dueAmountVal)
      .replace(/{due_amount}/g, dueAmountVal)
      .replace(/{বকেয়া_মাস}/g, monthsText)
      .replace(/{due_months}/g, monthsText)
      .replace(/{মোট_জমা}/g, totalDepositVal)
      .replace(/{total_deposit}/g, totalDepositVal)
      .replace(/{বিকাশ_নম্বর}/g, isBengali ? '[বিকাশ নম্বর]' : '[bKash Number]')
      .replace(/{bkash_no}/g, isBengali ? '[বিকাশ নম্বর]' : '[bKash Number]')
      .replace(/\[সমিতির নাম\]/g, isBengali ? '[সমিতির নাম]' : '[Somiti Name]');
  };

  const firstRecipient = recipients[0];
  const firstRecipientName = firstRecipient ? (isBengali ? firstRecipient.name : (firstRecipient.nameEn || firstRecipient.name)) : '';

  const recipientsSummary = useMemo(() => {
    if (recipients.length === 0) return '';
    return recipients.map((r) => isBengali ? r.name.split(' ')[0] : (r.nameEn || r.name).split(' ')[0]).join(', ');
  }, [recipients, isBengali]);

  const [sending,setSending] = useState(false);
  const handleSend = async () => {
    if (sending || !recipients.length) return;
    if (pushSelected) { Alert.alert(l('Push unavailable','পুশ এখনো সংযুক্ত নয়'),l('Choose SMS or prepare a WhatsApp message.','SMS বা WhatsApp বেছে নিন।')); return; }
    if (!smsSelected && !whatsappSelected) { Alert.alert(l('Choose a channel','মাধ্যম নির্বাচন করুন')); return; }
    setSending(true);
    try {
      if (whatsappSelected && firstRecipient) {
        const phone=(firstRecipient.whatsapp||firstRecipient.phone).replace(/[^0-9]/g,'');
        await Linking.openURL('https://wa.me/'+(phone.startsWith('88')?phone:'88'+phone)+'?text='+encodeURIComponent(renderFor(firstRecipient)));
      }
      if (smsSelected) {
        const result=await smsGateway.sendBulkSms(recipients.map(r=>({phone:r.phone,message:renderFor(r),templateType:'overdue_reminder',recipientName:r.name,memberId:r.id})));
        const simulated=result.logs.filter(log=>log.provider==='mock').length;
        Alert.alert(l('SMS result','SMS-এর ফলাফল'),simulated?l(simulated+' messages simulated; no SMS was delivered.',formatNum(simulated)+'টি ডেমো বার্তা তৈরি হয়েছে; SMS পাঠানো হয়নি।'):l(result.sentCount+' accepted, '+result.failedCount+' failed.',formatNum(result.sentCount)+'টি গৃহীত, '+formatNum(result.failedCount)+'টি ব্যর্থ।'));
      }
    } catch(e:any) {Alert.alert(l('Failed','ব্যর্থ'),e.message);} finally {setSending(false);}
  };

  const variableTags = isBengali
    ? ['{নাম}', '{বকেয়া_টাকা}', '{বকেয়া_মাস}', '{মোট_জমা}', '{বিকাশ_নম্বর}']
    : ['{name}', '{due_amount}', '{due_months}', '{total_deposit}', '{bkash_no}'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/due')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Send Reminder', 'রিমাইন্ডার পাঠান')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Recipients Card */}
        <View style={styles.recipientsCard}>
          <View style={styles.recipientsTop}>
            <View style={styles.recipientsLeft}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.recipientsTitle}>{formatNum(recipients.length)} {l('Recipients', 'জন প্রাপক')}</Text>
            </View>
            <TouchableOpacity onPress={() => safeBack(router, '/(admin)/due')} activeOpacity={0.7}>
              <Text style={styles.changeLink}>{l('Change', 'বদলান')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.recipientsNames} numberOfLines={1}>
            {recipientsSummary}
          </Text>
        </View>

        {/* Section: মাধ্যম (Channel) */}
        <Text style={styles.sectionHeader}>{l('Channels', 'মাধ্যম')}</Text>
        <View style={styles.channelsCard}>
          {/* Push */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => setPushSelected(!pushSelected)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, pushSelected && styles.checkboxBoxActive]}>
              {pushSelected && <Ionicons name="checkmark" size={14} color={colors.surface} />}
            </View>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} style={styles.channelIcon} />
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>{l('Push Notification', 'পুশ নোটিফিকেশন')}</Text>
              <Text style={styles.channelSub}>{l('Requires a notification service', 'নোটিফিকেশন সার্ভিস সংযোগ প্রয়োজন')}</Text>
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
              {whatsappSelected && <Ionicons name="checkmark" size={14} color={colors.surface} />}
            </View>
            <Ionicons name="chatbubble-outline" size={20} color={colors.primary} style={styles.channelIcon} />
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
              <Text style={styles.channelSub}>{l('Direct chat message ready', 'সরাসরি চ্যাটে বার্তা প্রস্তুত থাকবে')}</Text>
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
              {smsSelected && <Ionicons name="checkmark" size={14} color={colors.surface} />}
            </View>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.channelIcon} />
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>{l('SMS', 'এসএমএস')}</Text>
              <Text style={styles.channelSub}>{l('Per SMS charge applies', 'প্রতি এসএমএসে চার্জ প্রযোজ্য')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: টেমপ্লেট (Template) */}
        <Text style={styles.sectionHeader}>{l('Template', 'টেমপ্লেট')}</Text>
        <TouchableOpacity
          style={styles.dropdownBox}
          onPress={() => setIsTemplateModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownText}>
            {isBengali ? currentTemplate.name : currentTemplate.nameEn}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Section: বার্তা (Message) */}
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

        {/* Variable Tags Row */}
        <View style={styles.variablePillsRow}>
          {variableTags.map((tag, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.variablePill}
              onPress={() => handleInsertTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={styles.variablePillText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: প্রিভিউ · রফিকুল ইসলাম (Preview) */}
        <Text style={styles.sectionHeader}>
          {l('Preview · ', 'প্রিভিউ · ')}{firstRecipientName}
        </Text>
        <View style={styles.previewContainer}>
          <View style={styles.previewBubble}>
            <Text style={styles.previewText}>
              {firstRecipient ? renderFor(firstRecipient) : l('No due members to preview.', 'প্রিভিউ দেখানোর মতো বকেয়া সদস্য নেই।')}
            </Text>
          </View>
        </View>

        <View style={styles.scrollBottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend} disabled={sending}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane" size={18} color={colors.surface} />
          <Text style={styles.sendBtnText}>
            {isBengali ? `${formatNum(recipients.length)} জনকে পাঠান` : `Send to ${formatNum(recipients.length)} Recipients`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Template Selection Modal */}
      <Modal
        visible={isTemplateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTemplateModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsTemplateModalOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{l('Select Template', 'টেমপ্লেট নির্বাচন করুন')}</Text>
            {templates.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <TouchableOpacity
                  key={tmpl.id}
                  style={[styles.modalItem, isSelected && styles.modalItemActive]}
                  onPress={() => handleSelectTemplate(tmpl)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                    {isBengali ? tmpl.name : tmpl.nameEn}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  recipientsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recipientsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recipientsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientsTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  changeLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  recipientsNames: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  sectionHeader: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  channelsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  channelDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 10,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.surface,
  },
  checkboxBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  channelIcon: {
    marginRight: 12,
  },
  channelTextCol: {
    flex: 1,
  },
  channelTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  channelSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  dropdownText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  messageBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  messageInput: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    color: colors.text,
    lineHeight: typography.lineHeight.subhead + 4,
    textAlignVertical: 'top',
    minHeight: 88,
  },
  variablePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  variablePill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  variablePillText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  previewContainer: {
    backgroundColor: colors.previewContainer,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  previewBubble: {
    backgroundColor: colors.previewBubble,
    borderRadius: 12,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  previewText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.subhead + 2,
    color: colors.text,
  },
  scrollBottomSpacer: {
    height: 30,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.bg,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  sendBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
    marginBottom: 14,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalItemActive: {
    backgroundColor: colors.primarySoft,
  },
  modalItemText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  modalItemTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});
