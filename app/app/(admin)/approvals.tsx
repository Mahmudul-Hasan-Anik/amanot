import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { PendingApproval } from '../../src/mocks/mockData';
import { useAuthStore } from '../../src/features/auth/authStore';
import { safeBack } from '../../src/utils/navigation';

interface AttachmentModalState {
  type: 'image' | 'document';
  title: string;
  amount?: number;
  date?: string;
  detail?: string;
}

interface ConfirmModalState {
  item: PendingApproval;
  action: 'approve' | 'reject';
}

interface ToastState {
  message: string;
  type: 'success' | 'danger';
  targetTab?: 'approved' | 'rejected';
}

const REJECTION_REASONS = [
  'অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার',
  'বাজেট বহির্ভূত ব্যয়',
  'যথাযথ মেমো বা রসিদ সংযুক্ত নেই',
  'অননুমোদিত অতিরিক্ত খরচ',
  'অন্যান্য কারণ',
];

export default function ApprovalsScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const {
    somitiInfo,
    approvals,
    approvedApprovals = [],
    rejectedApprovals = [],
    approveRequest,
    rejectRequest,
  } = useSomitiStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentModalState | null>(null);

  // In-app interactive confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার');
  const [customReason, setCustomReason] = useState<string>('');

  // Toast notification state
  const [toast, setToast] = useState<ToastState | null>(null);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const triggerToast = (
    message: string,
    type: 'success' | 'danger',
    targetTab?: 'approved' | 'rejected'
  ) => {
    setToast({ message, type, targetTab });
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    const { item, action } = confirmModal;

    if (action === 'approve') {
      approveRequest(item.id, useAuthStore.getState().currentUser?.name);
      setConfirmModal(null);
      triggerToast(
        l(
          `"${item.title}" approved successfully. Funds adjusted.`,
          `"${item.title}" সফলভাবে অনুমোদিত হয়েছে এবং ফান্ড সমন্বয় করা হয়েছে।`
        ),
        'success',
        'approved'
      );
    } else {
      const finalReason =
        selectedReason === 'অন্যান্য কারণ' && customReason.trim()
          ? customReason.trim()
          : selectedReason || 'অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার';

      rejectRequest(item.id, finalReason, useAuthStore.getState().currentUser?.name);
      setConfirmModal(null);
      triggerToast(
        l(
          `"${item.title}" has been rejected.`,
          `"${item.title}" বাতিল করা হয়েছে।`
        ),
        'danger',
        'rejected'
      );
    }
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
          onPress={() => safeBack(router)}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Approvals', 'অনুমোদন')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* In-app Toast Banner */}
      {toast && (
        <View
          style={[
            styles.toastContainer,
            toast.type === 'success' ? styles.toastSuccess : styles.toastDanger,
          ]}
        >
          <View style={styles.toastLeft}>
            <Ionicons
              name={toast.type === 'success' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={toast.type === 'success' ? '#0F766E' : '#DC2626'}
            />
            <Text style={styles.toastText} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
          <View style={styles.toastRight}>
            {toast.targetTab && (
              <TouchableOpacity
                style={styles.toastActionBtn}
                onPress={() => {
                  setActiveTab(toast.targetTab!);
                  setToast(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.toastActionText}>{l('View', 'দেখুন')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setToast(null)}
              style={styles.toastCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                        onPress={() => {
                          setSelectedReason('অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার');
                          setCustomReason('');
                          setConfirmModal({ item, action: 'reject' });
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                        <Text style={styles.rejectBtnText}>{l('Reject', 'প্রত্যাখ্যান')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => {
                          setConfirmModal({ item, action: 'approve' });
                        }}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
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

      {/* Action Confirmation Modal (Approve / Reject) */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.confirmModalCard}>
            {/* Modal Icon & Header */}
            <View style={styles.confirmHeader}>
              <View
                style={[
                  styles.confirmIconCircle,
                  confirmModal?.action === 'approve'
                    ? styles.confirmIconApprove
                    : styles.confirmIconReject,
                ]}
              >
                <Ionicons
                  name={
                    confirmModal?.action === 'approve'
                      ? 'shield-checkmark'
                      : 'alert-circle'
                  }
                  size={28}
                  color={confirmModal?.action === 'approve' ? '#0F766E' : '#DC2626'}
                />
              </View>
              <Text style={styles.confirmTitle}>
                {confirmModal?.action === 'approve'
                  ? l('Confirm Approval', 'অনুমোদন নিশ্চিতকরণ')
                  : l('Confirm Rejection', 'প্রত্যাখ্যান নিশ্চিতকরণ')}
              </Text>
              <Text style={styles.confirmSubtitle}>
                {confirmModal?.action === 'approve'
                  ? l(
                      'Please verify the details before approving this request.',
                      'অনুরোধটি অনুমোদন করার পূর্বে বিবরণ যাচাই করে নিশ্চিত করুন।'
                    )
                  : l(
                      'Please specify the reason for rejecting this request.',
                      'অনুরোধটি বাতিল বা প্রত্যাখ্যানের কারণ উল্লেখ করুন।'
                    )}
              </Text>
            </View>

            {/* Target Item Summary Box */}
            {confirmModal && (
              <View style={styles.confirmItemBox}>
                <View style={styles.confirmItemTop}>
                  <Text style={styles.confirmItemTitle} numberOfLines={2}>
                    {confirmModal.item.title}
                  </Text>
                  <Text style={styles.confirmItemAmount}>
                    {confirmModal.item.amountDisplay ||
                      formatMoney(confirmModal.item.amount)}
                  </Text>
                </View>
                <Text style={styles.confirmItemDetail} numberOfLines={2}>
                  {confirmModal.item.detail}
                </Text>
                <Text style={styles.confirmItemMeta}>
                  {l('Entered by:', 'এন্ট্রি:')} {confirmModal.item.createdBy}
                </Text>
              </View>
            )}

            {/* Approve Notice or Reject Reason Selector */}
            {confirmModal?.action === 'approve' ? (
              <View style={styles.approveNoticeBox}>
                <Ionicons name="information-circle-outline" size={18} color="#0F766E" />
                <Text style={styles.approveNoticeText}>
                  {l(
                    'Upon approval, this amount will be recorded into expenses and deducted from available funds.',
                    'অনুমোদনের সাথে সাথে সমিতির ফান্ড ও কোষাধ্যক্ষের ক্যাশ হিসাব থেকে অর্থ স্বয়ংক্রিয়ভাবে সমন্বয় হবে।'
                  )}
                </Text>
              </View>
            ) : (
              <View style={styles.rejectReasonSection}>
                <Text style={styles.rejectSectionLabel}>
                  {l('Select Rejection Reason:', 'প্রত্যাখ্যানের কারণ নির্বাচন করুন:')}
                </Text>
                <View style={styles.reasonChipsContainer}>
                  {REJECTION_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        style={[
                          styles.reasonChip,
                          isSelected && styles.reasonChipSelected,
                        ]}
                        onPress={() => setSelectedReason(reason)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.reasonChipText,
                            isSelected && styles.reasonChipTextSelected,
                          ]}
                        >
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedReason === 'অন্যান্য কারণ' && (
                  <TextInput
                    style={styles.customReasonInput}
                    placeholder={l(
                      'Type rejection reason here...',
                      'প্রত্যাখ্যানের সুনির্দিষ্ট কারণ লিখুন...'
                    )}
                    placeholderTextColor="#94A3B8"
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                  />
                )}
              </View>
            )}

            {/* Modal Action Buttons */}
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmModal(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelBtnText}>{l('Cancel', 'বাতিল')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmSubmitBtn,
                  confirmModal?.action === 'approve'
                    ? styles.confirmSubmitApprove
                    : styles.confirmSubmitReject,
                ]}
                onPress={handleConfirmAction}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={
                    confirmModal?.action === 'approve'
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.confirmSubmitBtnText}>
                  {confirmModal?.action === 'approve'
                    ? l('Yes, Approve', 'অনুমোদন করুন')
                    : l('Yes, Reject', 'প্রত্যাখ্যান করুন')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                  <Text style={styles.voucherOrgName}>
                    {l((somitiInfo as any).nameEn || 'Uttara Model Samity', somitiInfo.name || 'উত্তরা মডেল সমবায় সমিতি')}
                  </Text>
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
                  <Text style={styles.voucherOrgName}>
                    {l((somitiInfo as any).nameEn || 'Uttara Model Samity', somitiInfo.name || 'উত্তরা মডেল সমবায় সমিতি')}
                  </Text>
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

  // Toast Banner Styles
  toastContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  toastSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  toastDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  toastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  toastRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  toastText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  toastActionBtn: {
    backgroundColor: '#134E4A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toastActionText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  toastCloseBtn: {
    padding: 4,
  },

  // Confirm Modal Styles
  confirmModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 420,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmIconApprove: {
    backgroundColor: '#CCFBF1',
  },
  confirmIconReject: {
    backgroundColor: '#FEE2E2',
  },
  confirmTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  confirmItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  confirmItemTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    marginRight: 6,
  },
  confirmItemAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#134E4A',
  },
  confirmItemDetail: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  confirmItemMeta: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#94A3B8',
  },
  approveNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 18,
  },
  approveNoticeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#0F766E',
    flex: 1,
    lineHeight: 17,
  },
  rejectReasonSection: {
    marginBottom: 16,
  },
  rejectSectionLabel: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
  },
  reasonChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  reasonChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  reasonChipSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  reasonChipText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#475569',
  },
  reasonChipTextSelected: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#DC2626',
  },
  customReasonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#1E293B',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  confirmCancelBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#475569',
  },
  confirmSubmitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  confirmSubmitApprove: {
    backgroundColor: '#134E4A',
  },
  confirmSubmitReject: {
    backgroundColor: '#DC2626',
  },
  confirmSubmitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
