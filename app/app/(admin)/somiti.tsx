import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface CommitteeMember {
  id: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
  name: string;
  role: string;
}

const COMMITTEE: CommitteeMember[] = [
  {
    id: '1',
    initial: 'আ',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    name: 'আনোয়ার হোসেন',
    role: 'সভাপতি',
  },
  {
    id: '2',
    initial: 'জ',
    avatarBg: '#DCFCE7',
    avatarColor: '#16A34A',
    name: 'জাহিদ হাসান',
    role: 'সাধারণ সম্পাদক',
  },
  {
    id: '3',
    initial: 'ম',
    avatarBg: '#CCFBF1',
    avatarColor: '#0F766E',
    name: 'মাহমুদা খাতুন',
    role: 'কোষাধ্যক্ষ',
  },
  {
    id: '4',
    initial: 'হ',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    name: 'হাবিবুর রহমান',
    role: 'সদস্য',
  },
];

export default function SomitiProfileScreen() {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>সমিতির প্রোফাইল</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Somiti Identity Hero */}
        <View style={styles.identityArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>স</Text>
          </View>
          <Text style={styles.somitiName}>[সমিতির নাম]</Text>
          <Text style={styles.somitiSub}>নিবন্ধন নং [নম্বর] · প্রতিষ্ঠা [সাল]</Text>
        </View>

        {/* 3 Stats Cards in a Row */}
        <View style={styles.threeStatsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>সদস্য</Text>
            <Text style={styles.statCardVal}>১০০</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>তহবিল</Text>
            <Text style={styles.statCardVal}>৳৪৮.৫ল</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>প্রজেক্ট</Text>
            <Text style={styles.statCardVal}>৪টি</Text>
          </View>
        </View>

        {/* Section: যোগাযোগ */}
        <Text style={styles.sectionTitle}>যোগাযোগ</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ঠিকানা</Text>
            <Text style={styles.rowValue}>[অফিসের ঠিকানা]</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>ফোন</Text>
            <Text style={styles.rowValue}>[ফোন নম্বর]</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>ইমেইল</Text>
            <Text style={styles.rowValue}>[ইমেইল]</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>নিবন্ধন কর্তৃপক্ষ</Text>
            <Text style={styles.rowValue}>[যেমন সমবায় অধিদপ্তর]</Text>
          </View>
        </View>

        {/* Section: কমিটি */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>কমিটি</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.historyLink}>ইতিহাস</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.committeeTermText}>মেয়াদ: [শুরু] – [শেষ]</Text>

        <View style={styles.card}>
          {COMMITTEE.map((m, index) => (
            <View
              key={m.id}
              style={[
                styles.memberRow,
                index < COMMITTEE.length - 1 && styles.memberRowBorder,
              ]}
            >
              <View style={[styles.avatarCircle, { backgroundColor: m.avatarBg }]}>
                <Text style={[styles.avatarText, { color: m.avatarColor }]}>{m.initial}</Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberRole}>{m.role}</Text>
              </View>

              <TouchableOpacity
                style={styles.callIconBox}
                onPress={() => Alert.alert('কল', `${m.name}-এর সাথে যোগাযোগ করুন`)}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={16} color="#0F766E" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Section: জমা দেওয়ার হিসাব */}
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>জমা দেওয়ার হিসাব</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ব্যাংক</Text>
            <Text style={styles.rowValue}>[ব্যাংকের নাম], [শাখা]</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>হিসাব নম্বর</Text>
            <Text style={styles.rowValue}>[হিসাব নম্বর]</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>বিকাশ</Text>
            <Text style={styles.rowValue}>[বিকাশ নম্বর]</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>নগদ</Text>
            <Text style={styles.rowValue}>[নগদ নম্বর]</Text>
          </View>
        </View>
        <Text style={styles.accountsNotice}>এই তথ্য সদস্য অ্যাপ ও রিমাইন্ডার বার্তায় দেখানো হবে</Text>

        {/* Section: ডকুমেন্ট */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>ডকুমেন্ট</Text>
        <View style={styles.docsList}>
          {/* Doc 1 */}
          <View style={styles.docCard}>
            <View style={styles.docIconBox}>
              <Ionicons name="document-text-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>গঠনতন্ত্র</Text>
              <Text style={styles.docSub}>PDF · হালনাগাদ [তারিখ]</Text>
            </View>
            <TouchableOpacity style={styles.docDownloadBtn} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Doc 2 */}
          <View style={styles.docCard}>
            <View style={styles.docIconBox}>
              <Ionicons name="document-text-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>নিবন্ধন সনদ</Text>
              <Text style={styles.docSub}>PDF</Text>
            </View>
            <TouchableOpacity style={styles.docDownloadBtn} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>
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
  identityArea: {
    alignItems: 'center',
    marginVertical: 12,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 34,
    color: '#FFFFFF',
  },
  somitiName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
  },
  somitiSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  threeStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  statCardVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
    marginLeft: 4,
  },
  historyLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  committeeTermText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 6,
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
    paddingVertical: 12,
  },
  rowLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  rowValue: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  memberRole: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  callIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountsNotice: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
  },
  docsList: {
    gap: 10,
    marginTop: 4,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  docSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  docDownloadBtn: {
    padding: 6,
  },
});
