import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface IconTileProps {
  iconName: keyof typeof Ionicons.glyphMap;
  size?: number;
  iconSize?: number;
  bgColor?: string;
  iconColor?: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const IconTile: React.FC<IconTileProps> = ({
  iconName,
  size = 40,
  iconSize = 20,
  bgColor = colors.surfaceMuted,
  iconColor = colors.primary,
  borderRadius = 12,
  style,
}) => {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
