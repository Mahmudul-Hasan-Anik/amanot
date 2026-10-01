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

export default function StatementScreen() {
  const router = useRouter();

  const [target, setTarget] = useState<'all' | 'due' | 'single'>('all');
  const [whatsapp, setWhatsapp] = useState(true);
  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);

  const [autoMonthly, setAutoMonthly] = useState(true);
  const [autoFullPdf, setAutoFullPdf] = useState(true);
  const [autoAnnual, setAutoAnnual] = useState(true);

  const handleSend = () => {
    Alert.alert('সফল', '৯৬ জন সদস্যের কাছে স্টেটমেন্ট পাঠানো শুরু হয়েছে!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>স্টেটমেন্ট পাঠান</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section: সময়কাল */}
        <Text style={styles.sectionTitle}>সময়কাল</Text>
        <View style={styles.periodBox}>
          <Text style={styles.periodText}>জানুয়ারি – সেপ্টেম্বর ২০২৬</Text>
          <Ionicons name="calendar-outline" size={18} color="#64748B" />
        </View>

        {/* Section: কাকে পাঠাবেন */}
        <Text style={styles.sectionTitle}>কাকে পাঠাবেন</Text>
        <View style={styles.targetRow}>
          <TouchableOpacity
            style={[styles.targetChip, target === 'all' && styles.targetChipActive]}
            onPress={() => setTarget('all')}
            activeOpacity={0.8}
          >
            {target === 'all' && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.targetChipText, target === 'all' && styles.targetChipTextActive]}>
              সকল সক্রিয় ৯৬
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetChip, target === 'due' && styles.targetChipActive]}
            onPress={() => setTarget('due')}
            activeOpacity={0.8}
          >
            <Text style={[styles.targetChipText, target === 'due' && styles.targetChipTextActive]}>
              বকেয়াধারী ২২
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetChip, target === 'single' && styles.targetChipActive]}
            onPress={() => setTarget('single')}
            activeOpacity={0.8}
          >
            <Text style={[styles.targetChipText, target === 'single' && styles.targetChipTextActive]}>
              একজন
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.selectMemberPill} activeOpacity={0.8}>
          <Text style={styles.selectMemberText}>বাছাই করুন</Text>
        </TouchableOpacity>

        {/* Section: মাধ্যম */}
        <Text style={styles.sectionTitle}>মাধ্যম</Text>
        <View style={styles.channelCard}>
          {/* Option 1 */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setWhatsapp(!whatsapp)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, whatsapp && styles.checkboxBoxActive]}>
              {whatsapp && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>হোয়াটসঅ্যাপে PDF স্টেটমেন্ট</Text>
          </TouchableOpacity>

          <View style={styles.checkboxDivider} />

          {/* Option 2 */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSms(!sms)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, sms && styles.checkboxBoxActive]}>
              {sms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>এসএমএসে সংক্ষিপ্ত ব্যালেন্স</Text>
              <Text style={styles.checkboxSub}>স্মার্টফোন নেই এমন ১৮ জনের জন্য</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.checkboxDivider} />

          {/* Option 3 */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setPush(!push)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, push && styles.checkboxBoxActive]}>
              {push && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>পুশ নোটিফিকেশন</Text>
          </TouchableOpacity>
        </View>

        {/* Section: প্রিভিউ */}
        <Text style={styles.sectionTitle}>প্রিভিউ</Text>
        <View style={styles.previewContainer}>
          {/* Preview Header */}
          <View style={styles.previewHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>স</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.previewSomitiTitle}>[সমিতির নাম]</Text>
              <Text style={styles.previewStatementTitle}>সদস্য স্টেটমেন্ট · জানু–সেপ্টে ২০২৬</Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          <Text style={styles.previewMemberName}>করিম উদ্দিন · SM-042</Text>

          <View style={styles.previewLedger}>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerDate}>৮ জুলাই</Text>
              <Text style={styles.ledgerDesc}>জুলাই জমা</Text>
              <Text style={styles.ledgerAmount}>৳২,০০০</Text>
            </View>

            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerDate}>৯ জুন</Text>
              <Text style={styles.ledgerDesc}>জুন জমা</Text>
              <Text style={styles.ledgerAmount}>৳২,০০০</Text>
            </View>

            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerDate}>১৫ জানু</Text>
              <Text style={styles.ledgerDesc}>২০২৫ লাভ</Text>
              <Text style={styles.ledgerAmount}>৳৭,৮০০</Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>সমাপনী ব্যালেন্স</Text>
            <Text style={styles.summaryAmount}>৳১,০৮,০০০</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>বকেয়া</Text>
            <Text style={[styles.summaryAmount, { color: '#DC2626' }]}>৳৪,১০০</Text>
          </View>
        </View>

        {/* Section: স্বয়ংক্রিয় সময়সূচি */}
        <Text style={styles.sectionTitle}>স্বয়ংক্রিয় সময়সূচি</Text>
        <View style={styles.scheduleCard}>
          {/* Switch 1 */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>মাসিক ব্যালেন্স</Text>
              <Text style={styles.switchSub}>প্রতি মাসের ১–৫ তারিখে</Text>
            </View>
            <Switch
              value={autoMonthly}
              onValueChange={setAutoMonthly}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchDivider} />

          {/* Switch 2 */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>পূর্ণ PDF স্টেটমেন্ট</Text>
              <Text style={styles.switchSub}>প্রতি ৩ মাসে</Text>
            </View>
            <Switch
              value={autoFullPdf}
              onValueChange={setAutoFullPdf}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchDivider} />

          {/* Switch 3 */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>বার্ষিক স্টেটমেন্ট</Text>
              <Text style={styles.switchSub}>বণ্টন অনুমোদনের পর</Text>
            </View>
            <Switch
              value={autoAnnual}
              onValueChange={setAutoAnnual}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>৯৬ জনকে পাঠান</Text>
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
    paddingBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  periodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  periodText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  targetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  targetChipActive: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  targetChipText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  targetChipTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  selectMemberPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  selectMemberText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#1E293B',
  },
  channelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkboxDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxBoxActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  checkboxLabel: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  checkboxSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  previewContainer: {
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E8E5DD',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  previewSomitiTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  previewStatementTitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E8E5DD',
    marginVertical: 10,
  },
  previewMemberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
  },
  previewLedger: {
    gap: 6,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerDate: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    width: 60,
  },
  ledgerDesc: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#1E293B',
    flex: 1,
  },
  ledgerAmount: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  summaryLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  summaryAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  switchTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  switchSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F6F7F2',
  },
  sendBtn: {
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  sendBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
