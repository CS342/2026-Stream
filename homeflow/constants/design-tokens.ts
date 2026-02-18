import { StyleSheet } from 'react-native';

// ─── Color System ────────────────────────────────────────────────────

export const COLORS = {
  // Primary - Stanford Cardinal
  primary: '#8C1515',
  primaryLight: '#B83A4B',
  primaryDark: '#6B0F0F',
  
  // Text
  textDark: '#2D2D44',
  textMuted: '#6B6B85',
  textLight: '#8E8EA8',
  disabledText: '#B0A8C8',
  
  // Backgrounds
  white: '#FFFFFF',
  backgroundLight: '#FFF5F5',
  backgroundLighter: '#FFF9F9',
  inputBackground: '#FFFAFA',
  appBackground: '#FFFBFB',
  appBackgroundAlt: '#FFF8F8',
  
  // Borders
  border: '#F0E0E0',
  borderCard: '#F0E8E8',
  borderCardinal: '#FFE0E0',
  
  // Health/Study Colors
  healthData: '#0EA5E9',
  survey: '#F59E0B',
  progress: '#22C55E',
  
  // Semantic
  accent: '#F59E0B',
  info: '#3B82F6',
  error: '#EF4444',
  successBg: '#D1FAE5',
  successText: '#065F46',
  warningBg: '#FEF3C7',
  warningText: '#D97706',
  
  // Utility
  inputPlaceholder: '#A8A8B8',
  indicatorInactive: '#C8C8D8',
  disabledButton: '#D8D8E8',
  shadow: '#000000',
  whiteOverlay75: 'rgba(255,255,255,0.75)',
  whiteOverlay80: 'rgba(255,255,255,0.8)',
};

// ─── Gradients ───────────────────────────────────────────────────────

export const GRADIENTS = {
  primaryButton: ['#8C1515', '#B83A4B', '#C44A5A'] as const,
  disabledButton: ['#D8D0E8', '#D0C8E0'] as const,
  screenBackground: ['#FFFBFB', '#FFFFFF', '#FFF8FA'] as const,
  headerGradient: ['#8C1515', '#9C2020', '#B83A4B'] as const,
  progressFill: ['#8C1515', '#B83A4B'] as const,
  healthData: ['#0EA5E9', '#38BDF8'] as const,
  survey: ['#F59E0B', '#FBBF24'] as const,
  progress: ['#22C55E', '#4ADE80'] as const,
};

// ─── Shadows ─────────────────────────────────────────────────────────

export const SHADOWS = {
  card: {
    shadowColor: '#2D2D44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSelected: {
    shadowColor: '#8C1515',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    shadowColor: '#8C1515',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  small: {
    shadowColor: '#8C1515',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    shadowColor: '#8C1515',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardLarge: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  iconCircle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
};

// ─── Typography ──────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  display: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1 },
  screenTitle: { fontSize: 38, fontWeight: '800' as const },
  h1: { fontSize: 30, fontWeight: '800' as const },
  sectionTitle: { fontSize: 28, fontWeight: '800' as const },
  emptyTitle: { fontSize: 26, fontWeight: '800' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 22, fontWeight: '700' as const },
  input: { fontSize: 22, fontWeight: '700' as const },
  button: { fontSize: 19, fontWeight: '800' as const },
  bodyLarge: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 18, fontWeight: '600' as const },
  buttonSmall: { fontSize: 18, fontWeight: '700' as const },
  bodyDescription: { fontSize: 17, fontWeight: '500' as const },
  bodySmall: { fontSize: 16, fontWeight: '600' as const },
  labelSmall: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '600' as const },
};

// ─── Sizing ──────────────────────────────────────────────────────────

export const SIZING = {
  iconHero: 56,
  iconPage: 48,
  iconCard: 24,
  iconButton: 20,
  iconNav: 22,
  iconInput: 20,
  circlePage: 80,
  circleCard: 44,
  circleResource: 72,
  circleAvatar: 120,
};

// ─── Spacing ─────────────────────────────────────────────────────────

export const SPACING = {
  screenPadding: 24,
  contentPadding: 20,
  sectionGap: 24,
  itemGap: 14,
  smallGap: 8,
  xs: 4,
};

// ─── Radii ───────────────────────────────────────────────────────────

export const RADII = {
  headerBottom: 32,
  formCard: 24,
  cardLarge: 24,
  userCard: 28,
  card: 20,
  badge: 20,
  button: 16,
  grid: 16,
  input: 14,
  badgeSmall: 10,
};

// ─── Borders ─────────────────────────────────────────────────────────

export const BORDERS = {
  cardLarge: 3,
  cardSelected: 2.5,
  card: 2,
  input: 1.5,
  innerGlow: 1,
};

// ─── Animation ───────────────────────────────────────────────────────

export const ANIMATION = {
  springBouncy: { damping: 20, stiffness: 180 },
  springSmooth: { damping: 22, stiffness: 120 },
  entranceDelay: 80,
  staggerDelay: 100,
  fastStaggerDelay: 50,
};

// ─── Shared Styles ───────────────────────────────────────────────────

export const SHARED_STYLES = StyleSheet.create({
  pageIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

// ─── App Styles ──────────────────────────────────────────────────────

export const APP_STYLES = StyleSheet.create({
  tabHeader: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.borderCard,
    ...SHADOWS.header,
  },
  tabHeaderTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  tabHeaderSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: COLORS.borderCard,
    ...SHADOWS.cardLarge,
  },
  resourceIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    ...SHADOWS.iconCircle,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    ...SHADOWS.card,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 24,
    marginBottom: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
});

// ─── Decorative Shapes ───────────────────────────────────────────────

interface DecorativeShape {
  size: number;
  color: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export const DECORATIVE_SHAPES: Record<string, DecorativeShape[]> = {
  home: [
    { size: 180, color: 'rgba(140,21,21,0.04)', top: -60, right: -40 },
    { size: 120, color: 'rgba(140,21,21,0.03)', bottom: 100, left: -40 },
    { size: 90, color: 'rgba(184,58,75,0.03)', top: 360, right: -20 },
  ],
  screen: [
    { size: 160, color: 'rgba(140,21,21,0.04)', top: -40, left: -50 },
    { size: 100, color: 'rgba(140,21,21,0.03)', bottom: 200, right: -30 },
  ],
};

// ─── Utility Functions ───────────────────────────────────────────────

export function withOpacity(color: string, opacity: number): string {
  const hex = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return color + hex;
}

export function getGradientForColor(color: string): readonly [string, string] {
  switch (color) {
    case COLORS.healthData:
      return GRADIENTS.healthData;
    case COLORS.survey:
      return GRADIENTS.survey;
    case COLORS.progress:
      return GRADIENTS.progress;
    case COLORS.primary:
      return GRADIENTS.primaryButton;
    default:
      return GRADIENTS.primaryButton;
  }
}
