/**
 * @spezivibe/healthkit
 *
 * Apple HealthKit integration for React Native applications.
 * Provides configurable health metrics collection and display.
 *
 * @example
 * ```tsx
 * import { HealthKitProvider, HealthView, SampleType } from '@spezivibe/healthkit';
 *
 * const config = {
 *   collect: [SampleType.stepCount, SampleType.heartRate],
 *   syncToBackend: false,
 * };
 *
 * function HealthScreen() {
 *   return (
 *     <HealthKitProvider config={config}>
 *       <HealthView />
 *     </HealthKitProvider>
 *   );
 * }
 * ```
 *
 * @example Query activity, sleep, and vitals
 * ```tsx
 * import { getDailyActivity, getSleep, getVitals, getDateRange } from '@spezivibe/healthkit';
 *
 * // Get last 7 days of activity
 * const activity = await getDailyActivity(getDateRange(7));
 *
 * // Get last 7 nights of sleep
 * const sleep = await getSleep(getDateRange(7));
 *
 * // Get last 7 days of vitals
 * const vitals = await getVitals(getDateRange(7));
 * ```
 */

// Types - Core
export type {
  HealthKitConfig,
  HealthSample,
  HealthStatistics,
  HealthQueryOptions,
  AuthorizationStatus,
  HealthTheme,
  HealthThemeColors,
  PartialHealthTheme,
  HealthViewProps,
  MetricCardProps,
  HealthObservation,
  HealthKitContextValue,
} from './types';

// Types - Activity, Sleep, Vitals
export type {
  DailyActivityDay,
  DailyActivityResult,
  ActiveMinutesTiered,
  SleepSample,
  SleepNight,
  SleepResult,
  VitalsSample,
  VitalsDay,
  VitalsResult,
  PermissionResult,
} from './types';

// Enums
export { SleepStage } from './types';

// Sample Types
export {
  SampleType,
  SAMPLE_TYPE_UNITS,
  SAMPLE_TYPE_LABELS,
  getUnitForType,
  getLabelForType,
} from './sample-types';

// Services - Core
export { HealthKitService, HKSleepValue, mapHKSleepValueToStage } from './services';
export type { IHealthKitService } from './services';

// Services - Query Functions
export {
  // Activity
  getDailyActivity,
  getRecentActivity,
  calculateSedentaryMinutes,
  // Sleep
  getSleep,
  getRecentSleep,
  getSleepNightDate,
  groupSamplesByNight,
  hasDetailedSleepStages,
  aggregateSleepNight,
  calculateAverageSleepDuration,
  // Vitals
  getVitals,
  getRecentVitals,
  getHeartRateSamples,
  calculateAverageRestingHR,
  calculateAverageHRV,
  FUTURE_WATCH_METRICS,
} from './services';

// Providers
export { HealthKitProvider, useHealthKitContext } from './providers';
export type { HealthKitProviderProps } from './providers';

// Hooks
export { useHealthKit, useHealthMetric } from './hooks';
export type { UseHealthKitReturn, UseHealthMetricReturn } from './hooks';

// UI Components
export {
  HealthView,
  MetricCard,
  ExpoGoFallback,
  defaultLightHealthTheme,
  defaultDarkHealthTheme,
  mergeHealthTheme,
} from './ui';
export type { ExpoGoFallbackProps } from './ui';

// Utils - Expo detection
export { isExpoGo, isStandalone, getExpoGoMessage } from './utils';

// Utils - Date helpers
export {
  type DateRange,
  getDateRange,
  getDayBoundaries,
  formatDateKey,
  parseDateKey,
  getDateKeysInRange,
  bucketByDay,
  durationInMinutes,
  isDateInRange,
  daysAgo,
  isSameDay,
  startOfToday,
  endOfToday,
} from './utils';
