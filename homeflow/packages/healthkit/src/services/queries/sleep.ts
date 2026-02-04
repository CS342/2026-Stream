/**
 * Sleep Query Module
 *
 * Provides functions to query and aggregate sleep data from HealthKit.
 * Handles both iOS 16+ detailed sleep stages and legacy asleep/inBed data.
 */

import { HealthKitService } from '../HealthKitService';
import type { SleepSample, SleepNight, SleepResult } from '../../types';
import { SleepStage } from '../../types';
import {
  type DateRange,
  formatDateKey,
  getDateKeysInRange,
  durationInMinutes,
} from '../../utils';

/**
 * Determine the "night" a sleep sample belongs to.
 * Sleep that starts after 6pm belongs to that day's night.
 * Sleep that starts before 6pm belongs to the previous day's night.
 *
 * This handles cases where people go to bed late (e.g., 11pm on Monday = Monday night)
 * or wake up late (e.g., 10am wakeup on Tuesday still = Monday night)
 *
 * @param startDate Start time of the sleep sample
 * @returns Date key (YYYY-MM-DD) for the night this sleep belongs to
 */
export function getSleepNightDate(startDate: Date): string {
  const hour = startDate.getHours();

  // If sleep starts between midnight (0) and 6pm (18), it belongs to previous day's night
  if (hour < 18) {
    const previousDay = new Date(startDate);
    previousDay.setDate(previousDay.getDate() - 1);
    return formatDateKey(previousDay);
  }

  // Sleep starting at 6pm or later belongs to this day's night
  return formatDateKey(startDate);
}

/**
 * Group sleep samples by night
 *
 * @param samples Array of sleep samples
 * @returns Map of night date key to array of samples
 */
export function groupSamplesByNight(
  samples: SleepSample[]
): Map<string, SleepSample[]> {
  const nights = new Map<string, SleepSample[]>();

  for (const sample of samples) {
    const nightKey = getSleepNightDate(sample.startDate);

    if (!nights.has(nightKey)) {
      nights.set(nightKey, []);
    }
    nights.get(nightKey)!.push(sample);
  }

  return nights;
}

/**
 * Check if any samples in the array have detailed sleep stages (iOS 16+)
 * Detailed stages include Core, Deep, and REM
 *
 * @param samples Array of sleep samples
 * @returns True if detailed stages are present
 */
export function hasDetailedSleepStages(samples: SleepSample[]): boolean {
  return samples.some(
    (s) =>
      s.stage === SleepStage.Core ||
      s.stage === SleepStage.Deep ||
      s.stage === SleepStage.REM
  );
}

/**
 * Aggregate sleep samples into a SleepNight summary
 *
 * @param date Night date (YYYY-MM-DD)
 * @param samples Sleep samples for this night
 * @returns SleepNight summary
 */
