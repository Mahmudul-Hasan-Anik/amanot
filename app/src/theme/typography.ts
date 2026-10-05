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
    tiny: 10,
    xs: 11,
    caption: 12,
    sm: 13,
    subhead: 14,
    md: 15,
    base: 16,
    lg: 17,
    title: 18,
    xl: 20,
    otp: 22,
    xxl: 24,
    headline: 28,
    hero: 32,
    logo: 34,
  },
  lineHeight: {
    tiny: 14,
    xs: 16,
    caption: 16,
    sm: 18,
    subhead: 20,
    md: 22,
    base: 24,
    lg: 24,
    title: 26,
    xl: 28,
    otp: 28,
    xxl: 32,
    headline: 34,
    hero: 38,
    logo: 40,
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
