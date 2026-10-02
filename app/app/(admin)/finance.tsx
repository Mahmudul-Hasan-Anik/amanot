import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore, Transaction } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { CashAccount } from '../../src/mocks/mockData';

const MONTHS_LIST = [
  { key: '2026-09', bn: 'সেপ্টেম্বর ২০২৬', en: 'September 2026', income: 182400, expense: 12800 },
  { key: '2026-08', bn: 'আগস্ট ২০২৬', en: 'August 2026', income: 175000, expense: 11200 },
  { key: '2026-07', bn: 'জুলাই ২০২৬', en: 'July 2026', income: 168000, expense: 9800 },
  { key: '2026-06', bn: 'জুন ২০২৬', en: 'June 2026', income: 180000, expense: 14500 },
  { key: '2026-05', bn: 'মে ২০২৬', en: 'May 2026', income: 162000, expense: 8900 },
];

export default function FinanceScreen() {
  const router = useRouter();
  const { somitiInfo, cashAccounts, expenses, transactions, transferCash } = useSomitiStore();
  const { l, formatMoney, formatNum, language } = useLanguage();

  // Selected Month State
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-09');
  const [showMonthModal, setShowMonthModal] = useState<boolean>(false);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [fromAccount, setFromAccount] = useState<string>('ca4'); // Default: মাঠকর্মী
  const [toAccount, setToAccount] = useState<string>('ca2'); // Default: কোষাধ্যক্ষ
  const [transferAmount, setTransferAmount] = useState<string>('5000');
  const [transferNote, setTransferNote] = useState<string>('মাঠের কালেকশন কোষাধ্যক্ষকে জমা');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Transaction Detail Modal State
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Toast State
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
    return cashAccounts.reduce((sum, acc) => sum + (acc.amount || 0), 0);
  }, [cashAccounts]);

  // Dynamic Expenses by Category (baseline 5 categories from Page 14 + dynamic additions)
  const expenseByCategory = useMemo(() => {
    const defaultCategories: Record<string, number> = {
      'সভা ও আপ্যায়ন': 5200,
      'যাতায়াত': 3100,
      'অন্যান্য': 1800,
      'এসএমএস ও অ্যাপ': 1500,
      'স্টেশনারি': 1200,
    };

    // If custom expenses exist in store, add them
    expenses.forEach((item) => {
      const cat = item.category || 'অন্যান্য';
      if (defaultCategories[cat] !== undefined) {
        if (item.amount > defaultCategories[cat]) {
          defaultCategories[cat] = item.amount;
        }
      } else {
        defaultCategories[cat] = (defaultCategories[cat] || 0) + item.amount;
      }
    });

    return defaultCategories;
  }, [expenses]);

  const totalExpense = useMemo(() => {
    return Object.values(expenseByCategory).reduce((sum, amt) => sum + amt, 0);
  }, [expenseByCategory]);

  const totalIncome = useMemo(() => {
    return somitiInfo.monthlyIncome || selectedMonthObj.income;
  }, [somitiInfo.monthlyIncome, selectedMonthObj.income]);

  const netAmount = totalIncome - totalExpense;

  // Icon mapping matching PDF Page 14 exactly:
  // 1. Bank: business-outline
  // 2. Treasurer: wallet-outline
  // 3. bKash: phone-portrait-outline
  // 4. Field worker: people-outline
  const getAccountIcon = (account: CashAccount) => {
    const type = account.type || '';
    const name = (account.name || '').toLowerCase();
    if (type === 'bank' || name.includes('ব্যাংক') || name.includes('bank')) {
      return 'business-outline';
    }
    if (type === 'bkash' || name.includes('বিকাশ') || name.includes('bkash')) {
      return 'phone-portrait-outline';
    }
    if (type === 'field' || name.includes('মাঠ') || name.includes('field')) {
      return 'people-outline';
    }
    return 'wallet-outline';
  };

  const handleExecuteTransfer = () => {
    const amt = parseFloat(transferAmount.replace(/[^0-9.]/g, ''));
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert(
        l('Invalid Amount', 'ভুল পরিমাণ'),
        l('Please enter a valid amount.', 'অনুগ্রহ করে সঠিক টাকা লিখুন।')
      );
      return;
    }

    const sourceAcc = cashAccounts.find((a) => a.id === fromAccount);
    const destAcc = cashAccounts.find((a) => a.id === toAccount);

    if (!sourceAcc || !destAcc) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please select valid accounts.', 'অনুগ্রহ করে সঠিক হিসাব নির্বাচন করুন।'));
      return;
    }

    if (fromAccount === toAccount) {
      Alert.alert(
        l('Invalid Account', 'ভুল অ্যাকাউন্ট'),
        l('Cannot transfer to the same account.', 'একই অ্যাকাউন্টে স্থানান্তর করা সম্ভব নয়।')
      );
      return;
    }

    if (sourceAcc.amount < amt) {
      Alert.alert(
        l('Insufficient Balance', 'পর্যাপ্ত ব্যালেন্স নেই'),
        `${sourceAcc.name} ${l('does not have enough balance.', '-এ পর্যাপ্ত ব্যালেন্স নেই।')}`
      );
      return;
    }

    const success = transferCash(fromAccount, toAccount, amt, transferNote);
    if (success) {
      setShowTransferModal(false);
      triggerToast(
        `${formatMoney(amt)} ${sourceAcc.name} ${l('from', 'থেকে')} ${destAcc.name}-${l('to successfully transferred!', 'এ সফলভাবে স্থানান্তর করা হয়েছে!')}`
      );
    }
  };

  const handleShareStatement = async () => {
    try {
      const summaryText = `${l((somitiInfo as any).nameEn || 'Uttara Model Samity', somitiInfo.name || 'উত্তরা মডেল সমবায় সমিতি')} - ${l('Income & Expense Statement', 'আয় ও ব্যয় বিবরণী')} (${selectedMonthObj.bn})\n\n${l('Income:', 'আয়:')} ${formatMoney(totalIncome)}\n${l('Expense:', 'ব্যয়:')} ${formatMoney(totalExpense)}\n${l('Net Balance:', 'নিট উদ্বৃত্ত:')} ${formatMoney(netAmount, { showPlusSign: true })}\n\n${l('In Hand & Bank Total:', 'হাতে ও ব্যাংকে মোট:')} ${formatMoney(totalCashAndBank)}\n- ব্যাংক: ${formatMoney(cashAccounts[0]?.amount || 760000)}\n- কোষাধ্যক্ষ: ${formatMoney(cashAccounts[1]?.amount || 120000)}\n- বিকাশ: ${formatMoney(cashAccounts[2]?.amount || 38000)}\n- মাঠকর্মী: ${formatMoney(cashAccounts[3]?.amount || 12000)}`;

      await Share.share({
        message: summaryText,
      });
      setShowExportModal(false);
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Income & Expense', 'আয় ও ব্যয়')}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setShowExportModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#0F766E" />
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Selector Pill */}
        <TouchableOpacity
          style={styles.monthPill}
          activeOpacity={0.75}
          onPress={() => setShowMonthModal(true)}
        >
          <Ionicons name="calendar-outline" size={16} color="#1E293B" />
          <Text style={styles.monthPillText}>{l(selectedMonthObj.en, selectedMonthObj.bn)}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* 3 Metrics Card (আয় | ব্যয় | নিট) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{l('Income', 'আয়')}</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>
              {formatMoney(totalIncome)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{l('Expense', 'ব্যয়')}</Text>
            <Text style={[styles.summaryValue, { color: '#DC2626' }]}>
              {formatMoney(totalExpense)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{l('Net', 'নিট')}</Text>
            <Text style={[styles.summaryValue, { color: netAmount >= 0 ? '#0F766E' : '#DC2626' }]}>
              {formatMoney(netAmount, { showPlusSign: true })}
            </Text>
          </View>
        </View>

        {/* Section: হিসাবসমূহ */}
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
          {cashAccounts.map((account, index) => {
            const iconName = getAccountIcon(account);

            return (
              <React.Fragment key={account.id}>
                <View style={styles.accountRow}>
                  <View style={styles.accountIconBox}>
                    <Ionicons name={iconName} size={20} color="#0F766E" />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountSub}>
                      {account.holder}
                      {account.note ? ` · ${account.note}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.accountBalance}>
                    {formatMoney(account.amount)}
                  </Text>
                </View>
                {index < cashAccounts.length - 1 && <View style={styles.accountDivider} />}
              </React.Fragment>
            );
          })}

          <View style={styles.accountDivider} />

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{l('Total in Hand & Bank', 'হাতে ও ব্যাংকে মোট')}</Text>
            <Text style={styles.totalBalance}>{formatMoney(totalCashAndBank)}</Text>
          </View>
        </View>

        {/* Section: খাতভিত্তিক ব্যয় */}
        <Text style={[styles.sectionTitle, { marginTop: 14, marginBottom: 8, paddingHorizontal: 4 }]}>
          {l('Expense by Category', 'খাতভিত্তিক ব্যয়')}
        </Text>

        <View style={styles.categoriesCard}>
          {Object.entries(expenseByCategory).map(([cat, amt]) => {
            const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
            return (
              <View key={cat} style={styles.catItem}>
                <View style={styles.catHeader}>
                  <Text style={styles.catName}>{cat}</Text>
                  <Text style={styles.catAmount}>{formatMoney(amt)}</Text>
                </View>
                <View style={styles.catTrack}>
                  <View
                    style={[
                      styles.catFill,
                      { width: `${Math.min(100, Math.max(8, pct))}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Section: সাম্প্রতিক লেনদেন */}
        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
          <Text style={styles.sectionTitle}>{l('Recent', 'সাম্প্রতিক')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllLink}>{l('View All', 'সব দেখুন')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentCard}>
          {transactions.slice(0, 4).map((txn, index) => {
            const isDeposit = txn.type === 'deposit' || txn.type === 'profit';
            const isTransfer = txn.type === 'transfer';
            const prefix = isTransfer ? '⇄ ' : isDeposit ? '+' : '−';
            const amountColor = isTransfer ? '#0284C7' : isDeposit ? '#059669' : '#DC2626';

            return (
              <React.Fragment key={txn.id}>
                <TouchableOpacity
                  style={styles.recentRow}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTxn(txn)}
                >
                  <View style={styles.recentDetails}>
                    <Text style={styles.recentTitle}>
                      {txn.type === 'expense'
                        ? `খরচ: ${txn.memberName === 'সমিতি খরচ' ? (txn.note?.split(':')[1] || txn.note || 'ব্যয়') : txn.memberName}`
                        : txn.type === 'profit'
                        ? `আয়: ${txn.memberName}`
                        : txn.type === 'transfer'
                        ? `স্থানান্তর: ${txn.note}`
                        : `জমা: ${txn.memberName}`}
                    </Text>
                    <Text style={styles.recentMeta}>
                      {txn.date} ·{' '}
                      {txn.paymentMethod === 'bkash'
                        ? l('bKash', 'বিকাশ')
                        : txn.paymentMethod === 'bank'
                        ? l('Bank', 'ব্যাংক')
                        : txn.paymentMethod === 'nagad'
                        ? l('Nagad', 'নগদ')
                        : l('Cash In Hand', 'হাতে নগদ')}
                    </Text>
                  </View>
                  <Text style={[styles.recentAmount, { color: amountColor }]}>
                    {prefix}{formatMoney(txn.amount)}
                  </Text>
                </TouchableOpacity>
                {index < Math.min(transactions.length, 4) - 1 && <View style={styles.recentDivider} />}
              </React.Fragment>
            );
          })}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Action Button (+ খরচ লিখুন) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/expense/new')}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>{l('Record Expense', 'খরচ লিখুন')}</Text>
      </TouchableOpacity>

      {/* Month Selector Modal */}
      <Modal visible={showMonthModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <View style={styles.monthModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{l('Select Month', 'মাস নির্বাচন করুন')}</Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {MONTHS_LIST.map((m) => {
              const isSelected = selectedMonthKey === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.monthOptionRow, isSelected && styles.monthOptionRowActive]}
                  onPress={() => {
                    setSelectedMonthKey(m.key);
                    setShowMonthModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={[styles.monthOptionTitle, isSelected && styles.monthOptionTitleActive]}>
                      {l(m.en, m.bn)}
                    </Text>
                    <Text style={styles.monthOptionSub}>
                      {l('Income:', 'আয়:')} {formatMoney(m.income)} · {l('Expense:', 'ব্যয়:')} {formatMoney(m.expense)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#0F766E" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cash Transfer Modal */}
      <Modal visible={showTransferModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.transferModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{l('Account Transfer', 'হিসাব স্থানান্তর')}</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* From Account */}
            <Text style={styles.modalFieldLabel}>
              {l('From which account?', 'কোন হিসাব থেকে?')}
            </Text>
            <View style={styles.modalPickerRow}>
              {cashAccounts.map((acc) => {
                const isActive = fromAccount === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountChip, isActive && styles.accountChipActive]}
                    onPress={() => setFromAccount(acc.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.accountChipText, isActive && styles.accountChipTextActive]}>
                      {acc.name} ({formatMoney(acc.amount)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* To Account */}
            <Text style={[styles.modalFieldLabel, { marginTop: 14 }]}>
              {l('To which account?', 'কোন হিসাবে জমা হবে?')}
            </Text>
            <View style={styles.modalPickerRow}>
              {cashAccounts.map((acc) => {
                const isActive = toAccount === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountChip, isActive && styles.accountChipActive]}
                    onPress={() => setToAccount(acc.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.accountChipText, isActive && styles.accountChipTextActive]}>
                      {acc.name} ({formatMoney(acc.amount)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Amount */}
            <Text style={[styles.modalFieldLabel, { marginTop: 14 }]}>
              {l('Amount (৳)', 'টাকার পরিমাণ (৳)')}
            </Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholder="৫০০০"
            />

            {/* Quick Amount Pills */}
            <View style={styles.quickAmtRow}>
              {['1000', '2000', '5000', '10000'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmtBtn}
                  onPress={() => setTransferAmount(amt)}
                >
                  <Text style={styles.quickAmtText}>{formatMoney(Number(amt))}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.quickAmtBtn}
                onPress={() => {
                  const src = cashAccounts.find((a) => a.id === fromAccount);
                  if (src) setTransferAmount(String(src.amount));
                }}
              >
                <Text style={styles.quickAmtText}>{l('All', 'সব')}</Text>
              </TouchableOpacity>
            </View>

            {/* Note */}
            <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>
              {l('Note / Reference (Optional)', 'বিবরণ / নোট (ঐচ্ছিক)')}
            </Text>
            <TextInput
              style={styles.noteInput}
              value={transferNote}
              onChangeText={setTransferNote}
              placeholder={l('e.g. Field collection handover', 'যেমন: মাঠের কালেকশন জমা')}
            />

            <TouchableOpacity
              style={styles.transferSubmitBtn}
              onPress={handleExecuteTransfer}
              activeOpacity={0.88}
            >
              <Text style={styles.transferSubmitBtnText}>
                {l('Complete Transfer', 'স্থানান্তর সম্পন্ন করুন')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTxn} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTxn(null)}
        >
          <View style={styles.detailModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{l('Transaction Details', 'লেনদেন বিবরণ')}</Text>
              <TouchableOpacity onPress={() => setSelectedTxn(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedTxn && (
              <View style={styles.detailBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{l('Receipt / Voucher No:', 'রসিদ / ভাউচার নং:')}</Text>
                  <Text style={styles.detailValBold}>{selectedTxn.receiptNo}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{l('Type:', 'ধরণ:')}</Text>
                  <Text style={styles.detailVal}>
                    {selectedTxn.type === 'deposit'
                      ? l('Member Deposit', 'সদস্যের জমা')
                      : selectedTxn.type === 'profit'
                      ? l('Project Profit', 'প্রজেক্ট লাভ')
                      : selectedTxn.type === 'transfer'
                      ? l('Cash Transfer', 'হিসাব স্থানান্তর')
                      : l('Expense', 'সমিতির খরচ')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{l('Amount:', 'পরিমাণ:')}</Text>
                  <Text
                    style={[
                      styles.detailValBold,
                      { color: selectedTxn.type === 'expense' ? '#DC2626' : '#059669', fontSize: 16 },
                    ]}
                  >
                    {formatMoney(selectedTxn.amount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{l('Date:', 'তারিখ:')}</Text>
                  <Text style={styles.detailVal}>{selectedTxn.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{l('Payment Method:', 'পরিশোধ মাধ্যম:')}</Text>
                  <Text style={styles.detailVal}>
                    {selectedTxn.paymentMethod === 'bkash'
                      ? 'বিকাশ'
                      : selectedTxn.paymentMethod === 'bank'
                      ? 'ব্যাংক'
                      : 'হাতে নগদ'}
                  </Text>
                </View>
                {selectedTxn.note && (
                  <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                    <Text style={styles.detailLabel}>{l('Note:', 'বিবরণ:')}</Text>
                    <Text style={[styles.detailVal, { flex: 1, textAlign: 'right' }]}>{selectedTxn.note}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeDetailBtn}
                  onPress={() => setSelectedTxn(null)}
                >
                  <Text style={styles.closeDetailBtnText}>{l('Close', 'বন্ধ করুন')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Export / Report Modal */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExportModal(false)}
        >
          <View style={styles.exportModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{l('Export Statement', 'স্টেটমেন্ট এক্সপোর্ট')}</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.exportSub}>
              {l('Uttara Model Samity', 'উত্তরা মডেল সমবায় সমিতি')} · {selectedMonthObj.bn}
            </Text>

            <View style={styles.exportOptions}>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => {
                  setShowExportModal(false);
                  triggerToast(l('PDF statement downloaded successfully!', 'PDF স্টেটমেন্ট ডাউনলোড সম্পন্ন হয়েছে!'));
                }}
              >
                <Ionicons name="document-text-outline" size={22} color="#0F766E" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.exportBtnTitle}>{l('Download PDF Report', 'PDF রিপোর্ট ডাউনলোড')}</Text>
                  <Text style={styles.exportBtnSub}>{l('Official signed statement copy', 'দাপ্তরিক ও নিরীক্ষিত স্টেটমেন্ট')}</Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => {
                  setShowExportModal(false);
                  triggerToast(l('Excel sheet exported successfully!', 'Excel ফাইল এক্সপোর্ট সম্পন্ন হয়েছে!'));
                }}
              >
                <Ionicons name="grid-outline" size={22} color="#059669" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.exportBtnTitle}>{l('Export Excel Sheet', 'Excel ফাইল এক্সপোর্ট')}</Text>
                  <Text style={styles.exportBtnSub}>{l('Full ledger spreadsheet (.xlsx)', 'পূর্ণাঙ্গ আর্থিক স্প্রেডশিট')}</Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleShareStatement}
              >
                <Ionicons name="share-social-outline" size={22} color="#0284C7" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.exportBtnTitle}>{l('Share via WhatsApp', 'হোয়াটসঅ্যাপে শেয়ার')}</Text>
                  <Text style={styles.exportBtnSub}>{l('Send monthly financial summary', 'কমিটিকে সারসংক্ষেপ প্রেরণ')}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerBtn: {
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
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  toastText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#0F766E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 14,
  },
  monthPillText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  transferLink: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
  },
  seeAllLink: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  accountsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  accountSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  accountBalance: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  accountDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  totalLabel: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  totalBalance: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#0F766E',
  },
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  catItem: {
    gap: 6,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catName: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  catAmount: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  catTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 3,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  recentDetails: {
    flex: 1,
  },
  recentTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  recentMeta: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recentAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
  },
  recentDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#134E4A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    gap: 6,
  },
  fabText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  monthModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  monthOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  monthOptionRowActive: {
    backgroundColor: '#E6F4F2',
  },
  monthOptionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  monthOptionTitleActive: {
    color: '#0F766E',
  },
  monthOptionSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  transferModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  modalFieldLabel: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  modalPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountChipActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  accountChipText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#475569',
  },
  accountChipTextActive: {
    color: '#FFFFFF',
  },
  amountInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  quickAmtRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  quickAmtBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickAmtText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#0F766E',
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#1E293B',
  },
  transferSubmitBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  transferSubmitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  detailModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  detailBox: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  detailVal: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  detailValBold: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  closeDetailBtn: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeDetailBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#475569',
  },
  exportModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  exportSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  exportOptions: {
    gap: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  exportBtnTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  exportBtnSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
