import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { mockProjects } from '../../../src/mocks/mockData';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { safeBack } from '../../../src/utils/navigation';
import { AppModal } from '../../../src/components/AppModal';
import { toEnglishDigits } from '../../../src/lib/bengali';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects, transactions, recordProjectReturn, addExpense } = useSomitiStore();

  const allProjects = projects;
  const project = allProjects.find(
    (p) => p.id === id || p.id === `p${id}` || p.id.replace('p', '') === id
  );

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [returnAmount, setReturnAmount] = useState('');
  const [returnSource, setReturnSource] = useState<'bank' | 'cash'>('bank');
  const [returnNote, setReturnNote] = useState('');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseSource, setExpenseSource] = useState<'bank' | 'cash'>('bank');
  const [expenseNote, setExpenseNote] = useState('');

  const isProfit = project ? project.netProfit >= 0 : true;

  const handleDocOpen = (name: string) => {
    Alert.alert(l('Document Viewer', 'ডকুমেন্ট ভিউয়ার'), `${project?.name} - ${name} ${l('is loading...', 'লোড হচ্ছে...')}`);
  };

  const handleRecordReturn = async () => {
    try {
    const cleanAmount = Number(toEnglishDigits(returnAmount).replace(/[^0-9.]/g, '')) || 0;
    if (cleanAmount <= 0) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter a valid amount.', 'অনুগ্রহ করে সঠিক পরিমাণ লিখুন।'));
      return;
    }
    if (!project) return;

    await recordProjectReturn({
      projectId: project.id,
      amount: cleanAmount,
      paymentSource: returnSource === 'bank' ? 'ব্যাংক হিসাব' : 'হাতে নগদ',
      note: returnNote.trim() || 'প্রজেক্ট কিস্তি / মুনাফা আদায়',
    });

    setShowIncomeModal(false);
    setReturnAmount('');
    setReturnNote('');

    Alert.alert(
      l('Success', 'সফল'),
      `${project.name} ${l('received return of', 'থেকে')} ${formatMoney(cleanAmount)} ${l('recorded successfully!', 'টাকা আয় জমা হয়েছে!')}`
    );
    } catch(e:any) {Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
  };

  const handleRecordExpense = async () => {
    try {
    const cleanAmount = Number(toEnglishDigits(expenseAmount).replace(/[^0-9.]/g, '')) || 0;
    if (cleanAmount <= 0) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter a valid amount.', 'অনুগ্রহ করে সঠিক পরিমাণ লিখুন।'));
      return;
    }
    if (!project) return;

    await addExpense({title:project.name+': '+(expenseNote.trim()||l('Project expense','প্রজেক্ট খরচ')),category:l('Project expense','প্রজেক্ট খরচ'),amount:cleanAmount,paymentSource:expenseSource,voucherNo:'PRJ-EXP-'+Date.now(),note:expenseNote});
    setShowExpenseModal(false);
    setExpenseAmount('');
    setExpenseNote('');

    Alert.alert(
      l('Success', 'সফল'),
      `${project.name} ${l('recorded expense of', 'এর জন্য')} ${formatMoney(cleanAmount)} ${l('successfully!', 'টাকা খরচ রেকর্ড করা হয়েছে!')}`
    );
    } catch(e:any) {Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
  };

  // Project ledger
  const sampleTransactions = transactions.filter(t=>t.memberId===project?.id || (project && t.note?.startsWith(project.name+':'))).map(t=>({id:t.id,titleBn:t.note||t.memberName,titleEn:t.note||t.memberName,metaBn:t.date,metaEn:t.date,amount:t.type==='profit'?t.amount:-t.amount,isIncome:t.type==='profit'}));

  if(!project) return <SafeAreaView style={styles.container}><View style={{padding:24}}><Text>{l('Project not found','প্রজেক্ট পাওয়া যায়নি')}</Text><TouchableOpacity onPress={()=>safeBack(router,'/(admin)/(tabs)/projects')}><Text style={{color:colors.primary,marginTop:16}}>{l('Back to projects','প্রজেক্ট তালিকায় ফিরুন')}</Text></TouchableOpacity></View></SafeAreaView>;
  const projectTitle = isBengali
    ? project.name
    : project.id === 'p1'
    ? 'Site A: Land Project'
    : project.id === 'p2'
    ? 'Shop Rental Project'
    : project.id === 'p3'
    ? 'Poultry Farm'
    : project.id === 'p4'
    ? 'Site B: Construction'
    : project.name;

  const typeLabel =
    project.type === 'জমি'
      ? l('Land', 'জমি')
      : project.type === 'ভাড়া'
      ? l('Rent', 'ভাড়া')
      : project.type === 'কৃষি'
      ? l('Agriculture', 'কৃষি')
      : project.type === 'নির্মাণ'
      ? l('Construction', 'নির্মাণ')
      : project.type;

  const locLabel = project.location === '[স্থান]' ? l('[Location]', '[স্থান]') : project.location;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/projects')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Projects', 'প্রজেক্ট')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert(l('Edit', 'সম্পাদনা'), l('Edit project details', 'প্রজেক্টের বিবরণ সম্পাদনা করুন'))}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert(l('Menu', 'মেনু'), l('More options', 'আরও অপশন'))}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category & Status Tags */}
        <View style={styles.tagsRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>{typeLabel}</Text>
          </View>
          <View
            style={[
              styles.tagPill,
              project.status === 'delayed' ? styles.tagPillDelayed : styles.tagPillOngoing,
            ]}
          >
            <Text
              style={[
                styles.tagPillText,
                project.status === 'delayed' ? styles.tagPillTextDelayed : styles.tagPillTextOngoing,
              ]}
            >
              {project.status === 'delayed'
                ? l('Delayed', 'বিলম্বিত')
                : project.status === 'completed'
                ? l('Completed', 'সমাপ্ত')
                : l('Ongoing', 'চলমান')}
            </Text>
          </View>
        </View>

        {/* Project Title and Meta */}
        <Text style={styles.projectMainTitle}>{projectTitle}</Text>
        <Text style={styles.projectMetaLine}>
          {l('Manager:', 'দায়িত্বে:')} {project.manager} · {locLabel}
        </Text>
        <Text style={styles.projectMetaLine}>
          {l('Start', 'শুরু')} {project.startDate} · {l('Est. End', 'সম্ভাব্য শেষ')} {project.expectedEnd}
        </Text>

        {/* 2x2 Metric Cards Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('Total Investment', 'মোট বিনিয়োগ')}</Text>
              <Text style={styles.metricCardVal}>{formatMoney(project.investedAmount)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('Total Return', 'মোট ফেরত')}</Text>
              <Text style={styles.metricCardVal}>{formatMoney(project.returnedAmount)}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('Net Profit', 'নিট লাভ')}</Text>
              <Text
                style={[
                  styles.metricCardVal,
                  isProfit ? styles.profitColor : styles.lossColor,
                ]}
              >
                {isProfit ? `+${formatMoney(project.netProfit)}` : `−${formatMoney(Math.abs(project.netProfit))}`}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('ROI', 'ROI')}</Text>
              <Text
                style={[
                  styles.metricCardVal,
                  isProfit ? styles.profitColor : styles.lossColor,
                ]}
              >
                {formatNum(project.roiPct)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Capital Recovery Progress Card */}
        <View style={styles.recoveryCard}>
          <View style={styles.recoveryHeader}>
            <Text style={styles.recoveryTitle}>{l('Capital Recovery', 'মূলধন ফেরত')}</Text>
            <Text style={styles.recoveryPct}>{formatNum(project.recoveryPct)}%</Text>
          </View>

          <View style={styles.recoveryTrack}>
            <View style={[styles.recoveryFill, { width: `${project.recoveryPct}%` }]} />
          </View>

          <Text style={styles.recoverySub}>
            {l('Remaining in project:', 'প্রজেক্টে এখনো আছে')} {formatMoney(project.remainingAmount)}
          </Text>
        </View>

        {/* Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{l('Transactions', 'লেনদেন')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/audit')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllLink}>{l('See All', 'সব দেখুন')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsCard}>
          {sampleTransactions.map((txn, idx) => (
            <React.Fragment key={txn.id}>
              {idx > 0 && <View style={styles.txnDivider} />}
              <View style={styles.txnRow}>
                <View
                  style={[
                    styles.txnIconCircle,
                    txn.isIncome ? styles.txnIconIncome : styles.txnIconExpense,
                  ]}
                >
                  <Ionicons
                    name={txn.isIncome ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={txn.isIncome ? colors.primary : colors.text}
                  />
                </View>
                <View style={styles.txnDetails}>
                  <Text style={styles.txnTitle}>{isBengali ? txn.titleBn : txn.titleEn}</Text>
                  <Text style={styles.txnMeta}>{isBengali ? txn.metaBn : txn.metaEn}</Text>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    txn.isIncome ? styles.profitColor : styles.normalAmountColor,
                  ]}
                >
                  {txn.isIncome ? `+${formatMoney(txn.amount)}` : `−${formatMoney(Math.abs(txn.amount))}`}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Documents Section */}
        <Text style={[styles.sectionTitle, styles.docsHeader]}>{l('Documents', 'ডকুমেন্ট')}</Text>
        <View style={styles.docsRow}>
          <TouchableOpacity
            style={styles.docCard}
            onPress={() => handleDocOpen(l('Contract', 'চুক্তিপত্র'))}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            <Text style={styles.docText}>{l('Contract', 'চুক্তিপত্র')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.docCard}
            onPress={() => handleDocOpen(l('Site Photos (3)', 'সাইটের ছবি (৩)'))}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={24} color={colors.primary} />
            <Text style={styles.docText}>
              {l('Site Photos (3)', 'সাইটের ছবি (৩)')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.docCard}
            onPress={() => handleDocOpen(l('Receipts (6)', 'রসিদ (৬)'))}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.primary} />
            <Text style={styles.docText}>
              {l('Receipts (6)', 'রসিদ (৬)')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* Bottom Fixed Dual Action Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.expenseBtn}
          onPress={() => setShowExpenseModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up-outline" size={18} color={colors.text} />
          <Text style={styles.expenseBtnText}>{l('Record Expense', 'খরচ লিখুন')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.incomeBtn}
          onPress={() => setShowIncomeModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down-outline" size={18} color={colors.surface} />
          <Text style={styles.incomeBtnText}>{l('Record Income/Return', 'আয়/ফেরত লিখুন')}</Text>
        </TouchableOpacity>
      </View>

      {/* Record Return / Income Modal */}
      <AppModal
        visible={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        title={l('Record Project Income / Return', 'প্রজেক্ট আয় / ফেরত লিখুন')}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalProjectName}>{projectTitle}</Text>
          <Text style={styles.modalProjectSub}>
            {l('Current Return:', 'বর্তমান ফেরত:')} {formatMoney(project?.returnedAmount || 0)} ({formatNum(project?.recoveryPct || 0)}%)
          </Text>

          <Text style={styles.inputTitle}>{l('Income Amount (৳)', 'প্রাপ্ত আয়ের পরিমাণ (৳)')}</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencySign}>৳</Text>
            <TextInput
              style={styles.modalAmountInput}
              value={returnAmount}
              onChangeText={setReturnAmount}
              placeholder="৫০,০০০"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <Text style={styles.inputTitle}>{l('Payment Received In', 'যে হিসাবে জমা হয়েছে')}</Text>
          <View style={styles.sourceToggleRow}>
            <TouchableOpacity
              style={[styles.sourceToggleBtn, returnSource === 'bank' && styles.sourceToggleBtnActive]}
              onPress={() => setReturnSource('bank')}
            >
              <Text style={styles.sourceToggleText}>{l('Bank Account', 'ব্যাংক হিসাব')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sourceToggleBtn, returnSource === 'cash' && styles.sourceToggleBtnActive]}
              onPress={() => setReturnSource('cash')}
            >
              <Text style={styles.sourceToggleText}>{l('Cash in Hand', 'হাতে নগদ')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputTitle}>{l('Note / Description', 'বিবরণ')}</Text>
          <TextInput
            style={styles.modalNoteInput}
            value={returnNote}
            onChangeText={setReturnNote}
            placeholder={l('e.g. Plot Sale Installment', 'যেমন: প্লট বিক্রয়ের কিস্তি')}
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={styles.modalSubmitBtn}
            onPress={handleRecordReturn}
          >
            <Text style={styles.modalSubmitBtnText}>{l('Save Income', 'আয় সংরক্ষণ করুন')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Record Expense Modal */}
      <AppModal
        visible={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={l('Record Project Expense', 'প্রজেক্টের খরচ লিখুন')}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalProjectName}>{projectTitle}</Text>
          <Text style={styles.modalProjectSub}>
            {l('Total Invested:', 'মোট বিনিয়োগ:')} {formatMoney(project?.investedAmount || 0)}
          </Text>

          <Text style={styles.inputTitle}>{l('Expense Amount (৳)', 'খরচের পরিমাণ (৳)')}</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencySign}>৳</Text>
            <TextInput
              style={styles.modalAmountInput}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder="২০,০০০"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <Text style={styles.inputTitle}>{l('Paid From', 'যে হিসাব থেকে প্রদান')}</Text>
          <View style={styles.sourceToggleRow}>
            <TouchableOpacity
              style={[styles.sourceToggleBtn, expenseSource === 'bank' && styles.sourceToggleBtnActive]}
              onPress={() => setExpenseSource('bank')}
            >
              <Text style={styles.sourceToggleText}>{l('Bank Account', 'ব্যাংক হিসাব')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sourceToggleBtn, expenseSource === 'cash' && styles.sourceToggleBtnActive]}
              onPress={() => setExpenseSource('cash')}
            >
              <Text style={styles.sourceToggleText}>{l('Cash in Hand', 'হাতে নগদ')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputTitle}>{l('Expense Purpose', 'খরচের খাত')}</Text>
          <TextInput
            style={styles.modalNoteInput}
            value={expenseNote}
            onChangeText={setExpenseNote}
            placeholder={l('e.g. Materials purchase', 'যেমন: মালামাল ক্রয়')}
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={styles.modalSubmitBtn}
            onPress={handleRecordExpense}
          >
            <Text style={styles.modalSubmitBtnText}>{l('Save Expense', 'খরচ সংরক্ষণ করুন')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  tagPillOngoing: {
    backgroundColor: colors.primarySoft,
  },
  tagPillDelayed: {
    backgroundColor: colors.warningSoft,
  },
  tagPillText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.primary,
  },
  tagPillTextOngoing: {
    color: colors.primary,
  },
  tagPillTextDelayed: {
    color: colors.warning,
  },
  projectMainTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text,
    marginBottom: 4,
  },
  projectMetaLine: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  gridContainer: {
    marginTop: 14,
    gap: 10,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  metricCardLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricCardVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text,
  },
  profitColor: {
    color: colors.primary,
  },
  lossColor: {
    color: colors.warning,
  },
  recoveryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recoveryTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  recoveryPct: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.textSecondary,
  },
  recoveryTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginVertical: 6,
  },
  recoveryFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  recoverySub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
  },
  seeAllLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  transactionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  txnDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 6,
  },
  txnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnIconExpense: {
    backgroundColor: colors.surfaceMuted,
  },
  txnIconIncome: {
    backgroundColor: colors.primarySoft,
  },
  txnDetails: {
    flex: 1,
  },
  txnTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  txnMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txnAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
  },
  normalAmountColor: {
    color: colors.text,
  },
  docsHeader: {
    marginBottom: 10,
  },
  docsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  docCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  docText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
    marginTop: 6,
  },
  scrollSpacer: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.bg,
    gap: 10,
  },
  expenseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  expenseBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  incomeBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: colors.primary,
    gap: 6,
  },
  incomeBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.surface,
  },
  modalContent: {
    paddingVertical: 8,
  },
  modalProjectName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
  },
  modalProjectSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  inputTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: colors.surface,
  },
  currencySign: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
    marginRight: 8,
  },
  modalAmountInput: {
    flex: 1,
    height: 44,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  sourceToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sourceToggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sourceToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sourceToggleText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  modalNoteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.surface,
  },
});
