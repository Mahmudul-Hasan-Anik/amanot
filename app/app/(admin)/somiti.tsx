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
import { useSomitiStore } from '../../src/store/somitiStore';
import { formatBengaliMoney, toBengaliDigits } from '../../src/lib/money';

const AVATAR_COLORS = [
  { bg: '#E0F2FE', text: '#0284C7' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#EDE9FE', text: '#7C3AED' },
];

export default function SomitiProfileScreen() {
  const router = useRouter();
  const { somitiInfo, members, projects } = useSomitiStore();

  const committeeMembers = members.filter(
    (m) => m.role && m.role !== 'সাধারণ সদস্য'
  );

  const fundInLakh = (somitiInfo.totalFund / 100000).toFixed(1);

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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => Alert.alert('সম্পাদনা', 'সমিতির তথ্য হালনাগাদ করার সুবিধা শীঘ্রই আসছে')}
          activeOpacity={0.7}
        >
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
            <Text style={styles.logoText}>{somitiInfo.name.charAt(0) || 'স'}</Text>
          </View>
          <Text style={styles.somitiName}>{somitiInfo.name}</Text>
          <Text style={styles.somitiSub}>
            {somitiInfo.regNo} · প্রতিষ্ঠা {toBengaliDigits(somitiInfo.establishedYear)}
          </Text>
        </View>

        {/* 3 Stats Cards in a Row */}
        <View style={styles.threeStatsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>সদস্য</Text>
            <Text style={styles.statCardVal}>{toBengaliDigits(members.length)}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>তহবিল</Text>
            <Text style={styles.statCardVal}>৳{toBengaliDigits(fundInLakh)}ল</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>প্রজেক্ট</Text>
            <Text style={styles.statCardVal}>{toBengaliDigits(projects.length)}টি</Text>
          </View>
        </View>

        {/* Section: যোগাযোগ */}
        <Text style={styles.sectionTitle}>যোগাযোগ ও ঠিকানা</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ঠিকানা</Text>
            <Text style={styles.rowValue}>{somitiInfo.address}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>ফোন নম্বর</Text>
            <Text style={styles.rowValue}>{somitiInfo.phone}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>ইমেইল</Text>
            <Text style={styles.rowValue}>{somitiInfo.email}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>নিবন্ধন কর্তৃপক্ষ</Text>
            <Text style={styles.rowValue}>উপজেলা সমবায় কার্যালয়</Text>
          </View>
        </View>

        {/* Section: কমিটি */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>পরিচালনা কমিটি</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.historyLink}>মেয়াদ: ২০২৫–২০২৭</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {committeeMembers.map((m, index) => {
            const colorTheme = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const initial = m.name.trim().charAt(0) || 'স';

            return (
              <React.Fragment key={m.id}>
                <View style={styles.memberRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: colorTheme.bg }]}>
                    <Text style={[styles.avatarText, { color: colorTheme.text }]}>{initial}</Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>{m.role}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.callIconBox}
                    onPress={() => Alert.alert('কল', `${m.name} (${m.phone})-এ কল দিন`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={16} color="#0F766E" />
                  </TouchableOpacity>
                </View>
                {index < committeeMembers.length - 1 && <View style={styles.memberRowBorder} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Section: জমা দেওয়ার হিসাব */}
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>সমিতির পেমেন্ট হিসাব</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ব্যাংক অ্যাকাউন্ট</Text>
            <Text style={styles.rowValue}>ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>হিসাব নম্বর</Text>
            <Text style={styles.rowValue}>২০৫০-১৪০২-১০২৮-৯০০</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>বিকাশ মার্চেন্ট</Text>
            <Text style={styles.rowValue}>০১৭১১-২২৩৩৪৪</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>নগদ মার্চেন্ট</Text>
            <Text style={styles.rowValue}>০১৮১১-২২৩৩৪৪</Text>
          </View>
        </View>
        <Text style={styles.accountsNotice}>এই হিসাবসমূহ সদস্যের ডিজিটাল রসিদ ও রিমাইন্ডার বার্তায় প্রদর্শিত হয়</Text>

        {/* Section: ডকুমেন্ট */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>সমিতির দলিল ও সনদ</Text>
        <View style={styles.docsList}>
          {/* Doc 1 */}
          <View style={styles.docCard}>
            <View style={styles.docIconBox}>
              <Ionicons name="document-text-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>গঠনতন্ত্র ও উপ-আইন</Text>
              <Text style={styles.docSub}>PDF · সংশোধিত জানুয়ারি ২০২৬</Text>
            </View>
            <TouchableOpacity
              style={styles.docDownloadBtn}
              onPress={() => Alert.alert('ডাউনলোড', 'গঠনতন্ত্র PDF ডাউনলোড হচ্ছে...')}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Doc 2 */}
          <View style={styles.docCard}>
            <View style={styles.docIconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>সরকারি নিবন্ধন সনদ</Text>
              <Text style={styles.docSub}>PDF · সত্যায়িত কপি</Text>
            </View>
            <TouchableOpacity
              style={styles.docDownloadBtn}
              onPress={() => Alert.alert('ডাউনলোড', 'নিবন্ধন সনদ PDF ডাউনলোড হচ্ছে...')}
              activeOpacity={0.7}
            >
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
    marginBottom: 16,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  somitiName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 2,
  },
  somitiSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  threeStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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
    marginBottom: 2,
  },
  statCardVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  historyLink: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  rowValue: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountsNotice: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
    marginBottom: 8,
  },
  docsList: {
    gap: 10,
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
    borderRadius: 18,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
