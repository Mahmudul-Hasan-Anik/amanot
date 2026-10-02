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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';

interface AttachmentModalState {
  type: 'image' | 'document';
  title: string;
  amount?: number;
  date?: string;
  detail?: string;
}

export default function ApprovalsScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const {
    approvals,
    approvedApprovals = [],
    rejectedApprovals = [],
    approveRequest,
    rejectRequest,
  } = useSomitiStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentModalState | null>(null);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve'
        ? l('Confirm Approval', 'অনুমোদন নিশ্চিতকরণ')
        : l('Confirm Rejection', 'প্রত্যাখ্যান নিশ্চিতকরণ'),
      action === 'approve'
        ? l(
            'Do you want to approve this request? Funds will be adjusted upon approval.',
            'অনুরোধটি কি অনুমোদন করতে চান? অনুমোদিত হলে ফান্ড থেকে অর্থ সমন্বয় হবে।'
          )
        : l('Do you want to reject this request?', 'অনুরোধটি কি প্রত্যাখ্যান করতে চান?'),
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text:
            action === 'approve'
              ? l('Yes, Approve', 'হ্যাঁ, অনুমোদন করুন')
              : l('Yes, Reject', 'হ্যাঁ, প্রত্যাখ্যান করুন'),
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => {
            if (action === 'approve') {
              approveRequest(id, 'আনোয়ার হোসেন (সভাপতি)');
              Alert.alert(
                l('Success', 'সফল'),
                l('Request approved successfully. Funds have been adjusted.', 'অনুরোধটি সফলভাবে অনুমোদিত হয়েছে এবং ফান্ড সমন্বয় করা হয়েছে।')
              );
            } else {
              rejectRequest(id, 'অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার', 'আনোয়ার হোসেন (সভাপতি)');
              Alert.alert(
                l('Rejected', 'প্রত্যাখ্যাত'),
                l('Request has been rejected and moved to rejected records.', 'অনুরোধটি প্রত্যাখ্যান করা হয়েছে এবং বাতিল তালিকায় রাখা হয়েছে।')
              );
            }
          },
        },
      ]
    );
  };

  const getTagColor = (type: string) => {
    if (type === 'expense') {
      return { bg: '#CCFBF1', text: '#0F766E' };
    }
    if (type === 'investment') {
      return { bg: '#EDE9FE', text: '#7C3AED' };
    }
    return { bg: '#FEF3C7', text: '#D97706' };
  };

  const getTagLabel = (type: string) => {
    if (type === 'expense') return l('Expense', 'ব্যয়');
    if (type === 'investment') return l('Investment', 'বিনিয়োগ');
    return l('Correction', 'সংশোধন');
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
              {l('Approved', 'অনুমোদিত')} {formatNum(approvedApprovals.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'rejected' && styles.tabBtnActive]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
              {l('Rejected', 'প্রত্যাখ্যাত')} {formatNum(rejectedApprovals.length)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 1. Pending Tab List */}
        {activeTab === 'pending' && (
          <View style={styles.cardsList}>
            {approvals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={56} color="#0F766E" />
                <Text style={styles.emptyTitle}>{l('All requests completed', 'সব অনুরোধ সম্পন্ন হয়েছে')}</Text>
                <Text style={styles.emptySub}>{l('No pending requests currently.', 'বর্তমানে কোনো অপেক্ষমাণ অনুরোধ নেই।')}</Text>
              </View>
            ) : (
              approvals.map((item) => {
                const tagColor = getTagColor(item.type);
                return (
                  <View key={item.id} style={styles.approvalCard}>
                    {/* Card Top Row */}
                    <View style={styles.cardTopRow}>
                      <View style={[styles.tagPill, { backgroundColor: tagColor.bg }]}>
                        <Text style={[styles.tagPillText, { color: tagColor.text }]}>
                          {getTagLabel(item.type)}
                        </Text>
                      </View>
                      <Text style={styles.timeText}>{item.dateStr}</Text>
                    </View>

                    {/* Title & Amount */}
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemAmount}>
                        {item.amountDisplay || formatMoney(item.amount)}
                      </Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.itemDescription}>{item.detail}</Text>

                    {/* Entry By */}
                    <Text style={styles.entryByText}>
                      {l('Entered by:', 'এন্ট্রি:')} {item.createdBy}
                    </Text>

                    {/* Attachment Link (PDF Page 16) */}
                    {item.attachmentType === 'image' && (
                      <TouchableOpacity
                        style={styles.attachmentLinkRow}
                        onPress={() =>
                          setSelectedAttachment({
                            type: 'image',
                            title: item.title,
                            amount: item.amount,
                            date: item.dateStr,
                            detail: item.detail,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons name="image-outline" size={17} color="#0F766E" />
                        <Text style={styles.attachmentLinkText}>
                          {l('View Receipt Photo', 'রসিদের ছবি দেখুন')}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {item.attachmentType === 'document' && (
                      <TouchableOpacity
                        style={styles.attachmentLinkRow}
                        onPress={() =>
                          setSelectedAttachment({
                            type: 'document',
                            title: item.title,
                            amount: item.amount,
                            date: item.dateStr,
                            detail: item.detail,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons name="document-text-outline" size={17} color="#0F766E" />
                        <Text style={styles.attachmentLinkText}>
                          {l('Agreement Document', 'চুক্তিপত্র')}
                        </Text>
                      </TouchableOpacity>
                    )}

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
                        <Text style={styles.approveBtnText}>{l('Approve', 'অনুমোদন')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 2. Approved Tab List */}
        {activeTab === 'approved' && (
          <View style={styles.cardsList}>
            {approvedApprovals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={56} color="#94A3B8" />
                <Text style={styles.emptyTitle}>{l('No approved records', 'কোনো অনুমোদিত রেকর্ড নেই')}</Text>
                <Text style={styles.emptySub}>{l('Approved requests will be archived here.', 'অনুমোদিত অনুরোধগুলো এখানে সংরক্ষিত থাকবে।')}</Text>
              </View>
            ) : (
              approvedApprovals.map((item) => {
                const tagColor = getTagColor(item.type);
                return (
                  <View key={item.id} style={styles.approvalCard}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.tagPill, { backgroundColor: tagColor.bg }]}>
                        <Text style={[styles.tagPillText, { color: tagColor.text }]}>
                          {getTagLabel(item.type)}
                        </Text>
                      </View>
                      <View style={styles.statusBadgeApproved}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.statusBadgeApprovedText}>
                          {l('Approved', 'অনুমোদিত')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemAmount}>{formatMoney(item.amount)}</Text>
                    </View>

                    <Text style={styles.itemDescription}>{item.detail}</Text>

                    <View style={styles.historyMetaRow}>
                      <Text style={styles.historyMetaText}>
                        {l('Entered by:', 'এন্ট্রি:')} {item.createdBy}
                      </Text>
                      <Text style={styles.historyApprovedByText}>
                        {item.approvedBy || l('Approved by President', 'অনুমোদন: সভাপতি')} · {item.approvedAt || 'আজ'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 3. Rejected Tab List */}
        {activeTab === 'rejected' && (
          <View style={styles.cardsList}>
            {rejectedApprovals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="close-circle-outline" size={56} color="#94A3B8" />
                <Text style={styles.emptyTitle}>{l('No rejected records', 'কোনো বাতিল রেকর্ড নেই')}</Text>
                <Text style={styles.emptySub}>{l('Rejected requests will be logged here.', 'বাতিল করা অনুরোধগুলো এখানে প্রদর্শিত হবে।')}</Text>
              </View>
            ) : (
              rejectedApprovals.map((item) => {
                const tagColor = getTagColor(item.type);
                return (
                  <View key={item.id} style={styles.approvalCard}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.tagPill, { backgroundColor: tagColor.bg }]}>
                        <Text style={[styles.tagPillText, { color: tagColor.text }]}>
                          {getTagLabel(item.type)}
                        </Text>
                      </View>
                      <View style={styles.statusBadgeRejected}>
                        <Ionicons name="close-circle" size={14} color="#DC2626" />
                        <Text style={styles.statusBadgeRejectedText}>
                          {l('Rejected', 'বাতিল')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={[styles.itemAmount, { color: '#DC2626' }]}>
                        {formatMoney(item.amount)}
                      </Text>
                    </View>

                    <Text style={styles.itemDescription}>{item.detail}</Text>

                    <View style={styles.rejectionBox}>
                      <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                      <Text style={styles.rejectionReasonText}>
                        {l('Reason:', 'কারণ:')} {item.rejectionReason || l('Voucher not verified', 'অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার')}
                      </Text>
                    </View>

                    <View style={styles.historyMetaRow}>
                      <Text style={styles.historyMetaText}>
                        {l('Entered by:', 'এন্ট্রি:')} {item.createdBy}
                      </Text>
                      <Text style={styles.historyRejectedByText}>
                        {item.rejectedBy || l('Rejected by President', 'বাতিল: সভাপতি')} · {item.rejectedAt || 'আজ'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Attachment Preview Modal */}
      <Modal
        visible={!!selectedAttachment}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAttachment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={selectedAttachment?.type === 'image' ? 'receipt-outline' : 'document-text-outline'}
                  size={20}
                  color="#0F766E"
                />
                <Text style={styles.modalHeaderTitle}>
                  {selectedAttachment?.type === 'image'
                    ? l('Expense Voucher Attachment', 'ব্যয় ভাউচার ও রসিদ প্রমাণক')
                    : l('Project Agreement Document', 'প্রজেক্ট চুক্তিপত্র সারসংক্ষেপ')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAttachment(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Document Content */}
            {selectedAttachment?.type === 'image' ? (
              <View style={styles.voucherPreview}>
                <View style={styles.voucherHeaderRow}>
                  <Text style={styles.voucherOrgName}>{l('Uttara Model Samity', 'উত্তরা মডেল সমিতি')}</Text>
                  <Text style={styles.voucherBadge}>#V-1024</Text>
                </View>
                <Text style={styles.voucherSubtitle}>
                  {l('OFFICIAL CASH EXPENSE VOUCHER', 'দাপ্তরিক ব্যয় ভাউচার রসিদ')}
                </Text>
                <View style={styles.voucherDivider} />

                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Purpose / Item:', 'ব্যয়ের বিবরণ:')}</Text>
                  <Text style={styles.voucherValue}>{selectedAttachment.title}</Text>
                </View>
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Details:', 'বিস্তারিত বিবরণ:')}</Text>
                  <Text style={styles.voucherValue}>{selectedAttachment.detail}</Text>
                </View>
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Vendor / Recipient:', 'প্রাপক প্রতিষ্ঠান:')}</Text>
                  <Text style={styles.voucherValue}>{l('Khan Kitchen & Catering', 'খান কিচেন অ্যান্ড ক্যাটারিং')}</Text>
                </View>
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Payment Source:', 'পরিশোধের উৎস:')}</Text>
                  <Text style={styles.voucherValue}>{l('Cashier in Hand', 'কোষাধ্যক্ষের হাতে নগদ')}</Text>
                </View>

                <View style={styles.voucherTotalRow}>
                  <Text style={styles.voucherTotalLabel}>{l('Voucher Amount:', 'ভাউচারের মোট টাকা:')}</Text>
                  <Text style={styles.voucherTotalAmount}>
                    {formatMoney(selectedAttachment.amount || 12500)}
                  </Text>
                </View>

                <View style={styles.sealRow}>
                  <View style={styles.sealBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#0F766E" />
                    <Text style={styles.sealText}>
                      {l('ORIGINAL ATTACHMENT VERIFIED', 'মূল ভাউচার ও মেমো সংযুক্ত')}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.voucherPreview}>
                <View style={styles.voucherHeaderRow}>
                  <Text style={styles.voucherOrgName}>{l('Uttara Model Samity', 'উত্তরা মডেল সমিতি')}</Text>
                  <Text style={styles.voucherBadge}>AGR-2026/04</Text>
                </View>
                <Text style={styles.voucherSubtitle}>
                  {l('PROJECT INVESTMENT AGREEMENT SUMMARY', 'প্রজেক্ট বিনিয়োগ চুক্তিপত্র সারসংক্ষেপ')}
                </Text>
                <View style={styles.voucherDivider} />

                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Project Name:', 'প্রজেক্টের নাম:')}</Text>
                  <Text style={styles.voucherValue}>{selectedAttachment?.title}</Text>
                </View>
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Contractor:', 'ঠিকাদারি প্রতিষ্ঠান:')}</Text>
                  <Text style={styles.voucherValue}>{l('M/S Al-Amin Construction Ltd.', 'মেসার্স আল-আমিন কনস্ট্রাকশন লি.')}</Text>
                </View>
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Payment Stage:', 'কিস্তি পর্যায়:')}</Text>
                  <Text style={styles.voucherValue}>{selectedAttachment?.detail}</Text>
                </View>
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherLabel}>{l('Payment Method:', 'পরিশোধের মাধ্যম:')}</Text>
                  <Text style={styles.voucherValue}>{l('Bank Account Check', 'ব্যাংক হিসাব (চলতি হিসাব)')}</Text>
                </View>

                <View style={styles.voucherTotalRow}>
                  <Text style={styles.voucherTotalLabel}>{l('Disbursement Amount:', 'কিস্তির মোট পরিমাণ:')}</Text>
                  <Text style={styles.voucherTotalAmount}>
                    {formatMoney(selectedAttachment?.amount || 200000)}
                  </Text>
                </View>

                <View style={styles.sealRow}>
                  <View style={styles.sealBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#0F766E" />
                    <Text style={styles.sealText}>
                      {l('SIGNED BY PRESIDENT & CONTRACTOR', 'সভাপতি ও ঠিকাদারের যৌথ স্বাক্ষরিত')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Modal Bottom Button */}
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setSelectedAttachment(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>{l('Close Preview', 'বন্ধ করুন')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPillText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
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
    marginBottom: 10,
  },
  attachmentLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  attachmentLinkText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#0F766E',
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
    backgroundColor: '#FFFFFF',
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
  statusBadgeApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeApprovedText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#059669',
  },
  statusBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeRejectedText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#DC2626',
  },
  historyMetaRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyMetaText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  historyApprovedByText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#059669',
  },
  historyRejectedByText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#DC2626',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginVertical: 6,
  },
  rejectionReasonText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#DC2626',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voucherPreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  voucherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherOrgName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#134E4A',
  },
  voucherBadge: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 12,
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voucherSubtitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  voucherDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 10,
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  voucherLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  voucherValue: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#1E293B',
    maxWidth: '60%',
    textAlign: 'right',
  },
  voucherTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 8,
    marginTop: 6,
  },
  voucherTotalLabel: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  voucherTotalAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#134E4A',
  },
  sealRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  sealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  sealText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 10,
    color: '#0F766E',
  },
  modalPrimaryBtn: {
    backgroundColor: '#134E4A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
