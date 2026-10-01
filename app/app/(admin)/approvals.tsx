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

interface ApprovalItem {
  id: string;
  tag: string;
  time: string;
  title: string;
  amount: string;
  description: string;
  entryBy: string;
  attachmentName?: string;
  attachmentIcon?: 'image-outline' | 'document-text-outline';
}

const INITIAL_APPROVALS: ApprovalItem[] = [
  {
    id: '1',
    tag: 'ব্যয়',
    time: 'আজ ১০:২০',
    title: 'সভার আপ্যায়ন',
    amount: '৳১২,৫০০',
    description: 'বার্ষিক সাধারণ সভার দুপুরের খাবার (১০০ জন) · উৎস: কোষাধ্যক্ষের হাতে',
    entryBy: 'মাহমুদা খাতুন (কোষাধ্যক্ষ)',
    attachmentName: 'রসিদের ছবি দেখুন',
    attachmentIcon: 'image-outline',
  },
  {
    id: '2',
    tag: 'বিনিয়োগ',
    time: 'গতকাল',
    title: 'সাইট বি: নির্মাণ',
    amount: '৳২,০০,০০০',
    description: '৩য় কিস্তি · ব্যাংক থেকে প্রদান · প্রজেক্ট বর্তমানে বিলম্বিত',
    entryBy: 'মাহমুদা খাতুন (কোষাধ্যক্ষ)',
    attachmentName: 'চুক্তিপত্র',
    attachmentIcon: 'document-text-outline',
  },
  {
    id: '3',
    tag: 'সংশোধন',
    time: 'গতকাল',
    title: 'রসিদ #১০৭১',
    amount: '৳২,০০০ → ৳১,৫০০',
    description: 'কারণ: ভুল পরিমাণ এন্ট্রি হয়েছিল। মূল এন্ট্রি মুছে যাবে না, বিপরীত এন্ট্রি যোগ হবে।',
    entryBy: 'জাহিদ হাসান (সম্পাদক)',
  },
];

export default function ApprovalsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'অনুমোদন নিশ্চিতকরণ' : 'প্রত্যাখ্যান নিশ্চিতকরণ',
      action === 'approve' ? 'অনুরোধটি কি অনুমোদন করতে চান?' : 'অনুরোধটি কি প্রত্যাখ্যান করতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'হ্যাঁ',
          onPress: () => {
            setApprovals((prev) => prev.filter((a) => a.id !== id));
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
        <Text style={styles.headerTitle}>অনুমোদন</Text>
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
              অপেক্ষমাণ ৩
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'approved' && styles.tabBtnActive]}
            onPress={() => setActiveTab('approved')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
              অনুমোদিত
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'rejected' && styles.tabBtnActive]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
              প্রত্যাখ্যাত
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cards List */}
        <View style={styles.cardsList}>
          {approvals.map((item) => (
            <View key={item.id} style={styles.approvalCard}>
              {/* Card Top Row: Tag and Time */}
              <View style={styles.cardTopRow}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{item.tag}</Text>
                </View>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>

              {/* Title & Amount Row */}
              <View style={styles.titleAmountRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardAmount}>{item.amount}</Text>
              </View>

              {/* Description */}
              <Text style={styles.descriptionText}>{item.description}</Text>

              {/* Entry By */}
              <Text style={styles.entryByText}>এন্ট্রি: {item.entryBy}</Text>

              {/* Attachment Link if any */}
              {item.attachmentName && (
                <TouchableOpacity style={styles.attachmentLink} activeOpacity={0.7}>
                  <Ionicons
                    name={item.attachmentIcon || 'document-text-outline'}
                    size={16}
                    color="#0F766E"
                  />
                  <Text style={styles.attachmentText}>{item.attachmentName}</Text>
                </TouchableOpacity>
              )}

              {/* Buttons: Reject & Approve */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleAction(item.id, 'reject')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rejectBtnText}>প্রত্যাখ্যান</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleAction(item.id, 'approve')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>অনুমোদন</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  segmentedTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  tabTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#1E293B',
  },
  cardsList: {
    gap: 14,
  },
  approvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#475569',
  },
  timeText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  titleAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  cardAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  descriptionText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 4,
  },
  entryByText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  attachmentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  attachmentText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#0F766E',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 22,
  },
  rejectBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 22,
    gap: 4,
  },
  approveBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
