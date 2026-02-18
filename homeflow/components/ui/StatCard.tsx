import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import {
  COLORS,
  SHADOWS,
  ANIMATION,
  TYPOGRAPHY,
  SIZING,
  RADII,
  BORDERS,
  getGradientForColor,
} from '@/constants/design-tokens';

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  index: number;
  animationBaseDelay?: number;
}

export function StatCard({
  label,
  value,
  icon,
  color,
  index,
  animationBaseDelay = 0,
}: StatCardProps) {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = animationBaseDelay + index * ANIMATION.fastStaggerDelay;
    translateY.value = withDelay(
      delay,
      withSpring(0, ANIMATION.springBouncy),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const gradient = getGradientForColor(color);

  return (
    <Animated.View style={[styles.card, SHADOWS.card, cardStyle]}>
      <LinearGradient
        colors={[...gradient] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconCircle}
      >
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </LinearGradient>
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.card,
    padding: 16,
    borderWidth: BORDERS.card,
    borderColor: COLORS.borderCard,
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  content: {
    alignItems: 'center',
  },
  value: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
