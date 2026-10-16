import {ActionMenu} from '../../../src/components/ActionMenu';
import { MemberIdentityFields } from '../../../src/components/MemberIdentityFields';
import { MemberCategory, MEMBER_CATEGORIES, legacyMemberNumber } from '../../../src/lib/memberIdentity';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { StickyCTA } from '../../../src/components/StickyCTA';
import { AppModal } from '../../../src/components/AppModal';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useAuthStore } from '../../../src/features/auth/authStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { isSupabaseConfigured } from '../../../src/lib/supabase';
import { BENGALI_MONTHS_FULL } from '../../../src/lib/bengali';
import { ENGLISH_MONTHS } from '../../../src/lib/months';
import { safeBack } from '../../../src/utils/navigation';
import { toEnglishDigits, toBengaliDigits } from '../../../src/lib/bengali';
import {useLedgerPage} from '../../../src/hooks/useLedgerPage';
import {signedTransactionAmount} from '../../../src/lib/ledger';
import {financeNote} from '../../../src/i18n/financeLabels';
import {MemberBalanceSummary} from '../../../src/components/MemberBalanceSummary';
import {MemberLoginPin} from '../../../src/components/MemberLoginPin';

export default function MemberProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();
  const { getMemberById, members, updateMember, deleteMember } = useSomitiStore();
  const withdrawalRequests=useSomitiStore(s=>s.withdrawalRequests);
  const { resetMemberPin, customPins, actualRole, currentUser } = useAuthStore();
  const isAdminUser = actualRole === 'super_admin' || actualRole === 'admin';

  const member = getMemberById(String(id)) || members.find((m) => m.id === id);
  const history=useLedgerPage({memberId:member?.id},!!member);

  // Edit Member Modal State
  const [showActions,setShowActions]=useState(false);
  const [showLoginPin,setShowLoginPin]=useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNumber,setEditNumber]=useState('');
  const [editCategory,setEditCategory]=useState<MemberCategory|''>(member?.memberCategory || '');
  const [editName, setEditName] = useState(member?.name || '');
  const [editFatherName,setEditFatherName] = useState(member?.fatherName || '');
  const [editMotherName,setEditMotherName] = useState(member?.motherName || '');
  const [editPhone, setEditPhone] = useState(member?.phone || '');
  const [editAddress, setEditAddress] = useState(member?.address || '');
  const [editNomineeName, setEditNomineeName] = useState(member?.nomineeName || '');
  const [editNomineeRelation, setEditNomineeRelation] = useState(member?.nomineeRelation || '');

  // Edit Follow-up Modal State
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupDate, setFollowupDate] = useState(
    member?.nextFollowup?.date || ''
  );
  const [followupNote, setFollowupNote] = useState(
    member?.nextFollowup?.note || ''
  );

  if(!member)return <SafeAreaView style={styles.container}><Text>{l('Member unavailable. Refresh the directory.','সদস্য পাওয়া যায়নি। তালিকা রিফ্রেশ করুন।')}</Text><Button title={l('Back','ফিরুন')} onPress={()=>safeBack(router,'/(admin)/(tabs)/members')}/></SafeAreaView>;
  const openEditModal = () => {
    if (member) {
      setEditNumber(member.memberNumber||'');
      setEditCategory(member.memberCategory || '');
      setEditName(member.name);
      setEditFatherName(member.fatherName || '');
      setEditMotherName(member.motherName || '');
      setEditPhone(toEnglishDigits(member.phone));
      setEditAddress(member.address && member.address !== '[ঠিকানা]' ? member.address : '');
      setEditNomineeName(member.nomineeName || '');
      setEditNomineeRelation(member.nomineeRelation || '');
      setShowEditModal(true);
    }
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Name and phone are required', 'নাম ও মোবাইল নম্বর আবশ্যক'));
      return;
    }

    try {
    if(!member.memberNumber && (editCategory||editNumber)){
      if(!isAdminUser)throw new Error(l('Admin required','অ্যাডমিন প্রয়োজন'));
      await useSomitiStore.getState().mapLegacyIdentity(member.id,editCategory as MemberCategory,editNumber);
    }
    await updateMember(member.id, {
      ...(editCategory && editCategory!==member.memberCategory ? {memberCategory:editCategory} : {}),
      name: editName.trim(),
      fatherName: editFatherName.trim(),
      motherName: editMotherName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim() || '[ঠিকানা]',
      nomineeName: editNomineeName.trim(),
      nomineeRelation: editNomineeRelation.trim(),
    });

    setShowEditModal(false);
    Alert.alert(l('Success', 'সফল'), l('Member updated successfully', 'সদস্যের তথ্য সফলভাবে হালনাগাদ হয়েছে'));
    }catch(e:any){Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
  };

  const handleSaveEdit = () => {
    if(editCategory && editCategory!==member.memberCategory){
      Alert.alert(l('Change member category?','সদস্যের ক্যাটাগরি পরিবর্তন করবেন?'),member.memberNumber?l('Only the prefix changes. Member number and history remain unchanged.','শুধু prefix বদলাবে; নম্বর ও হিসাব অপরিবর্তিত থাকবে।'):l('Confirm this permanent member number. It cannot be edited later. All account history stays attached.','স্থায়ী সদস্য নম্বর নিশ্চিত করুন। পরে বদলানো যাবে না; সব হিসাব একই সদস্যের থাকবে।'),[{text:l('Cancel','বাতিল'),style:'cancel'},{text:l('Confirm','নিশ্চিত করুন'),onPress:()=>{void saveEdit()}}]);
    }else void saveEdit();
  };

  const handleSaveFollowup = async () => {
    if (!followupDate.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Follow-up date is required', 'ফলো-আপ তারিখ আবশ্যক'));
      return;
    }

    try { await updateMember(member.id, {
      nextFollowup: {
        date: followupDate.trim(),
        note: followupNote.trim(),
      },
    });

    setShowFollowupModal(false);
    Alert.alert(l('Success', 'সফল'), l('Follow-up updated successfully', 'ফলো-আপ তথ্য সফলভাবে হালনাগাদ হয়েছে'));
    }catch(e:any){Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
  };

  const canIssueLoginPin=isAdminUser&&member?.id!==currentUser?.id;
  const handleResetPin=()=>{if(canIssueLoginPin)setShowLoginPin(true);};
  const displayName = isBengali ? member.name : (member.nameEn || member.name);
  const displayNominee = isBengali ? member.nomineeName : (member.nomineeNameEn || member.nomineeName);

  const handleCall = () => {
    const raw = toEnglishDigits(member.phone || '').replace(/[^0-9]/g, '');
    if (raw) {
      Linking.openURL(`tel:${raw}`);
    } else {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
    }
  };

  const handleWhatsApp = () => {
    const raw = toEnglishDigits(member.whatsapp || member.phone || '').replace(/[^0-9]/g, '');
    if (!raw) {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
      return;
    }
    const fullPhone = raw.startsWith('88') ? raw : `88${raw}`;
    const greeting = l(`Assalamu Alaikum ${displayName}`, `আসসালামু আলাইকুম ${displayName} ভাই`);
    Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(greeting)}`);
  };

  const handleSMS = () => {
    const raw = toEnglishDigits(member.phone || '').replace(/[^0-9]/g, '');
    if (raw) {
      Linking.openURL(`sms:${raw}`);
    } else {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
    }
  };

  const handleSendWhatsAppLoginInfo = () => {
    const raw = toEnglishDigits(member.whatsapp || member.phone || '').replace(/[^0-9]/g, '');
    if (!raw) {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
      return;
    }
    const fullPhone = raw.startsWith('88') ? raw : `88${raw}`;
    const currPin = isSupabaseConfigured() ? l('(PIN given by admin)', '(অ্যাডমিনের দেওয়া পিন)') : customPins[member.id] || '1234';
    const text = isBengali
      ? `আসসালামু আলাইকুম ${member.name}।\nআমানত সমিতিতে আপনার সদস্য পোর্টাল প্রস্তুত।\n\nআইডি: ${member.code}\nমোবাইল: ${formatNum(member.phone)}\nলগইন পিন: ${formatNum(currPin)}\n\nঅ্যাপে লগইন করে আপনার মাসিক সঞ্চয় ও রসিদ দেখতে পারবেন।`
      : `Assalamu Alaikum ${displayName}.\nYour member portal at Amanot Somiti is ready.\n\nMember ID: ${member.code}\nMobile: ${formatNum(member.phone)}\nLogin PIN: ${formatNum(currPin)}\n\nLog in to the app to view your monthly savings and receipts.`;
    Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`);
  };

  const memberActions = [
        {
          text: l('Share login instructions', 'লগইনের নির্দেশনা শেয়ার করুন'),
          onPress: handleSendWhatsAppLoginInfo,
        },
        ...(canIssueLoginPin?[{
          text: l('Issue temporary PIN', 'Temporary PIN দিন'),
          onPress: handleResetPin,
        }]:[]),
        {
          text: l('Edit Member Info', 'সদস্যের তথ্য সংশোধন'),
          onPress: openEditModal,
        },
        {
          text: l('Update Follow-up', 'ফলো-আপ আপডেট'),
          onPress: () => setShowFollowupModal(true),
        },
        ...(isAdminUser && member.id !== currentUser?.id
          ? [
              {
                text: member.status === 'inactive' ? l('Reactivate member', 'সদস্য সক্রিয় করুন') : l('Mark inactive', 'নিষ্ক্রিয় করুন'),
                onPress: async () => {try {await updateMember(member.id, { status: member.status === 'inactive' ? 'paid' : 'inactive' });}catch(e:any){Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}},
              },
              {
                text: l('Remove member', 'সদস্য বাদ দিন'),
                style: 'destructive' as const,
                onPress: () =>
                  Alert.alert(
                    l('Remove member?', 'সদস্য বাদ দেবেন?'),
                    l(
                      `${member.name} will be removed from the list and can no longer log in. Their past transactions stay in the ledger.`,
                      `${member.name} তালিকা থেকে বাদ যাবেন এবং লগইন করতে পারবেন না। আগের লেনদেন হিসাবে থেকে যাবে।`
                    ),
                    [
                      { text: l('Cancel', 'বাতিল'), style: 'cancel' },
                      {
                        text: l('Remove', 'বাদ দিন'),
                        style: 'destructive',
                        onPress: async () => {
                          try {await deleteMember(member.id);router.replace('/(admin)/(tabs)/members');}
                          catch(e:any){Alert.alert(l('Remove failed','বাদ দিতে ব্যর্থ'),e.message);}
                        },
                      },
                    ]
                  ),
              },
            ]
          : []),
        {
          text: l('Cancel', 'বাতিল'),
          style: 'cancel',
        },
      ];
  const handleMoreOptions=()=>setShowActions(true);

  const formatJoinDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (isBengali) {
      return toBengaliDigits(
        dateStr
          .replace(/January/i, 'জানুয়ারি')
          .replace(/February/i, 'ফেব্রুয়ারি')
          .replace(/March/i, 'মার্চ')
          .replace(/April/i, 'এপ্রিল')
          .replace(/May/i, 'মে')
          .replace(/June/i, 'জুন')
          .replace(/July/i, 'জুলাই')
          .replace(/August/i, 'আগস্ট')
          .replace(/September/i, 'সেপ্টেম্বর')
          .replace(/October/i, 'অক্টোবর')
          .replace(/November/i, 'নভেম্বর')
          .replace(/December/i, 'ডিসেম্বর')
      );
    }
    return toEnglishDigits(
      dateStr
        .replace(/জানুয়ারি/g, 'January')
        .replace(/ফেব্রুয়ারি/g, 'February')
        .replace(/মার্চ/g, 'March')
        .replace(/এপ্রিল/g, 'April')
        .replace(/মে/g, 'May')
        .replace(/জুন/g, 'June')
        .replace(/জুলাই/g, 'July')
        .replace(/আগস্ট/g, 'August')
        .replace(/সেপ্টেম্বর/g, 'September')
        .replace(/অক্টোবর/g, 'October')
        .replace(/নভেম্বর/g, 'November')
        .replace(/ডিসেম্বর/g, 'December')
    );
  };

  const formatRelation = (relation?: string) => {
    if (!relation) return '';
    const map: Record<string, { en: string; bn: string }> = {
      'স্ত্রী': { en: 'Wife', bn: 'স্ত্রী' },
      'স্বামী': { en: 'Husband', bn: 'স্বামী' },
      'পুত্র': { en: 'Son', bn: 'পুত্র' },
      'কন্যা': { en: 'Daughter', bn: 'কন্যা' },
      'ভাই': { en: 'Brother', bn: 'ভাই' },
      'বোন': { en: 'Sister', bn: 'বোন' },
      'মা': { en: 'Mother', bn: 'মা' },
      'বাবা': { en: 'Father', bn: 'বাবা' },
    };
    if (map[relation]) {
      return l(map[relation].en, map[relation].bn);
    }
    return relation;
  };

  const recentTransactions = isSupabaseConfigured() ? history.rows.slice(0,10).map(t=>({date:t.date,title:financeNote(t.note||t.months?.join(', ')||t.type,isBengali),amount:signedTransactionAmount(t),receipt:t.receiptNo,type:t.paymentMethod})) : (member?.recentTxns || []).map((t) => ({
    date: t.date,
    title: t.title,
    amount: t.amount,
    receipt: t.receiptNo,
    type: t.type,
  }));

  const infoRows = [
    { label: l("Father's Name", 'পিতার নাম'), value: member.fatherName || '—' },
    { label: l("Mother's Name", 'মাতার নাম'), value: member.motherName || '—' },
    { label: l('Mobile', 'মোবাইল'), value: formatNum(member.phone) },
    { label: l('WhatsApp', 'হোয়াটসঅ্যাপ'), value: formatNum(member.whatsapp || member.phone) },
    { label: l('National ID (NID)', 'জাতীয় পরিচয়পত্র'), value: member.nid ? formatNum(member.nid) : '—' },
    {
      label: l('Nominee', 'নমিনি'),
      value: member.nomineeRelation ? `${displayNominee} (${formatRelation(member.nomineeRelation)})` : displayNominee || '—',
    },
    {
      label: l('Address', 'ঠিকানা'),
      value:
        member.address && member.address !== '[ঠিকানা]'
          ? isBengali
            ? member.address
            : toEnglishDigits(member.address)
          : l('[Address]', '[ঠিকানা]'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          testID="member-back-btn"
          onPress={() => safeBack(router, '/(admin)/(tabs)/members')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{l('Member Profile', 'সদস্য প্রোফাইল')}</Text>
        <View style={styles.appBarRight}>
          <TouchableOpacity
            testID="member-edit-btn"
            style={styles.iconBtn}
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="member-more-btn"
            style={styles.iconBtn}
            onPress={handleMoreOptions}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <View style={styles.headerProfileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
          </View>
          <View style={styles.profileDetailsCol}>
            <Text style={styles.memberName}>{displayName}</Text>
            <Text style={styles.memberSub}>
              {member.code} · {l('Joined', 'যোগদান')} {formatJoinDate(member.joinDate)}
            </Text>

            {member.memberCategory && <Text style={styles.memberSub}>{(()=>{const category=MEMBER_CATEGORIES.find(item=>item.value===member.memberCategory);return category?l(category.en,category.bn):''})()}</Text>}
            <View style={styles.badgeRow}>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{member.status==='inactive'?l('Inactive','নিষ্ক্রিয়'):l('Active', 'সক্রিয়')}</Text>
              </View>

            </View>
          </View>
        </View>

        {/* 4 Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            testID="member-call-btn"
            style={styles.actionBtn}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('Call', 'কল')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="member-whatsapp-btn"
            style={styles.actionBtn}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="member-sms-btn"
            style={styles.actionBtn}
            onPress={handleSMS}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('SMS', 'এসএমএস')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="member-statement-btn"
            style={styles.actionBtn}
            onPress={() => router.push({pathname:'/(admin)/ledger',params:{memberId:member.id}})}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('Statement', 'স্টেটমেন্ট')}</Text>
          </TouchableOpacity>
        </View>

        {/* Card: মোট জমা */}
        {canIssueLoginPin&&<Card style={styles.card}>
          <Text style={styles.cardSmallTitle}>{l('Member app login','সদস্যের অ্যাপ লগইন')}</Text>
          <Text style={[styles.cardSmallTitle,{marginBottom:12}]}>{l('Give this member a temporary PIN to log in with their mobile number.','মোবাইল নম্বর দিয়ে লগইনের জন্য এই সদস্যকে অস্থায়ী PIN দিন।')}</Text>
          <Button testID="member-login-pin-btn" title={l('Give login PIN','লগইন PIN দিন')} variant="outline" onPress={handleResetPin}/>
        </Card>}
        <Button title={l('Withdrawal requests','উত্তোলনের আবেদন')} variant="outline" onPress={()=>router.push({pathname:'/(admin)/withdrawals',params:{memberId:member.id}})} style={{marginBottom:16}}/>
        <MemberBalanceSummary member={member} requests={withdrawalRequests}/>
        <Card style={styles.card}>
          <Text style={styles.cardSmallTitle}>{l('Profit history','লাভের ইতিহাস')}</Text>

          {/* Overdue Banner */}


          {/* Profit 2-columns */}
          <View style={styles.profitGrid}>
            <View style={styles.profitCol}>
              <Text style={styles.profitLabel}>{l('Last distributed profit','সর্বশেষ বণ্টিত লাভ')}</Text>
              <Text style={styles.profitVal}>
                +{formatMoney(member.profit2025 || 0)}
              </Text>
            </View>
            <View style={styles.profitCol}>
              <Text style={styles.profitLabel}>{l('This Year (Est.)', 'এ বছর (আনুমানিক)')}</Text>
              <Text style={styles.profitVal}>
                +{formatMoney(member.estimatedProfit2026 || 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Card: সাম্প্রতিক লেনদেন */}
        <View style={styles.sectionHeaderFlex}>
          <Text style={styles.sectionTitle}>{l('Recent Transactions', 'সাম্প্রতিক লেনদেন')}</Text>
          <TouchableOpacity
            testID="member-view-all-txns"
            onPress={() => router.push(`/(admin)/statement?memberId=${member.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllLink}>{l('View All', 'সব দেখুন')}</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.card}>
          {history.loading&&<Text style={styles.txnMeta}>{l('Loading…','লোড হচ্ছে…')}</Text>}
          {history.error&&<TouchableOpacity onPress={history.reload}><Text style={styles.txnMeta}>{history.error} · {l('Retry','আবার চেষ্টা করুন')}</Text></TouchableOpacity>}
          {!history.loading&&!history.error&&recentTransactions.length === 0 && (
            <Text style={[styles.txnMeta, { paddingVertical: 12 }]}>{l('No transactions yet', 'এখনো কোনো লেনদেন নেই')}</Text>
          )}
          {recentTransactions.map((txn, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => router.push({pathname:'/(admin)/ledger',params:{memberId:member.id}})}
              style={[
                styles.txnRow,
                index === recentTransactions.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.txnTitle}>{txn.title}</Text>
                <Text style={styles.txnMeta}>
                  {txn.date} · {txn.type} {txn.receipt ? `· ${l('Receipt', 'রসিদ')} ${txn.receipt}` : ''}
                </Text>
              </View>
              <Text style={styles.txnAmount}>
                {formatMoney(txn.amount,{showPlusSign:true})}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Card: ব্যক্তিগত তথ্য */}
        <Text style={styles.sectionTitleAlone}>{l('Personal Information', 'ব্যক্তিগত তথ্য')}</Text>
        <Card style={styles.card}>
          {infoRows.map((info, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={openEditModal}
              style={[
                styles.infoRow,
                idx === infoRows.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.infoLabel}>{info.label}</Text>
              <Text style={styles.infoVal}>{info.value}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Card: পরবর্তী ফলো-আপ */}
        <TouchableOpacity
          testID="member-followup-card"
          activeOpacity={0.8}
          onPress={() => setShowFollowupModal(true)}
        >
          <Card style={styles.followupCard}>
            <View style={styles.followupCardRow}>
              <Ionicons name="calendar-outline" size={22} color={colors.text} />
              <View style={styles.followupContent}>
                <Text style={styles.followupHeader}>
                  {l('Next Follow-up:', 'পরবর্তী ফলো-আপ:')} {followupDate || l('Not set', 'নির্ধারিত নেই')}
                </Text>
                <Text style={styles.followupText}>
                  {followupNote}
                </Text>
              </View>
              <View style={styles.followupEditBtn}>
                <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <StickyCTA backgroundColor={colors.bg} style={styles.stickyCTA}>
        <TouchableOpacity
          testID="member-collect-deposit-btn"
          style={styles.bottomPayBtn}
          onPress={() => router.push(`/(admin)/deposit/new?memberId=${member.id}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color={colors.surface} />
          <Text style={styles.bottomPayBtnText}>{l('Collect Deposit', 'জমা নিন')}</Text>
        </TouchableOpacity>
      </StickyCTA>

      {/* Edit Member Modal */}
      {showLoginPin&&canIssueLoginPin&&<MemberLoginPin member={member} onIssue={()=>resetMemberPin(member.id)} onClose={()=>setShowLoginPin(false)}/>}
      <ActionMenu visible={showActions} title={displayName} actions={memberActions} onClose={()=>setShowActions(false)}/>
      <AppModal visible={showEditModal} onClose={() => setShowEditModal(false)} contentContainerStyle={{maxHeight:'90%'}}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{flexShrink:1}}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Edit Member Info', 'সদস্যের তথ্য সংশোধন')}</Text>
          <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <MemberIdentityFields category={editCategory} number={member.memberNumber || editNumber} onCategory={setEditCategory} onNumber={setEditNumber} existingCode={member.code} locked={!!member.memberNumber || !isAdminUser} legacy={!member.memberNumber&&!isAdminUser}/>
        <Text style={styles.modalInputLabel}>{l('Member Name', 'সদস্যের পুরো নাম')}</Text>
        <TextInput
          testID="edit-name-input"
          style={styles.modalInput}
          value={editName}
          onChangeText={setEditName}
          placeholder={l('Name', 'নাম')}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l("Father's Name", 'পিতার নাম')}</Text>
        <TextInput testID="edit-father-name-input" style={styles.modalInput} value={editFatherName} onChangeText={setEditFatherName} placeholderTextColor={colors.textSecondary} />

        <Text style={styles.modalInputLabel}>{l("Mother's Name", 'মাতার নাম')}</Text>
        <TextInput testID="edit-mother-name-input" style={styles.modalInput} value={editMotherName} onChangeText={setEditMotherName} placeholderTextColor={colors.textSecondary} />

        <Text style={styles.modalInputLabel}>{l('Mobile Number', 'মোবাইল নম্বর')}</Text>
        <TextInput
          testID="edit-phone-input"
          style={styles.modalInput}
          value={editPhone}
          onChangeText={(t) => setEditPhone(toEnglishDigits(t))}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Nominee Name', 'নমিনির নাম')}</Text>
        <TextInput
          testID="edit-nominee-input"
          style={styles.modalInput}
          value={editNomineeName}
          onChangeText={setEditNomineeName}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Nominee Relationship', 'সম্পর্ক')}</Text>
        <TextInput
          testID="edit-relation-input"
          style={styles.modalInput}
          value={editNomineeRelation}
          onChangeText={setEditNomineeRelation}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Address', 'ঠিকানা')}</Text>
        <TextInput
          testID="edit-address-input"
          style={styles.modalInput}
          value={editAddress}
          onChangeText={setEditAddress}
          placeholderTextColor={colors.textSecondary}
        />

        <Button
          testID="edit-member-save-btn"
          title={l('Save Changes', 'তথ্য সংরক্ষণ করুন')}
          variant="primary"
          onPress={handleSaveEdit}
          style={{ marginTop: 16 }}
        />
        </ScrollView>
      </AppModal>

      {/* Edit Follow-up Modal */}
      <AppModal visible={showFollowupModal} onClose={() => setShowFollowupModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Update Follow-up', 'ফলো-আপ আপডেট')}</Text>
          <TouchableOpacity onPress={() => setShowFollowupModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.modalInputLabel}>{l('Follow-up Date', 'ফলো-আপের তারিখ')}</Text>
        <TextInput
          testID="edit-followup-date-input"
          style={styles.modalInput}
          value={followupDate}
          onChangeText={setFollowupDate}
          placeholder={l('e.g. 3 October', 'যেমন: ৩ অক্টোবর')}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Follow-up Note', 'নোট / আলোচনা')}</Text>
        <TextInput
          testID="edit-followup-note-input"
          style={[styles.modalInput, { minHeight: 64, textAlignVertical: 'top' }]}
          value={followupNote}
          onChangeText={setFollowupNote}
          multiline
          placeholder={l('Follow-up details...', 'আলোচনার বিবরণ...')}
          placeholderTextColor={colors.textSecondary}
        />

        <Button
          testID="edit-followup-save-btn"
          title={l('Save Follow-up', 'সংরক্ষণ করুন')}
          variant="primary"
          onPress={handleSaveFollowup}
          style={{ marginTop: 16 }}
        />
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    color: colors.primary,
  },
  profileDetailsCol: {
    flex: 1,
  },
  memberName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  memberSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  activeBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  activeBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  dueBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  dueBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.warning,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  card: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  cardSmallTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  cardLargeAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.headline,
    color: colors.text,
    marginVertical: 4,
  },
  cardSubText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  overdueTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.warning,
  },
  overdueSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.warning,
    marginTop: 2,
  },
  overdueAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.warning,
  },
  profitGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profitCol: {
    flex: 1,
  },
  profitLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  profitVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.primary,
    marginTop: 2,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  fractionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthTile: {
    flexBasis: '22.8%',
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTilePaid: {
    backgroundColor: colors.primary,
  },
  monthTileDue: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  monthTileUpcoming: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  monthTileName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
  },
  monthTileStatus: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.tiny,
    marginTop: 2,
  },
  monthNamePaid: {
    color: colors.surface,
  },
  monthStatusPaid: {
    color: colors.primarySoft,
  },
  monthNameDue: {
    color: colors.warning,
  },
  monthStatusDue: {
    color: colors.warning,
  },
  monthNameUpcoming: {
    color: colors.textSecondary,
  },
  monthStatusUpcoming: {
    color: colors.textSecondary,
  },
  sectionHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  sectionTitleAlone: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
    marginBottom: 8,
    marginTop: 2,
  },
  viewAllLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.primary,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txnTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  txnMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txnAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  infoVal: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  followupCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  followupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followupContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  followupHeader: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  followupText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followupEditBtn: {
    padding: 6,
  },
  stickyCTA: {
    borderTopWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomPayBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 9999,
    gap: 6,
  },
  bottomPayBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
  },
  modalInputLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    fontFamily: typography.fontFamily.regular,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typography.size.subhead,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
});
