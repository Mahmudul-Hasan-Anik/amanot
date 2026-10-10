import { generateTemporaryPin } from '../../../src/lib/pinPolicy';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import * as ImagePicker from 'expo-image-picker';
import * as api from '../../../src/lib/api';
import { readProfilePhoto } from '../../../src/lib/profilePhoto';
import { REMOTE } from '../../../src/store/somitiStore';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { safeBack } from '../../../src/utils/navigation';
import { AppModal } from '../../../src/components/AppModal';
import { StickyCTA } from '../../../src/components/StickyCTA';
import { Checkbox } from '../../../src/components/Checkbox';
import { toBengaliDigits, toEnglishDigits } from '../../../src/lib/bengali';
import { todayDMY, parseDMY } from '../../../src/lib/months';

export default function NewMemberScreen() {
  const router = useRouter();
  const { l, isBengali, formatNum } = useLanguage();
  const { addMember, members } = useSomitiStore();

  // next code = highest existing number + 1 (server makes the final choice)
  const nextCodeNum =
    members.reduce((mx, m) => Math.max(mx, parseInt((m.code || '').replace(/\D/g, ''), 10) || 0), 0) + 1;
  const autoMemberCode = `SM-${String(nextCodeNum).padStart(3, '0')}`;

  // Form states matching PDF Page 6
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [memberCode] = useState(autoMemberCode);
  const [nid, setNid] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [nomineePhone, setNomineePhone] = useState('');
  const [joinDate, setJoinDate] = useState(todayDMY());
  const [monthlyAmount, setMonthlyAmount] = useState('2000');
  const [isMonthlyFocused, setIsMonthlyFocused] = useState(false);
  const [admissionFee, setAdmissionFee] = useState('500');
  const [isFeeFocused, setIsFeeFocused] = useState(false);

  // DatePicker modal state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'dob' | 'joinDate'>('dob');
  const [pickerDay, setPickerDay] = useState(15);
  const [pickerMonth, setPickerMonth] = useState(8);
  const [pickerYear, setPickerYear] = useState(1990);

  const MONTH_NAMES_BN = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openDatePicker = (target: 'dob' | 'joinDate') => {
    setDatePickerTarget(target);
    const curVal = target === 'dob' ? dob : joinDate;
    if (curVal) {
      const parts = toEnglishDigits(curVal).split(/[\/\-\.]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && d >= 1 && d <= 31) setPickerDay(d);
        if (!isNaN(m) && m >= 1 && m <= 12) setPickerMonth(m);
        if (!isNaN(y) && y >= 1930 && y <= 2030) setPickerYear(y);
      }
    } else {
      if (target === 'dob') {
        setPickerDay(15);
        setPickerMonth(8);
        setPickerYear(1990);
      } else {
        const now = new Date();
        setPickerDay(now.getDate());
        setPickerMonth(now.getMonth() + 1);
        setPickerYear(now.getFullYear());
      }
    }
    setShowDatePicker(true);
  };

  const handleConfirmDate = () => {
    const dd = pickerDay < 10 ? `0${pickerDay}` : `${pickerDay}`;
    const mm = pickerMonth < 10 ? `0${pickerMonth}` : `${pickerMonth}`;
    const yyyy = `${pickerYear}`;
    const dateStr = `${dd}/${mm}/${yyyy}`;
    const formatted = isBengali ? toBengaliDigits(dateStr) : dateStr;

    if (datePickerTarget === 'dob') {
      setDob(formatted);
    } else {
      setJoinDate(formatted);
    }
    setShowDatePicker(false);
  };

  const getMonthlyDisplay = () => {
    if (isMonthlyFocused) {
      return isBengali ? toBengaliDigits(monthlyAmount) : monthlyAmount;
    }
    const num = Number(monthlyAmount);
    if (!num) return '';
    return formatNum(num);
  };

  const getFeeDisplay = () => {
    if (isFeeFocused) {
      return isBengali ? toBengaliDigits(admissionFee) : admissionFee;
    }
    const num = Number(admissionFee);
    if (!num) return '';
    return formatNum(num);
  };

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [temporaryPin,setTemporaryPin] = useState('');
  const [createdMember, setCreatedMember] = useState<any>(null);

  const handlePickPhoto = async () => {
    try {
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
      if(!result.canceled) {
        await readProfilePhoto(result.assets[0].uri);
        setPhotoUri(result.assets[0].uri);
      }
    } catch(e:any){Alert.alert(l('Photo unavailable','ছবি নির্বাচন করা যায়নি'),e.message);}
  };

  const handlePhoneChange = (t: string) => {
    let eng = toEnglishDigits(t).replace(/[^\d]/g, '');
    if (eng.startsWith('0')) {
      eng = eng.substring(1);
    }
    setPhone(eng);
  };

  const handleWaChange = (t: string) => {
    let eng = toEnglishDigits(t).replace(/[^\d]/g, '');
    if (eng.startsWith('0')) {
      eng = eng.substring(1);
    }
    setWhatsappPhone(eng);
  };

  const [saving,setSaving] = useState(false);
  const handleSubmit = async () => {
    if (saving) return;
    if (!name.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter member full name', 'অনুগ্রহ করে সদস্যের পূর্ণ নাম লিখুন'));
      return;
    }
    if (!phone.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter member mobile number', 'অনুগ্রহ করে সদস্যের মোবাইল নম্বর লিখুন'));
      return;
    }

    if (phone.replace(/\D/g, '').length !== 10) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Mobile number must be 11 digits (01XXXXXXXXX)', 'মোবাইল নম্বর ১১ সংখ্যার হতে হবে (০১XXXXXXXXX)'));
      return;
    }
    const cleanMonthly = Number(toEnglishDigits(monthlyAmount).replace(/[^\d]/g, ''));
    if (!cleanMonthly) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter the monthly deposit amount', 'মাসিক জমার পরিমাণ লিখুন'));
      return;
    }
    const cleanFee = Number(toEnglishDigits(admissionFee).replace(/[^\d]/g, '')) || 0;
    const formattedPhone = phone.startsWith('0') ? phone : `0${phone}`;
    const joinISO = parseDMY(toEnglishDigits(joinDate));
    if (!joinISO) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Join date must be DD/MM/YYYY', 'যোগদানের তারিখ DD/MM/YYYY আকারে দিন'));
      return;
    }
    const waDigits = !sameAsPhone && whatsappPhone ? `0${whatsappPhone.replace(/^0/, '')}` : formattedPhone;

    setSaving(true);
    try {
    const initialPin = REMOTE ? generateTemporaryPin() : '1234';
    const newMember = await addMember({
      name: name.trim(),
      phone: formattedPhone,
      code: autoMemberCode,
      initialPin,
      joinDate: joinISO,
      whatsapp: waDigits,
      nid: nid.trim(),
      address: address.trim() || l('Address not provided', 'ঠিকানা দেওয়া হয়নি'),
      nomineeName: nomineeName.trim() || l('Nominee not provided', 'নমিনি দেওয়া হয়নি'),
      nomineeRelation: nomineeRelation.trim() || l('Relation not specified', 'সম্পর্ক দেওয়া হয়নি'),
      nomineePhone: nomineePhone.trim(),
      monthlyAmount: cleanMonthly,
      admissionFee: cleanFee,
    });

    if(REMOTE && photoUri) {
      try { await api.uploadMemberProfilePhoto(newMember.id,photoUri);await useSomitiStore.getState().syncFromServer(); }
      catch(e:any) { Alert.alert(l('Member saved; photo upload failed','সদস্য সংরক্ষিত; ছবি আপলোড হয়নি'),e.message); }
    } else if(photoUri) { useSomitiStore.getState().updateMember(newMember.id,{photoUri}); }
    setTemporaryPin(initialPin);
    setCreatedMember(newMember);
    setShowSuccessModal(true);
    } catch(e:any) { Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message); } finally {setSaving(false);}
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/members')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{l('New Member', 'নতুন সদস্য')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Upload Row (Page 6 Design: horizontal avatar + copy) */}
        <View style={styles.photoRow}>
          <TouchableOpacity
            testID="photo-upload-circle"
            style={styles.photoCircle}
            onPress={handlePickPhoto}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImg} />
            ) : (
              <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
          <View style={styles.photoTextContainer}>
            <Text style={styles.photoTitle}>{l('Member Photo', 'সদস্যের ছবি')}</Text>
            <Text style={styles.photoSub}>
              {l('Gallery · JPEG, PNG or WebP · Max 120 KB (optional)', 'গ্যালারি · JPEG, PNG বা WebP · সর্বোচ্চ ১২০ KB (ঐচ্ছিক)')}
            </Text>
          </View>
        </View>

        {/* 1. ব্যক্তিগত তথ্য */}
        <Text style={styles.sectionTitle}>{l('Personal Information', 'ব্যক্তিগত তথ্য')}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('Full Name *', 'পূর্ণ নাম *')}</Text>
          <TextInput
            testID="input-member-name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={l('e.g. Md. Abdul Karim', 'যেমন: মোঃ আব্দুল করিম')}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('Member ID', 'সদস্য আইডি')}</Text>
          <View style={styles.readonlyIdContainer}>
            <Text style={styles.readonlyIdText}>{autoMemberCode}</Text>
          </View>
          <Text style={styles.helperHint}>{l('Auto-generated', 'স্বয়ংক্রিয়ভাবে তৈরি')}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('National ID Number *', 'জাতীয় পরিচয়পত্র নম্বর *')}</Text>
          <TextInput
            style={styles.input}
            value={nid}
            onChangeText={(t) => setNid(toEnglishDigits(t).replace(/\D/g, ''))}
            placeholder={l('10 or 17 digits', '১০ বা ১৭ সংখ্যা')}
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.helperHint}>{l('Number only; NID photos are not collected.', 'শুধু নম্বর; NID-এর ছবি নেওয়া হয় না।')}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('Date of Birth', 'জন্মতারিখ')}</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              testID="input-member-dob"
              style={styles.inputWithIconText}
              value={dob}
              onChangeText={setDob}
              placeholder={l('DD/MM/YYYY', 'দিন/মাস/বছর')}
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              testID="btn-dob-calendar"
              style={styles.calendarIconBtn}
              onPress={() => openDatePicker('dob')}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. যোগাযোগ */}
        <Text style={styles.sectionTitle}>{l('Contact Details', 'যোগাযোগ')}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('Mobile Number *', 'মোবাইল নম্বর *')}</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.phonePrefixText}>{isBengali ? '+৮৮০' : '+880'}</Text>
            <TextInput
              testID="input-member-phone"
              style={styles.phoneInput}
              value={isBengali ? toBengaliDigits(phone) : phone}
              onChangeText={handlePhoneChange}
              placeholder={isBengali ? '১৭১XX XXXXXX' : '17XX XXXXXX'}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <Checkbox
          checked={sameAsPhone}
          onPress={() => setSameAsPhone(!sameAsPhone)}
          label={l('WhatsApp number is same', 'হোয়াটসঅ্যাপ নম্বর একই')}
          style={styles.checkboxWrapper}
        />

        {!sameAsPhone && (
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>{l('WhatsApp Number *', 'হোয়াটসঅ্যাপ নম্বর *')}</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.phonePrefixText}>{isBengali ? '+৮৮০' : '+880'}</Text>
              <TextInput
                testID="input-member-whatsapp"
                style={styles.phoneInput}
                value={isBengali ? toBengaliDigits(whatsappPhone) : whatsappPhone}
                onChangeText={handleWaChange}
                placeholder={isBengali ? '১৭১XX XXXXXX' : '17XX XXXXXX'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('Address *', 'ঠিকানা *')}</Text>
          <TextInput
            testID="input-member-address"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder={l('Village/Area, Upazila, District', 'গ্রাম/এলাকা, উপজেলা, জেলা')}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* 3. নমিনি */}
        <Text style={styles.sectionTitle}>{l('Nominee', 'নমিনি')}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('Nominee Name *', 'নমিনির নাম *')}</Text>
          <TextInput
            testID="input-nominee-name"
            style={styles.input}
            value={nomineeName}
            onChangeText={setNomineeName}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.twoColsRow}>
          <View style={[styles.inputGroup, styles.col]}>
            <Text style={styles.fieldLabel}>{l('Relation', 'সম্পর্ক')}</Text>
            <TextInput
              testID="input-nominee-relation"
              style={styles.input}
              value={nomineeRelation}
              onChangeText={setNomineeRelation}
              placeholder={l('e.g. Wife', 'যেমন: স্ত্রী')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={[styles.inputGroup, styles.col]}>
            <Text style={styles.fieldLabel}>{l('Phone', 'ফোন')}</Text>
            <TextInput
              testID="input-nominee-phone"
              style={styles.input}
              value={isBengali ? toBengaliDigits(nomineePhone) : nomineePhone}
              onChangeText={(t) => setNomineePhone(toEnglishDigits(t))}
              placeholder={isBengali ? '০১XXXXXXXXX' : '01XXXXXXXXX'}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* 4. সমিতির তথ্য */}
        <Text style={styles.sectionTitle}>{l('Somiti Details', 'সমিতির তথ্য')}</Text>

        <View style={styles.twoColsRow}>
          <View style={[styles.inputGroup, styles.col]}>
            <Text style={styles.fieldLabel}>{l('Join Date', 'যোগদানের তারিখ')}</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                testID="input-join-date"
                style={styles.inputWithIconText}
                value={formatNum(joinDate)}
                onChangeText={(t) => setJoinDate(toEnglishDigits(t))}
                placeholder="30/09/2026"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                testID="btn-join-date-calendar"
                style={styles.calendarIconBtn}
                onPress={() => openDatePicker('joinDate')}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputGroup, styles.col]}>
            <Text style={styles.fieldLabel}>{l('Monthly Deposit *', 'মাসিক জমা *')}</Text>
            <View style={styles.currencyInputContainer}>
              <Text style={styles.currencyPrefix}>৳</Text>
              <TextInput
                testID="input-monthly-amount"
                style={styles.currencyInput}
                value={getMonthlyDisplay()}
                onFocus={() => setIsMonthlyFocused(true)}
                onBlur={() => setIsMonthlyFocused(false)}
                onChangeText={(t) => setMonthlyAmount(toEnglishDigits(t).replace(/[^\d]/g, ''))}
                placeholder="2000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>{l('Admission Fee', 'ভর্তি ফি')}</Text>
          <View style={styles.currencyInputContainer}>
            <Text style={styles.currencyPrefix}>৳</Text>
            <TextInput
              testID="input-admission-fee"
              style={styles.currencyInput}
              value={getFeeDisplay()}
              onFocus={() => setIsFeeFocused(true)}
              onBlur={() => setIsFeeFocused(false)}
              onChangeText={(t) => setAdmissionFee(toEnglishDigits(t).replace(/[^\d]/g, ''))}
              placeholder="500"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoBoxText}>
            {l(
              'Monthly deposit amount can be modified later from member profile. History will be preserved.',
              'মাসিক জমার পরিমাণ পরে সদস্যের প্রোফাইল থেকে পরিবর্তন করা যাবে। পরিবর্তনের ইতিহাস সংরক্ষিত থাকবে।'
            )}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <StickyCTA backgroundColor={colors.bg}>
        <TouchableOpacity
          testID="submit-new-member-btn"
          style={styles.submitBtn}
          onPress={handleSubmit} disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color={colors.textWhite} />
          <Text style={styles.submitBtnText}>{l('Add Member', 'সদস্য যোগ করুন')}</Text>
        </TouchableOpacity>
      </StickyCTA>

      {/* Date Picker Modal */}
      <AppModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerHeader}>
          <View style={styles.datePickerTitleRow}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.datePickerTitle}>
              {datePickerTarget === 'dob'
                ? l('Select Date of Birth', 'জন্মতারিখ নির্বাচন করুন')
                : l('Select Join Date', 'যোগদানের তারিখ নির্বাচন করুন')}
            </Text>
          </View>
          <TouchableOpacity
            testID="btn-close-datepicker"
            onPress={() => setShowDatePicker(false)}
            style={styles.datePickerCloseBtn}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Selected Date Preview Banner */}
        <View style={styles.datePreviewBox}>
          <Text style={styles.datePreviewLabel}>
            {l('Selected Date', 'নির্বাচিত তারিখ')}
          </Text>
          <Text style={styles.datePreviewVal}>
            {isBengali
              ? `${toBengaliDigits(pickerDay)} ${MONTH_NAMES_BN[pickerMonth - 1]} ${toBengaliDigits(pickerYear)}`
              : `${pickerDay} ${MONTH_NAMES_EN[pickerMonth - 1]} ${pickerYear}`}
          </Text>
        </View>

        {/* 3 Column Picker */}
        <View style={styles.pickerColumnsRow}>
          {/* Day Column */}
          <View style={styles.pickerCol}>
            <Text style={styles.pickerColHeader}>{l('Day', 'দিন')}</Text>
            <ScrollView
              style={styles.pickerScrollView}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const isSelected = d === pickerDay;
                return (
                  <TouchableOpacity
                    key={`day-${d}`}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => setPickerDay(d)}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                      {isBengali ? toBengaliDigits(d) : d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Month Column */}
          <View style={[styles.pickerCol, { flex: 1.4 }]}>
            <Text style={styles.pickerColHeader}>{l('Month', 'মাস')}</Text>
            <ScrollView
              style={styles.pickerScrollView}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isSelected = m === pickerMonth;
                const mName = isBengali ? MONTH_NAMES_BN[m - 1] : MONTH_NAMES_EN[m - 1];
                return (
                  <TouchableOpacity
                    key={`month-${m}`}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => setPickerMonth(m)}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}
                    >
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Year Column */}
          <View style={styles.pickerCol}>
            <Text style={styles.pickerColHeader}>{l('Year', 'বছর')}</Text>
            <ScrollView
              style={styles.pickerScrollView}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 80 }, (_, i) => 2026 - i).map((y) => {
                const isSelected = y === pickerYear;
                return (
                  <TouchableOpacity
                    key={`year-${y}`}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => setPickerYear(y)}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                      {isBengali ? toBengaliDigits(y) : y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          testID="btn-confirm-datepicker"
          style={styles.datePickerConfirmBtn}
          onPress={handleConfirmDate}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={colors.textWhite} />
          <Text style={styles.datePickerConfirmBtnText}>
            {l('Confirm Date', 'তারিখ নিশ্চিত করুন')}
          </Text>
        </TouchableOpacity>
      </AppModal>

      {/* Success & WhatsApp Share Modal */}
      <AppModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/(admin)/(tabs)/members');
        }}
      >
        <View style={styles.successModalHeader}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={44} color={colors.primary} />
          </View>
          <Text style={styles.successModalTitle}>
            {l('Member Added Successfully!', 'সদস্য যোগ সফল হয়েছে!')}
          </Text>
          <Text style={styles.successModalSub}>
            {createdMember?.name} ({createdMember?.code})
            {temporaryPin ? `\nTemporary PIN: ${temporaryPin}\nপ্রথম login-এ পিন বদলাতে হবে।` : ''}
          </Text>
        </View>

        <TouchableOpacity
          testID="modal-send-whatsapp-btn"
          style={styles.whatsappSendModalBtn}
          onPress={() => {
            if (createdMember) {
              const cleanPhone = createdMember.phone.replace(/[^0-9]/g, '');
              const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
              const text = `আসসালামু আলাইকুম ${createdMember.name}।\nআমানত সমিতিতে আপনাকে স্বাগতম।\n\nআপনার সদস্য আইডি: ${createdMember.code}\nমোবাইল নম্বর: ${createdMember.phone}\nTemporary PIN: ${temporaryPin}\n৭২ ঘণ্টার মধ্যে লগইন করে পিন পরিবর্তন করুন।\n\nআপনার অ্যাপে লগইন করে নিজের সঞ্চয় ও রসিদ দেখতে পারবেন।`;
              Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`);
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.textWhite} />
          <Text style={styles.whatsappSendModalBtnText}>
            {l('Send Login PIN via WhatsApp', 'হোয়াটসঅ্যাপে লগইন তথ্য পাঠান')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="modal-go-to-members-btn"
          style={styles.doneModalBtn}
          onPress={() => {
            setShowSuccessModal(false);
            router.replace('/(admin)/(tabs)/members');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.doneModalBtnText}>
            {l('Go to Member Directory', 'সদস্য তালিকায় যান')}
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.bg,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.title,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoTextContainer: {
    flex: 1,
  },
  photoTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.base,
    color: colors.text,
    marginBottom: 2,
  },
  photoSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.base,
    color: colors.text,
    marginTop: 18,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.subhead,
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    outlineStyle: 'none' as any,
  },
  readonlyIdContainer: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  readonlyIdText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.md,
    color: colors.text,
  },
  helperHint: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputWithIconText: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    outlineStyle: 'none' as any,
  },
  calendarIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  phonePrefixText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.md,
    color: colors.text,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    outlineStyle: 'none' as any,
  },
  checkboxWrapper: {
    marginBottom: 14,
    marginTop: 2,
  },
  twoColsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    outlineStyle: 'none' as any,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  datePickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.base,
    color: colors.text,
  },
  datePickerCloseBtn: {
    padding: 4,
  },
  datePreviewBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  datePreviewLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  datePreviewVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.base,
    color: colors.primary,
  },
  pickerColumnsRow: {
    flexDirection: 'row',
    gap: 8,
    height: 190,
    marginBottom: 16,
  },
  pickerCol: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 6,
  },
  pickerColHeader: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  pickerScrollView: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 3,
  },
  pickerItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  pickerItemText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.caption,
    color: colors.text,
  },
  pickerItemTextSelected: {
    fontFamily: 'HindSiliguri-Bold',
    color: colors.primary,
  },
  datePickerConfirmBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  datePickerConfirmBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.md,
    color: colors.textWhite,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
  },
  infoBoxText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 24,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  submitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.base,
    color: colors.textWhite,
  },
  successModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successModalTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.title,
    color: colors.text,
    textAlign: 'center',
  },
  successModalSub: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.subhead,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  whatsappSendModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.whatsapp,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  whatsappSendModalBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.subhead,
    color: colors.textWhite,
  },
  doneModalBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  doneModalBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
});
