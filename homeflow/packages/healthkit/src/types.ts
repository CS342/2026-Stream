/**
 * HealthKit Types
 *
 * Type definitions for HealthKit integration.
 */

import { SampleType } from './sample-types';

/**
 * Configuration for the HealthKit provider
 */
export interface HealthKitConfig {
  /** Sample types to collect (request read/write access) */
  collect: SampleType[];
  /** Sample types to read only (no write access) */
  readOnly?: SampleType[];
  /** Sample types to enable background delivery for */
  backgroundDelivery?: SampleType[];
  /** Whether to sync collected data to backend */
  syncToBackend?: boolean;
}

/**
 * A single health data sample
 */
export interface HealthSample {
  value: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  sourceName?: string;
  sourceId?: string;
}

/**
 * Aggregated health statistics
 */
export interface HealthStatistics {
  sum?: number;
  average?: number;
  min?: number;
  max?: number;
  count: number;
  unit: string;
}

/**
 * Query options for fetching health data
 */
export interface HealthQueryOptions {
  startDate: Date;
  endDate: Date;
  limit?: number;
  ascending?: boolean;
}

/**
 * Authorization status for a sample type
 */
export type AuthorizationStatus =
  | 'notDetermined'
  | 'sharingDenied'
  | 'sharingAuthorized';

/**
 * Theme colors for health UI components
 */
export interface HealthThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  secondaryText: string;
  accent: string;
  border: string;
  // Metric-specific colors
  steps: string;
  heartRate: string;
  activeEnergy: string;
  sleep: string;
}

/**
 * Theme for health UI components
 */
export interface HealthTheme {
  colors: HealthThemeColors;
  borderRadius: number;
  spacing: {
    cardPadding: number;
    cardGap: number;
  };
}

/**
 * Partial theme for customization
 */
export type PartialHealthTheme = {
  colors?: Partial<HealthThemeColors>;
  borderRadius?: number;
  spacing?: Partial<HealthTheme['spacing']>;
};

/**
 * Props for HealthView component
 */
export interface HealthViewProps {
  /** Health metrics to display */
  metrics?: SampleType[];
  /** Custom theme */
  theme?: PartialHealthTheme;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Custom title for the header */
  title?: string;
  /** Callback when authorization is requested */
  onAuthorizationRequested?: () => void;
  /** Callback when data is refreshed */
  onRefresh?: () => void;
}

/**
 * Props for MetricCard component
 */
export interface MetricCardProps {
  type: SampleType;
  value: number | null;
  unit: string;
  label?: string;
  icon?: string;
  color?: string;
  isLoading?: boolean;
  onPress?: () => void;
}

/**
 * Health observation for backend sync (FHIR-compatible)
 */
export interface HealthObservation {
  type: SampleType;
  value: number;
  unit: string;
  effectiveDateTime: string;
  sourceName?: string;
}

/**
 * Context value for HealthKit provider
 */
export interface HealthKitContextValue {
  /** Whether HealthKit is available on this device */
  isAvailable: boolean;
  /** Whether authorization has been granted */
  isAuthorized: boolean;
  /** Whether initialization is in progress */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** The current configuration */
  config: HealthKitConfig;
  /** Request authorization for configured types */
  requestAuthorization: () => Promise<boolean>;
  /** Refresh all data */
  refresh: () => void;
}

// ============================================================================
// Daily Activity Types
// ============================================================================

/**
 * Daily activity summary for a single day
 */
export interface DailyActivityDay {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Total step count for the day */
  steps: number;
  /** Apple Exercise minutes (brisk activity detected by Apple Watch) */
  exerciseMinutes: number;
  /** Apple Move minutes (any movement activity) */
  moveMinutes: number;
  /** Apple Stand hours converted to minutes (for display consistency) */
  standMinutes: number;
  /**
   * Estimated sedentary minutes.
   * Calculated as: waking hours (16h) - exercise - stand time
   * This is an approximation; HealthKit doesn't track sedentary time directly.
   */
  sedentaryMinutes: number;
  /** Active energy burned in kcal */
  activeEnergyBurned: number;
  /** Distance walked/run in meters */
  distanceWalkingRunning: number;
}

/**
 * Tiered breakdown of active minutes
 * Note: Apple Watch tracks Exercise Time (high intensity) and Move Time (any movement)
 * but doesn't provide intermediate tiers. This structure supports future expansion.
 */
