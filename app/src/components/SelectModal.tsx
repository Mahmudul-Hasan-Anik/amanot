import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useLanguage } from '../i18n/useLanguage';

interface SelectModalProps {
  visible: boolean;
  title: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SelectModal({ visible, title, value, options, onSelect, onClose }: SelectModalProps) {
  const { l } = useLanguage();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={l('Close selection', 'নির্বাচন বন্ধ করুন')} />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel={l('Close', 'বন্ধ করুন')}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {options.map(option => (
              <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: option.value === value }}
                style={[styles.option, option.value === value && styles.selected]}
                onPress={() => { onSelect(option.value); onClose(); }}>
                <Text style={[styles.label, option.value === value && styles.selectedLabel]}>{option.label}</Text>
                {option.value === value && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  panel: { width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: colors.surface, borderRadius: 20, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1, fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, color: colors.text },
  close: { padding: 10 },
  list: { flexShrink: 1 },
  option: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selected: { backgroundColor: colors.primarySoft },
  label: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, color: colors.text },
  selectedLabel: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
});
