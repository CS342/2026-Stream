/**
 * HealthKit Configuration
 *
 * Configure which health data types to collect and display.
 * Modify this file to customize the health metrics for your app.
 *
 * HomeFlow BPH Study Requirements:
 * - Activity: steps, exercise time, stand time (for sedentary estimation)
 * - Sleep: sleep stages (iOS 16+) with fallback to basic sleep analysis
 * - Vitals: heart rate, resting HR, HRV, respiratory rate
 */

import { HealthKitConfig, SampleType } from '@spezivibe/healthkit';

export const healthKitConfig: HealthKitConfig = {
  // Health data types to collect (request read/write access)
  // These are the core metrics for the BPH study
  collect: [
    // Activity metrics
    SampleType.stepCount,
    SampleType.activeEnergyBurned,
    SampleType.appleExerciseTime,
    SampleType.appleMoveTime,
    SampleType.appleStandTime,
    SampleType.distanceWalkingRunning,

    // Sleep
    SampleType.sleepAnalysis,

    // Vitals
    SampleType.heartRate,
  ],

  // Health data types to read only (no write access)
  // These are recorded by Apple Watch automatically
  readOnly: [
    // Body measurements (for context)
    SampleType.bodyMass,
    SampleType.height,

    // Advanced vitals (from Apple Watch)
    SampleType.restingHeartRate,
    SampleType.heartRateVariabilitySDNN,
    SampleType.respiratoryRate,
    SampleType.oxygenSaturation,
    SampleType.walkingHeartRateAverage,
  ],

  // Enable background delivery for these types (optional)
  // Uncomment to enable daily background sync
  // backgroundDelivery: [
  //   SampleType.stepCount,
  //   SampleType.sleepAnalysis,
  // ],

  // Whether to sync health data to the backend
  // Set to true when backend integration is ready
  syncToBackend: false,
};

/**
 * Activity types used for daily activity queries
 */
export const ACTIVITY_TYPES = [
  SampleType.stepCount,
  SampleType.activeEnergyBurned,
  SampleType.appleExerciseTime,
  SampleType.appleMoveTime,
  SampleType.appleStandTime,
  SampleType.distanceWalkingRunning,
] as const;

/**
 * Vitals types used for daily vitals queries
 */
export const VITALS_TYPES = [
  SampleType.heartRate,
  SampleType.restingHeartRate,
  SampleType.heartRateVariabilitySDNN,
  SampleType.respiratoryRate,
  SampleType.oxygenSaturation,
] as const;

/**
 * All types that need to be requested for full functionality
 */
export const ALL_HEALTH_TYPES = [
  ...healthKitConfig.collect,
  ...(healthKitConfig.readOnly ?? []),
] as const;
