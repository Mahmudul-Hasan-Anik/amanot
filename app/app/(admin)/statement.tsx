import React, { useState, useMemo } from 'react';
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
  FlatList,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { AppModal } from '../../src/components/AppModal';
import { toEnglishDigits, toBengaliDigits } from '../../src/lib/bengali';

export default function StatementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { l, formatMoney, formatNum } = useLanguage();
  const { members, somitiInfo } = useSomitiStore();

  const [target, setTarget] = useState<'all' | 'due' | 'single'>(params.memberId ? 'single' : 'all');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    (params.memberId as string) || members[0]?.id || '1'
  );
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const [whatsapp, setWhatsapp] = useState(true);
  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);

  const [autoMonthly, setAutoMonthly] = useState(true);
  const [autoFullPdf, setAutoFullPdf] = useState(true);
  const [autoAnnual, setAutoAnnual] = useState(true);

  const activeMembers = useMemo(() => members.filter((m) => m.status !== 'inactive'), [members]);
  const dueMembers = useMemo(() => members.filter((m) => m.dueAmount > 0), [members]);
  const selectedMember = useMemo(() => members.find((m) => m.id === selectedMemberId) || members[0], [members, selectedMemberId]);

  const recipientCount = target === 'all' ? activeMembers.length : target === 'due' ? dueMembers.length : 1;

  const handleSend = () => {
    const channelNames = [];
    if (whatsapp) channelNames.push(l('WhatsApp', 'হোয়াটসঅ্যাপ'));
    if (sms) channelNames.push(l('SMS', 'এসএমএস'));
    if (push) channelNames.push(l('Push Notification', 'পুশ নোটিফিকেশন'));

    if (channelNames.length === 0) {
      Alert.alert(l('Select Channel', 'মাধ্যম নির্বাচন করুন'), l('Please select at least one sending channel.', 'অনুগ্রহ করে অন্তত একটি প্রেরণের মাধ্যম নির্বাচন করুন।'));
      return;
    }

    if (whatsapp && target === 'single' && selectedMember) {
      const phoneDigits = toEnglishDigits((selectedMember.whatsapp || selectedMember.phone || '').replace(/[^\d]/g, ''));
      const fullPhone = phoneDigits.startsWith('88') ? phoneDigits : (phoneDigits.startsWith('0') ? `88${phoneDigits}` : `880${phoneDigits}`);
      const msg = `*${somitiInfo.name}*\n` +
        `👤 সদস্য: ${selectedMember.name} (${selectedMember.code})\n` +
        `📅 হিসাব সময়কাল: জানুয়ারি – অক্টোবর ২০২৬\n\n` +
        `💰 মোট সঞ্চয় জমা: ৳${toBengaliDigits(selectedMember.totalDeposit)}\n` +
        `⚠️ বর্তমান বকেয়া: ৳${toBengaliDigits(selectedMember.dueAmount)}\n` +
        `📈 প্রাক্কলিত মুনাফা অংশ: ৳${toBengaliDigits(selectedMember.estimatedProfit2026 || 5786)}\n\n` +
        `নিয়মিত সঞ্চয় জমা দিয়ে সমিতির সার্বিক উন্নয়নে অংশ নিন।\n` +
        `জরুরি প্রয়োজনে যোগাযোগ: ${somitiInfo.phone}`;

      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
      Linking.openURL(url).catch(() => {
        Alert.alert(l('Error', 'ত্রুটি'), l('Could not open WhatsApp.', 'হোয়াটসঅ্যাপ খোলা যায়নি।'));
      });
      return;
    }

    const targetDesc = target === 'single' ? selectedMember?.name : `${formatNum(recipientCount)} ${l('Members', 'জন সদস্য')}`;

    Alert.alert(
      l('Statement Sent Successfully', 'স্টেটমেন্ট সফলভাবে পাঠানো হয়েছে'),
      `${targetDesc} - ${channelNames.join(l(' and ', ' ও '))} ${l('received statement successfully!', '-এর মাধ্যমে স্টেটমেন্ট পাঠানো সম্পন্ন হয়েছে!')}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Send Statement', 'স্টেটমেন্ট পাঠান')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section: সময়কাল */}
        <Text style={styles.sectionTitle}>{l('Period', 'সময়কাল')}</Text>
        <View style={styles.periodBox}>
          <Text style={styles.periodText}>{l('January – October 2026', 'জানুয়ারি – অক্টোবর ২০২৬')}</Text>
          <Ionicons name="calendar-outline" size={18} color="#64748B" />
        </View>

        {/* Section: কাকে পাঠাবেন */}
        <Text style={styles.sectionTitle}>{l('Recipients', 'কাকে পাঠাবেন')}</Text>
        <View style={styles.targetRow}>
          <TouchableOpacity
            style={[styles.targetChip, target === 'all' && styles.targetChipActive]}
            onPress={() => setTarget('all')}
            activeOpacity={0.8}
          >
            {target === 'all' && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.targetChipText, target === 'all' && styles.targetChipTextActive]}>
              {l('All Active', 'সকল সক্রিয়')} {formatNum(activeMembers.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetChip, target === 'due' && styles.targetChipActive]}
            onPress={() => setTarget('due')}
            activeOpacity={0.8}
          >
            {target === 'due' && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.targetChipText, target === 'due' && styles.targetChipTextActive]}>
              {l('Due Members', 'বকেয়াধারী')} {formatNum(dueMembers.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetChip, target === 'single' && styles.targetChipActive]}
            onPress={() => {
              setTarget('single');
              setShowMemberPicker(true);
            }}
            activeOpacity={0.8}
          >
            {target === 'single' && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.targetChipText, target === 'single' && styles.targetChipTextActive]}>
              {l('Single Member', 'একজন')}
            </Text>
          </TouchableOpacity>
        </View>

        {target === 'single' && selectedMember && (
          <TouchableOpacity
            style={styles.selectMemberPill}
            onPress={() => setShowMemberPicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={16} color="#0F766E" />
            <Text style={styles.selectMemberText}>
              {selectedMember.name} ({selectedMember.code})
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </TouchableOpacity>
        )}

        {/* Section: মাধ্যম */}
        <Text style={styles.sectionTitle}>{l('Channel', 'মাধ্যম')}</Text>
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
            <Text style={styles.checkboxLabel}>{l('PDF Statement via WhatsApp', 'হোয়াটসঅ্যাপে PDF স্টেটমেন্ট')}</Text>
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
              <Text style={styles.checkboxLabel}>{l('Summary Balance via SMS', 'এসএমএসে সংক্ষিপ্ত ব্যালেন্স')}</Text>
              <Text style={styles.checkboxSub}>{l('For non-smartphone members', 'স্মার্টফোন নেই এমন সদস্যদের জন্য')}</Text>
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
            <Text style={styles.checkboxLabel}>{l('App Push Notification', 'অ্যাপ পুশ নোটিফিকেশন')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section: প্রিভিউ */}
        <Text style={styles.sectionTitle}>{l('Statement Preview (Sample)', 'স্টেটমেন্ট প্রিভিউ (নমুনা)')}</Text>
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.previewMemberName}>
                {target === 'single' ? selectedMember?.name : (l('Karim Uddin', 'করিম উদ্দিন'))}
              </Text>
              <Text style={styles.previewMemberCode}>
                {l('Code:', 'কোড:')} {target === 'single' ? selectedMember?.code : 'SM-042'}
              </Text>
            </View>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{l('PDF Generated', 'পিডিএফ তৈরি')}</Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{l('Total Deposit', 'মোট জমা')}</Text>
            <Text style={styles.previewVal}>
              {formatMoney(target === 'single' ? selectedMember?.totalDeposit || 0 : 108000)}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{l('Current Due', 'বর্তমান বকেয়া')}</Text>
            <Text style={[styles.previewVal, { color: (target === 'single' ? selectedMember?.dueAmount || 0 : 4100) > 0 ? '#DC2626' : '#059669' }]}>
              {formatMoney(target === 'single' ? selectedMember?.dueAmount || 0 : 4100)}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{l('Estimated Profit Share', 'সম্ভাব্য লাভ অংশ')}</Text>
            <Text style={[styles.previewVal, { color: '#059669' }]}>+{formatMoney(5786)}</Text>
          </View>
        </View>

        {/* Section: শিডিউল */}
        <Text style={styles.sectionTitle}>{l('Automatic Schedule', 'স্বয়ংক্রিয় শিডিউল')}</Text>
        <View style={styles.scheduleCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{l('Monthly Balance', 'মাসিক ব্যালেন্স')}</Text>
              <Text style={styles.switchSub}>{l('1st–5th of every month', 'প্রতি মাসের ১–৫ তারিখে')}</Text>
            </View>
            <Switch
              value={autoMonthly}
              onValueChange={setAutoMonthly}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{l('Full PDF Statement', 'পূর্ণ PDF স্টেটমেন্ট')}</Text>
              <Text style={styles.switchSub}>{l('Every 3 months', 'প্রতি ৩ মাসে')}</Text>
            </View>
            <Switch
              value={autoFullPdf}
              onValueChange={setAutoFullPdf}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{l('Annual Statement', 'বার্ষিক স্টেটমেন্ট')}</Text>
              <Text style={styles.switchSub}>{l('After distribution approval', 'বণ্টন অনুমোদনের পর')}</Text>
            </View>
            <Switch
              value={autoAnnual}
              onValueChange={setAutoAnnual}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Send Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>
            {target === 'single'
              ? `${l('Send to', 'পাঠান')} ${selectedMember?.name}`
              : `${l('Send to', 'পাঠান')} ${formatNum(recipientCount)} ${l('Members', 'জনকে')}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Member Picker Modal */}
      <AppModal
        visible={showMemberPicker}
        onClose={() => setShowMemberPicker(false)}
        title={l('Select Member', 'সদস্য নির্বাচন করুন')}
        contentContainerStyle={{ maxHeight: '80%' }}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Select Member', 'সদস্য নির্বাচন করুন')}</Text>
          <TouchableOpacity onPress={() => setShowMemberPicker(false)}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 360 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.pickerItem,
                selectedMemberId === item.id && styles.pickerItemActive,
              ]}
              onPress={() => {
                setSelectedMemberId(item.id);
                setShowMemberPicker(false);
              }}
            >
              <Text style={styles.pickerItemName}>{item.name}</Text>
              <Text style={styles.pickerItemCode}>{item.code} · {formatMoney(item.totalDeposit)}</Text>
            </TouchableOpacity>
          )}
        />
      </AppModal>
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
    marginLeft: 2,
  },
  periodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EAEBE6',
  },
  targetChipActive: {
    backgroundColor: '#CCFBF1',
  },
  targetChipText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#64748B',
  },
  targetChipTextActive: {
    color: '#0F766E',
  },
  selectMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  selectMemberText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
  },
  channelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
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
    paddingVertical: 12,
    gap: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  checkboxDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  previewMemberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  previewMemberCode: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  previewBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  previewBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#0F766E',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  previewVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    marginTop: 1,
  },
  switchDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  sendBtnText: {
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
    padding: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemActive: {
    backgroundColor: '#E6F4F2',
  },
  pickerItemName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  pickerItemCode: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
});
