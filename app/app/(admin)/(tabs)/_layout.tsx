import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { NewEntrySheet } from '../../../src/components/NewEntrySheet';

export default function TabLayout() {
  const { l } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const [sheet, setSheet] = useState(false);

  const renderIcon = (name: keyof typeof Ionicons.glyphMap, nameOutline: keyof typeof Ionicons.glyphMap, focused: boolean, color: any) => (
    <View style={focused ? styles.activePill : styles.inactivePill}>
      <Ionicons name={focused ? name : nameOutline} size={20} color={focused ? colors.primary : color} />
    </View>
  );

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: ({ children, style, onPress, onLongPress, accessibilityLabel, accessibilityState, 'aria-selected': selected, testID }) => (
          <Pressable
            style={style}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ ...accessibilityState, selected: selected === true }}
            testID={testID}
          >{children}</Pressable>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'HindSiliguri-Medium',
          fontSize: typography.size.caption,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: l('Home', 'হোম'),
          tabBarIcon: ({ color, focused }) => renderIcon('home', 'home-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: l('Members', 'সদস্য'),
          tabBarIcon: ({ color, focused }) => renderIcon('people', 'people-outline', focused, color),
        }}
      />
      {/* Savings are voluntary: the monthly collection tab is replaced by the New entry button. */}
      <Tabs.Screen name="collection" options={{ href: null }} />
      <Tabs.Screen
        name="new"
        options={{
          title: l('New', 'নতুন'),
          tabBarAccessibilityLabel: l('New entry', 'নতুন এন্ট্রি'),
          tabBarButton: ({ style }) => (
            <Pressable style={[style, styles.plusWrap]} onPress={() => setSheet(true)} accessibilityRole="button" accessibilityLabel={l('New entry', 'নতুন এন্ট্রি')} testID="tab-new-entry">
              <View style={styles.plus}><Ionicons name="add" size={28} color={colors.textWhite} /></View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: l('Investments', 'বিনিয়োগ'),
          tabBarIcon: ({ color, focused }) => renderIcon('business', 'business-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: l('More', 'আরও'),
          tabBarIcon: ({ color, focused }) => renderIcon('grid', 'grid-outline', focused, color),
        }}
      />
    </Tabs>
    <NewEntrySheet visible={sheet} onClose={() => setSheet(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  plusWrap: { alignItems: 'center', justifyContent: 'center' },
  plus: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: -14, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  activePill: {
    backgroundColor: colors.primarySoft,
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactivePill: {
    width: 48,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
