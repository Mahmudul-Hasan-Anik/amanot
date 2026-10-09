import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import {
  PendingApproval,
  mockPendingApprovals,
  mockApprovedApprovals,
  mockRejectedApprovals,
} from '../../src/mocks/mockData';
import { useAuthStore } from '../../src/features/auth/authStore';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const REJECTION_REASONS = [
  { bn: 'অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার', en: 'Unclear or unnecessary voucher' },
  { bn: 'বাজেট বহির্ভূত ব্যয়', en: 'Out of budget expense' },
  { bn: 'যথাযথ মেমো বা রসিদ সংযুক্ত নেই', en: 'Proper memo/receipt not attached' },
  { bn: 'অননুমোদিত অতিরিক্ত খরচ', en: 'Unauthorized excess expenditure' },
  { bn: 'অন্যান্য কারণ', en: 'Other reason' },
];

export default function ApprovalsScreen() {
  const router = useRouter();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();
  const {
    approvals: storeApprovals,
    approvedApprovals = [],
    rejectedApprovals = [],
    approveRequest,
    rejectRequest,
    autoApproveAllPending,
  } = useSomitiStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedAttachment, setSelectedAttachment] = useState<{
    title: string;
    type: 'image' | 'document';
  } | null>(null);

  // Reject confirmation modal
  const [rejectingItem, setRejectingItem] = useState<PendingApproval | null>(null);
  const [selectedReasonIdx, setSelectedReasonIdx] = useState(0);
  const [customReason, setCustomReason] = useState('');

  // Fallback to mock data if store list is empty so screen displays the exact design data
  const approvals = storeApprovals;
  const approvedList = approvedApprovals;
  const rejectedList = rejectedApprovals;

  const cleanTitle = (rawTitle: string) => {
    return rawTitle.replace(
      /^(ব্যয়:\s*|বিনিয়োগ:\s*|সংশোধন:\s*|Expense:\s*|Investment:\s*|Correction:\s*)/i,
      ''
    );
  };

  const getBadgeLabel = (type: string) => {
    if (type === 'expense') return l('Expense', 'ব্যয়');
    if (type === 'investment') return l('Investment', 'বিনিয়োগ');
    return l('Correction', 'সংশোধন');
  };

  const handleApprove = async (item: PendingApproval) => {
    try {
    const approverName = useAuthStore.getState().currentUser?.name || (isBengali ? 'আনোয়ার হোসেন' : 'Anwar Hossain');
    await approveRequest(item.id, approverName);
    Alert.alert(
      l('Approved', 'অনুমোদিত'),
      l(
        `"${cleanTitle(item.title)}" has been approved. Funds adjusted.`,
        `"${cleanTitle(item.title)}" সফলভাবে অনুমোদিত হয়েছে এবং ফান্ড সমন্বয় করা হয়েছে।`
      )
    );
    } catch (e: any) { Alert.alert(l('Failed', 'ব্যর্থ'), e.message); }
  };

  const handleConfirmReject = async () => {
    try {
    if (!rejectingItem) return;
    const approverName = useAuthStore.getState().currentUser?.name || (isBengali ? 'আনোয়ার হোসেন' : 'Anwar Hossain');
    const finalReason =
      selectedReasonIdx === REJECTION_REASONS.length - 1 && customReason.trim()
        ? customReason.trim()
        : isBengali
        ? REJECTION_REASONS[selectedReasonIdx].bn
        : REJECTION_REASONS[selectedReasonIdx].en;

    await rejectRequest(rejectingItem.id, finalReason, approverName);
    const itemTitle = cleanTitle(rejectingItem.title);
    setRejectingItem(null);
    setCustomReason('');
    Alert.alert(
      l('Rejected', 'প্রত্যাখ্যাত'),
      l(`"${itemTitle}" has been rejected.`, `"${itemTitle}" বাতিল করা হয়েছে।`)
    );
    } catch (e: any) { Alert.alert(l('Failed', 'ব্যর্থ'), e.message); }
  };

  const handleAutoApproveAll = async () => {
    try {
    const result = await autoApproveAllPending();
    if (result.approvedCount > 0) {
      Alert.alert(
        l('Auto-Approved', 'স্বয়ংক্রিয় অনুমোদন সম্পন্ন'),
        l(
          `${result.approvedCount} eligible requests totaling ${formatMoney(result.totalAmount)} have been auto-approved!`,
          `${formatNum(result.approvedCount)}টি উপযুক্ত অনুরোধ (মোট ${formatMoney(result.totalAmount)}) স্বয়ংক্রিয়ভাবে অনুমোদিত হয়েছে!`
        )
      );
    } else {
      Alert.alert(
        l('Notice', 'নোটিশ'),
        l(
          'No pending vouchers eligible for auto-approval threshold.',
          'স্বয়ংক্রিয় অনুমোদনের সীমার মধ্যে কোনো অপেক্ষমাণ ভাউচার নেই।'
        )
      );
    }
    } catch (e: any) { Alert.alert(l('Failed', 'ব্যর্থ'), e.message); }
  };

  const currentList =
    activeTab === 'pending'
      ? approvals
      : activeTab === 'approved'
      ? approvedList
      : rejectedList;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Approvals', 'অনুমোদন')}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filter Segmented Tabs */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'pending' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'pending' && styles.segmentTextActive,
              ]}
            >
              {l('Pending', 'অপেক্ষমাণ')} {formatNum(approvals.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'approved' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('approved')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'approved' && styles.segmentTextActive,
              ]}
            >
              {l('Approved', 'অনুমোদিত')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'rejected' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'rejected' && styles.segmentTextActive,
              ]}
            >
              {l('Rejected', 'প্রত্যাখ্যাত')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Auto Approve Quick Action Banner */}
        {activeTab === 'pending' && approvals.length > 0 && (
          <View style={styles.autoApproveBanner}>
            <View style={styles.autoApproveLeft}>
              <View style={styles.autoApproveIconBox}>
                <Ionicons name="flash" size={16} color={colors.primary} />
              </View>
              <View style={styles.autoApproveTextCol}>
                <Text style={styles.autoApproveTitle}>
                  {l('Smart Auto-Approval', 'স্বয়ংক্রিয় অনুমোদন')}
                </Text>
                <Text style={styles.autoApproveSub}>
                  {l('One-tap approve all vouchers under limit', 'সীমার নিচের ভাউচার এক ক্লিকে অনুমোদন')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.autoApproveBtn}
              onPress={handleAutoApproveAll}
              activeOpacity={0.8}
            >
              <Text style={styles.autoApproveBtnText}>
                {l('⚡ Auto-Approve', '⚡ সব অনুমোদন')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Approvals Cards List */}
        {currentList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={54} color={colors.primary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending'
                ? l('No pending requests', 'কোনো অপেক্ষমাণ অনুরোধ নেই')
                : activeTab === 'approved'
                ? l('No approved requests', 'কোনো অনুমোদিত অনুরোধ নেই')
                : l('No rejected requests', 'কোনো প্রত্যাখ্যাত অনুরোধ নেই')}
            </Text>
            <Text style={styles.emptySub}>
              {l('All requests are up to date.', 'সব অনুরোধ হালনাগাদ রয়েছে।')}
            </Text>
          </View>
        ) : (
          currentList.map((item) => {
            const displayTitle = cleanTitle(item.title);
            const badgeText = getBadgeLabel(item.type);

            return (
              <View key={item.id} style={styles.approvalCard}>
                {/* Top Row: Type Pill Badge & Timestamp */}
                <View style={styles.cardTopRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{badgeText}</Text>
                  </View>
                  <Text style={styles.timestampText}>
                    {item.dateStr || (isBengali ? 'আজ ১০:২০' : 'Today 10:20')}
                  </Text>
                </View>

                {/* Title & Amount Row */}
                <View style={styles.titleAmountRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {displayTitle}
                  </Text>
                  <Text style={styles.cardAmount}>
                    {item.amountDisplay || formatMoney(item.amount)}
                  </Text>
                </View>

                {/* Detail Description */}
                {!!item.detail && (
                  <Text style={styles.cardDetailText}>
                    {item.type === 'correction'
                      ? item.detail.replace(/^৳[^\s·]+(\s*→\s*৳[^\s·]+)?\s*·\s*/, '')
                      : item.detail}
                  </Text>
                )}

                {/* Created By / Entry By */}
                <Text style={styles.cardEntryText}>
                  {l('Entry:', 'এন্ট্রি:')} {item.createdBy || (isBengali ? 'মাহমুদা খাতুন (কোষাধ্যক্ষ)' : 'Mahmuda Khatun (Cashier)')}
                </Text>

                {/* Attachment Row (if present) */}
                {item.attachmentTitle ? (
                  <TouchableOpacity
                    style={styles.attachmentRow}
                    onPress={() =>
                      setSelectedAttachment({
                        title: item.attachmentTitle || 'Attachment',
                        type: item.attachmentType || 'image',
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.attachmentType === 'document' ? 'document-text-outline' : 'image-outline'}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.attachmentText}>
                      {item.attachmentTitle}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Action Buttons (Pending Tab) */}
                {activeTab === 'pending' && (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => setRejectingItem(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rejectBtnText}>
                        {l('Reject', 'প্রত্যাখ্যান')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(item)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.surface} />
                      <Text style={styles.approveBtnText}>
                        {l('Approve', 'অনুমোদন')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Approved Info Footer */}
                {activeTab === 'approved' && item.approvedBy && (
                  <View style={styles.statusFooter}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.statusFooterText}>
                      {l('Approved by:', 'অনুমোদনকারী:')} {item.approvedBy}
                    </Text>
                  </View>
                )}

                {/* Rejected Info Footer */}
                {activeTab === 'rejected' && (
                  <View style={styles.rejectedFooter}>
                    <Ionicons name="close-circle" size={16} color={colors.warning} />
                    <Text style={styles.rejectedFooterText}>
                      {item.rejectionReason || l('Rejected by admin', 'প্রশাসক কর্তৃক বাতিল')}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Attachment Preview Modal */}
      <Modal
        visible={!!selectedAttachment}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAttachment(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAttachment(null)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>
                {selectedAttachment?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAttachment(null)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.attachmentMockBox}>
              <Ionicons
                name={selectedAttachment?.type === 'document' ? 'document-text' : 'image'}
                size={56}
                color={colors.primary}
              />
              <Text style={styles.attachmentMockTitle}>
                {selectedAttachment?.title}
              </Text>
              <Text style={styles.attachmentMockDesc}>
                {l('Verified attachment from official Somiti records.', 'সমিতির নথি থেকে যাচাইকৃত সংযুক্তি।')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setSelectedAttachment(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneBtnText}>{l('Close', 'বন্ধ করুন')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reject Reason Confirmation Modal */}
      <Modal
        visible={!!rejectingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRejectingItem(null)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>
                {l('Reject Request', 'অনুরোধ প্রত্যাখ্যান')}
              </Text>
              <TouchableOpacity onPress={() => setRejectingItem(null)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubheading}>
              {l('Select rejection reason:', 'প্রত্যাখ্যানের কারণ নির্বাচন করুন:')}
            </Text>

            {REJECTION_REASONS.map((reasonObj, index) => {
              const isSelected = selectedReasonIdx === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                  onPress={() => setSelectedReasonIdx(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}>
                    {isBengali ? reasonObj.bn : reasonObj.en}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}

            {selectedReasonIdx === REJECTION_REASONS.length - 1 && (
              <TextInput
                style={styles.customReasonInput}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder={l('Write custom reason...', 'অন্যান্য কারণ লিখুন...')}
                placeholderTextColor={colors.textSecondary}
              />
            )}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectingItem(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>{l('Cancel', 'বাতিল')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRejectBtn}
                onPress={handleConfirmReject}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmRejectBtnText}>
                  {l('Confirm Rejection', 'নিশ্চিত করুন')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  approvalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.text,
  },
  timestampText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  titleAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
    marginRight: 10,
  },
  cardAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
  },
  cardDetailText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardEntryText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  attachmentText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  approveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.surface,
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  statusFooterText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.primary,
  },
  rejectedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  rejectedFooterText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.warning,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bottomSpacer: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
  },
  modalSubheading: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  attachmentMockBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  attachmentMockTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  attachmentMockDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.surface,
  },
  reasonOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  reasonOptionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  reasonOptionTextSelected: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  customReasonInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.text,
    marginBottom: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  modalConfirmRejectBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmRejectBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    color: colors.surface,
  },
  autoApproveBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoApproveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  autoApproveIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoApproveTextCol: {
    flex: 1,
  },
  autoApproveTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    color: colors.primary,
  },
  autoApproveSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  autoApproveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoApproveBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.surface,
  },
});
