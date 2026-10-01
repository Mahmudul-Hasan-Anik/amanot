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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RecordDepositScreen() {
  const router = useRouter();

  const [augustSelected, setAugustSelected] = useState(true);
  const [septemberSelected, setSeptemberSelected] = useState(true);
  const [octoberSelected, setOctoberSelected] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('bkash');
  const [trxId, setTrxId] = useState('BK7X29QM4L');
  const [date, setDate] = useState('৩০/০৯/২০২৬');

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [sendPush, setSendPush] = useState(true);

  // Recalculate amount dynamically based on selected months
  const monthsCount = (augustSelected ? 1 : 0) + (septemberSelected ? 1 : 0) + (octoberSelected ? 1 : 0);
  const lateFee = augustSelected ? 100 : 0;
  const baseAmount = monthsCount * 2000;
  const totalAmount = baseAmount + lateFee;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>জমা গ্রহণ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Member Selector Card */}
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.avatarText}>ক</Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>করিম উদ্দিন</Text>
            <Text style={styles.memberSub}>SM-042 · মাসিক ৳২,০০০</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.changeLink}>বদলান</Text>
          </TouchableOpacity>
        </View>

        {/* Month Selection */}
        <Text style={styles.sectionTitle}>কোন মাসের জমা</Text>
        <View style={styles.monthPillsRow}>
          <TouchableOpacity
            style={[styles.monthPill, augustSelected && styles.monthPillActive]}
            onPress={() => setAugustSelected(!augustSelected)}
            activeOpacity={0.8}
          >
            {augustSelected && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.monthPillText, augustSelected && styles.monthPillTextActive]}>
              আগস্ট (বকেয়া)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.monthPill, septemberSelected && styles.monthPillActive]}
            onPress={() => setSeptemberSelected(!septemberSelected)}
            activeOpacity={0.8}
          >
            {septemberSelected && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.monthPillText, septemberSelected && styles.monthPillTextActive]}>
              সেপ্টেম্বর
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.monthPill, octoberSelected && styles.monthPillActive]}
            onPress={() => setOctoberSelected(!octoberSelected)}
            activeOpacity={0.8}
          >
            {octoberSelected && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.monthPillText, octoberSelected && styles.monthPillTextActive]}>
              অক্টোবর (অগ্রিম)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>পরিমাণ</Text>
          <Text style={styles.amountDisplay}>৳ ৪,১০০</Text>
          <View style={styles.divider} />

          <View style={styles.calcRow}>
            <Text style={styles.calcLeft}>২ মাস × ৳২,০০০</Text>
            <Text style={styles.calcRight}>৳৪,০০০</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLeft}>বিলম্ব ফি (আগস্ট)</Text>
            <Text style={styles.calcRight}>৳১০০</Text>
          </View>
        </View>

        {/* Payment Method Segmented Control */}
        <Text style={styles.sectionTitle}>পেমেন্টের মাধ্যম</Text>
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, paymentMethod === 'cash' && styles.segmentBtnActive]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, paymentMethod === 'cash' && styles.segmentTextActive]}>
              হাতে নগদ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, paymentMethod === 'bkash' && styles.segmentBtnActive]}
            onPress={() => setPaymentMethod('bkash')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, paymentMethod === 'bkash' && styles.segmentTextActive]}>
              বিকাশ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, paymentMethod === 'nagad' && styles.segmentBtnActive]}
            onPress={() => setPaymentMethod('nagad')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, paymentMethod === 'nagad' && styles.segmentTextActive]}>
              নগদ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, paymentMethod === 'bank' && styles.segmentBtnActive]}
            onPress={() => setPaymentMethod('bank')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, paymentMethod === 'bank' && styles.segmentTextActive]}>
              ব্যাংক
            </Text>
          </TouchableOpacity>
        </View>

        {/* Two inputs side-by-side */}
        <View style={styles.twoInputsRow}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>লেনদেন নম্বর</Text>
            <TextInput
              style={styles.textInput}
              value={trxId}
              onChangeText={setTrxId}
              placeholder="BK7X29QM4L"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>তারিখ</Text>
            <TextInput
              style={styles.textInput}
              value={date}
              onChangeText={setDate}
              placeholder="৩০/০৯/২০২৬"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Receipt Dispatch Checkboxes */}
        <View style={styles.receiptCard}>
          <Text style={styles.receiptHeader}>সদস্যকে রসিদ পাঠান</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSendWhatsApp(!sendWhatsApp)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, sendWhatsApp && styles.checkboxBoxActive]}>
              {sendWhatsApp && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>হোয়াটসঅ্যাপ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSendSMS(!sendSMS)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, sendSMS && styles.checkboxBoxActive]}>
              {sendSMS && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>এসএমএস</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSendPush(!sendPush)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, sendPush && styles.checkboxBoxActive]}>
              {sendPush && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>পুশ নোটিফিকেশন</Text>
          </TouchableOpacity>
        </View>

        {/* Information Notice Box */}
        <View style={styles.infoNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#475569" style={styles.infoIcon} />
          <Text style={styles.infoNoticeText}>
            করিম উদ্দিনের আগস্ট ও সেপ্টেম্বরের জমা ৳৪,১০০ বিকাশে গ্রহণ করা হবে। জমার পর মোট জমা হবে ৳১,১২,০০০।
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom Confirm Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => router.replace('/(admin)/receipt/1088')}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>জমা নিশ্চিত করুন</Text>
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
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#0F766E',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-SemiBold',
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
  amountLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  amountDisplay: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 32,
    color: '#1E293B',
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  calcLeft: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  calcRight: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  segmentTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#1E293B',
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  receiptCard: {
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
  receiptHeader: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    gap: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#134E4A',
    borderColor: '#134E4A',
  },
  checkboxLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  infoNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#E8ECE6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginTop: 2,
  },
  infoNoticeText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F6F7F2',
  },
  confirmBtn: {
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  confirmBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
