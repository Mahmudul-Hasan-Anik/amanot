import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface AvatarProps {
  name: string;
  variant?: 'circle' | 'tile' | 'logo';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  index?: number; // for rotating through avatarPastels
  bgColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  variant = 'circle',
  size = 'md',
  index = 0,
  bgColor,
  textColor,
  style,
}) => {
  const initial = name ? name.trim().charAt(0) : 'স';
  const isLogo = variant === 'tile' || variant === 'logo';

  // Pastel rotation for member avatars
  const pastel = colors.avatarPastels[Math.abs(index) % colors.avatarPastels.length];
  const finalBg = bgColor || (isLogo ? colors.primary : pastel.bg);
  const finalTextColor = textColor || (isLogo ? '#FFFFFF' : pastel.text);

  return (
    <View
      style={[
        styles.base,
        styles[`size_${size}`],
        isLogo ? styles[`tileRadius_${size}`] : styles.circleRadius,
        { backgroundColor: finalBg },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          styles[`textSize_${size}`],
          { color: finalTextColor },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleRadius: {
    borderRadius: 9999,
  },
  tileRadius_sm: {
    borderRadius: 8,
  },
  tileRadius_md: {
    borderRadius: 12,
  },
  tileRadius_lg: {
    borderRadius: 16,
  },
  tileRadius_xl: {
    borderRadius: 20,
  },

  // Sizes
  size_sm: {
    width: 32,
    height: 32,
  },
  size_md: {
    width: 42,
    height: 42,
  },
  size_lg: {
    width: 56,
    height: 56,
  },
  size_xl: {
    width: 72,
    height: 72,
  },

  // Text
  text: {
    fontFamily: 'HindSiliguri-Bold',
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  textSize_sm: {
    fontSize: 14,
  },
  textSize_md: {
    fontSize: 18,
  },
  textSize_lg: {
    fontSize: 24,
  },
  textSize_xl: {
    fontSize: 32,
  },
});
