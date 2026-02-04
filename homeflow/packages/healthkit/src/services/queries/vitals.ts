/**
 * Vitals Query Module
 *
 * Provides functions to query and aggregate vital signs data from HealthKit
 * including heart rate, HRV, respiratory rate, and other Apple Watch metrics.
 */

import { HealthKitService } from '../HealthKitService';
import { SampleType } from '../../sample-types';
import type { VitalsDay, VitalsResult, HealthSample } from '../../types';
import {
  type DateRange,
  getDateKeysInRange,
  getDayBoundaries,
  parseDateKey,
  bucketByDay,
} from '../../utils';

/**
 * Get heart rate statistics for a single day
 */
async function getDailyHeartRateStats(
  dateKey: string
): Promise<VitalsDay['heartRate']> {
  const dayBounds = getDayBoundaries(parseDateKey(dateKey));

  // Query all heart rate samples for the day
  const samples = await HealthKitService.querySamples(SampleType.heartRate, {
    startDate: dayBounds.start,
    endDate: dayBounds.end,
  });

  if (samples.length === 0) {
    return {
      min: null,
      max: null,
      average: null,
      sampleCount: 0,
    };
  }

  const values = samples.map((s) => s.value);
  const sum = values.reduce((a, b) => a + b, 0);

  return {
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values)),
    average: Math.round(sum / values.length),
    sampleCount: values.length,
  };
}

/**
 * Get the most recent sample of a type for a day
 * Returns null if no sample exists for that day
 */
async function getDailyMostRecent(
  type: SampleType,
  dateKey: string
): Promise<number | null> {
  const dayBounds = getDayBoundaries(parseDateKey(dateKey));

  const samples = await HealthKitService.querySamples(type, {
    startDate: dayBounds.start,
    endDate: dayBounds.end,
    ascending: false, // Most recent first
    limit: 1,
  });

  if (samples.length === 0) {
    return null;
  }

  return samples[0].value;
}

/**
 * Get vitals data for a date range
 *
 * @param range Date range to query
 * @returns VitalsResult with array of daily summaries
 */
export async function getVitals(range: DateRange): Promise<VitalsResult> {
  const dateKeys = getDateKeysInRange(range);

  // Process each day
  const days: VitalsDay[] = await Promise.all(
    dateKeys.map(async (dateKey) => {
      // Fetch all vitals for this day in parallel
      const [heartRateStats, restingHR, hrv, respiratoryRate, oxygenSat] =
        await Promise.all([
          getDailyHeartRateStats(dateKey),
          getDailyMostRecent(SampleType.restingHeartRate, dateKey),
          getDailyMostRecent(SampleType.heartRateVariabilitySDNN, dateKey),
          getDailyMostRecent(SampleType.respiratoryRate, dateKey),
          getDailyMostRecent(SampleType.oxygenSaturation, dateKey),
        ]);

      return {
        date: dateKey,
        heartRate: heartRateStats,
        restingHeartRate: restingHR !== null ? Math.round(restingHR) : null,
        hrv: hrv !== null ? Math.round(hrv) : null,
        respiratoryRate:
          respiratoryRate !== null ? Math.round(respiratoryRate * 10) / 10 : null,
        oxygenSaturation:
          oxygenSat !== null ? Math.round(oxygenSat * 100) / 100 : null,
      };
    })
  );

  return {
    days,
    range: {
      start: range.start,
      end: range.end,
    },
  };
}

/**
 * Get vitals data for the last N days
 *
 * @param days Number of days to include (default 7)
 * @returns VitalsResult
 */
export async function getRecentVitals(days: number = 7): Promise<VitalsResult> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return getVitals({ start, end });
}

/**
 * Get all heart rate samples for a date range (for detailed analysis)
 *
 * @param range Date range to query
 * @returns Array of HealthSample with heart rate readings
 */
export async function getHeartRateSamples(
  range: DateRange
): Promise<HealthSample[]> {
  return HealthKitService.querySamples(SampleType.heartRate, {
    startDate: range.start,
    endDate: range.end,
    ascending: true,
  });
}

/**
 * Calculate average resting heart rate over a period
 *
 * @param days Array of VitalsDay data
 * @returns Average resting HR (excluding days with no data)
 */
export function calculateAverageRestingHR(days: VitalsDay[]): number | null {
  const daysWithData = days.filter((d) => d.restingHeartRate !== null);
  if (daysWithData.length === 0) return null;

  const sum = daysWithData.reduce((s, d) => s + (d.restingHeartRate ?? 0), 0);
  return Math.round(sum / daysWithData.length);
}

/**
 * Calculate average HRV over a period
 *
 * @param days Array of VitalsDay data
 * @returns Average HRV in ms (excluding days with no data)
 */
export function calculateAverageHRV(days: VitalsDay[]): number | null {
  const daysWithData = days.filter((d) => d.hrv !== null);
  if (daysWithData.length === 0) return null;

  const sum = daysWithData.reduce((s, d) => s + (d.hrv ?? 0), 0);
  return Math.round(sum / daysWithData.length);
}

/**
 * List of additional Apple Watch metrics that could be added in the future.
 * These are not currently implemented but documented for reference.
 */
export const FUTURE_WATCH_METRICS = [
  {
    type: 'HKQuantityTypeIdentifierOxygenSaturation',
    name: 'Blood Oxygen (SpO2)',
    notes: 'Requires Apple Watch Series 6+',
    unit: '%',
  },
  {
    type: 'HKQuantityTypeIdentifierVO2Max',
    name: 'VO2 Max',
    notes: 'Cardio fitness level',
    unit: 'mL/kg/min',
  },
  {
    type: 'HKQuantityTypeIdentifierWalkingHeartRateAverage',
    name: 'Walking Heart Rate Average',
    notes: 'Average HR during walks',
    unit: 'bpm',
  },
  {
    type: 'HKQuantityTypeIdentifierAppleWalkingSteadiness',
    name: 'Walking Steadiness',
    notes: 'Fall risk indicator (iOS 15+)',
    unit: '%',
  },
  {
    type: 'HKQuantityTypeIdentifierWalkingAsymmetryPercentage',
    name: 'Walking Asymmetry',
    notes: 'Gait analysis',
    unit: '%',
  },
  {
    type: 'HKQuantityTypeIdentifierWalkingDoubleSupportPercentage',
    name: 'Double Support Time',
    notes: 'Mobility indicator',
    unit: '%',
  },
  {
    type: 'HKQuantityTypeIdentifierWalkingSpeed',
    name: 'Walking Speed',
    notes: 'Average walking pace',
    unit: 'm/s',
  },
  {
    type: 'HKQuantityTypeIdentifierWalkingStepLength',
    name: 'Step Length',
    notes: 'Average step length',
    unit: 'cm',
  },
  {
    type: 'HKQuantityTypeIdentifierStairAscentSpeed',
    name: 'Stair Ascent Speed',
    notes: 'How fast you climb stairs',
    unit: 'floors/min',
  },
  {
    type: 'HKQuantityTypeIdentifierStairDescentSpeed',
    name: 'Stair Descent Speed',
    notes: 'How fast you descend stairs',
    unit: 'floors/min',
  },
  {
    type: 'HKQuantityTypeIdentifierAppleSleepingWristTemperature',
    name: 'Wrist Temperature',
    notes: 'Apple Watch Series 8+ only',
    unit: 'degC',
  },
  {
    type: 'HKCategoryTypeIdentifierAtrialFibrillationBurden',
    name: 'AFib History',
    notes: 'Requires AFib History feature enabled',
    unit: '%',
  },
] as const;
