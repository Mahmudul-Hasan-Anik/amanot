import React,{useState} from 'react';
import { Modal, Pressable, FlatList, TextInput, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useLanguage } from '../i18n/useLanguage';
import {toEnglishDigits} from '../lib/money';

interface SelectModalProps {
  visible: boolean;
  title: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string;searchText?:string }>;
  searchable?:boolean;
  searchPlaceholder?:string;
  header?:React.ReactNode;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SelectModal({ visible, title, value, options, onSelect, onClose,searchable=false,searchPlaceholder,header }: SelectModalProps) {
  const { l } = useLanguage();
  const [query,setQuery]=useState('');
  const close=()=>{setQuery('');onClose();};
  const normalized=toEnglishDigits(query).trim().toLowerCase();
  const filtered=searchable&&normalized?options.filter(o=>toEnglishDigits(o.searchText||o.label).toLowerCase().includes(normalized)):options;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={l('Close selection', 'নির্বাচন বন্ধ করুন')} />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable style={styles.close} onPress={close} accessibilityRole="button" accessibilityLabel={l('Close', 'বন্ধ করুন')}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          {searchable&&<TextInput value={query} onChangeText={setQuery} accessibilityLabel={searchPlaceholder||l('Search','খুঁজুন')} placeholder={searchPlaceholder||l('Search','খুঁজুন')} style={styles.search}/>}
          {header}
          <FlatList style={styles.list} data={filtered} keyExtractor={o=>o.value} initialNumToRender={12} windowSize={5} keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.label}>{l('No matches','কোনো ফল পাওয়া যায়নি')}</Text>}
            renderItem={({item:option})=>(
              <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: option.value === value }}
                style={[styles.option, option.value === value && styles.selected]}
                onPress={() => { onSelect(option.value); close(); }}>
                <Text style={[styles.label, option.value === value && styles.selectedLabel]}>{option.label}</Text>
                {option.value === value && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            )}/>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  search:{minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:12,marginBottom:12,color:colors.text,fontFamily:typography.fontFamily.regular},
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
