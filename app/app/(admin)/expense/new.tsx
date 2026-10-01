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

  const [selectedCategory, setSelectedCategory] = useState('সভা ও আপ্যায়ন');
  const [source, setSource] = useState<'treasurer' | 'bank' | 'bkash'>('treasurer');
  const [date, setDate] = useState('৩০/০৯/২০২৬');
  const [spender, setSpender] = useState('আনোয়ার হোসেন');
  const [reason, setReason] = useState('বার্ষিক সাধারণ সভার দুপুরের খাবার (১০০ জন)');

  const handleSubmit = () => {
    Alert.alert(
      'অনুমোদনের জন্য পাঠানো হয়েছে',
      'পরিমাণ ৳১০,০০০ এর বেশি হওয়ায় সভাপতির অনুমোদনের পর ব্যয়টি চূড়ান্ত হবে।',
      [{ text: 'ঠিক আছে', onPress: () => router.replace('/(admin)/approvals') }]
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
          <Text style={styles.amountLabel}>পরিমাণ</Text>
          <Text style={styles.amountDisplay}>৳ ১২,৫০০</Text>
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
              <Text style={styles.pickerText}>{date}</Text>
              <Ionicons name="calendar-outline" size={18} color="#64748B" />
            </View>
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>ব্যয়কারী</Text>
            <View style={styles.pickerBox}>
              <Text style={styles.pickerText}>{spender}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
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
          />
        </View>

        {/* Section: রসিদের ছবি যোগ করুন */}
        <TouchableOpacity style={styles.voucherDashedBox} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={26} color="#0F766E" />
          <Text style={styles.voucherTitle}>রসিদের ছবি যোগ করুন *</Text>
          <Text style={styles.voucherSub}>৳১,০০০ এর বেশি ব্যয়ে বাধ্যতামূলক</Text>
        </TouchableOpacity>

        {/* Warning Notice Box */}
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={18} color="#C2410C" style={styles.warningIcon} />
          <Text style={styles.warningText}>
            পরিমাণ ৳১০,০০০ এর বেশি হওয়ায় সভাপতির অনুমোদনের পর ব্যয়টি চূড়ান্ত হবে।
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>অনুমোদনের জন্য পাঠান</Text>
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
    borderRadius: 16,
    padding: 18,
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
  amountUnderline: {
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
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  categoryText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
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
    fontFamily: 'HindSiliguri-Regular',
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
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
  reasonCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  reasonInput: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  voucherDashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  voucherTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  voucherSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  warningIcon: {
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#C2410C',
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F6F7F2',
  },
  submitBtn: {
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  submitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
