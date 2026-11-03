import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Alert, Modal, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as api from '../lib/api';
import type { InvestmentDocKind, InvestmentDocument } from '../lib/api';
import { REMOTE } from '../store/somitiStore';
import { useLanguage } from '../i18n/useLanguage';
import { ActionMenu } from './ActionMenu';
import { showToast } from './Toast';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Doc = InvestmentDocument & { localUri?: string };
const KINDS: ReadonlyArray<{ kind: InvestmentDocKind; en: string; bn: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { kind: 'contract', en: 'Contract', bn: 'চুক্তিপত্র', icon: 'document-text-outline' },
  { kind: 'photo', en: 'Site photos', bn: 'সাইটের ছবি', icon: 'image-outline' },
  { kind: 'receipt', en: 'Receipts', bn: 'রসিদ', icon: 'receipt-outline' },
];
// Demo mode keeps documents in memory for the session only.
const demoDocs = new Map<string, Doc[]>();

export function InvestmentDocuments({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { l, formatNum } = useLanguage();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(REMOTE);
  const [error, setError] = useState('');
  const [busyKind, setBusyKind] = useState<InvestmentDocKind | null>(null);
  const [pickFor, setPickFor] = useState<InvestmentDocKind | null>(null);
  const [openKind, setOpenKind] = useState<InvestmentDocKind | null>(null);
  const [viewing, setViewing] = useState<Doc | null>(null);

  const load = useCallback(async () => {
    if (!REMOTE) { setDocs(demoDocs.get(projectId) || []); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const list = await api.fetchInvestmentDocuments(projectId);
      setDocs(list);
      setUrls(await api.signedInvestmentDocUrls(list.map((d) => d.path)));
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const byKind = useMemo(() => {
    const m = new Map<InvestmentDocKind, Doc[]>();
    for (const d of docs) { const k = d.kind === 'other' ? 'receipt' : d.kind; m.set(k, [...(m.get(k) || []), d]); }
    return m;
  }, [docs]);
  const srcOf = (d: Doc) => d.localUri || urls.get(d.path);

  const pick = async (kind: InvestmentDocKind, source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert(l('Camera permission needed', 'ক্যামেরার অনুমতি দরকার'), l('Allow camera access from phone settings.', 'ফোনের সেটিংস থেকে ক্যামেরার অনুমতি দিন।')); return; }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.7 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setBusyKind(kind);
      const id = api.uuid();
      if (!REMOTE) {
        const { contentType, bytes } = await api.readInvestmentDocument(asset.uri);
        const d: Doc = { id, projectId, kind, path: `${projectId}/${id}`, fileName: asset.fileName || '', contentType, size: bytes.byteLength, createdAt: new Date().toISOString(), localUri: asset.uri };
        const next = [d, ...(demoDocs.get(projectId) || [])]; demoDocs.set(projectId, next); setDocs(next);
      } else {
        await api.uploadInvestmentDocument({ id, projectId, kind, uri: asset.uri, fileName: asset.fileName || undefined });
        await load();
      }
      setOpenKind(kind);
      showToast(l('Document added', 'ডকুমেন্ট যোগ হয়েছে'));
    } catch (e: any) {
      Alert.alert(l('Upload failed', 'আপলোড ব্যর্থ'), e?.message || String(e));
    } finally { setBusyKind(null); }
  };

  const remove = (d: Doc) => {
    Alert.alert(l('Remove document?', 'ডকুমেন্ট মুছবেন?'), l('It will be removed from this investment.', 'এটি এই বিনিয়োগ থেকে সরিয়ে দেওয়া হবে।'), [
      { text: l('Cancel', 'বাতিল'), style: 'cancel' },
      { text: l('Remove', 'মুছুন'), style: 'destructive', onPress: async () => {
        try {
          if (REMOTE) await api.removeInvestmentDocument(d.id);
          const next = docs.filter((x) => x.id !== d.id);
          if (!REMOTE) demoDocs.set(projectId, next);
          setDocs(next); setViewing(null);
          showToast(l('Document removed', 'ডকুমেন্ট মুছে ফেলা হয়েছে'));
        } catch (e: any) { Alert.alert(l('Could not remove', 'মোছা যায়নি'), e?.message || String(e)); }
      } },
    ]);
  };

  const open = (d: Doc) => {
    const src = srcOf(d);
    if (d.contentType === 'application/pdf') {
      if (src) Linking.openURL(src).catch(() => Alert.alert(l('Could not open file', 'ফাইল খোলা যায়নি')));
      return;
    }
    setViewing(d);
  };

  return (
    <View>
      <Text style={s.title}>{l('Documents', 'ডকুমেন্ট')}</Text>
      {error ? (
        <Pressable onPress={load} style={s.errorBox}><Text style={s.errorText}>{error}</Text><Text style={s.retry}>{l('Tap to retry', 'আবার চেষ্টা করতে চাপুন')}</Text></Pressable>
      ) : null}
      <View style={s.row}>
        {KINDS.map((k) => {
          const count = byKind.get(k.kind)?.length || 0;
          const active = openKind === k.kind;
          return (
            <Pressable key={k.kind} accessibilityRole="button" style={[s.card, active && s.cardActive]} onPress={() => setOpenKind(active ? null : k.kind)}>
              {busyKind === k.kind ? <ActivityIndicator color={colors.primary} /> : <Ionicons name={k.icon} size={24} color={colors.primary} />}
              <Text style={s.cardText} numberOfLines={1}>{l(k.en, k.bn)} ({loading ? '…' : formatNum(count)})</Text>
            </Pressable>
          );
        })}
      </View>
      {openKind ? (
        <View style={s.panel}>
          <View style={s.grid}>
            {(byKind.get(openKind) || []).map((d) => {
              const src = srcOf(d);
              return (
                <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={d.fileName || l('Document', 'ডকুমেন্ট')} style={s.thumb} onPress={() => open(d)}>
                  {d.contentType === 'application/pdf' ? <View style={s.pdf}><Ionicons name="document-outline" size={28} color={colors.primary} /><Text style={s.pdfText}>PDF</Text></View>
                    : src ? <Image source={{ uri: src }} style={s.img} /> : <ActivityIndicator color={colors.primary} />}
                </Pressable>
              );
            })}
            {canEdit ? (
              <Pressable accessibilityRole="button" style={[s.thumb, s.add]} disabled={!!busyKind} onPress={() => setPickFor(openKind)}>
                <Ionicons name="add" size={28} color={colors.primary} />
                <Text style={s.addText}>{l('Add', 'যোগ করুন')}</Text>
              </Pressable>
            ) : null}
          </View>
          {!(byKind.get(openKind) || []).length && !canEdit ? <Text style={s.muted}>{l('No documents yet', 'এখনো কোনো ডকুমেন্ট নেই')}</Text> : null}
        </View>
      ) : null}

      <ActionMenu visible={!!pickFor} title={l('Add document', 'ডকুমেন্ট যোগ করুন')} onClose={() => setPickFor(null)} actions={[
        { text: l('Take a photo', 'ক্যামেরায় ছবি তুলুন'), onPress: () => { const k = pickFor!; setPickFor(null); pick(k, 'camera'); } },
        { text: l('Choose from gallery', 'গ্যালারি থেকে নিন'), onPress: () => { const k = pickFor!; setPickFor(null); pick(k, 'library'); } },
      ]} />

      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)}>
        <SafeAreaView style={s.viewer}>
          <View style={s.viewerBar}>
            <Pressable accessibilityRole="button" accessibilityLabel={l('Close', 'বন্ধ করুন')} onPress={() => setViewing(null)} style={s.viewerBtn}><Ionicons name="close" size={26} color="#fff" /></Pressable>
            {canEdit && viewing ? <Pressable accessibilityRole="button" onPress={() => remove(viewing)} style={s.viewerBtn}><Ionicons name="trash-outline" size={22} color="#fff" /><Text style={s.viewerBtnText}>{l('Remove', 'মুছুন')}</Text></Pressable> : null}
          </View>
          <ScrollView contentContainerStyle={s.viewerBody} maximumZoomScale={4} minimumZoomScale={1} centerContent>
            {viewing && srcOf(viewing) ? <Image source={{ uri: srcOf(viewing)! }} style={s.full} resizeMode="contain" /> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: typography.fontFamily.bold, fontSize: 18, color: colors.text, marginTop: 24, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, minHeight: 84, backgroundColor: colors.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6, borderWidth: 1, borderColor: colors.border },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardText: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: colors.text },
  panel: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 92, height: 92, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
  pdf: { alignItems: 'center', gap: 4 },
  pdfText: { fontFamily: typography.fontFamily.bold, fontSize: 12, color: colors.primary },
  add: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.surface },
  addText: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: colors.primary },
  muted: { fontFamily: typography.fontFamily.medium, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8 },
  errorBox: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 10 },
  errorText: { fontFamily: typography.fontFamily.medium, color: colors.warning, fontSize: 13 },
  retry: { fontFamily: typography.fontFamily.medium, color: colors.primary, fontSize: 13, marginTop: 6 },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 8 },
  viewerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  viewerBtnText: { color: '#fff', fontFamily: typography.fontFamily.medium },
  viewerBody: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: 600 },
});
