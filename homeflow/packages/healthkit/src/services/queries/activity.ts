/**
 * Activity Query Module
 *
 * Provides functions to query and aggregate daily physical activity data
 * from HealthKit including steps, exercise time, and estimated sedentary time.
 */

import { HealthKitService } from '../HealthKitService';
import { SampleType } from '../../sample-types';
import type { DailyActivityDay, DailyActivityResult } from '../../types';
import {
  type DateRange,
  getDateKeysInRange,
  formatDateKey,
  getDayBoundaries,
  parseDateKey,
} from '../../utils';

/**
 * Assumed waking hours per day for sedentary time calculation.
 * 16 hours = 24 hours - 8 hours of sleep
 */
const WAKING_HOURS_PER_DAY = 16;
const WAKING_MINUTES_PER_DAY = WAKING_HOURS_PER_DAY * 60;

/**
 * Get daily statistics for a cumulative quantity type
 */
async function getDailyStatistics(
  type: SampleType,
  range: DateRange
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  const dateKeys = getDateKeysInRange(range);

  // Query each day individually for accurate daily totals
  for (const dateKey of dateKeys) {
    const dayBounds = getDayBoundaries(parseDateKey(dateKey));
    const stats = await HealthKitService.getStatistics(type, {
      startDate: dayBounds.start,
      endDate: dayBounds.end,
    });
    results.set(dateKey, stats?.sum ?? 0);
  }

  return results;
}

/**
 * Get daily average for a non-cumulative quantity type (like heart rate)
 */
async function getDailyAverages(
  type: SampleType,
  range: DateRange
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  const dateKeys = getDateKeysInRange(range);

  for (const dateKey of dateKeys) {
    const dayBounds = getDayBoundaries(parseDateKey(dateKey));
    const stats = await HealthKitService.getStatistics(type, {
      startDate: dayBounds.start,
      endDate: dayBounds.end,
    });
    results.set(dateKey, stats?.average ?? 0);
  }

  return results;
}

/**
 * Calculate estimated sedentary minutes for a day
 *
 * Sedentary time is approximated as:
 *   Waking hours (16h) - Exercise time - Stand time
 *
 * Limitations:
 * - This is a rough estimate since HealthKit doesn't track sedentary time directly
 * - Stand time from Apple Watch is in hours (we convert to minutes)
 * - Move time is not subtracted as it overlaps with exercise/stand
 * - Does not account for sleep variations
 *
 * @param exerciseMinutes Apple Exercise Time (high-intensity activity)
 * @param standMinutes Apple Stand Time (converted from hours)
 * @returns Estimated sedentary minutes (minimum 0)
 */
export function calculateSedentaryMinutes(
  exerciseMinutes: number,
  standMinutes: number
): number {
  // Stand time counts when you stand for at least 1 minute in an hour
  // We estimate ~5 minutes of activity per stand hour
  const estimatedStandActivity = standMinutes;

  // Sedentary = Waking time - active time
  // We don't double-count exercise time with stand time
  const activeMinutes = Math.max(exerciseMinutes, estimatedStandActivity);
  const sedentary = WAKING_MINUTES_PER_DAY - activeMinutes;

  return Math.max(0, Math.round(sedentary));
}

/**
 * Get daily activity data for a date range
 *
 * @param range Date range to query
 * @returns DailyActivityResult with array of daily summaries
 */
export async function getDailyActivity(
  range: DateRange
): Promise<DailyActivityResult> {
  // Fetch all metrics in parallel for efficiency
  const [
    stepsMap,
    exerciseMap,
    moveMap,
    standMap,
    energyMap,
    distanceMap,
  ] = await Promise.all([
    getDailyStatistics(SampleType.stepCount, range),
    getDailyStatistics(SampleType.appleExerciseTime, range),
    getDailyStatistics(SampleType.appleMoveTime, range),
    getDailyStatistics(SampleType.appleStandTime, range),
    getDailyStatistics(SampleType.activeEnergyBurned, range),
    getDailyStatistics(SampleType.distanceWalkingRunning, range),
  ]);

  const dateKeys = getDateKeysInRange(range);
  const days: DailyActivityDay[] = dateKeys.map((dateKey) => {
    const steps = Math.round(stepsMap.get(dateKey) ?? 0);
    const exerciseMinutes = Math.round(exerciseMap.get(dateKey) ?? 0);
    const moveMinutes = Math.round(moveMap.get(dateKey) ?? 0);
    // Stand time is tracked in hours by Apple Watch, but reported in minutes
    const standMinutes = Math.round(standMap.get(dateKey) ?? 0);
    const activeEnergyBurned = Math.round(energyMap.get(dateKey) ?? 0);
    const distanceWalkingRunning = Math.round(distanceMap.get(dateKey) ?? 0);

    const sedentaryMinutes = calculateSedentaryMinutes(
      exerciseMinutes,
      standMinutes
    );

    return {
      date: dateKey,
      steps,
      exerciseMinutes,
      moveMinutes,
      standMinutes,
      sedentaryMinutes,
      activeEnergyBurned,
      distanceWalkingRunning,
    };
  });

  return {
    days,
    range: {
      start: range.start,
      end: range.end,
    },
  };
}

/**
 * Get activity summary for the last N days
 *
 * @param days Number of days to include (default 7)
 * @returns DailyActivityResult
 */
export async function getRecentActivity(
  days: number = 7
): Promise<DailyActivityResult> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return getDailyActivity({ start, end });
}
