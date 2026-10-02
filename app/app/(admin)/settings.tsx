import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useSomitiStore } from '../../src/store/somitiStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { resetAllData } = useSomitiStore();

  const [autoReminder, setAutoReminder] = useState(true);
  const [bengaliDigits, setBengaliDigits] = useState(true);

  const handleResetData = () => {
    Alert.alert(
      'ডেটা রিসেট নিশ্চিতকরণ',
      'আপনি কি সকল তথ্য পুনরায় প্রাথমিক অবস্থায় ফিরিয়ে নিতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'হ্যাঁ, রিসেট করুন',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert('সফল', 'অ্যাপের সকল ডেমো তথ্য সফলভাবে রিসেট হয়েছে।');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'লগআউট নিশ্চিতকরণ',
      'আপনি কি আমানত অ্যাপ থেকে লগআউট করতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'লগআউট',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>সেটিংস</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section 1: মাসিক জমা */}
        <Text style={styles.sectionTitle}>মাসিক জমা</Text>
        <View style={styles.card}>
          {/* Row 1 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>ডিফল্ট মাসিক জমা</Text>
              <Text style={styles.rowSub}>সদস্যভিত্তিক পরিবর্তনযোগ্য</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>৳২,০০০</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>জমার শেষ তারিখ</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>প্রতি মাসের ১০ তারিখ</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 3 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>গ্রেস পিরিয়ড</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>৫ দিন</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 4 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>বিলম্ব ফি</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>৳১০০ (নির্দিষ্ট)</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 2: লাভ-ক্ষতি বণ্টন */}
        <Text style={styles.sectionTitle}>লাভ-ক্ষতি বণ্টন</Text>
        <View style={styles.card}>
          {/* Row 1 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>হিসাব বছর</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>জানু – ডিসে</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>বণ্টন পদ্ধতি</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>মোট জমার অনুপাতে</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 3 */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>রিজার্ভ ফান্ড</Text>
              <Text style={styles.rowSub}>কমিটি নির্ধারিত · বছর শুরুতে লক</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>১০%</Text>
              <Ionicons name="lock-closed" size={14} color="#64748B" />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 4 */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>পরিচালক অংশ</Text>
              <Text style={styles.rowSub}>কমিটি নির্ধারিত · বছর শুরুতে লক</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>১০%</Text>
              <Ionicons name="lock-closed" size={14} color="#64748B" />
            </View>
          </View>
        </View>

        {/* Notice Info Box */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#475569" style={styles.noticeIcon} />
          <Text style={styles.noticeText}>
            রিজার্ভ ও পরিচালক শতকরা হার পরিবর্তনের জন্য সাধারণ সভার সিদ্ধান্ত প্রয়োজন।
          </Text>
        </View>

        {/* Section 3: নোটিফিকেশন ও রিমাইন্ডার */}
        <Text style={styles.sectionTitle}>নোটিফিকেশন ও বার্তা</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>স্বয়ংক্রিয় বকেয়া রিমাইন্ডার</Text>
              <Text style={styles.rowSub}>শেষ তারিখের ৩ দিন আগে থেকে</Text>
            </View>
            <Switch
              value={autoReminder}
              onValueChange={setAutoReminder}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>বার্তার টেমপ্লেট</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>৬টি টেমপ্লেট</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 4: সিস্টেম ও সেশন */}
        <Text style={styles.sectionTitle}>সিস্টেম ও সেশন</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleResetData}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, { color: '#D97706' }]}>ডেমো ডেটা রিসেট করুন</Text>
              <Text style={styles.rowSub}>নতুন করে প্রাথমিক ডেটা লোড হবে</Text>
            </View>
            <Ionicons name="refresh-outline" size={20} color="#D97706" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, { color: '#DC2626' }]}>লগআউট</Text>
              <Text style={styles.rowSub}>বর্তমান অ্যাকাউন্ট সেশন সমাপ্ত করুন</Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
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
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  rowSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#E8ECE6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  noticeIcon: {
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
});
