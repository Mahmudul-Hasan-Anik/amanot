import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { toEnglishDigits, toBengaliDigits } from '../../../src/lib/bengali';

const EXPENSE_CATEGORIES = [
  'সভা ও আপ্যায়ন',
  'যাতায়াত',
  'অফিস ভাড়া',
  'এসএমএস ও অ্যাপ',
  'স্টেশনারি',
  'আইনি ফি',
  'মাঠকর্মী সম্মানী',
  'অন্যান্য',
];

export default function NewExpenseScreen() {
  const router = useRouter();
  const { addExpense } = useSomitiStore();

  const [amount, setAmount] = useState('১২,৫০০');
  const [selectedCategory, setSelectedCategory] = useState('সভা ও আপ্যায়ন');
  const [source, setSource] = useState<'treasurer' | 'bank' | 'bkash'>('treasurer');
  const [date, setDate] = useState('২ অক্টোবর ২০২৬');
  const [spender, setSpender] = useState('আনোয়ার হোসেন');
  const [reason, setReason] = useState('বার্ষিক সাধারণ সভার দুপুরের খাবার (১০০ জন)');

  const handleSubmit = () => {
    const cleanAmount = Number(toEnglishDigits(amount.replace(/[^\d]/g, ''))) || 0;
    if (cleanAmount <= 0) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে খরচের সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে খরচের কারণ বা বিবরণ লিখুন।');
      return;
    }

    const voucherNo = `V-${toBengaliDigits(Math.floor(1000 + Math.random() * 9000))}`;
    const paymentSource = source === 'bank' ? 'ব্যাংক' : source === 'bkash' ? 'বিকাশ' : 'কোষাধ্যক্ষের হাত (হাতে নগদ)';

    addExpense({
      title: reason,
      category: selectedCategory,
      amount: cleanAmount,
      paymentSource,
      voucherNo,
      note: `ব্যয়কারী: ${spender}`,
    });

    Alert.alert(
      'খরচ সংরক্ষিত হয়েছে',
      `ভাউচার নং ${voucherNo} - ৳${toBengaliDigits(cleanAmount)} টাকা খরচ লিপিবদ্ধ করা হয়েছে।`,
      [{ text: 'ঠিক আছে', onPress: () => router.replace('/(admin)/(tabs)') }]
    );
  };

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
        <Text style={styles.headerTitle}>খরচ লিখুন</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Amount Box */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>পরিমাণ (টাকা)</Text>
          <TextInput
            style={styles.amountDisplay}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="১২,৫০০"
            placeholderTextColor="#94A3B8"
          />
          <View style={styles.amountUnderline} />
        </View>

        {/* Section: খাত */}
        <Text style={styles.sectionTitle}>খাত</Text>
        <View style={styles.categoriesGrid}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color="#0F766E" />}
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date and Spender Two Inputs Row */}
        <View style={styles.twoInputsRow}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>তারিখ</Text>
            <View style={styles.pickerBox}>
              <TextInput
                style={styles.pickerText}
                value={date}
                onChangeText={setDate}
              />
              <Ionicons name="calendar-outline" size={18} color="#64748B" />
            </View>
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>ব্যয়কারী</Text>
            <View style={styles.pickerBox}>
              <TextInput
                style={styles.pickerText}
                value={spender}
                onChangeText={setSpender}
              />
              <Ionicons name="person-outline" size={18} color="#64748B" />
            </View>
          </View>
        </View>

        {/* Section: পরিশোধের উৎস */}
        <Text style={styles.sectionTitle}>পরিশোধের উৎস</Text>
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, source === 'treasurer' && styles.segmentBtnActive]}
            onPress={() => setSource('treasurer')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, source === 'treasurer' && styles.segmentTextActive]}>
              কোষাধ্যক্ষের হাতে
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, source === 'bank' && styles.segmentBtnActive]}
            onPress={() => setSource('bank')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, source === 'bank' && styles.segmentTextActive]}>
              ব্যাংক
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, source === 'bkash' && styles.segmentBtnActive]}
            onPress={() => setSource('bkash')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, source === 'bkash' && styles.segmentTextActive]}>
              বিকাশ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: কারণ */}
        <Text style={styles.sectionTitle}>কারণ</Text>
        <View style={styles.reasonCard}>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            placeholder="খরচের বিবরণ লিখুন"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Section: রসিদের ছবি যোগ করুন */}
        <TouchableOpacity
          style={styles.voucherDashedBox}
          onPress={() => Alert.alert('ছবি যুক্ত করুন', 'ভাউচারের ছবি তোলা বা গ্যালারি থেকে যোগ করা সম্পন্ন হয়েছে')}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={26} color="#0F766E" />
          <Text style={styles.voucherTitle}>রসিদের ছবি যোগ করুন</Text>
          <Text style={styles.voucherSub}>৳১,০০০ এর বেশি ব্যয়ে ভাউচার যুক্ত রাখুন</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>খরচ সংরক্ষণ করুন</Text>
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
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
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
    marginBottom: 6,
  },
  amountDisplay: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 32,
    color: '#1E293B',
    textAlign: 'center',
    minWidth: 160,
  },
  amountUnderline: {
    width: 80,
    height: 2,
    backgroundColor: '#0F766E',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  categoryText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#475569',
  },
  categoryTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
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
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  pickerText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  segmentTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  reasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  reasonInput: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#1E293B',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  voucherDashedBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  voucherTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 6,
  },
  voucherSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
