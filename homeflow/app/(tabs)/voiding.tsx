import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, Pressable, useColorScheme, SectionList, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {fetchSessions, ThroneSession} from '@/src/services/throneFirestore';

type DateRange = '1d' | '1w' | '1m';

const RANGE_LABELS: Record<DateRange, string> = {
  '1d': 'Day',
  '1w': 'Week',
  '1m': 'Month',
};

function getDateRange(range: DateRange): {startDate: Date; endDate: Date} {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case '1d':
      // today only
      break;
    case '1w':
      start.setDate(start.getDate() - 6);
      break;
    case '1m':
      start.setMonth(start.getMonth() - 1);
      break;
  }

  return {startDate: start, endDate: end};
}

function groupByDay(sessions: ThroneSession[]): {title: string; date: string; data: ThroneSession[]}[] {
  const groups: Record<string, ThroneSession[]> = {};

  for (const s of sessions) {
    const d = new Date(s.startTs);
    const key = d.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  // Sort days descending
  return Object.entries(groups)
    .sort(([, a], [, b]) => new Date(b[0].startTs).getTime() - new Date(a[0].startTs).getTime())
    .map(([title, data]) => ({title, date: title, data}));
}

export default function VoidingScreen() {
  const isDark = useColorScheme() === 'dark';
  const [sessions, setSessions] = useState<ThroneSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>('1m');

  const loadSessions = useCallback(async (r: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const {startDate, endDate} = getDateRange(r);
      const data = await fetchSessions({startDate, endDate});
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSessions(range).then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [range, loadSessions]);

  const sections = useMemo(() => groupByDay(sessions), [sessions]);

  const bg = isDark ? '#000000' : '#F2F2F7';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#EBEBF599' : '#3C3C4399';
  const accent = isDark ? '#0A84FF' : '#007AFF';
  const pillBg = isDark ? '#1C1C1E' : '#E5E5EA';
  const pillActiveBg = accent;

  const totalVoids = sessions.length;

  if (error && sessions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: bg}]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={[styles.title, {color: textPrimary}]}>Voiding</Text>
          <Text style={[styles.subtitle, {color: textSecondary}]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: bg}]} edges={['top']}>
      <Text style={[styles.header, {color: textPrimary}]}>Voiding</Text>

      {/* Date range selector */}
      <View style={styles.rangeRow}>
        {(['1d', '1w', '1m'] as DateRange[]).map((r) => (
          <Pressable
            key={r}
            style={[
              styles.rangePill,
              {backgroundColor: range === r ? pillActiveBg : pillBg},
            ]}
            onPress={() => setRange(r)}
          >
            <Text
              style={[
                styles.rangePillText,
                {color: range === r ? '#FFFFFF' : textPrimary},
              ]}
            >
              {RANGE_LABELS[r]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryText, {color: textSecondary}]}>
          {totalVoids} void{totalVoids !== 1 ? 's' : ''} in {sections.length} day{sections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.subtitle, {color: textSecondary, marginTop: 12}]}>
            Loading sessions...
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.subtitle, {color: textSecondary}]}>
            No sessions found for this period.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({section}) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: textPrimary}]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionCount, {color: textSecondary}]}>
                {section.data.length} void{section.data.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          renderItem={({item}) => (
            <Pressable
              style={[styles.card, {backgroundColor: cardBg}]}
              onPress={() => router.push({pathname: '/throne-session', params: {id: item.id}})}
            >
              <View style={styles.cardRow}>
                <Text style={[styles.cardTime, {color: textPrimary}]}>
                  {new Date(item.startTs).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })}
                </Text>
                <Text style={[styles.cardStatus, {
                  color: item.status === 'DONE' ? '#34C759' : textSecondary,
                }]}>
                  {item.status}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={[styles.cardMetrics, {color: textSecondary}]}>
                  {item.metricCount} metrics
                </Text>
                {item.endTs && item.startTs && (
                  <Text style={[styles.cardMetrics, {color: textSecondary}]}>
                    {formatDuration(item.startTs, item.endTs)}
                  </Text>
                )}
              </View>
              {item.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {item.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, {backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7'}]}>
                      <Text style={[styles.tagText, {color: textSecondary}]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function formatDuration(startTs: string, endTs: string): string {
  const ms = new Date(endTs).getTime() - new Date(startTs).getTime();
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  rangeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  rangePill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  rangePillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardMetrics: {
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
