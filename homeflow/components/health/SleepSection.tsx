import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DurationBar } from './DurationBar';
import type { SleepInsight } from '@/lib/services/health-summary';

interface SleepSectionProps {
  insight: SleepInsight;
}

export function SleepSection({ insight }: SleepSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const isDark = useColorScheme() === 'dark';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={[styles.card, isDark && styles.cardDark]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="moon.fill" size={16} color={isDark ? '#A0A8D0' : '#7B8CDE'} />
          <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>Sleep</Text>
        </View>
        <IconSymbol
          name="chevron.right"
          size={14}
          color={isDark ? '#6B7394' : '#8E8E93'}
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </View>

      <Text style={[styles.headline, isDark && styles.headlineDark]}>
        {insight.headline}
      </Text>
      <Text style={[styles.supporting, isDark && styles.supportingDark]}>
        {insight.supportingText}
      </Text>

      {expanded && (
        <View style={styles.details}>
          <DurationBar
            fill={insight.barFill}
            valueLabel={`${insight.totalHours}h`}
            baselineLabel={`${insight.baselineHours}h avg`}
          />

          <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
            Sleep efficiency: {insight.efficiency}%
          </Text>

          {insight.stages && (
            <View style={styles.stagesContainer}>
              <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
                Deep: {insight.stages.deep} min
              </Text>
              <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
                Core: {insight.stages.core} min
              </Text>
              <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
                REM: {insight.stages.rem} min
              </Text>
              <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
                Awake: {insight.stages.awake} min
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EEEEF6',
    borderRadius: 16,
    padding: 20,
  },
  cardDark: {
    backgroundColor: '#141828',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#7B8CDE',
    fontWeight: '500',
  },
  sectionLabelDark: {
    color: '#A0A8D0',
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3044',
    fontFamily: 'Georgia',
    marginBottom: 4,
  },
  headlineDark: {
    color: '#D4D8E8',
  },
  supporting: {
    fontSize: 16,
    color: '#6E7286',
    lineHeight: 22,
  },
  supportingDark: {
    color: '#8B92A8',
  },
  details: {
    marginTop: 16,
  },
  detailRow: {
    fontSize: 15,
    color: '#5C6080',
    marginTop: 8,
  },
  detailRowDark: {
    color: '#9CA3BE',
  },
  stagesContainer: {
    marginTop: 4,
  },
});
