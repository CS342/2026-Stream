import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';

interface DurationBarProps {
  fill: number;
  valueLabel: string;
  baselineLabel: string;
}

export function DurationBar({ fill, valueLabel, baselineLabel }: DurationBarProps) {
  const isDark = useColorScheme() === 'dark';
  const clampedFill = Math.max(0, Math.min(fill, 1));

  return (
    <View style={styles.container}>
      <View style={[styles.track, isDark && styles.trackDark]}>
        <View
          style={[
            styles.fill,
            isDark && styles.fillDark,
            { width: `${clampedFill * 100}%` },
          ]}
        />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.label, isDark && styles.labelDark]}>{valueLabel}</Text>
        <Text style={[styles.label, isDark && styles.labelDark]}>{baselineLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  track: {
    height: 8,
    backgroundColor: '#D8D8E4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackDark: {
    backgroundColor: '#1E2236',
  },
  fill: {
    height: 8,
    backgroundColor: '#7B8CDE',
    borderRadius: 4,
  },
  fillDark: {
    backgroundColor: '#6878C0',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 14,
    color: '#6E7286',
  },
  labelDark: {
    color: '#8B92A8',
  },
});
