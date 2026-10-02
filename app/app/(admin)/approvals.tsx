import React, { useState } from 'react';
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
import { useLanguage } from '../../src/i18n/useLanguage';

export default function ApprovalsScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const { approvals, approveRequest, rejectRequest } = useSomitiStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? l('Confirm Approval', 'অনুমোদন নিশ্চিতকরণ') : l('Confirm Rejection', 'প্রত্যাখ্যান নিশ্চিতকরণ'),
      action === 'approve'
        ? l('Do you want to approve this request? Funds will be adjusted upon approval.', 'অনুরোধটি কি অনুমোদন করতে চান? অনুমোদিত হলে ফান্ড থেকে অর্থ সমন্বয় হবে।')
        : l('Do you want to reject this request?', 'অনুরোধটি কি প্রত্যাখ্যান করতে চান?'),
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: action === 'approve' ? l('Yes, Approve', 'হ্যাঁ, অনুমোদন করুন') : l('Yes, Reject', 'হ্যাঁ, প্রত্যাখ্যান করুন'),
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => {
            if (action === 'approve') {
              approveRequest(id);
              Alert.alert(l('Success', 'সফল'), l('Request approved successfully.', 'অনুরোধটি সফলভাবে অনুমোদিত হয়েছে।'));
            } else {
              rejectRequest(id);
              Alert.alert(l('Rejected', 'প্রত্যাখ্যাত'), l('Request has been rejected.', 'অনুরোধটি প্রত্যাখ্যান করা হয়েছে।'));
            }
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
        <Text style={styles.headerTitle}>{l('Approvals', 'অনুমোদন')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filter Segmented Tabs */}
        <View style={styles.segmentedTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              {l('Pending', 'অপেক্ষমাণ')} {formatNum(approvals.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'approved' && styles.tabBtnActive]}
            onPress={() => setActiveTab('approved')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
              {l('Approved', 'অনুমোদিত')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'rejected' && styles.tabBtnActive]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
              {l('Rejected', 'বাতিল')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Approvals List */}
        <View style={styles.cardsList}>
          {activeTab === 'pending' && approvals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#0F766E" />
              <Text style={styles.emptyTitle}>{l('All requests completed', 'সব অনুরোধ সম্পন্ন হয়েছে')}</Text>
              <Text style={styles.emptySub}>{l('No pending requests currently.', 'বর্তমানে কোনো অপেক্ষমাণ অনুরোধ নেই।')}</Text>
            </View>
          ) : activeTab === 'pending' ? (
            approvals.map((item) => (
              <View key={item.id} style={styles.approvalCard}>
                {/* Card Top Row */}
                <View style={styles.cardTopRow}>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>
                      {item.type === 'expense' ? l('Expense', 'ব্যয়') : item.type === 'investment' ? l('Investment', 'বিনিয়োগ') : l('Correction', 'সংশোধন')}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{item.dateStr}</Text>
                </View>

                {/* Title & Amount */}
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemAmount}>{formatMoney(item.amount)}</Text>
                </View>

                {/* Description */}
                <Text style={styles.itemDescription}>{item.detail}</Text>

                {/* Entry By */}
                <Text style={styles.entryByText}>{l('Entered by:', 'এন্ট্রি করেছেন:')} {item.createdBy}</Text>

                {/* Buttons Row: প্রত্যাখ্যান / অনুমোদন */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleAction(item.id, 'reject')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={16} color="#DC2626" />
                    <Text style={styles.rejectBtnText}>{l('Reject', 'প্রত্যাখ্যান')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleAction(item.id, 'approve')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>{l('Approve', 'অনুমোদন করুন')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={56} color="#94A3B8" />
              <Text style={styles.emptyTitle}>{l('No records found', 'কোনো রেকর্ড নেই')}</Text>
            </View>
          )}
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
    alignItems: 'flex-start',
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
  segmentedTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  tabTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  cardsList: {
    gap: 14,
  },
  approvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagPill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPillText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#0F766E',
  },
  timeText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#94A3B8',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  itemAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#134E4A',
  },
  itemDescription: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  entryByText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#DC2626',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#134E4A',
  },
  approveBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  emptyTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
    marginTop: 12,
  },
  emptySub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});
