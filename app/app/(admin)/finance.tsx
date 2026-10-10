import { financeLabel, financeNote, financeDate } from '../../src/i18n/financeLabels';
import { Card } from '../../src/components/Card';
import { FAB } from '../../src/components/FAB';
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore, Transaction, REMOTE } from '../../src/store/somitiStore';
import { useLedgerPage } from '../../src/hooks/useLedgerPage';
import { monthRange } from '../../src/lib/ledger';
import { buildReportForExport, exportReport } from '../../src/utils/reportExport';
import { mockCashAccounts } from '../../src/mocks/mockData';
import { useLanguage } from '../../src/i18n/useLanguage';
import { CashAccount } from '../../src/mocks/mockData';
import { recentMonths, inMonth } from '../../src/lib/months';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'fade' | 'slide' | 'none';
}

function AppModal({ visible, onClose, children, animationType = 'fade' }: AppModalProps) {
  if (!visible) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webModalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {children}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {children}
      </View>
    </Modal>
  );
}

const MONTHS_LIST = recentMonths(12);
const paymentLabel = (method: string, bn: boolean) => ({cash:bn?'নগদ':'Cash',bank:bn?'ব্যাংক':'Bank',bkash:'bKash',nagad:'Nagad'}[method] || financeLabel(method,bn));
const accountLabel = (account: CashAccount, bn: boolean) => (({bank:bn?'ব্যাংক হিসাব':'Bank Account',cashier:bn?'কোষাধ্যক্ষের হাতে':'Cash with Treasurer',field:bn?'মাঠকর্মীর হাতে':'Cash with Field Worker',bkash:bn?'বিকাশ':'bKash',nagad:bn?'নগদ':'Nagad'} as Record<string,string>)[account.type || ''] || financeLabel(account.name,bn));

