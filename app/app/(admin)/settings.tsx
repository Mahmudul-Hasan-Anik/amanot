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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/features/auth/authStore';
import { REMOTE } from '../../src/store/somitiStore';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { resetAllData, somitiInfo, updateSomitiInfo } = useSomitiStore();
  const {
    language,
    isBengali,
    useBengaliDigits,
    l,
    formatMoney,
    formatNum,
    setLanguage,
    setUseBengaliDigits,
    dueDateDay: localDueDay,
    setDueDateDay,
    gracePeriodDays: localGrace,
    setGracePeriodDays,
    defaultMonthlyDeposit: localDefaultDeposit,
    setDefaultMonthlyDeposit,
    lateFeeAmount: localLateFee,
    setLateFeeAmount,
    expenseApprovalLimit: localLimit,
    setExpenseApprovalLimit,
    accountingYear,
    setAccountingYear,
    autoReminder,
    setAutoReminder,
  } = useLanguage();

  // In live (Supabase) mode these settings belong to the somiti and are saved on the server
  const info: any = somitiInfo;
  const pick = (key: string, local: number) =>
    REMOTE && info?.[key] !== undefined && info?.[key] !== ''
      ? Number(info[key])
      : local;
  const dueDateDay = pick('dueDay', localDueDay);
  const gracePeriodDays = pick('graceDays', localGrace);
  const defaultMonthlyDeposit = pick('defaultMonthly', localDefaultDeposit);
  const lateFeeAmount = pick('lateFee', localLateFee);
  const expenseApprovalLimit = pick('expenseApprovalLimit', localLimit);
  const saveSetting = (key: string, value: number) => {
    if (REMOTE) updateSomitiInfo({ [key]: value } as any);
  };

  // Auto-approve toggle state (defaults to true per user directive)
  const [autoApprove, setAutoApprove] = useState(true);

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const handleResetData = () => {
    if (REMOTE) {
      resetAllData(); // live mode: reload from server, never deletes anything
      Alert.alert(
        l('Done', 'সম্পন্ন'),
        l('Data reloaded from server.', 'সার্ভার থেকে তথ্য রিলোড হয়েছে।')
      );
      return;
    }
    Alert.alert(
      l('Reset Demo Data', 'ডেটা রিসেট নিশ্চিতকরণ'),
      l(
        'Are you sure you want to reset all data to default demo state?',
        'আপনি কি সকল তথ্য পুনরায় প্রাথমিক অবস্থায় ফিরিয়ে নিতে চান?'
      ),
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Yes, Reset', 'হ্যাঁ, রিসেট করুন'),
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert(
              l('Success', 'সফল'),
              l('All demo data has been reset.', 'অ্যাপের সকল ডেমো তথ্য সফলভাবে রিসেট হয়েছে।')
            );
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      l('Logout Confirmation', 'লগআউট নিশ্চিতকরণ'),
      l('Are you sure you want to log out of Amanot?', 'আপনি কি আমানত অ্যাপ থেকে লগআউট করতে চান?'),
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Logout', 'লগআউট'),
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleBackupNow = () => {
    Alert.alert(
      l('Backup Status', 'ব্যাকআপ অবস্থা'),
      l(
        'Local data successfully backed up right now.',
        'সকল তথ্য সফলভাবে ক্লাউড ও লোকাল মেমোরিতে ব্যাকআপ সম্পন্ন হয়েছে।'
      )
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/more')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Settings', 'সেটিংস')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section 1: মাসিক জমা (Monthly Deposit) */}
        <Text style={styles.sectionTitle}>{l('Monthly Deposit', 'মাসিক জমা')}</Text>
        <View style={styles.card}>
          {/* Row 1: Default Monthly Deposit */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => setShowDepositModal(true)}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>
                {l('Default Monthly Deposit', 'ডিফল্ট মাসিক জমা')}
              </Text>
              <Text style={styles.rowSub}>
                {l('Customizable per member', 'সদস্যভিত্তিক পরিবর্তনযোগ্য')}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{formatMoney(defaultMonthlyDeposit)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2: Due Date / Date Setting */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => setShowDateModal(true)}
          >
            <Text style={styles.rowTitle}>{l('Deposit Due Date', 'জমার শেষ তারিখ')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {isBengali
                  ? `প্রতি মাসের ${formatNum(dueDateDay)} তারিখ`
                  : `${dueDateDay}th of every month`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 3: Grace Period */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              const next =
                gracePeriodDays === 5
                  ? 7
                  : gracePeriodDays === 7
                  ? 10
                  : gracePeriodDays === 10
                  ? 3
                  : 5;
              setGracePeriodDays(next);
              saveSetting('graceDays', next);
            }}
          >
            <Text style={styles.rowTitle}>{l('Grace Period', 'গ্রেস পিরিয়ড')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {isBengali ? `${formatNum(gracePeriodDays)} দিন` : `${gracePeriodDays} days`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 4: Late Fee */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              const next =
                lateFeeAmount === 100
                  ? 150
                  : lateFeeAmount === 150
                  ? 200
                  : lateFeeAmount === 200
                  ? 50
                  : 100;
              setLateFeeAmount(next);
              saveSetting('lateFee', next);
            }}
          >
            <Text style={styles.rowTitle}>{l('Late Fee', 'বিলম্ব ফি')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {isBengali
                  ? `${formatMoney(lateFeeAmount)} (নির্দিষ্ট)`
                  : `${formatMoney(lateFeeAmount)} (Fixed)`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 2: লাভ-ক্ষতি বণ্টন (Profit-Loss Distribution) */}
        <Text style={styles.sectionTitle}>
          {l('Profit-Loss Distribution', 'লাভ-ক্ষতি বণ্টন')}
        </Text>
        <View style={styles.card}>
          {/* Row 1: Accounting Year */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              const next = accountingYear === 'Jan – Dec' ? 'Jul – Jun' : 'Jan – Dec';
              setAccountingYear(next);
            }}
          >
            <Text style={styles.rowTitle}>{l('Accounting Year', 'হিসাব বছর')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {accountingYear === 'Jan – Dec'
                  ? l('Jan – Dec', 'জানু – ডিসে')
                  : l('Jul – Jun', 'জুলাই – জুন')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2: Distribution Method */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>{l('Distribution Method', 'বণ্টন পদ্ধতি')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {l('Proportional to Deposit', 'মোট জমার অনুপাতে')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 3: Reserve Fund */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{l('Reserve Fund', 'রিজার্ভ ফান্ড')}</Text>
              <Text style={styles.rowSub}>
                {l('Committee set · Locked at year start', 'কমিটি নির্ধারিত · বছর শুরুতে লক')}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{formatNum('10')}%</Text>
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 4: Director Share */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{l('Director Share', 'পরিচালক অংশ')}</Text>
              <Text style={styles.rowSub}>
                {l('Committee set · Locked at year start', 'কমিটি নির্ধারিত · বছর শুরুতে লক')}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{formatNum('10')}%</Text>
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 5: Director Max Cap */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>
              {l('Director Max Limit', 'পরিচালক অংশের সর্বোচ্চ সীমা')}
            </Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{formatNum('20')}%</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 6: In Case of Loss */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>{l('In Case of Loss', 'ক্ষতি হলে')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{l('From members deposit', 'সদস্যদের জমা থেকে')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Notice Info Box */}
        <View style={styles.noticeBox}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textSecondary}
            style={styles.noticeIcon}
          />
          <Text style={styles.noticeText}>
            {l(
              'Changing percentages mid-year requires approval from the President and another committee member.',
              'বছরের মাঝে শতাংশ পরিবর্তন করতে সভাপতি ও আরও একজন কমিটি সদস্যের অনুমোদন লাগবে।'
            )}
          </Text>
        </View>

        {/* Section 3: অনুমোদন (Approvals) - Page 22 */}
        <Text style={styles.sectionTitle}>{l('Approvals', 'অনুমোদন')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => setShowApprovalModal(true)}
          >
            <Text style={styles.rowTitle}>
              {l('Expense Approval Limit', 'ব্যয় অনুমোদনের সীমা')}
            </Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{formatMoney(expenseApprovalLimit)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>{l('New Investment', 'নতুন বিনিয়োগ')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {l('Always Require Approval', 'সবসময় অনুমোদন')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* User Request: Auto-Approve Feature */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>
                {l('Auto Approval', 'স্বয়ংক্রিয় অনুমোদন')}
              </Text>
              <Text style={styles.rowSub}>
                {l('Auto-approve expenses within limit', 'সীমার ভেতরের ব্যয় স্বয়ংক্রিয় অনুমোদন')}
              </Text>
            </View>
            <Switch
              value={autoApprove}
              onValueChange={setAutoApprove}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        {/* Section 4: যোগাযোগ (Communication) - Page 22 */}
        <Text style={styles.sectionTitle}>{l('Communication', 'যোগাযোগ')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>
                {l('Automatic Due Reminder', 'স্বয়ংক্রিয় বকেয়া রিমাইন্ডার')}
              </Text>
              <Text style={styles.rowSub}>
                {l('3 days before the due date', 'শেষ তারিখের ৩ দিন আগে থেকে')}
              </Text>
            </View>
            <Switch
              value={autoReminder}
              onValueChange={setAutoReminder}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => router.push('/(admin)/reminder')}
          >
            <Text style={styles.rowTitle}>{l('Message Templates', 'বার্তার টেমপ্লেট')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{isBengali ? '৫টি' : '5'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>{l('SMS Gateway', 'এসএমএস গেটওয়ে')}</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.valText, { color: colors.primary }]}>
                {l('Connected', 'সংযুক্ত')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 5: অ্যাপ (App Settings) - Page 22 */}
        <Text style={styles.sectionTitle}>{l('App', 'অ্যাপ')}</Text>
        <View style={styles.card}>
          {/* Row 1: Language Switcher */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => setShowLanguageModal(true)}
          >
            <Text style={styles.rowTitle}>{l('Language', 'ভাষা')}</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.valText, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>
                {language === 'bn' ? 'বাংলা' : 'English'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2: Bengali Digits */}
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{l('Bengali Digits', 'বাংলা সংখ্যা')}</Text>
            <Switch
              value={useBengaliDigits}
              onValueChange={setUseBengaliDigits}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.divider} />

          {/* Row 3: Backup */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={handleBackupNow}
          >
            <Text style={styles.rowTitle}>{l('Backup', 'ব্যাকআপ')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {l('Daily · Today 2:00', 'প্রতিদিন · আজ ২:০০')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 6: সিস্টেম ও সেশন (System & Session) */}
        <Text style={styles.sectionTitle}>{l('System & Session', 'সিস্টেম ও সেশন')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleResetData}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, { color: colors.warning }]}>
                {REMOTE
                  ? l('Reload data from server', 'সার্ভার থেকে তথ্য রিলোড করুন')
                  : l('Reset Demo Data', 'ডেমো ডেটা রিসেট করুন')}
              </Text>
              <Text style={styles.rowSub}>
                {l('Restore all demo records to initial state', 'নতুন করে প্রাথমিক ডেটা লোড হবে')}
              </Text>
            </View>
            <Ionicons name="refresh-outline" size={20} color={colors.warning} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, { color: colors.warning }]}>
                {l('Logout', 'লগআউট')}
              </Text>
              <Text style={styles.rowSub}>
                {l('End current account session', 'বর্তমান অ্যাকাউন্ট সেশন সমাপ্ত করুন')}
              </Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color={colors.warning} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {l('Select Language', 'ভাষা নির্বাচন করুন')}
            </Text>
            <TouchableOpacity
              style={[styles.modalOption, language === 'bn' && styles.modalOptionActive]}
              onPress={() => {
                setLanguage('bn');
                setShowLanguageModal(false);
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  language === 'bn' && styles.modalOptionTextActive,
                ]}
              >
                বাংলা (Bengali)
              </Text>
              {language === 'bn' && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, language === 'en' && styles.modalOptionActive]}
              onPress={() => {
                setLanguage('en');
                setShowLanguageModal(false);
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  language === 'en' && styles.modalOptionTextActive,
                ]}
              >
                English
              </Text>
              {language === 'en' && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.modalCancelText}>{l('Cancel', 'বাতিল')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Due Date Picker Modal */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {l('Set Monthly Due Date', 'জমার শেষ তারিখ নির্ধারণ')}
            </Text>
            {[1, 5, 7, 10, 15, 20, 25].map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.modalOption, dueDateDay === day && styles.modalOptionActive]}
                onPress={() => {
                  setDueDateDay(day);
                  saveSetting('dueDay', day);
                  setShowDateModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    dueDateDay === day && styles.modalOptionTextActive,
                  ]}
                >
                  {isBengali
                    ? `প্রতি মাসের ${formatNum(day)} তারিখ`
                    : `${day}th of every month`}
                </Text>
                {dueDateDay === day && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowDateModal(false)}
            >
              <Text style={styles.modalCancelText}>{l('Cancel', 'বাতিল')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Default Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {l('Default Monthly Deposit', 'ডিফল্ট মাসিক জমা')}
            </Text>
            {[1000, 1500, 2000, 2500, 3000, 5000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.modalOption,
                  defaultMonthlyDeposit === amt && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setDefaultMonthlyDeposit(amt);
                  saveSetting('defaultMonthly', amt);
                  setShowDepositModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    defaultMonthlyDeposit === amt && styles.modalOptionTextActive,
                  ]}
                >
                  {formatMoney(amt)}
                </Text>
                {defaultMonthlyDeposit === amt && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowDepositModal(false)}
            >
              <Text style={styles.modalCancelText}>{l('Cancel', 'বাতিল')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Approval Limit Modal */}
      <Modal visible={showApprovalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {l('Expense Approval Limit', 'ব্যয় অনুমোদনের সীমা')}
            </Text>
            {[5000, 10000, 20000, 50000, 100000].map((lim) => (
              <TouchableOpacity
                key={lim}
                style={[
                  styles.modalOption,
                  expenseApprovalLimit === lim && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setExpenseApprovalLimit(lim);
                  saveSetting('expenseApprovalLimit', lim);
                  setShowApprovalModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    expenseApprovalLimit === lim && styles.modalOptionTextActive,
                  ]}
                >
                  {formatMoney(lim)}
                </Text>
                {expenseApprovalLimit === lim && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowApprovalModal(false)}
            >
              <Text style={styles.modalCancelText}>{l('Cancel', 'বাতিল')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 8,
    marginTop: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  rowSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  noticeIcon: {
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: colors.surfaceMuted,
  },
  modalOptionActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalOptionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  modalOptionTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  modalCancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },
});
