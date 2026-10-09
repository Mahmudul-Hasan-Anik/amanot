import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useSomitiStore } from '../../src/store/somitiStore';
import { exportAndShareReceipt } from '../../src/utils/pdfExport';

export default function StatementScreen() {
  const router = useRouter();
  const { l, isBengali } = useLanguage();
  const { somitiInfo } = useSomitiStore();

  const handleDownloadStatementPdf = () => {
    exportAndShareReceipt({
      receiptNo: 'STM-2026',
      memberName: 'করিম উদ্দিন',
      memberCode: 'SM-042',
      memberPhone: '01712-345678',
      amount: 18000,
      date: '৩০ সেপ্টেম্বর ২০২৬',
      paymentMethod: 'bank',
      months: ['জানুয়ারি - সেপ্টেম্বর'],
      dueAmount: 4100,
      somitiName: somitiInfo.name,
      somitiReg: somitiInfo.regNo,
    });
  };

  const [target, setTarget] = useState<'all' | 'due' | 'single' | 'custom'>('all');
  const [whatsapp, setWhatsapp] = useState(true);
  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);

  const [autoMonthly, setAutoMonthly] = useState(true);
  const [autoFullPdf, setAutoFullPdf] = useState(true);
  const [autoAnnual, setAutoAnnual] = useState(true);

  const handleSend = () => {
    const channelNames = [];
    if (whatsapp) channelNames.push('WhatsApp');
    if (sms) channelNames.push('SMS');
    if (push) channelNames.push('Push');

    if (channelNames.length === 0) {
      Alert.alert(
        l('Select Channel', 'মাধ্যম নির্বাচন করুন'),
        l('Please select at least one delivery channel.', 'অনুগ্রহ করে অন্তত একটি প্রেরণের মাধ্যম নির্বাচন করুন।')
      );
      return;
    }

    const countStr = target === 'all' ? '96' : target === 'due' ? '22' : '1';
    Alert.alert(
      l('Statement Sent', 'স্টেটমেন্ট পাঠানো হয়েছে'),
      l(
        `Statements successfully delivered to ${countStr} members via ${channelNames.join(', ')}.`,
        `${channelNames.join(' ও ')} মাধ্যমের সাহায্যে ${isBengali ? '৯৬' : countStr} জন সদস্যকে স্টেটমেন্ট পাঠানো সম্পন্ন হয়েছে।`
      )
    );
  };

  const recipientCountLabel =
    target === 'all'
      ? l('96 Members', '৯৬ জনকে')
      : target === 'due'
      ? l('22 Members', '২২ জনকে')
      : l('1 Member', '১ জনকে');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Send Statement', 'স্টেটমেন্ট পাঠান')}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section: সময়কাল */}
        <Text style={styles.sectionHeading}>{l('Period', 'সময়কাল')}</Text>
        <TouchableOpacity
          style={styles.periodBox}
          onPress={() => Alert.alert(l('Period', 'সময়কাল'), l('Select statement duration', 'স্টেটমেন্টের সময়সীমা নির্বাচন করুন'))}
          activeOpacity={0.8}
        >
          <Text style={styles.periodBoxText}>
            {l('January – September 2026', 'জানুয়ারি – সেপ্টেম্বর ২০২৬')}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Section: কাকে পাঠাবেন */}
        <Text style={styles.sectionHeading}>{l('Recipients', 'কাকে পাঠাবেন')}</Text>
        <View style={styles.recipientChipsWrap}>
          <TouchableOpacity
            style={[styles.chipBtn, target === 'all' && styles.chipBtnActive]}
            onPress={() => setTarget('all')}
            activeOpacity={0.8}
          >
            {target === 'all' && (
              <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.chipCheck} />
            )}
            <Text style={[styles.chipText, target === 'all' && styles.chipTextActive]}>
              {l('All Active 96', 'সকল সক্রিয় ৯৬')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chipBtn, target === 'due' && styles.chipBtnActive]}
            onPress={() => setTarget('due')}
            activeOpacity={0.8}
          >
            {target === 'due' && (
              <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.chipCheck} />
            )}
            <Text style={[styles.chipText, target === 'due' && styles.chipTextActive]}>
              {l('Overdue 22', 'বকেয়াধারী ২২')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chipBtn, target === 'single' && styles.chipBtnActive]}
            onPress={() => setTarget('single')}
            activeOpacity={0.8}
          >
            {target === 'single' && (
              <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.chipCheck} />
            )}
            <Text style={[styles.chipText, target === 'single' && styles.chipTextActive]}>
              {l('Single Member', 'একজন')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Second Row Chip: বাছাই করুন */}
        <View style={styles.recipientSecondRow}>
          <TouchableOpacity
            style={[styles.chipBtn, target === 'custom' && styles.chipBtnActive]}
            onPress={() => setTarget('custom')}
            activeOpacity={0.8}
          >
            {target === 'custom' && (
              <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.chipCheck} />
            )}
            <Text style={[styles.chipText, target === 'custom' && styles.chipTextActive]}>
              {l('Custom Select', 'বাছাই করুন')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: মাধ্যম */}
        <Text style={styles.sectionHeading}>{l('Channels', 'মাধ্যম')}</Text>
        <View style={styles.channelsCard}>
          {/* Channel 1: WhatsApp */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => setWhatsapp(!whatsapp)}
            activeOpacity={0.8}
          >
            <View style={[styles.customCheckbox, whatsapp && styles.customCheckboxActive]}>
              {whatsapp && <Ionicons name="checkmark" size={13} color={colors.surface} />}
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>
                {l('PDF Statement via WhatsApp', 'হোয়াটসঅ্যাপে PDF স্টেটমেন্ট')}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.cardDivider} />

          {/* Channel 2: SMS */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => setSms(!sms)}
            activeOpacity={0.8}
          >
            <View style={[styles.customCheckbox, sms && styles.customCheckboxActive]}>
              {sms && <Ionicons name="checkmark" size={13} color={colors.surface} />}
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>
                {l('Short Balance via SMS', 'এসএমএসে সংক্ষিপ্ত ব্যালেন্স')}
              </Text>
              <Text style={styles.channelSub}>
                {l('For 18 members without smartphones', 'স্মার্টফোন নেই এমন ১৮ জনের জন্য')}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.cardDivider} />

          {/* Channel 3: Push */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => setPush(!push)}
            activeOpacity={0.8}
          >
            <View style={[styles.customCheckbox, push && styles.customCheckboxActive]}>
              {push && <Ionicons name="checkmark" size={13} color={colors.surface} />}
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>
                {l('Push Notification', 'পুশ নোটিফিকেশন')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: প্রিভিউ */}
        <Text style={styles.sectionHeading}>{l('Preview', 'প্রিভিউ')}</Text>
        <View style={styles.previewContainer}>
          <View style={styles.previewInnerCard}>
            {/* Header within preview */}
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewLogoTile}>
                <Text style={styles.previewLogoText}>{l('S', 'স')}</Text>
              </View>
              <View style={styles.previewHeaderInfo}>
                <Text style={styles.previewSomitiName}>
                  {l(somitiInfo.nameEn || 'Amanot Somiti', somitiInfo.name || 'আমানত সমিতি')}
                </Text>
                <Text style={styles.previewDocType}>
                  {l('Member Statement · Jan-Sep 2026', 'সদস্য স্টেটমেন্ট · জানু-সেপ্টে ২০২৬')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewDownloadBtn}
                onPress={handleDownloadStatementPdf}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={14} color={colors.primary} />
                <Text style={styles.previewDownloadText}>{l('PDF', 'পিডিএফ')}</Text>
              </TouchableOpacity>
            </View>

            {/* Green divider line */}
            <View style={styles.previewGreenRule} />

            {/* Member Identity */}
            <Text style={styles.previewMemberTitle}>
              {l('Karim Uddin · SM-042', 'করিম উদ্দিন · SM-042')}
            </Text>

            {/* 3 Transactions Table Rows */}
            <View style={styles.previewTxnRow}>
              <Text style={styles.previewTxnColDate}>{l('8 July', '৮ জুলাই')}</Text>
              <Text style={styles.previewTxnColDesc}>{l('July Deposit', 'জুলাই জমা')}</Text>
              <Text style={styles.previewTxnColAmount}>{l('৳2,000', '৳২,০০০')}</Text>
            </View>

            <View style={styles.previewTxnRow}>
              <Text style={styles.previewTxnColDate}>{l('9 June', '৯ জুন')}</Text>
              <Text style={styles.previewTxnColDesc}>{l('June Deposit', 'জুন জমা')}</Text>
              <Text style={styles.previewTxnColAmount}>{l('৳2,000', '৳২,০০০')}</Text>
            </View>

            <View style={styles.previewTxnRow}>
              <Text style={styles.previewTxnColDate}>{l('15 Jan', '১৫ জানু')}</Text>
              <Text style={styles.previewTxnColDesc}>{l('2025 Profit', '২০২৫ লাভ')}</Text>
              <Text style={styles.previewTxnColAmount}>{l('৳7,800', '৳৭,৮০০')}</Text>
            </View>

            <View style={styles.previewCardSubDivider} />

            {/* Summary Rows */}
            <View style={styles.previewSummaryRow}>
              <Text style={styles.previewClosingLabel}>
                {l('Closing Balance', 'সমাপনী ব্যালেন্স')}
              </Text>
              <Text style={styles.previewClosingAmount}>
                {l('৳1,08,000', '৳১,০৮,০০০')}
              </Text>
            </View>

            <View style={styles.previewSummaryRow}>
              <Text style={styles.previewDueLabel}>
                {l('Overdue', 'বকেয়া')}
              </Text>
              <Text style={styles.previewDueAmount}>
                {l('৳4,100', '৳৪,১০০')}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: স্বয়ংক্রিয় সময়সূচি */}
        <Text style={styles.sectionHeading}>{l('Automated Schedule', 'স্বয়ংক্রিয় সময়সূচি')}</Text>
        <View style={styles.scheduleCard}>
          {/* Toggle 1 */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>
                {l('Monthly Balance', 'মাসিক ব্যালেন্স')}
              </Text>
              <Text style={styles.toggleSub}>
                {l('1st-5th of each month', 'প্রতি মাসের ১-৫ তারিখে')}
              </Text>
            </View>
            <Switch
              value={autoMonthly}
              onValueChange={setAutoMonthly}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Toggle 2 */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>
                {l('Full PDF Statement', 'পূর্ণ PDF স্টেটমেন্ট')}
              </Text>
              <Text style={styles.toggleSub}>
                {l('Every 3 months', 'প্রতি ৩ মাসে')}
              </Text>
            </View>
            <Switch
              value={autoFullPdf}
              onValueChange={setAutoFullPdf}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Toggle 3 */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>
                {l('Annual Statement', 'বার্ষিক স্টেটমেন্ট')}
              </Text>
              <Text style={styles.toggleSub}>
                {l('After distribution approval', 'বণ্টন অনুমোদনের পর')}
              </Text>
            </View>
            <Switch
              value={autoAnnual}
              onValueChange={setAutoAnnual}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Sticky Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={18} color={colors.surface} style={styles.sendIcon} />
          <Text style={styles.sendButtonText}>
            {l(`Send to ${recipientCountLabel}`, `${recipientCountLabel} পাঠান`)}
          </Text>
        </TouchableOpacity>
      </View>
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
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  sectionHeading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
    marginBottom: 8,
  },
  periodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  periodBoxText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  recipientChipsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  recipientSecondRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  chipTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  channelsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  customCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  channelTextCol: {
    flex: 1,
  },
  channelTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  channelSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
  },
  previewContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    padding: 12,
    marginBottom: 18,
  },
  previewInnerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLogoTile: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  previewLogoText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.surface,
  },
  previewHeaderInfo: {
    flex: 1,
  },
  previewSomitiName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  previewDocType: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  previewDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  previewDownloadText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  previewGreenRule: {
    height: 2,
    backgroundColor: colors.primary,
    marginVertical: 10,
    borderRadius: 1,
  },
  previewMemberTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
    marginBottom: 8,
  },
  previewTxnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  previewTxnColDate: {
    width: 68,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  previewTxnColDesc: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  previewTxnColAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    color: colors.text,
    textAlign: 'right',
  },
  previewCardSubDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 8,
  },
  previewSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  previewClosingLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  previewClosingAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.primary,
  },
  previewDueLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.warning,
  },
  previewDueAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    color: colors.warning,
  },
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  toggleSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 16,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.surface,
  },
});