export default function FinanceScreen() {
  const router = useRouter();
  const state=useSomitiStore();
  const { somitiInfo, cashAccounts, expenses, transactions, transferCash, ledgerSummary } = state;
  const { l, isBengali, formatMoney, formatNum } = useLanguage();

  const displayCashAccounts = useMemo(() => {
    return cashAccounts;
  }, [cashAccounts]);

  // Selected Month State
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(MONTHS_LIST[0].key);
  const [showMonthModal, setShowMonthModal] = useState<boolean>(false);
  const ledger=useLedgerPage(monthRange(selectedMonthKey));
  const [exporting,setExporting]=useState(false);
  const handleExport=async(format:'PDF'|'CSV')=>{
    if(exporting)return;setExporting(true);setShowExportModal(false);
    try{await exportReport(await buildReportForExport(state,format==='CSV'?'9':'3',selectedMonthKey),somitiInfo.name,selectedMonthKey,format);}
    catch(e:any){Alert.alert(l('Export failed','এক্সপোর্ট ব্যর্থ'),e.message);}
    finally{setExporting(false);}
  };

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [fromAccount, setFromAccount] = useState<string>('ca4'); // Default: মাঠকর্মী
  const [toAccount, setToAccount] = useState<string>('ca2'); // Default: কোষাধ্যক্ষ
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNote, setTransferNote] = useState<string>('');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Transaction Detail Modal State
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef<number>(0);

  const closeTxnModal = () => {
    const savedY = scrollOffsetRef.current;
    setSelectedTxn(null);
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: savedY, animated: false });
      });
    }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedMonthObj = useMemo(() => {
    return MONTHS_LIST.find((m) => m.key === selectedMonthKey) || MONTHS_LIST[0];
  }, [selectedMonthKey]);

  // Total cash & bank dynamically calculated from actual accounts
  const totalCashAndBank = useMemo(() => {
    return displayCashAccounts.reduce((sum, acc) => sum + (acc.amount || 0), 0);
  }, [displayCashAccounts]);

  // Approved expenses of the selected month, grouped by category
  const periodTransactions = REMOTE ? ledger.rows : transactions.filter(t=>inMonth(t.dateISO,selectedMonthKey));
  const periodExpenses = expenses.filter(e=>e.status==='approved' && inMonth((e as any).dateISO,selectedMonthKey));
  const totals=ledgerSummary.months.find(m=>m.month===selectedMonthKey);
  const totalExpense = REMOTE ? Number(totals?.expenses||0) : periodTransactions.filter(t=>t.type==='expense').reduce((sum,t)=>sum+t.amount,0);
  const totalIncome = REMOTE ? Number(totals?.deposits||0)+Number(totals?.profit||0) : periodTransactions.filter(t=>t.type==='deposit'||t.type==='profit').reduce((sum,t)=>sum+t.amount,0);
  const groups = REMOTE ? Object.fromEntries(ledgerSummary.categories.filter(c=>c.month===selectedMonthKey).map(c=>[c.category,Number(c.amount)])) : periodExpenses.reduce<Record<string,number>>((acc,e)=>{acc[e.category]=(acc[e.category]||0)+e.amount;return acc;},{});
  const expenseCategories = Object.entries(groups).map(([name,amount])=>({id:name,nameBn:financeLabel(name,true),nameEn:financeLabel(name,false),amount,pct:totalExpense>0?Math.round(amount/totalExpense*100):0}));
  const netAmount = totalIncome-totalExpense;

  // Sample recent transactions matching Page 14 design
  const recentTxnsList = periodTransactions.slice(0,10).map(t=>({id:t.id,titleBn:financeNote(t.note||t.memberName,true),titleEn:financeNote(t.note||t.memberName,false),metaBn:financeDate(t.dateISO,t.date,true)+' · '+paymentLabel(t.paymentMethod,true),metaEn:financeDate(t.dateISO,t.date,false)+' · '+paymentLabel(t.paymentMethod,false),amount:t.type==='expense'?-t.amount:t.amount,isIncome:t.type!=='expense'}));

  const handleTransferSubmit = async () => {
    try {
    const amt = parseFloat(transferAmount.replace(/[^0-9.]/g, ''));
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter a valid amount', 'সঠিক টাকার পরিমাণ লিখুন'));
      return;
    }

    if (fromAccount === toAccount) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Sender and recipient accounts cannot be the same', 'একই হিসাবে স্থানান্তর করা যাবে না'));
      return;
    }

    const senderAcc = displayCashAccounts.find((a) => a.id === fromAccount);
    if (!senderAcc || senderAcc.amount < amt) {
      Alert.alert(
        l('Insufficient Balance', 'অপর্যাপ্ত ব্যালেন্স'),
        `${l('Sender account does not have enough balance', 'প্রেরক হিসাবে পর্যাপ্ত টাকা নেই')} (${formatMoney(senderAcc?.amount || 0)})`
      );
      return;
    }

    const note = transferNote.trim() || l('Internal Cash Transfer', 'অভ্যন্তরীণ তহবিল স্থানান্তর');
    if (!await transferCash(fromAccount, toAccount, amt, note)) return;

    setShowTransferModal(false);
    setTransferAmount('');
    setTransferNote('');

    const targetAcc = displayCashAccounts.find((a) => a.id === toAccount);
    triggerToast(
      `${senderAcc.name} → ${targetAcc?.name}: ${formatMoney(amt)} ${l('transferred successfully', 'সফলভাবে স্থানান্তর হয়েছে')}`
    );
    } catch(e:any) { Alert.alert(l('Transfer failed','স্থানান্তর ব্যর্থ'),e.message); }
  };

  const getAccountIcon = (account: CashAccount) => {
    if (account.type === 'bank') return 'business-outline';
    if (account.type === 'cashier') return 'wallet-outline';
    if (account.type === 'bkash') return 'call-outline';
    return 'people-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Income & Expense', 'আয় ও ব্যয়')}</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowExportModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Month Dropdown Pill */}
        <TouchableOpacity
          style={styles.monthPill}
          onPress={() => setShowMonthModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.text} />
          <Text style={styles.monthPillText}>
            {isBengali ? selectedMonthObj.bn : selectedMonthObj.en}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* 3-Column Summary Card */}
        <Card variant="surface" style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{l('Income', 'আয়')}</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalIncome)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{l('Expense', 'ব্যয়')}</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalExpense)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{l('Net', 'নিট')}</Text>
            <Text style={[styles.summaryValue, styles.netProfitColor]}>
              {formatMoney(netAmount)}
            </Text>
          </View>
        </Card>

        {/* Section: হিসাবসমূহ (Accounts) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{l('Accounts', 'হিসাবসমূহ')}</Text>
          <TouchableOpacity
            onPress={() => setShowTransferModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.transferLink}>{l('Transfer', 'স্থানান্তর')}</Text>
          </TouchableOpacity>
        </View>

        {/* Accounts Card */}
        <View style={styles.accountsCard}>
          {displayCashAccounts.map((account, index) => {
            const iconName = getAccountIcon(account);

            return (
              <React.Fragment key={account.id}>
                <View style={styles.accountRow}>
                  <View style={styles.accountIconBox}>
                    <Ionicons name={iconName} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>
                      {accountLabel(account, isBengali)}
                    </Text>
                    <Text style={styles.accountSub}>
                      {[account.holder || account.name, account.note].filter(Boolean).map(text => financeNote(text!,isBengali)).join(' · ')}
                    </Text>
                  </View>
                  <Text style={styles.accountBalance}>
                    {formatMoney(account.amount)}
                  </Text>
                </View>
                {index < displayCashAccounts.length - 1 && <View style={styles.accountDivider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Total in Hand & Bank Footer Row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{l('Total in Cash & Bank', 'হাতে ও ব্যাংকে মোট')}</Text>
          <Text style={styles.totalBalance}>{formatMoney(totalCashAndBank)}</Text>
        </View>

        {/* Section: খাতভিত্তিক ব্যয় (Expenses by Category) */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          {l('Expenses by Category', 'খাতভিত্তিক ব্যয়')}
        </Text>

        <View style={styles.categoriesCard}>
          {expenseCategories.map((cat, idx) => (
            <View key={cat.id} style={[styles.catItem, idx > 0 && styles.catItemSpaced]}>
              <View style={styles.catHeader}>
                <Text style={styles.catName}>
                  {isBengali ? cat.nameBn : cat.nameEn}
                </Text>
                <Text style={styles.catAmount}>{formatMoney(cat.amount)}</Text>
              </View>
              <View style={styles.catTrack}>
                <View
                  style={[
                    styles.catFill,
                    { width: `${cat.pct}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Section: সাম্প্রতিক (Recent) */}
        <View style={[styles.sectionHeaderRow, styles.sectionTitleSpaced]}>
          <Text style={styles.sectionTitle}>{l('Recent', 'সাম্প্রতিক')}</Text>
          <TouchableOpacity
            onPress={() => router.push({pathname:'/(admin)/ledger',params:{month:selectedMonthKey}})}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllLink}>{l('See All', 'সব দেখুন')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentCard}>
          {ledger.loading&&<Text style={styles.recentMeta}>{l('Loading…','লোড হচ্ছে…')}</Text>}
          {ledger.error&&<TouchableOpacity onPress={ledger.reload}><Text style={styles.recentMeta}>{ledger.error} · {l('Retry','আবার চেষ্টা করুন')}</Text></TouchableOpacity>}
          {recentTxnsList.map((txn, index) => (
            <React.Fragment key={txn.id}>
              <View style={styles.recentRow}>
                <View style={styles.recentDetails}>
                  <Text style={styles.recentTitle}>
                    {isBengali ? txn.titleBn : txn.titleEn}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {isBengali ? txn.metaBn : txn.metaEn}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.recentAmount,
                    txn.isIncome ? styles.profitColor : styles.lossColor,
                  ]}
                >
                  {txn.isIncome ? `+${formatMoney(txn.amount)}` : `−${formatMoney(Math.abs(txn.amount))}`}
                </Text>
              </View>
              {index < recentTxnsList.length - 1 && <View style={styles.recentDivider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* Floating Action Button (+ খরচ লিখুন) */}
      <FAB label={l('Record Expense', 'খরচ লিখুন')} onPress={() => router.push('/(admin)/expense/new')} />

      {/* Month Selector Modal */}
      <AppModal
        visible={showMonthModal}
        onClose={() => setShowMonthModal(false)}
      >
        <View style={styles.monthModalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeading}>{l('Select Month', 'মাস নির্বাচন করুন')}</Text>
            <TouchableOpacity onPress={() => setShowMonthModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.monthListScroll}>
            {MONTHS_LIST.map((m) => {
              const isSelected = m.key === selectedMonthKey;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.monthOption, isSelected && styles.monthOptionSelected]}
                  onPress={() => {
                    setSelectedMonthKey(m.key);
                    setShowMonthModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthOptionText, isSelected && styles.monthOptionTextSelected]}>
                    {isBengali ? m.bn : m.en}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AppModal>

      {/* Transfer Modal */}
      <AppModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      >
        <View style={styles.transferModalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeading}>{l('Transfer Cash', 'তহবিল স্থানান্তর')}</Text>
            <TouchableOpacity onPress={() => setShowTransferModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalFieldLabel}>{l('Transfer From', 'যে হিসাব থেকে যাবে')}</Text>
          <View style={styles.accountSelectorRow}>
            {displayCashAccounts.map((acc) => {
              const isSelected = fromAccount === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                  onPress={() => setFromAccount(acc.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.accountChipText, isSelected && styles.accountChipTextSelected]}>
                    {accountLabel(acc,isBengali)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalFieldLabel}>{l('Transfer To', 'যে হিসাবে জমা হবে')}</Text>
          <View style={styles.accountSelectorRow}>
            {displayCashAccounts.map((acc) => {
              const isSelected = toAccount === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountChip, isSelected && styles.accountChipSelected]}
                  onPress={() => setToAccount(acc.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.accountChipText, isSelected && styles.accountChipTextSelected]}>
                    {accountLabel(acc,isBengali)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalFieldLabel}>{l('Amount (BDT)', 'টাকার পরিমাণ (৳)')}</Text>
          <TextInput
            style={styles.modalTextInput}
            value={transferAmount}
            onChangeText={setTransferAmount}
            placeholder={l('e.g. 5000', 'যেমন: ৫০০০')}
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.modalFieldLabel}>{l('Note', 'বিবরণ')}</Text>
          <TextInput
            style={styles.modalTextInput}
            value={transferNote}
            onChangeText={setTransferNote}
            placeholder={l('e.g. Field cash handed over', 'যেমন: মাঠকর্মী কর্তৃক কোষাধ্যক্ষকে প্রদান')}
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={styles.modalSubmitBtn}
            onPress={handleTransferSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.modalSubmitBtnText}>{l('Confirm Transfer', 'স্থানান্তর সম্পন্ন করুন')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Export Modal */}
      <AppModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      >
        <View style={styles.exportModalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeading}>{l('Download Report', 'রিপোর্ট ডাউনলোড')}</Text>
            <TouchableOpacity onPress={() => setShowExportModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.exportOption}
            disabled={exporting}
            onPress={() => handleExport('PDF')}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text style={styles.exportOptionText}>{l('Monthly Statement (PDF)', 'মাসিক বিবরণী (PDF)')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportOption}
            disabled={exporting}
            onPress={() => handleExport('CSV')}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={22} color={colors.primary} />
            <Text style={styles.exportOptionText}>{l('Monthly Ledger (Excel)', 'মাসিক লেজার (Excel)')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: 'row', marginBottom: 16 },
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
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  toastText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 14,
  },
  monthPillText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 4,
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text,
  },
  netProfitColor: {
    color: colors.primary,
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
  sectionTitleSpaced: {
    marginTop: 16,
    marginBottom: 10,
  },
  transferLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  accountsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  accountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  accountSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountBalance: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  accountDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  totalLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  totalBalance: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  categoriesCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  catItem: {},
  catItemSpaced: {
    marginTop: 12,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  catAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  catTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  seeAllLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  recentCard: {
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
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  recentDetails: {
    flex: 1,
  },
  recentTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  recentMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recentAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
  },
  profitColor: {
    color: colors.primary,
  },
  lossColor: {
    color: colors.text,
  },
  recentDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 6,
  },
  scrollSpacer: {
    height: 100,
  },
  webModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  monthModalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: 400,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
  },
  monthListScroll: {
    maxHeight: 320,
  },
  monthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  monthOptionSelected: {
    backgroundColor: colors.primarySoft,
  },
  monthOptionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  monthOptionTextSelected: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  transferModalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalFieldLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  accountSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  accountChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  accountChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  accountChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  accountChipTextSelected: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    marginBottom: 12,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalSubmitBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.surface,
  },
  exportModalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    gap: 10,
  },
  exportOptionText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.primary,
  },
});
