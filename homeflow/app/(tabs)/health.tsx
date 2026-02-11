import React from 'react';
import {
  StyleSheet,
  useColorScheme,
  Platform,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHealthSummary } from '@/hooks/use-health-summary';
import { SleepSection } from '@/components/health/SleepSection';
import { ActivitySection } from '@/components/health/ActivitySection';
import { VitalsSection } from '@/components/health/VitalsSection';

export default function HealthScreen() {
  const isDark = useColorScheme() === 'dark';

  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            Health data is available on iPhone
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <HealthContent />;
}

function HealthContent() {
  const isDark = useColorScheme() === 'dark';
  const { summary, isLoading, error } = useHealthSummary();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isDark ? '#98989D' : '#8E8E93'} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            No health data available yet. Wear your Apple Watch today and check back later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.dateLabel, isDark && styles.dateLabelDark]}>
          {summary.dateLabel}
        </Text>
        <Text style={[styles.greeting, isDark && styles.greetingDark]}>
          {summary.greeting}
        </Text>

        <View style={styles.spacerLarge} />

        {summary.sleep && <SleepSection insight={summary.sleep} />}

        <View style={styles.spacerMedium} />

        {summary.activity && <ActivitySection insight={summary.activity} />}

        <View style={styles.spacerMedium} />

        {summary.vitals && <VitalsSection insight={summary.vitals} />}

        <View style={styles.spacerBottom} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F8',
  },
  containerDark: {
    backgroundColor: '#0A0E1A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: '#7A7F8E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  dateLabelDark: {
    color: '#8B92A8',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
    marginTop: 4,
  },
  greetingDark: {
    color: '#C8D6E5',
  },
  emptyText: {
    fontSize: 16,
    color: '#7A7F8E',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyTextDark: {
    color: '#8B92A8',
  },
  spacerLarge: {
    height: 24,
  },
  spacerMedium: {
    height: 16,
  },
  spacerBottom: {
    height: 32,
  },
});
