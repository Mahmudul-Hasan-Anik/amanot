import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { bnDate } from '../../src/lib/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function NoticesScreen() {
  const router = useRouter();
  const { l } = useLanguage();
  const { notices, addNotice, deleteNotice } = useSomitiStore();
  const { actualRole } = useAuthStore();
  const canPost = actualRole === 'super_admin' || actualRole === 'admin';

  const [saving,setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handlePost = async () => {
    if(saving)return;
    if (!title.trim()) {
      Alert.alert(l('Title needed', 'শিরোনাম দিন'), l('Please write a notice title.', 'নোটিশের শিরোনাম লিখুন।'));
      return;
    }
    setSaving(true);
    try { await addNotice(title.trim(), body.trim()); setTitle('');setBody(''); }
    catch(e:any){Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
    finally {setSaving(false);}
  };

  const handleDelete = (id: string, t: string) => {
    Alert.alert(l('Delete notice?', 'নোটিশ মুছবেন?'), t, [
      { text: l('Cancel', 'বাতিল'), style: 'cancel' },
      { text: l('Delete', 'মুছুন'), style: 'destructive', onPress: async () => {try {await deleteNotice(id);}catch(e:any){Alert.alert(l('Delete failed','মুছতে ব্যর্থ'),e.message);}} },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack(router, '/(admin)/(tabs)/more')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Meetings & Notices', 'সভা ও নোটিশ')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {canPost && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{l('Post a notice', 'নতুন নোটিশ')}</Text>
            <Text style={styles.cardSub}>
              {l('All members will see this on their home screen.', 'সব সদস্য তাদের হোম স্ক্রিনে এটি দেখবেন।')}
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={l('Title, e.g. General meeting on 10th', 'শিরোনাম, যেমন: ১০ তারিখ সাধারণ সভা')}
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder={l('Details (optional)', 'বিস্তারিত (ঐচ্ছিক)')}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <TouchableOpacity style={styles.postBtn} onPress={handlePost} activeOpacity={0.85}>
              <Ionicons name="megaphone-outline" size={18} color={colors.textWhite} />
              <Text style={styles.postBtnText}>{l('Publish Notice', 'নোটিশ প্রকাশ করুন')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>{l('Published notices', 'প্রকাশিত নোটিশ')}</Text>
        {notices.length === 0 && (
          <Text style={styles.empty}>{l('No notices yet.', 'এখনো কোনো নোটিশ নেই।')}</Text>
        )}
        {notices.map((n) => (
          <View key={n.id} style={styles.noticeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>{n.title}</Text>
              {!!n.body && <Text style={styles.noticeBody}>{n.body}</Text>}
              <Text style={styles.noticeMeta}>
                {bnDate(n.createdAt)}
                {n.createdBy ? ` · ${n.createdBy}` : ''}
              </Text>
            </View>
            {canPost && (
              <TouchableOpacity onPress={() => handleDelete(n.id, n.title)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.warning} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: 'HindSiliguri-Bold', fontSize: typography.size.title, color: colors.text },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 20 },
  cardTitle: { fontFamily: 'HindSiliguri-Bold', fontSize: typography.size.base, color: colors.text },
  cardSub: { fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
  },
  postBtnText: { fontFamily: 'HindSiliguri-SemiBold', fontSize: typography.size.md, color: colors.textWhite },
  sectionTitle: { fontFamily: 'HindSiliguri-SemiBold', fontSize: typography.size.subhead, color: colors.textSecondary, marginBottom: 8 },
  empty: { fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.subhead, color: colors.textSecondary, paddingVertical: 12 },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  noticeTitle: { fontFamily: 'HindSiliguri-Bold', fontSize: typography.size.md, color: colors.text },
  noticeBody: { fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.subhead, color: colors.text, marginTop: 4 },
  noticeMeta: { fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.caption, color: colors.textSecondary, marginTop: 6 },
  deleteBtn: { padding: 6, marginLeft: 8 },
});
