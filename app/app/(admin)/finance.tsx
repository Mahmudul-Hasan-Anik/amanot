import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { formatBengaliMoney, toBengaliDigits } from '../../src/lib/money';

export default function FinanceScreen() {
  const router = useRouter();
  const { somitiInfo, cashAccounts, expenses, transactions, transferCash } = useSomitiStore();

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromAccount, setFromAccount] = useState<string>(cashAccounts[3]?.id || 'field');
  const [toAccount, setToAccount] = useState<string>(cashAccounts[1]?.id || 'cashier');
  const [transferAmount, setTransferAmount] = useState<string>('5000');

  const totalCashAndBank = cashAccounts.reduce((sum, acc) => sum + acc.amount, 0);

  // Group expenses by category
  const expenseByCategory = expenses.reduce((acc: Record<string, number>, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0) || somitiInfo.monthlyExpense;
  const totalIncome = somitiInfo.monthlyCollected;
  const netAmount = totalIncome - totalExpense;

  const handleExecuteTransfer = () => {
    const amt = parseFloat(transferAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('ভুল পরিমাণ', 'অনুগ্রহ করে সঠিক টাকা লিখুন।');
      return;
    }

    const sourceAcc = cashAccounts.find((a) => a.id === fromAccount);
    if (sourceAcc && sourceAcc.amount < amt) {
      Alert.alert('পর্যাপ্ত ব্যালেন্স নেই', `${sourceAcc.name}-এ পর্যাপ্ত ব্যালেন্স নেই।`);
      return;
    }

    if (fromAccount === toAccount) {
      Alert.alert('ভুল অ্যাকাউন্ট', 'একই অ্যাকাউন্টে স্থানান্তর করা সম্ভব নয়।');
      return;
    }

    transferCash(fromAccount, toAccount, amt);
    setShowTransferModal(false);
    Alert.alert('সফল', `৳${formatBengaliMoney(amt)} সফলভাবে স্থানান্তর করা হয়েছে!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>আয় ও ব্যয়</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/(admin)/reports')}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Selector Pill */}
        <TouchableOpacity style={styles.monthPill} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color="#1E293B" />
          <Text style={styles.monthPillText}>অক্টোবর ২০২৬</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* 3 Metrics Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>আয়</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>
              ৳{formatBengaliMoney(totalIncome)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>ব্যয়</Text>
            <Text style={[styles.summaryValue, { color: '#DC2626' }]}>
              ৳{formatBengaliMoney(totalExpense)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>নিট</Text>
            <Text style={[styles.summaryValue, { color: netAmount >= 0 ? '#1E293B' : '#DC2626' }]}>
              {netAmount >= 0 ? `+৳${formatBengaliMoney(netAmount)}` : `−৳${formatBengaliMoney(Math.abs(netAmount))}`}
            </Text>
          </View>
        </View>

        {/* Section: হিসাবসমূহ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>হিসাবসমূহ</Text>
          <TouchableOpacity
            onPress={() => setShowTransferModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.transferLink}>স্থানান্তর</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accountsCard}>
          {cashAccounts.map((account, index) => {
            const getIcon = () => {
              if (account.id === 'bank') return 'business-outline';
              if (account.id === 'bkash') return 'phone-portrait-outline';
              if (account.id === 'field') return 'people-outline';
              return 'wallet-outline';
            };

            return (
              <React.Fragment key={account.id}>
                <View style={styles.accountRow}>
                  <View style={styles.accountIconBox}>
                    <Ionicons name={getIcon()} size={20} color="#0F766E" />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountSub}>{account.holder}</Text>
                  </View>
                  <Text style={styles.accountBalance}>
                    ৳{formatBengaliMoney(account.amount)}
                  </Text>
                </View>
                {index < cashAccounts.length - 1 && <View style={styles.accountDivider} />}
              </React.Fragment>
            );
          })}

          <View style={styles.accountDivider} />

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>হাতে ও ব্যাংকে মোট</Text>
            <Text style={styles.totalBalance}>৳{formatBengaliMoney(totalCashAndBank)}</Text>
          </View>
        </View>

        {/* Section: খাতভিত্তিক ব্যয় */}
        <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>
          খাতভিত্তিক ব্যয়
        </Text>

        <View style={styles.categoriesCard}>
          {Object.entries(expenseByCategory).length > 0 ? (
            Object.entries(expenseByCategory).map(([cat, amt]) => {
              const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
              return (
                <View key={cat} style={styles.catItem}>
                  <View style={styles.catHeader}>
                    <Text style={styles.catName}>{cat}</Text>
                    <Text style={styles.catAmount}>৳{formatBengaliMoney(amt)}</Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View style={[styles.catFill, { width: `${Math.min(100, Math.max(10, pct))}%` }]} />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.catItem}>
              <View style={styles.catHeader}>
                <Text style={styles.catName}>দাপ্তরিক ও সভা</Text>
                <Text style={styles.catAmount}>৳৫,৭০০</Text>
              </View>
              <View style={styles.catTrack}>
                <View style={[styles.catFill, { width: '60%' }]} />
              </View>
            </View>
          )}
        </View>

        {/* Section: সাম্প্রতিক লেনদেন */}
        <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>সাম্প্রতিক লেনদেন</Text>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/audit')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllLink}>সব দেখুন</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentCard}>
          {transactions.slice(0, 4).map((txn, index) => {
            const isDeposit = txn.type === 'deposit';
            return (
              <React.Fragment key={txn.id}>
                <View style={styles.recentRow}>
                  <View style={styles.recentDetails}>
                    <Text style={styles.recentTitle}>
                      {isDeposit ? `জমা: ${txn.memberName}` : txn.note || 'ব্যয়'}
                    </Text>
                    <Text style={styles.recentMeta}>
                      {txn.date} · {txn.paymentMethod === 'bkash' ? 'বিকাশ' : txn.paymentMethod === 'bank' ? 'ব্যাংক' : 'হাতে নগদ'}
                    </Text>
                  </View>
                  <Text style={[styles.recentAmount, { color: isDeposit ? '#059669' : '#DC2626' }]}>
                    {isDeposit ? `+৳${formatBengaliMoney(txn.amount)}` : `−৳${formatBengaliMoney(txn.amount)}`}
                  </Text>
                </View>
                {index < Math.min(transactions.length, 4) - 1 && <View style={styles.recentDivider} />}
              </React.Fragment>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/expense/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>খরচ লিখুন</Text>
      </TouchableOpacity>

      {/* Cash Transfer Modal */}
      <Modal visible={showTransferModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>হিসাব স্থানান্তর</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* From Account */}
            <Text style={styles.modalFieldLabel}>কোন হিসাব থেকে?</Text>
            <View style={styles.modalPickerRow}>
              {cashAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountChip, fromAccount === acc.id && styles.accountChipActive]}
                  onPress={() => setFromAccount(acc.id)}
                >
                  <Text style={[styles.accountChipText, fromAccount === acc.id && styles.accountChipTextActive]}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* To Account */}
            <Text style={[styles.modalFieldLabel, { marginTop: 14 }]}>কোন হিসাবে জমা হবে?</Text>
            <View style={styles.modalPickerRow}>
              {cashAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountChip, toAccount === acc.id && styles.accountChipActive]}
                  onPress={() => setToAccount(acc.id)}
                >
                  <Text style={[styles.accountChipText, toAccount === acc.id && styles.accountChipTextActive]}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text style={[styles.modalFieldLabel, { marginTop: 14 }]}>টাকার পরিমাণ (৳)</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholder="৫০০০"
            />

            <TouchableOpacity
              style={styles.transferSubmitBtn}
              onPress={handleExecuteTransfer}
              activeOpacity={0.85}
            >
              <Text style={styles.transferSubmitBtnText}>স্থানান্তর সম্পন্ন করুন</Text>
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
    color: '#1E293B',
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
    fontFamily: 'HindSiliguri-SemiBold',
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
    shadowOpacity: 0.2,
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
  modalCard: {
    width: '100%',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  accountChipActive: {
    backgroundColor: '#0F766E',
  },
  accountChipText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
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
  transferSubmitBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  transferSubmitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
