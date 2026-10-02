import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { safeBack } from '../../../src/utils/navigation';
import { AppModal } from '../../../src/components/AppModal';
import { toEnglishDigits } from '../../../src/lib/bengali';
import { colors } from '../../../src/theme/colors';

export default function RecordDepositScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { members, recordDeposit } = useSomitiStore();
  const { l, formatMoney, formatNum } = useLanguage();

  // Find selected member or default to করিম উদ্দিন (or first due member)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    (params.memberId as string) || (members.find((m) => m.status === 'due')?.id || members[0]?.id || '1')
  );
  const [showMemberModal, setShowMemberModal] = useState(false);

  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0];

  const [augustSelected, setAugustSelected] = useState(true);
  const [septemberSelected, setSeptemberSelected] = useState(true);
  const [octoberSelected, setOctoberSelected] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('bkash');
  const [trxId, setTrxId] = useState('BK7X29QM4L');
  const [date, setDate] = useState('2 October 2026');

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [sendPush, setSendPush] = useState(true);

  // Recalculate amount dynamically based on selected months
  const monthsCount = (augustSelected ? 1 : 0) + (septemberSelected ? 1 : 0) + (octoberSelected ? 1 : 0);
  const lateFee = augustSelected ? 100 : 0;
  const rate = currentMember?.monthlyAmount || 2000;
  const baseAmount = monthsCount * rate;
  const defaultTotal = baseAmount + lateFee;

  // Fully editable amount state (defaults to calculated total, but user can edit e.g. 1500 or 5000)
  const [customAmount, setCustomAmount] = useState<string>(String(defaultTotal));

  const toggleAugust = () => {
    const nextAug = !augustSelected;
    setAugustSelected(nextAug);
    const count = (nextAug ? 1 : 0) + (septemberSelected ? 1 : 0) + (octoberSelected ? 1 : 0);
    const fee = nextAug ? 100 : 0;
    setCustomAmount(String(count * rate + fee));
  };

  const toggleSeptember = () => {
    const nextSep = !septemberSelected;
    setSeptemberSelected(nextSep);
    const count = (augustSelected ? 1 : 0) + (nextSep ? 1 : 0) + (octoberSelected ? 1 : 0);
    const fee = augustSelected ? 100 : 0;
    setCustomAmount(String(count * rate + fee));
  };

  const toggleOctober = () => {
    const nextOct = !octoberSelected;
    setOctoberSelected(nextOct);
    const count = (augustSelected ? 1 : 0) + (septemberSelected ? 1 : 0) + (nextOct ? 1 : 0);
    const fee = augustSelected ? 100 : 0;
    setCustomAmount(String(count * rate + fee));
  };

  const handleSelectMember = (mId: string) => {
    setSelectedMemberId(mId);
    setShowMemberModal(false);
    const m = members.find((x) => x.id === mId);
    const mRate = m?.monthlyAmount || 2000;
    setCustomAmount(String(monthsCount * mRate + lateFee));
  };

  const handleConfirmDeposit = () => {
    const cleanAmount = parseInt(toEnglishDigits(customAmount).replace(/\D/g, ''), 10);
    if (!cleanAmount || cleanAmount <= 0) {
      Alert.alert(
        l('Invalid Amount', 'ভুল টাকার পরিমাণ'),
        l('Please enter a valid deposit amount.', 'অনুগ্রহ করে সঠিক জমার টাকার পরিমাণ লিখুন।')
      );
      return;
    }

    const selectedMonths: string[] = [];
    if (augustSelected) selectedMonths.push('আগস্ট');
    if (septemberSelected) selectedMonths.push('সেপ্টেম্বর');
    if (octoberSelected) selectedMonths.push('অক্টোবর');
    if (selectedMonths.length === 0) {
      selectedMonths.push('চলতি জমা');
    }

    const newTxn = recordDeposit({
      memberId: currentMember.id,
      months: selectedMonths,
      baseAmount: Math.max(0, cleanAmount - lateFee),
      lateFee,
      totalAmount: cleanAmount,
      paymentMethod,
      trxId: paymentMethod !== 'cash' ? trxId : undefined,
      note: `${selectedMonths.join(', ')} কিস্তি`,
      sendWhatsApp,
      sendSMS,
    });

    router.replace(`/(admin)/receipt/${newTxn.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/collection')}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Record Deposit', 'জমা গ্রহণ')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Member Selector Card */}
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.avatarText}>{currentMember?.name?.charAt(0) || 'S'}</Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{currentMember?.name}</Text>
            <Text style={styles.memberSub}>
              {currentMember?.code} · {l('Monthly', 'মাসিক')} {formatMoney(currentMember?.monthlyAmount || 2000)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowMemberModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.changeLink}>{l('Change', 'বদলান')}</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Month Selection */}
        <Text style={styles.sectionTitle}>{l('Which month deposit?', 'কোন মাসের জমা?')}</Text>
        <View style={styles.monthPillsRow}>
          <TouchableOpacity
            style={[styles.monthPill, augustSelected && styles.monthPillActive]}
            onPress={toggleAugust}
            activeOpacity={0.8}
          >
            <Ionicons
              name={augustSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={augustSelected ? '#0F766E' : '#94A3B8'}
            />
            <Text style={[styles.monthPillText, augustSelected && styles.monthPillTextActive]}>
              {l('August Due', 'আগস্ট বকেয়া')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.monthPill, septemberSelected && styles.monthPillActive]}
            onPress={toggleSeptember}
            activeOpacity={0.8}
          >
            <Ionicons
              name={septemberSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={septemberSelected ? '#0F766E' : '#94A3B8'}
            />
            <Text style={[styles.monthPillText, septemberSelected && styles.monthPillTextActive]}>
              {l('September', 'সেপ্টেম্বর')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.monthPill, octoberSelected && styles.monthPillActive]}
            onPress={toggleOctober}
            activeOpacity={0.8}
          >
            <Ionicons
              name={octoberSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={octoberSelected ? '#0F766E' : '#94A3B8'}
            />
            <Text style={[styles.monthPillText, octoberSelected && styles.monthPillTextActive]}>
              {l('October Advance', 'অক্টোবর অগ্রিম')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Amount Breakdown & Editable Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
              {l(`Regular deposit (${monthsCount} mo × ${formatMoney(rate)})`, `নিয়মিত জমা (${formatNum(monthsCount)} মাস × ${formatMoney(rate)})`)}
            </Text>
            <Text style={styles.amountVal}>{formatMoney(baseAmount)}</Text>
          </View>

          {lateFee > 0 && (
            <View style={styles.amountRow}>
              <View style={styles.lateFeeLabelRow}>
                <Text style={styles.amountLabel}>{l('Late fee (August)', 'বিলম্ব ফি (আগস্ট)')}</Text>
                <View style={styles.lateFeeBadge}>
                  <Text style={styles.lateFeeBadgeText}>+{formatMoney(lateFee)}</Text>
                </View>
              </View>
              <Text style={styles.amountVal}>+{formatMoney(lateFee)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Editable Deposit Amount Input (As Requested) */}
          <View style={styles.editableAmountSection}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>{l('Deposit Amount', 'জমার পরিমাণ (মোট)')}</Text>
              <Text style={styles.amountHintText}>
                {l('Editable: type custom, partial or advance amount', 'সম্পাদনযোগ্য: আংশিক বা অগ্রিম হলে পরিবর্তন করুন')}
              </Text>
            </View>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>৳</Text>
              <TextInput
                style={styles.amountTextInput}
                value={customAmount}
                onChangeText={(t) => setCustomAmount(toEnglishDigits(t))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* 3. Payment Method */}
        <Text style={styles.sectionTitle}>{l('Payment Method', 'পরিশোধের মাধ্যম')}</Text>
        <View style={styles.methodGrid}>
          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cash-outline"
              size={20}
              color={paymentMethod === 'cash' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'cash' && styles.methodBtnTextActive]}>
              {l('Cash', 'নগদ টাকা')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'bkash' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('bkash')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={paymentMethod === 'bkash' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'bkash' && styles.methodBtnTextActive]}>
              {l('bKash', 'বিকাশ')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'nagad' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('nagad')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flash-outline"
              size={20}
              color={paymentMethod === 'nagad' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'nagad' && styles.methodBtnTextActive]}>
              {l('Nagad (App)', 'নগদ (অ্যাপ)')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'bank' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('bank')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="business-outline"
              size={20}
              color={paymentMethod === 'bank' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'bank' && styles.methodBtnTextActive]}>
              {l('Bank', 'ব্যাংক')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TrxID / Date Input */}
        {paymentMethod !== 'cash' && (
          <View style={styles.inputCard}>
            <Text style={styles.inputCardLabel}>{l('Transaction ID (TrxID)', 'ট্রানজ্যাকশন আইডি (TrxID)')}</Text>
            <TextInput
              style={styles.textInput}
              value={trxId}
              onChangeText={setTrxId}
              placeholder="e.g. BK7X29QM4L"
              placeholderTextColor="#94A3B8"
            />
          </View>
        )}

        <View style={styles.inputCard}>
          <Text style={styles.inputCardLabel}>{l('Deposit Date', 'জমার তারিখ')}</Text>
          <TextInput
            style={styles.textInput}
            value={date}
            onChangeText={setDate}
            placeholder={l('2 October 2026', '২ অক্টোবর ২০২৬')}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* 4. Notification Channels */}
        <Text style={styles.sectionTitle}>{l('Receipt Delivery Method', 'রসিদ পাঠানোর মাধ্যম')}</Text>
        <View style={styles.notifyCard}>
          <TouchableOpacity
            style={styles.notifyRow}
            onPress={() => setSendWhatsApp(!sendWhatsApp)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sendWhatsApp ? 'checkbox' : 'square-outline'}
              size={20}
              color={sendWhatsApp ? '#0F766E' : '#94A3B8'}
            />
            <Text style={styles.notifyLabel}>{l('Send receipt via WhatsApp', 'হোয়াটসঅ্যাপে রসিদ পাঠান')}</Text>
          </TouchableOpacity>

          <View style={styles.dividerLight} />

          <TouchableOpacity
            style={styles.notifyRow}
            onPress={() => setSendSMS(!sendSMS)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sendSMS ? 'checkbox' : 'square-outline'}
              size={20}
              color={sendSMS ? '#0F766E' : '#94A3B8'}
            />
            <Text style={styles.notifyLabel}>{l('Send SMS (Optional)', 'এসএমএস পাঠান (ঐচ্ছিক)')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Member Selection Modal */}
      <AppModal
        visible={showMemberModal}
        onClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Select Member', 'সদস্য নির্বাচন করুন')}</Text>
          <TouchableOpacity onPress={() => setShowMemberModal(false)}>
            <Ionicons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 350 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.modalMemberItem,
                item.id === selectedMemberId && styles.modalMemberItemActive,
              ]}
              onPress={() => handleSelectMember(item.id)}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberSub}>
                  {item.code} · {formatMoney(item.monthlyAmount)}
                </Text>
              </View>
              {item.dueAmount > 0 && (
                <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>
                  {l('Due', 'বাকি')} {formatMoney(item.dueAmount)}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      </AppModal>

      {/* Bottom Confirm Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmDeposit}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>{l('Confirm Deposit', 'জমা নিশ্চিত করুন')}</Text>
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
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#134E4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  memberSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  changeLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  monthPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  monthPillActive: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  monthPillText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  monthPillTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  amountLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  amountVal: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  lateFeeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lateFeeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lateFeeBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#D97706',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  totalVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#0F766E',
  },
  editableAmountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  amountHintText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#0F766E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 120,
    justifyContent: 'flex-end',
  },
  currencySymbol: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#0F766E',
    marginRight: 4,
  },
  amountTextInput: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#0F766E',
    minWidth: 70,
    textAlign: 'right',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  methodBtnActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  methodBtnText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#475569',
  },
  methodBtnTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  inputCardLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  textInput: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 14,
    color: '#1E293B',
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 4,
  },
  notifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  notifyLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#334155',
  },
  dividerLight: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
  modalMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalMemberItemActive: {
    backgroundColor: '#CCFBF1',
  },
});
