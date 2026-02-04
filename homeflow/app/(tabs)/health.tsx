import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  useColorScheme,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HealthKitProvider,
  HealthView,
  ExpoGoFallback,
  defaultLightHealthTheme,
  defaultDarkHealthTheme,
  HealthKitService,
  getDateRange,
  getDailyActivity,
  getSleep,
  getVitals,
  type DailyActivityResult,
  type SleepResult,
  type VitalsResult,
  type PermissionResult,
} from '@spezivibe/healthkit';
import { healthKitConfig, ALL_HEALTH_TYPES } from '@/lib/healthkit-config';

/**
 * Debug panel for testing HealthKit integration
 */
function DebugPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [permissionResult, setPermissionResult] = useState<PermissionResult | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityResult | null>(null);
  const [sleepData, setSleepData] = useState<SleepResult | null>(null);
  const [vitalsData, setVitalsData] = useState<VitalsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'sleep' | 'vitals'>('activity');

  const handleRequestPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await HealthKitService.requestAuthorizationWithStatus(
        [...healthKitConfig.collect, ...(healthKitConfig.readOnly ?? [])],
        healthKitConfig.collect
      );
      setPermissionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission request failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFetchData = useCallback(async (days: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const range = getDateRange(days);

      // Fetch all data types in parallel
      const [activity, sleep, vitals] = await Promise.all([
        getDailyActivity(range),
        getSleep(range),
        getVitals(range),
      ]);

      setActivityData(activity);
      setSleepData(sleep);
      setVitalsData(vitals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Data fetch failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.debugPanel}>
      <Text style={[styles.debugTitle, isDark && styles.textDark]}>
        HealthKit Debug Panel
      </Text>

      {/* Permission Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleRequestPermissions}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Requesting...' : 'Request Permissions'}
          </Text>
        </TouchableOpacity>

        {permissionResult && (
          <View style={[styles.resultBox, isDark && styles.resultBoxDark]}>
            <Text style={[styles.resultLabel, isDark && styles.textDark]}>
              Status: {permissionResult.ok ? 'Success' : 'Failed'}
            </Text>
            {permissionResult.granted.length > 0 && (
              <Text style={[styles.resultText, styles.grantedText]}>
                Granted: {permissionResult.granted.length} types
              </Text>
            )}
            {permissionResult.denied.length > 0 && (
              <Text style={[styles.resultText, styles.deniedText]}>
                Denied: {permissionResult.denied.length} types
              </Text>
            )}
            <Text style={[styles.resultNote, isDark && styles.textMutedDark]}>
              Note: Read permissions always show as undetermined for privacy
            </Text>
          </View>
        )}
      </View>

      {/* Fetch Data Section */}
      <View style={styles.section}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleFetchData(7)}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Fetch 7 Days</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleFetchData(30)}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Fetch 30 Days</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Data Tabs */}
      {(activityData || sleepData || vitalsData) && (
        <View style={styles.section}>
          <View style={styles.tabBar}>
            {(['activity', 'sleep', 'vitals'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.dataContainer} nestedScrollEnabled>
            {activeTab === 'activity' && activityData && (
              <ActivityDataView data={activityData} isDark={isDark} />
            )}
            {activeTab === 'sleep' && sleepData && (
              <SleepDataView data={sleepData} isDark={isDark} />
            )}
            {activeTab === 'vitals' && vitalsData && (
              <VitalsDataView data={vitalsData} isDark={isDark} />
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ActivityDataView({ data, isDark }: { data: DailyActivityResult; isDark: boolean }) {
  return (
    <View>
      {data.days.map((day) => (
        <View key={day.date} style={[styles.dayCard, isDark && styles.dayCardDark]}>
          <Text style={[styles.dateText, isDark && styles.textDark]}>{day.date}</Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Steps: {day.steps.toLocaleString()}
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Exercise: {day.exerciseMinutes} min
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Move: {day.moveMinutes} min
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Stand: {day.standMinutes} min
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Sedentary: ~{day.sedentaryMinutes} min (est.)
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Energy: {day.activeEnergyBurned} kcal
          </Text>
        </View>
      ))}
    </View>
  );
}

function SleepDataView({ data, isDark }: { data: SleepResult; isDark: boolean }) {
  return (
    <View>
      {data.nights.map((night) => (
        <View key={night.date} style={[styles.dayCard, isDark && styles.dayCardDark]}>
          <Text style={[styles.dateText, isDark && styles.textDark]}>
            {night.date} (night)
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Total Asleep: {Math.round(night.totalAsleepMinutes / 60 * 10) / 10}h
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            In Bed: {Math.round(night.totalInBedMinutes / 60 * 10) / 10}h
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Efficiency: {night.sleepEfficiency}%
          </Text>
          {night.hasDetailedStages ? (
            <>
              <Text style={[styles.stageLabel, isDark && styles.textDark]}>Stages:</Text>
              <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
                Awake: {night.stages.awake} min
              </Text>
              <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
                Core: {night.stages.core} min
              </Text>
              <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
                Deep: {night.stages.deep} min
              </Text>
              <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
                REM: {night.stages.rem} min
              </Text>
            </>
          ) : night.stages.asleepUndifferentiated > 0 ? (
            <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
              (Legacy data - stages not available)
            </Text>
          ) : (
            <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
              No sleep data recorded
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function VitalsDataView({ data, isDark }: { data: VitalsResult; isDark: boolean }) {
  return (
    <View>
      {data.days.map((day) => (
        <View key={day.date} style={[styles.dayCard, isDark && styles.dayCardDark]}>
          <Text style={[styles.dateText, isDark && styles.textDark]}>{day.date}</Text>
          {day.heartRate.sampleCount > 0 ? (
            <>
              <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
                HR: {day.heartRate.min}-{day.heartRate.max} bpm (avg {day.heartRate.average})
              </Text>
              <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
                Samples: {day.heartRate.sampleCount}
              </Text>
            </>
          ) : (
            <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
              HR: No data
            </Text>
          )}
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Resting HR: {day.restingHeartRate ?? 'N/A'} bpm
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            HRV: {day.hrv ?? 'N/A'} ms
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            Resp Rate: {day.respiratoryRate ?? 'N/A'} br/min
          </Text>
          <Text style={[styles.dataText, isDark && styles.textMutedDark]}>
            SpO2: {day.oxygenSaturation ? `${day.oxygenSaturation}%` : 'N/A'}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function HealthScreen() {
  const colorScheme = useColorScheme();
  const theme =
    colorScheme === 'dark' ? defaultDarkHealthTheme : defaultLightHealthTheme;
  const [showDebug, setShowDebug] = useState(false);

  // HealthKit is iOS only
  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <HealthView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <HealthKitProvider
        config={healthKitConfig}
        expoGoFallback={<ExpoGoFallback />}
      >
        <ScrollView style={styles.scrollView}>
          {/* Toggle Debug Panel */}
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setShowDebug(!showDebug)}
          >
            <Text style={styles.debugToggleText}>
              {showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
            </Text>
          </TouchableOpacity>

          {showDebug && <DebugPanel />}

          <HealthView showHeader title="Today's Health" />
        </ScrollView>
      </HealthKitProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  debugToggle: {
    backgroundColor: '#007AFF',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugToggleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  debugPanel: {
    margin: 16,
    marginTop: 0,
  },
  debugTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#aaa',
  },
  section: {
    marginBottom: 16,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#34C759',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resultBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  resultBoxDark: {
    backgroundColor: '#1c1c1e',
  },
  resultLabel: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 2,
  },
  grantedText: {
    color: '#34C759',
  },
  deniedText: {
    color: '#FF3B30',
  },
  resultNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
  },
  loader: {
    marginVertical: 16,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dataContainer: {
    maxHeight: 400,
  },
  dayCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dayCardDark: {
    backgroundColor: '#1c1c1e',
  },
  dateText: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 6,
    color: '#000',
  },
  dataText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  stageLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 2,
    color: '#000',
  },
});
