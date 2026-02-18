import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import {
  COLORS,
  SHADOWS,
  ANIMATION,
  TYPOGRAPHY,
  SIZING,
  SPACING,
  RADII,
  BORDERS,
  withOpacity,
  getGradientForColor,
} from '@/constants/design-tokens';

interface InfoCardProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  index: number;
  badge?: string;
  animationBaseDelay?: number;
}

export function InfoCard({
  title,
  subtitle,
  icon,
  color,
  onPress,
  index,
  badge,
  animationBaseDelay = 0,
}: InfoCardProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = animationBaseDelay + index * ANIMATION.staggerDelay;
    translateY.value = withDelay(
      delay,
      withSpring(0, ANIMATION.springBouncy),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1, ANIMATION.springBouncy),
    );
    onPress();
  };

  const gradient = getGradientForColor(color);

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.card, SHADOWS.card, cardStyle]}>
        <LinearGradient
          colors={[...gradient] as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons name={icon} size={SIZING.iconCard} color={COLORS.white} />
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {badge && (
            <View style={[styles.badge, { backgroundColor: withOpacity(color, 0.1) }]}>
              <Text style={[styles.badgeText, { color }]}>{badge}</Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 20,
    borderWidth: BORDERS.card,
    borderColor: COLORS.borderCard,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.itemGap,
  },
  iconCircle: {
    width: SIZING.circleCard,
    height: SIZING.circleCard,
    borderRadius: SIZING.circleCard / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.body,
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
    lineHeight: 24,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.badgeSmall,
    marginTop: SPACING.xs,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
});
