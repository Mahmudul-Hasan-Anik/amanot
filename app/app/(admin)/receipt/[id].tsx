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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReceiptScreen() {
  const router = useRouter();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `আমানত - জমা রসিদ #১০৮৮\nসদস্য: করিম উদ্দিন (SM-042)\nমাস: আগস্ট, সেপ্টেম্বর ২০২৬\nজমা: ৳৪,০০০\nবিলম্ব ফি: ৳১০০\nমোট আদায়: ৳৪,১০০\nতারিখ: ৩০ সেপ্টেম্বর ২০২৬, ১১:৪২\nএখন মোট জমা: ৳১,১২,০০০`,
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

          <Text style={styles.successTitle}>জমা সফল হয়েছে</Text>
          <Text style={styles.amountLarge}>৳৪,১০০</Text>

          <View style={styles.whatsappNoticePill}>
            <Text style={styles.whatsappNoticeText}>হোয়াটসঅ্যাপে রসিদ পাঠানো হয়েছে ✓</Text>
          </View>
        </View>

        {/* Voucher Card */}
        <View style={styles.voucherCard}>
          <View style={styles.voucherTop}>
            <Text style={styles.voucherNo}>রসিদ #১০৮৮</Text>
            <Text style={styles.voucherSomiti}>[সমিতির নাম]</Text>
          </View>

          <View style={styles.detailList}>
            <View style={styles.row}>
              <Text style={styles.label}>সদস্য</Text>
              <Text style={styles.value}>করিম উদ্দিন (SM-042)</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>মাস</Text>
              <Text style={styles.value}>আগস্ট, সেপ্টেম্বর ২০২৬</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>জমা</Text>
              <Text style={styles.value}>৳৪,০০০</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>বিলম্ব ফি</Text>
              <Text style={styles.value}>৳১০০</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>মাধ্যম</Text>
              <Text style={styles.value}>বিকাশ · BK7X29QM4L</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>তারিখ</Text>
              <Text style={styles.value}>৩০ সেপ্টেম্বর ২০২৬, ১১:৪২</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>গ্রহণকারী</Text>
              <Text style={styles.value}>মাহমুদা খাতুন (কোষাধ্যক্ষ)</Text>
            </View>
          </View>

          <View style={styles.dottedDivider} />

          <View style={styles.rowTotal}>
            <Text style={styles.labelTotal}>এখন মোট জমা</Text>
            <Text style={styles.valueTotal}>৳১,১২,০০০</Text>
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
            <Text style={styles.shareBtnText}>রসিদ শেয়ার করুন</Text>
          </TouchableOpacity>

          {/* Another Deposit Button (dark teal pill) */}
          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => router.replace('/(admin)/deposit/new')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.anotherBtnText}>আরেকটি জমা নিন</Text>
          </TouchableOpacity>

          {/* Home Link */}
          <TouchableOpacity
            style={styles.homeLinkBtn}
            onPress={() => router.replace('/(admin)/(tabs)')}
            activeOpacity={0.7}
          >
            <Text style={styles.homeLinkText}>হোমে ফিরুন</Text>
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
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
  },
  whatsappNoticeText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#0F766E',
  },
  voucherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  voucherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voucherNo: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  voucherSomiti: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#64748B',
  },
  detailList: {
    gap: 10,
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
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    marginVertical: 14,
  },
  rowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelTotal: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#64748B',
  },
  valueTotal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#134E4A',
  },
  buttonsGroup: {
    gap: 12,
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 28,
    gap: 8,
  },
  shareBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#134E4A',
  },
  anotherBtn: {
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 6,
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
    color: '#134E4A',
  },
});
