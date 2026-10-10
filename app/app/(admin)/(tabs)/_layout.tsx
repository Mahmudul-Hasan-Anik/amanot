import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { useLanguage } from '../../../src/i18n/useLanguage';

export default function TabLayout() {
  const { l } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const renderIcon = (name: keyof typeof Ionicons.glyphMap, nameOutline: keyof typeof Ionicons.glyphMap, focused: boolean, color: any) => (
    <View style={focused ? styles.activePill : styles.inactivePill}>
      <Ionicons name={focused ? name : nameOutline} size={20} color={focused ? colors.primary : color} />
    </View>
  );

  return (
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
      <Tabs.Screen
        name="collection"
        options={{
          title: l('Collection', 'আদায়'),
          tabBarIcon: ({ color, focused }) => renderIcon('wallet', 'wallet-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: l('Projects', 'প্রজেক্ট'),
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
  );
}

const styles = StyleSheet.create({
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
