import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SelectModal } from '../../src/components/SelectModal';
import { useAuthStore } from '../../src/features/auth/authStore';
import { REMOTE } from '../../src/store/somitiStore';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';

import { typography } from '../../src/theme/typography';

const FY_MONTHS: [string, string][] = [['January','জানুয়ারি'],['February','ফেব্রুয়ারি'],['March','মার্চ'],['April','এপ্রিল'],['May','মে'],['June','জুন'],['July','জুলাই'],['August','আগস্ট'],['September','সেপ্টেম্বর'],['October','অক্টোবর'],['November','নভেম্বর'],['December','ডিসেম্বর']];

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { resetAllData, somitiInfo, updateSomitiInfo } = useSomitiStore();
  const {
    language,
    useBengaliDigits,
    l,
    formatMoney,
    formatNum,
    setLanguage,
    setUseBengaliDigits,
    expenseApprovalLimit: localLimit,
    setExpenseApprovalLimit,
    accountingYear,
    setAccountingYear,

  } = useLanguage();

  // In live (Supabase) mode these settings belong to the somiti and are saved on the server
  const info: any = somitiInfo;
  const reservePercent = Number(info.profitReservePct ?? 0);
  const directorPercent = Number(info.profitManagementPct ?? 0);
  const memberPercent = Math.max(0, 100 - reservePercent - directorPercent);
  const pick = (key: string, local: number) =>
    REMOTE && info?.[key] !== undefined && info?.[key] !== ''
      ? Number(info[key])
      : local;
  const expenseApprovalLimit = pick('expenseApprovalLimit', localLimit);
  const saveSetting = async (key: string, value: number) => {
    try { if (REMOTE) await updateSomitiInfo({ [key]: value } as any); }
    catch(e:any){Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
  };

  // Auto-approve toggle state (defaults to true per user directive)
  const [autoApprove, setAutoApprove] = useState((somitiInfo as any).autoApproveEnabled !== false);

  const handleToggleAutoApprove = async (val: boolean) => {
    try {await updateSomitiInfo({ autoApproveEnabled: val, autoApproveThreshold: expenseApprovalLimit } as any);setAutoApprove(val);}
    catch(e:any){Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
  };

  const role = useAuthStore(st => st.actualRole);
  const canChangeSociety = role === 'admin' || role === 'super_admin';
  const fyStart = Math.min(12, Math.max(1, Number(info.fiscalYearStartMonth) || 7));
  const [showFyModal, setShowFyModal] = useState(false);
  const [memberSeesProfit, setMemberSeesProfit] = useState(info.memberSeesProfit !== false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const handleResetData = async () => {
    if (REMOTE) {
      await useSomitiStore.getState().syncFromServer();
      if(useSomitiStore.getState().syncError){Alert.alert(l('Refresh failed','আপডেট ব্যর্থ'),l('Check your connection and try again.','ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।'));return;}
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
        'Backups are created by the owner using the encrypted backup tool. This button does not create or upload a backup.',
        'পরিচালক encrypted backup tool দিয়ে ব্যাকআপ তৈরি করেন। এই বোতাম থেকে ব্যাকআপ তৈরি বা আপলোড হয় না।'
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
        {/* Section 2: লাভ-ক্ষতি বণ্টন (Profit-Loss Distribution) */}
        <Text style={styles.sectionTitle}>
          {l('Profit-Loss Distribution', 'লাভ-ক্ষতি বণ্টন')}
        </Text>
        <View style={styles.card}>
          {/* Row 2: Distribution Method */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => router.push('/(admin)/distribution')}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{l('Distribution Method', 'বণ্টন পদ্ধতি')}</Text>
              <Text style={styles.rowSub}>{l('View the rule and annual preview', 'নিয়ম ও বার্ষিক হিসাব দেখুন')}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>
                {l('Proportional to Deposit', 'মোট জমার অনুপাতে')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {([
            ['reserve', l('Reserve Fund', 'রিজার্ভ ফান্ড'), reservePercent],
            ['management', l('Director Share', 'পরিচালক অংশ'), directorPercent],
          ] as const).map(([key, label, percent]) => (
            <React.Fragment key={key}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} style={styles.row} onPress={() => router.push('/(admin)/distribution')} activeOpacity={0.7}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{label}</Text>
                  <Text style={styles.rowSub}>{l('Edit on the annual distribution page', 'বার্ষিক বণ্টনের পৃষ্ঠায় পরিবর্তন করুন')}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.valText}>{formatNum(percent)}%</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
            </React.Fragment>
          ))}
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{l('Members share', 'সদস্যদের অংশ')}</Text>
            <Text style={styles.valText}>{formatNum(memberPercent)}%</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{l('In Case of Loss', 'ক্ষতি হলে')}</Text>
            <Text style={styles.valText}>{l('No profit distribution', 'লাভ বণ্টন হবে না')}</Text>
          </View>
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
              'Use 0% for a share that does not apply. Changing defaults does not change an approved distribution.',
              'কোনো অংশ না থাকলে ০% রাখুন। নিয়ম বদলালে আগের অনুমোদিত বণ্টন পরিবর্তন হবে না।'
            )}
          </Text>
        </View>

        {/* Year and member view. Approvals happen in the meeting, outside the app. */}
        <Text style={styles.sectionTitle}>{l('Year & members', 'হিসাব বছর ও সদস্য')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} activeOpacity={0.7} disabled={!canChangeSociety} onPress={() => setShowFyModal(true)}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{l('Year starts in', 'হিসাব বছর শুরু')}</Text>
              <Text style={styles.rowSub}>{l(`Closes at the end of ${FY_MONTHS[(fyStart + 10) % 12][0]}`, `${FY_MONTHS[(fyStart + 10) % 12][1]} মাসের শেষে বছর বন্ধ`)}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>{l(FY_MONTHS[fyStart - 1][0], FY_MONTHS[fyStart - 1][1])}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{l('Members see their profit', 'সদস্যরা মুনাফা দেখবেন')}</Text>
              <Text style={styles.rowSub}>{l('Off: the member app shows deposits and withdrawals only', 'বন্ধ থাকলে সদস্যের অ্যাপে শুধু জমা ও উত্তোলন দেখাবে')}</Text>
            </View>
            <Switch
              value={memberSeesProfit}
              disabled={!canChangeSociety}
              onValueChange={async (val) => { try { await updateSomitiInfo({ memberSeesProfit: val } as any); setMemberSeesProfit(val); } catch (e: any) { Alert.alert(l('Save failed', 'সংরক্ষণ ব্যর্থ'), e.message); } }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={styles.noticeIcon} />
          <Text style={styles.noticeText}>{l('Approvals happen in the society meeting. Every entry in the app takes effect straight away; mistakes are cancelled or edited, and kept in the audit log.', 'অনুমোদন সমিতির মিটিংয়ে হয়। অ্যাপের প্রতিটা এন্ট্রি সাথে সাথে কার্যকর; ভুল হলে বাতিল বা এডিট করা যায়, সব অডিট লগে থাকে।')}</Text>
        </View>
        <SelectModal visible={showFyModal} title={l('Year starts in', 'হিসাব বছর শুরু')} value={String(fyStart)} options={FY_MONTHS.map((m, i) => ({ value: String(i + 1), label: l(m[0], m[1]) }))}
          onClose={() => setShowFyModal(false)} onSelect={async (v) => { try { await updateSomitiInfo({ fiscalYearStartMonth: Number(v) } as any); } catch (e: any) { Alert.alert(l('Save failed', 'সংরক্ষণ ব্যর্থ'), e.message); } }} />

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
                {l('Owner managed', 'পরিচালকের দায়িত্বে')}
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
                {REMOTE
                  ? l('Fetch the latest saved records', 'সার্ভারে সংরক্ষিত সর্বশেষ তথ্য আনুন')
                  : l('Restore all demo records to initial state', 'নতুন করে প্রাথমিক ডেটা লোড হবে')}
              </Text>
            </View>
            <Ionicons name="refresh-outline" size={20} color={colors.warning} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={()=>router.push('/account-deletion')}
          >
            <Text style={styles.rowTitle}>{l('Delete account / close society','Account মুছুন / সমিতি বন্ধ করুন')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}
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
