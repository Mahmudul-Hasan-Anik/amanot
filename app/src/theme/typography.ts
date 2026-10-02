import { TextStyle } from 'react-native';

export const typography = {
  fontFamily: {
    regular: 'HindSiliguri-Regular',
    medium: 'HindSiliguri-Medium',
    semiBold: 'HindSiliguri-SemiBold',
    bold: 'HindSiliguri-Bold',
  },
  // Canonical Display Amount token for all large ৳ totals (Home hero, Member total, Deposit, etc.)
  displayAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  } as TextStyle,
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    hero: 32,
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 32,
    hero: 38,
  }
};

export const textStyles: Record<string, TextStyle> = {
  heroAmount: {
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  screenTitle: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: '600',
    color: '#1E293B',
  },
  body: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '400',
    color: '#1E293B',
  },
  bodyMuted: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '400',
    color: '#64748B',
  },
  badge: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: '600',
  },
  button: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
    textAlign: 'center',
  },
};
