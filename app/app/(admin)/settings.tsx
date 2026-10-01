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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  const [autoReminder, setAutoReminder] = useState(true);
  const [bengaliDigits, setBengaliDigits] = useState(true);

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

          <View style={styles.divider} />

          {/* Row 5 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>পরিচালক অংশের সর্বোচ্চ সীমা</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>২০%</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 6 */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>ক্ষতি হলে</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>সদস্যদের জমা থেকে</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Notice Box */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#475569" style={styles.noticeIcon} />
          <Text style={styles.noticeText}>
            বছরের মাঝে শতাংশ পরিবর্তন করতে সভাপতি ও আরও একজন কমিটি সদস্যের অনুমোদন লাগবে।
          </Text>
        </View>

        {/* Section 3: অনুমোদন */}
        <Text style={styles.sectionTitle}>অনুমোদন</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>ব্যয় অনুমোদনের সীমা</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>৳১০,০০০</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>নতুন বিনিয়োগ</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>সবসময় অনুমোদন</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 4: যোগাযোগ */}
        <Text style={styles.sectionTitle}>যোগাযোগ</Text>
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
              <Text style={styles.valText}>৬টি</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>এসএমএস গেটওয়ে</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>সংযুক্ত</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 5: অ্যাপ */}
        <Text style={styles.sectionTitle}>অ্যাপ</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>ভাষা</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>বাংলা</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowTitle}>বাংলা সংখ্যা</Text>
            <Switch
              value={bengaliDigits}
              onValueChange={setBengaliDigits}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowTitle}>ব্যাকআপ</Text>
            <View style={styles.rowRight}>
              <Text style={styles.valText}>প্রতিদিন · আজ ২:০০</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
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
