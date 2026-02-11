import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { VitalsInsight } from '@/lib/services/health-summary';

interface VitalsSectionProps {
  insight: VitalsInsight;
}

export function VitalsSection({ insight }: VitalsSectionProps) {
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
          <IconSymbol name="heart.fill" size={16} color={isDark ? '#C4949A' : '#B07178'} />
          <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>Vitals</Text>
        </View>
        <IconSymbol
          name="chevron.right"
          size={14}
          color={isDark ? '#7A5E62' : '#8E8E93'}
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </View>

      <Text style={[styles.headline, isDark && styles.headlineDark]}>
        {insight.headline}
      </Text>
      {insight.supportingText && (
        <Text style={[styles.supporting, isDark && styles.supportingDark]}>
          {insight.supportingText}
        </Text>
      )}

      {expanded && insight.items.length > 0 && (
        <View style={styles.details}>
          {insight.items.map((item, index) => (
            <View key={item.label}>
              {index > 0 && <View style={[styles.divider, isDark && styles.dividerDark]} />}
              <View style={styles.vitalRow}>
                <View style={[styles.dot, isDark && styles.dotDark]} />
                <Text style={[styles.vitalLabel, isDark && styles.vitalLabelDark]}>
                  {item.label}
                </Text>
                <Text style={[styles.vitalValue, isDark && styles.vitalValueDark]}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5EEEF',
    borderRadius: 16,
    padding: 20,
  },
  cardDark: {
    backgroundColor: '#1E1318',
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
    color: '#B07178',
    fontWeight: '500',
  },
  sectionLabelDark: {
    color: '#C4949A',
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3E2C30',
    fontFamily: 'Georgia',
    marginBottom: 4,
  },
  headlineDark: {
    color: '#DDD0D2',
  },
  supporting: {
    fontSize: 16,
    color: '#7A5E62',
    lineHeight: 22,
  },
  supportingDark: {
    color: '#A8868C',
  },
  details: {
    marginTop: 16,
  },
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4949A',
    marginRight: 10,
  },
  dotDark: {
    backgroundColor: '#7A5E62',
  },
  vitalLabel: {
    flex: 1,
    fontSize: 15,
    color: '#7A5E62',
  },
  vitalLabelDark: {
    color: '#A8868C',
  },
  vitalValue: {
    fontSize: 15,
    color: '#3E2C30',
    fontWeight: '500',
  },
  vitalValueDark: {
    color: '#DDD0D2',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDD0D2',
  },
  dividerDark: {
    backgroundColor: '#2E2024',
  },
});
