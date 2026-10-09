import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSomitiStore, REMOTE } from '../store/somitiStore';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function SyncStatus() {
  const { isSyncing, syncError, syncFromServer } = useSomitiStore();
  const { l } = useLanguage();
  if (REMOTE && !isSyncing && !syncError) return null;
  return <View style={{ paddingHorizontal:16, paddingVertical:8, flexDirection:'row', alignItems:'center', gap:8, backgroundColor:colors.surfaceMuted }}>
    {isSyncing && <ActivityIndicator size="small" color={colors.primary} />}
    <Text style={{ flex:1, color:syncError ? colors.danger : colors.textSecondary, fontFamily:typography.fontFamily.regular, fontSize:typography.size.caption }}>
      {!REMOTE ? l('Demo mode · Data stays on this device', 'ডেমো মোড · তথ্য এই ডিভাইসে থাকে') : syncError ? l('Could not sync. Showing saved data.', 'সিঙ্ক হয়নি। সংরক্ষিত তথ্য দেখানো হচ্ছে।') : l('Syncing…', 'তথ্য আপডেট হচ্ছে…')}
    </Text>
    {syncError && <TouchableOpacity onPress={() => syncFromServer()} accessibilityRole="button"><Text style={{color:colors.primary}}>{l('Retry', 'আবার চেষ্টা')}</Text></TouchableOpacity>}
  </View>;
}