export interface ActiveMinutesTiered {
  /** High-intensity exercise (from appleExerciseTime) */
  exercise: number;
  /** General movement (from appleMoveTime) */
  move: number;
  /** Combined total */
  total: number;
}

// ============================================================================
// Sleep Types
// ============================================================================

/**
 * Sleep stage categories
 * iOS 16+ provides detailed stages; older versions only have inBed/asleep
 */
export enum SleepStage {
  /** User is awake (during the night) */
  Awake = 'awake',
  /** Core sleep (light sleep) - iOS 16+ only */
  Core = 'core',
  /** Deep sleep (slow-wave) - iOS 16+ only */
  Deep = 'deep',
  /** REM sleep - iOS 16+ only */
  REM = 'rem',
  /** In bed but sleep state unknown (legacy) */
  InBed = 'inBed',
  /** Asleep but stage unknown (legacy or when stages unavailable) */
  Asleep = 'asleep',
  /** Unknown or unrecognized stage */
  Unknown = 'unknown',
}

/**
 * A single sleep sample/segment
 */
export interface SleepSample {
  /** Sleep stage for this segment */
  stage: SleepStage;
  /** Start time of this segment */
  startDate: Date;
  /** End time of this segment */
  endDate: Date;
  /** Duration in minutes */
  durationMinutes: number;
  /** Source app/device name */
  sourceName?: string;
}

/**
 * Sleep data for a single night
 * Note: A "night" is typically from ~6pm to ~12pm next day to capture late sleepers
 */
export interface SleepNight {
  /** Date of the night (YYYY-MM-DD format, using the date when sleep started) */
  date: string;
  /** Total time in bed (minutes) */
  totalInBedMinutes: number;
  /** Total time asleep (minutes) - all stages except awake and inBed */
  totalAsleepMinutes: number;
  /** Whether detailed sleep stages are available (iOS 16+) */
  hasDetailedStages: boolean;
  /** Breakdown by sleep stage */
  stages: {
    awake: number;
    core: number;
    deep: number;
    rem: number;
    /** Legacy "asleep" when stages unavailable */
    asleepUndifferentiated: number;
  };
  /** Raw sleep samples for this night */
  samples: SleepSample[];
  /** Sleep efficiency: asleep / inBed * 100 */
  sleepEfficiency: number;
}

// ============================================================================
// Vitals Types
// ============================================================================

/**
 * A single vitals reading
 */
export interface VitalsSample {
  /** Type of vital (heartRate, respiratoryRate, etc.) */
  type: string;
  /** Measured value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** When the measurement was taken */
  timestamp: Date;
  /** Source device/app */
  sourceName?: string;
}

/**
 * Daily vitals summary
 */
export interface VitalsDay {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Heart rate statistics (bpm) */
  heartRate: {
    min: number | null;
    max: number | null;
    average: number | null;
    /** Number of readings */
    sampleCount: number;
  };
  /** Resting heart rate (bpm) - typically one reading per day from Apple Watch */
  restingHeartRate: number | null;
  /** Heart rate variability SDNN (ms) */
  hrv: number | null;
  /** Respiratory rate (breaths/min) */
  respiratoryRate: number | null;
  /** Blood oxygen saturation (%) - if available */
  oxygenSaturation: number | null;
}

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Result of a permission request with detailed status
 */
export interface PermissionResult {
  /** Whether the overall request succeeded (user saw the prompt) */
  ok: boolean;
  /** Types that were granted access */
  granted: string[];
  /** Types that were denied access */
  denied: string[];
  /**
   * Types with undetermined status.
   * Note: HealthKit doesn't tell us if read access was granted;
   * it only indicates "not determined" vs "sharing denied" for write access.
   * Read permissions always appear as "not determined" even when granted.
   */
  notDetermined: string[];
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * Result of a daily activity query
 */
export interface DailyActivityResult {
  /** Array of daily activity summaries */
  days: DailyActivityDay[];
  /** Date range that was queried */
  range: {
    start: Date;
    end: Date;
  };
}

/**
 * Result of a sleep query
 */
export interface SleepResult {
  /** Array of sleep nights */
  nights: SleepNight[];
  /** Date range that was queried */
  range: {
    start: Date;
    end: Date;
  };
}

/**
 * Result of a vitals query
 */
export interface VitalsResult {
  /** Array of daily vitals summaries */
  days: VitalsDay[];
  /** Date range that was queried */
  range: {
    start: Date;
    end: Date;
  };
}
