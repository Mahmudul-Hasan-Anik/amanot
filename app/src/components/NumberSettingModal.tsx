import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Input } from './Input';
import { Button } from './Button';
import { useLanguage } from '../i18n/useLanguage';
import { toEnglishDigits } from '../lib/money';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function NumberSettingModal({ title, value, min, max, integer = false, onSave, onClose }: {
  title: string; value: number; min: number; max: number; integer?: boolean;
  onSave: (value: number) => Promise<void>; onClose: () => void;
}) {
  const { l } = useLanguage();
  const [input, setInput] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (busy) return;
    const text = toEnglishDigits(input).trim();
    const parsed = Number(text);
    if (!/^\d+(\.\d{1,2})?$/.test(text) || !Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
      setError(l(`Enter ${integer ? 'a whole number' : 'an amount'} between ${min} and ${max}.`, `${min} থেকে ${max}-এর মধ্যে ${integer ? 'পূর্ণ সংখ্যা' : 'টাকার পরিমাণ'} লিখুন।`));
      return;
    }
    setBusy(true); setError('');
    try { await onSave(parsed); onClose(); }
    catch (e: any) { setError(e?.message || l('Save failed. Try again.', 'সংরক্ষণ ব্যর্থ। আবার চেষ্টা করুন।')); }
    finally { setBusy(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Input accessibilityLabel={title} value={input} onChangeText={setInput} keyboardType={integer ? 'number-pad' : 'decimal-pad'} editable={!busy} error={error} autoFocus />
        <Button title={l('Save', 'সংরক্ষণ করুন')} onPress={save} loading={busy} />
        <Button title={l('Cancel', 'বাতিল')} variant="ghost" onPress={onClose} disabled={busy} />
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.overlay },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 12 },
  title: { color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title },
});
