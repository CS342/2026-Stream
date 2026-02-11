import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ActivityInsight } from '@/lib/services/health-summary';

interface ActivitySectionProps {
  insight: ActivityInsight;
}

export function ActivitySection({ insight }: ActivitySectionProps) {
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
          <IconSymbol name="figure.walk" size={16} color={isDark ? '#8CBCAA' : '#5A9E87'} />
          <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>Activity</Text>
        </View>
        <IconSymbol
          name="chevron.right"
          size={14}
          color={isDark ? '#5E7A70' : '#8E8E93'}
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
          <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
            Steps: {insight.steps.toLocaleString()}
          </Text>
          <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
            Energy burned: {Math.round(insight.energyBurned)} kcal
          </Text>
          <Text style={[styles.detailRow, isDark && styles.detailRowDark]}>
            Distance: {(insight.distance / 1000).toFixed(1)} km
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ECF4F0',
    borderRadius: 16,
    padding: 20,
  },
  cardDark: {
    backgroundColor: '#0F1E1A',
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
    color: '#5A9E87',
    fontWeight: '500',
  },
  sectionLabelDark: {
    color: '#8CBCAA',
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2A3E36',
    fontFamily: 'Georgia',
    marginBottom: 4,
  },
  headlineDark: {
    color: '#CDDDD6',
  },
  supporting: {
    fontSize: 16,
    color: '#5E7A70',
    lineHeight: 22,
  },
  supportingDark: {
    color: '#8EAAA0',
  },
  details: {
    marginTop: 16,
  },
  detailRow: {
    fontSize: 15,
    color: '#5E7A70',
    marginTop: 8,
  },
  detailRowDark: {
    color: '#8EAAA0',
  },
});
