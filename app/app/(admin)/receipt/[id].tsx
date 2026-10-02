import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getTransactionById, getMemberById, transactions, members, somitiInfo } = useSomitiStore();
  const { l, formatMoney } = useLanguage();

  const txn = getTransactionById(id as string) || transactions[0];
  const member = txn ? getMemberById(txn.memberId) || members.find((m) => m.id === txn.memberId) : members[0];

  const receiptNo = txn?.receiptNo || '#1088';
  const amount = txn?.amount || 4100;
  const memberName = txn?.memberName || member?.name || 'Karim Uddin';
  const memberCode = txn?.memberCode || member?.code || 'SM-042';
  const monthsStr = txn?.months?.join(', ') || (l('August, September 2026', 'আগস্ট, সেপ্টেম্বর ২০২৬'));
  const lateFee = txn?.lateFee || 0;
  const baseDeposit = amount - lateFee;
  const dateStr = txn?.date || (l('2 October 2026', '২ অক্টোবর ২০২৬'));
  const methodStr =
    txn?.paymentMethod === 'bkash'
      ? `${l('bKash', 'বিকাশ')} ${txn.trxId ? `· ${txn.trxId}` : ''}`
      : txn?.paymentMethod === 'nagad'
      ? `${l('Nagad', 'নগদ')} ${txn.trxId ? `· ${txn.trxId}` : ''}`
      : txn?.paymentMethod === 'bank'
      ? l('Bank Transfer', 'ব্যাংক ট্রান্সফার')
      : l('Cash', 'হাতে নগদ');

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${l((somitiInfo as any).nameEn || 'Uttara Model Samity', somitiInfo.name || 'উত্তরা মডেল সমবায় সমিতি')} - ${l('Deposit Receipt', 'জমা রসিদ')} ${receiptNo}\n${l('Member:', 'সদস্য:')} ${memberName} (${memberCode})\n${l('Month:', 'মাস:')} ${monthsStr}\n${l('Deposit:', 'জমা:')} ${formatMoney(baseDeposit)}\n${lateFee > 0 ? `${l('Late Fee:', 'বিলম্ব ফি:')} ${formatMoney(lateFee)}\n` : ''}${l('Total Collection:', 'মোট আদায়:')} ${formatMoney(amount)}\n${l('Method:', 'মাধ্যম:')} ${methodStr}\n${l('Date:', 'তারিখ:')} ${dateStr}\n${l('Total Deposit Now:', 'এখন মোট জমা:')} ${formatMoney(member?.totalDeposit || amount)}`,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Success Badge */}
        <View style={styles.successArea}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={32} color="#0F766E" />
          </View>

          <Text style={styles.successTitle}>{l('Deposit Successful', 'জমা সফল হয়েছে')}</Text>
          <Text style={styles.amountLarge}>{formatMoney(amount)}</Text>

          <View style={styles.whatsappNoticePill}>
            <Text style={styles.whatsappNoticeText}>{l('Receipt sent via WhatsApp ✓', 'হোয়াটসঅ্যাপে রসিদ পাঠানো হয়েছে ✓')}</Text>
          </View>
        </View>

        {/* Voucher Card */}
        <View style={styles.voucherCard}>
          <View style={styles.voucherTop}>
            <Text style={styles.voucherNo}>{l('Receipt', 'রসিদ')} {receiptNo}</Text>
            <Text style={styles.voucherSomiti}>
              {l((somitiInfo as any).nameEn || 'Uttara Model Samity', somitiInfo.name || 'উত্তরা মডেল সমবায় সমিতি')}
            </Text>
          </View>

          <View style={styles.detailList}>
            <View style={styles.row}>
              <Text style={styles.label}>{l('Member', 'সদস্য')}</Text>
              <Text style={styles.value}>{memberName} ({memberCode})</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Months', 'মাস')}</Text>
              <Text style={styles.value}>{monthsStr}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Deposit', 'জমা')}</Text>
              <Text style={styles.value}>{formatMoney(baseDeposit)}</Text>
            </View>

            {lateFee > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>{l('Late Fee', 'বিলম্ব ফি')}</Text>
                <Text style={styles.value}>{formatMoney(lateFee)}</Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>{l('Method', 'মাধ্যম')}</Text>
              <Text style={styles.value}>{methodStr}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Date', 'তারিখ')}</Text>
              <Text style={styles.value}>{dateStr}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Received By', 'গ্রহণকারী')}</Text>
              <Text style={styles.value}>{l('Mahmuda Khatun (Treasurer)', 'মাহমুদা খাতুন (কোষাধ্যক্ষ)')}</Text>
            </View>
          </View>

          <View style={styles.dottedDivider} />

          <View style={styles.rowTotal}>
            <Text style={styles.labelTotal}>{l('Total Deposit Now', 'এখন মোট জমা')}</Text>
            <Text style={styles.valueTotal}>{formatMoney(member?.totalDeposit || amount)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsGroup}>
          {/* Share Button (white pill with dark teal border) */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#134E4A" />
            <Text style={styles.shareBtnText}>{l('Share Receipt', 'রসিদ শেয়ার করুন')}</Text>
          </TouchableOpacity>

          {/* Another Deposit Button (dark teal pill) */}
          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => router.replace('/(admin)/deposit/new')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.anotherBtnText}>{l('Record Another Deposit', 'আরেকটি জমা নিন')}</Text>
          </TouchableOpacity>

          {/* Home Link */}
          <TouchableOpacity
            style={styles.homeLinkBtn}
            onPress={() => router.replace('/(admin)/(tabs)')}
            activeOpacity={0.7}
          >
            <Text style={styles.homeLinkText}>{l('Back to Home', 'হোমে ফিরুন')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  successArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
  },
  amountLarge: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 34,
    color: '#1E293B',
    marginVertical: 4,
  },
  whatsappNoticePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 6,
  },
  whatsappNoticeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#15803D',
  },
  voucherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  voucherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  voucherNo: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#0F766E',
  },
  voucherSomiti: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  detailList: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  value: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  rowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelTotal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  valueTotal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 17,
    color: '#0F766E',
  },
  buttonsGroup: {
    gap: 12,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  shareBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#134E4A',
  },
  anotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  anotherBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  homeLinkBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  homeLinkText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#64748B',
  },
});
