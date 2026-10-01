import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';

export default function NewMemberScreen() {
  const router = useRouter();

  // Form states matching Page 6
  const [name, setName] = useState('');
  const [memberCode] = useState('SM-101');
  const [nid, setNid] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [address, setAddress] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [nomineePhone, setNomineePhone] = useState('');
  const [joinDate] = useState('৩০/০৯/২০২৬');
  const [monthlyAmount, setMonthlyAmount] = useState('২,০০০');
  const [admissionFee, setAdmissionFee] = useState('৫০০');

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে সদস্যের পূর্ণ নাম লিখুন');
      return;
    }
    Alert.alert(
      'সদস্য যোগ সফল',
      `সদস্য ${name} (SM-101) সফলভাবে যুক্ত হয়েছেন!`,
      [{ text: 'ঠিক আছে', onPress: () => router.replace('/(admin)/(tabs)/members') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>নতুন সদস্য</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Upload Circle */}
        <View style={styles.photoUploadContainer}>
          <TouchableOpacity
            style={styles.photoCircle}
            onPress={() => Alert.alert('ছবি', 'ক্যামেরা বা গ্যালারি থেকে ছবি নির্বাচন করুন')}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={28} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.photoTitle}>সদস্যের ছবি</Text>
          <Text style={styles.photoSub}>ক্যামেরা বা গ্যালারি থেকে (ঐচ্ছিক)</Text>
        </View>

        {/* 1. ব্যক্তিগত তথ্য */}
        <Text style={styles.sectionHeader}>ব্যক্তিগত তথ্য</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>পূর্ণ নাম *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="যেমন: মোঃ আব্দুল করিম"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>সদস্য আইডি</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{memberCode}</Text>
          </View>
          <Text style={styles.hintText}>স্বয়ংক্রিয়ভাবে তৈরি</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>জাতীয় পরিচয়পত্র নম্বর *</Text>
          <TextInput
            style={styles.input}
            value={nid}
            onChangeText={setNid}
            placeholder="১০ বা ১৭ সংখ্যা"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        {/* NID Upload Button */}
        <TouchableOpacity
          style={styles.uploadNidBtn}
          onPress={() => Alert.alert('NID', 'জাতীয় পরিচয়পত্রের ছবি যোগ করুন')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={16} color={colors.textMain} />
          <Text style={styles.uploadNidText}>জাতীয় পরিচয়পত্রের ছবি যোগ করুন</Text>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>জন্মতারিখ</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={styles.inputFlex}
              value={dob}
              onChangeText={setDob}
              placeholder="দিন/মাস/বছর"
              placeholderTextColor={colors.textMuted}
            />
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </View>
        </View>

        {/* 2. যোগাযোগ */}
        <Text style={styles.sectionHeader}>যোগাযোগ</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>মোবাইল নম্বর *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+৮৮০ ১৭XX XXXXXX"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setSameAsPhone(!sameAsPhone)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={sameAsPhone ? 'checkbox' : 'square-outline'}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.checkboxLabel}>হোয়াটসঅ্যাপ নম্বর একই</Text>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ঠিকানা *</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="গ্রাম/এলাকা, উপজেলা, জেলা"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* 3. নমিনি */}
        <Text style={styles.sectionHeader}>নমিনি</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>নমিনির নাম *</Text>
          <TextInput
            style={styles.input}
            value={nomineeName}
            onChangeText={setNomineeName}
          />
        </View>

        <View style={styles.twoColsRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>সম্পর্ক</Text>
            <TextInput
              style={styles.input}
              value={nomineeRelation}
              onChangeText={setNomineeRelation}
              placeholder="যেমন: স্ত্রী"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>ফোন</Text>
            <TextInput
              style={styles.input}
              value={nomineePhone}
              onChangeText={setNomineePhone}
              placeholder="০১XXXXXXXXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* 4. সমিতির তথ্য */}
        <Text style={styles.sectionHeader}>সমিতির তথ্য</Text>

        <View style={styles.twoColsRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>যোগদানের তারিখ</Text>
            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyText}>{joinDate}</Text>
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>মাসিক জমা *</Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.prefixText}>৳</Text>
              <TextInput
                style={styles.prefixInput}
                value={monthlyAmount}
                onChangeText={setMonthlyAmount}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ভর্তি ফি</Text>
          <View style={styles.inputWithPrefix}>
            <Text style={styles.prefixText}>৳</Text>
            <TextInput
              style={styles.prefixInput}
              value={admissionFee}
              onChangeText={setAdmissionFee}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoBoxText}>
            মাসিক জমার পরিমাণ পরে সদস্যের প্রোফাইল থেকে পরিবর্তন করা যাবে। পরিবর্তনের ইতিহাস সংরক্ষিত থাকবে।
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>সদস্য যোগ করুন</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
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
    fontSize: 18,
    color: colors.textMain,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  photoUploadContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: colors.textMain,
  },
  photoSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionHeader: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: colors.textMain,
    marginBottom: 10,
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMain,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: colors.textMain,
  },
  codeBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: colors.textMain,
  },
  hintText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  uploadNidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    marginBottom: 12,
  },
  uploadNidText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMain,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: colors.textMain,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  checkboxLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMain,
  },
  twoColsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  readonlyInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: colors.textMain,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  prefixText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 14,
    color: colors.textMain,
    marginRight: 6,
  },
  prefixInput: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: colors.textMain,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    gap: 6,
    marginVertical: 10,
  },
  infoBoxText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    gap: 6,
    marginTop: 10,
  },
  submitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
