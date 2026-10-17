import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  title?: string;
}

export function AppModal({ visible, onClose, children, contentContainerStyle }: AppModalProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <SafeAreaView style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.contentCard, contentContainerStyle]} accessibilityViewIsModal>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
        </ScrollView>
      </View>
    </SafeAreaView>
    </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
    elevation: 20,
  },
  contentCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    zIndex: 10000,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
});