export function aggregateSleepNight(
  date: string,
  samples: SleepSample[]
): SleepNight {
  // Sort samples by start time
  const sortedSamples = [...samples].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  // Initialize stage totals
  const stages = {
    awake: 0,
    core: 0,
    deep: 0,
    rem: 0,
    asleepUndifferentiated: 0,
  };

  let totalInBedMinutes = 0;
  let totalAsleepMinutes = 0;

  for (const sample of sortedSamples) {
    const duration = sample.durationMinutes;

    switch (sample.stage) {
      case SleepStage.InBed:
        totalInBedMinutes += duration;
        // InBed doesn't count as asleep
        break;
      case SleepStage.Awake:
        stages.awake += duration;
        // Awake is in bed but not asleep
        totalInBedMinutes += duration;
        break;
      case SleepStage.Asleep:
        stages.asleepUndifferentiated += duration;
        totalAsleepMinutes += duration;
        totalInBedMinutes += duration;
        break;
      case SleepStage.Core:
        stages.core += duration;
        totalAsleepMinutes += duration;
        totalInBedMinutes += duration;
        break;
      case SleepStage.Deep:
        stages.deep += duration;
        totalAsleepMinutes += duration;
        totalInBedMinutes += duration;
        break;
      case SleepStage.REM:
        stages.rem += duration;
        totalAsleepMinutes += duration;
        totalInBedMinutes += duration;
        break;
      default:
        // Unknown stages - count as in bed but not asleep
        totalInBedMinutes += duration;
    }
  }

  // Calculate sleep efficiency
  const sleepEfficiency =
    totalInBedMinutes > 0
      ? Math.round((totalAsleepMinutes / totalInBedMinutes) * 100)
      : 0;

  return {
    date,
    totalInBedMinutes: Math.round(totalInBedMinutes),
    totalAsleepMinutes: Math.round(totalAsleepMinutes),
    hasDetailedStages: hasDetailedSleepStages(sortedSamples),
    stages: {
      awake: Math.round(stages.awake),
      core: Math.round(stages.core),
      deep: Math.round(stages.deep),
      rem: Math.round(stages.rem),
      asleepUndifferentiated: Math.round(stages.asleepUndifferentiated),
    },
    samples: sortedSamples,
    sleepEfficiency,
  };
}

/**
 * Get sleep data for a date range
 *
 * @param range Date range to query (extended internally to capture full nights)
 * @returns SleepResult with array of nightly summaries
 */
export async function getSleep(range: DateRange): Promise<SleepResult> {
  // Extend the range to capture sleep that starts the evening before
  // and ends the morning after
  const extendedStart = new Date(range.start);
  extendedStart.setDate(extendedStart.getDate() - 1);
  extendedStart.setHours(18, 0, 0, 0); // Start from 6pm previous day

  const extendedEnd = new Date(range.end);
  extendedEnd.setDate(extendedEnd.getDate() + 1);
  extendedEnd.setHours(18, 0, 0, 0); // End at 6pm next day

  // Query sleep samples
  const samples = await HealthKitService.querySleepSamples({
    startDate: extendedStart,
    endDate: extendedEnd,
  });

  // Group samples by night
  const nightsMap = groupSamplesByNight(samples);

  // Get the date keys we actually want (from the original range)
  const requestedDateKeys = getDateKeysInRange(range);

  // Aggregate into nightly summaries, only for requested dates
  const nights: SleepNight[] = [];
  for (const dateKey of requestedDateKeys) {
    const nightSamples = nightsMap.get(dateKey) || [];
    if (nightSamples.length > 0) {
      nights.push(aggregateSleepNight(dateKey, nightSamples));
    } else {
      // Include empty night entry for consistency
      nights.push({
        date: dateKey,
        totalInBedMinutes: 0,
        totalAsleepMinutes: 0,
        hasDetailedStages: false,
        stages: {
          awake: 0,
          core: 0,
          deep: 0,
          rem: 0,
          asleepUndifferentiated: 0,
        },
        samples: [],
        sleepEfficiency: 0,
      });
    }
  }

  return {
    nights,
    range: {
      start: range.start,
      end: range.end,
    },
  };
}

/**
 * Get sleep data for the last N nights
 *
 * @param nights Number of nights to include (default 7)
 * @returns SleepResult
 */
export async function getRecentSleep(nights: number = 7): Promise<SleepResult> {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setDate(start.getDate() - (nights - 1));
  start.setHours(0, 0, 0, 0);

  return getSleep({ start, end });
}

/**
 * Calculate average sleep duration over a period
 *
 * @param nights Array of SleepNight data
 * @returns Average minutes asleep (excluding nights with no data)
 */
export function calculateAverageSleepDuration(nights: SleepNight[]): number {
  const nightsWithData = nights.filter((n) => n.totalAsleepMinutes > 0);
  if (nightsWithData.length === 0) return 0;

  const totalMinutes = nightsWithData.reduce(
    (sum, n) => sum + n.totalAsleepMinutes,
    0
  );
  return Math.round(totalMinutes / nightsWithData.length);
}
