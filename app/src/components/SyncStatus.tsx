import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSomitiStore, REMOTE } from '../store/somitiStore';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function SyncStatus() {
  const { isSyncing, syncError, syncFromServer, lastSyncedAt } = useSomitiStore();
  const { l } = useLanguage();
  const stale = !lastSyncedAt || Date.now()-lastSyncedAt>10*60*1000;
  if (REMOTE && !isSyncing && !syncError && !stale) return null;
  return <View style={{ paddingHorizontal:16, paddingVertical:8, flexDirection:'row', alignItems:'center', gap:8, backgroundColor:colors.surfaceMuted }}>
    {isSyncing && <ActivityIndicator size="small" color={colors.primary} />}
    <Text style={{ flex:1, color:syncError ? colors.danger : colors.textSecondary, fontFamily:typography.fontFamily.regular, fontSize:typography.size.caption }}>
      {!REMOTE ? l('Demo mode · Data stays on this device', 'ডেমো মোড · তথ্য এই ডিভাইসে থাকে') : isSyncing ? l('Syncing…', 'তথ্য আপডেট হচ্ছে…') : lastSyncedAt ? l(`Showing data from ${new Date(lastSyncedAt).toLocaleTimeString()}. Refresh to confirm.`, `${new Date(lastSyncedAt).toLocaleTimeString()}-এর তথ্য দেখানো হচ্ছে। আপডেট করে নিশ্চিত হন।`) : l('Connect to load your account data.', 'অ্যাকাউন্টের তথ্য পেতে ইন্টারনেটে যুক্ত হন।')}
    </Text>
    {(syncError || stale) && !isSyncing && <TouchableOpacity onPress={() => syncFromServer()} accessibilityRole="button"><Text style={{color:colors.primary}}>{l('Refresh', 'আপডেট')}</Text></TouchableOpacity>}
  </View>;
}
