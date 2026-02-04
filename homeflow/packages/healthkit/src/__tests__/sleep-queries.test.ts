/**
 * Sleep Query Tests
 *
 * Tests for sleep stage mapping, night grouping, and aggregation.
 */

import { SleepStage } from '../types';
import {
  getSleepNightDate,
  groupSamplesByNight,
  hasDetailedSleepStages,
  aggregateSleepNight,
  calculateAverageSleepDuration,
} from '../services/queries/sleep';
import { mapHKSleepValueToStage, HKSleepValue } from '../services/HealthKitService';
import type { SleepSample, SleepNight } from '../types';

describe('Sleep Stage Mapping', () => {
  describe('mapHKSleepValueToStage', () => {
    it('maps InBed (0) correctly', () => {
      expect(mapHKSleepValueToStage(HKSleepValue.InBed)).toBe(SleepStage.InBed);
    });

    it('maps Asleep (1) correctly', () => {
      expect(mapHKSleepValueToStage(HKSleepValue.Asleep)).toBe(SleepStage.Asleep);
    });

    it('maps Awake (2) correctly', () => {
      expect(mapHKSleepValueToStage(HKSleepValue.Awake)).toBe(SleepStage.Awake);
    });

    it('maps Core (3) correctly', () => {
      expect(mapHKSleepValueToStage(HKSleepValue.Core)).toBe(SleepStage.Core);
    });

    it('maps Deep (4) correctly', () => {
      expect(mapHKSleepValueToStage(HKSleepValue.Deep)).toBe(SleepStage.Deep);
    });

    it('maps REM (5) correctly', () => {
      expect(mapHKSleepValueToStage(HKSleepValue.REM)).toBe(SleepStage.REM);
    });

    it('maps unknown values to Unknown', () => {
      expect(mapHKSleepValueToStage(99)).toBe(SleepStage.Unknown);
      expect(mapHKSleepValueToStage(-1)).toBe(SleepStage.Unknown);
    });
  });
});

describe('Sleep Night Date Calculation', () => {
  describe('getSleepNightDate', () => {
    it('sleep starting at 10pm belongs to that day', () => {
      const date = new Date(2024, 0, 15, 22, 0); // Jan 15, 10pm
      expect(getSleepNightDate(date)).toBe('2024-01-15');
    });

    it('sleep starting at 11pm belongs to that day', () => {
      const date = new Date(2024, 0, 15, 23, 30); // Jan 15, 11:30pm
      expect(getSleepNightDate(date)).toBe('2024-01-15');
    });

    it('sleep starting at 6pm belongs to that day', () => {
      const date = new Date(2024, 0, 15, 18, 0); // Jan 15, 6pm
      expect(getSleepNightDate(date)).toBe('2024-01-15');
    });

    it('wakeup at 7am belongs to previous day night', () => {
      const date = new Date(2024, 0, 16, 7, 0); // Jan 16, 7am
      expect(getSleepNightDate(date)).toBe('2024-01-15');
    });

    it('wakeup at 12pm belongs to previous day night', () => {
      const date = new Date(2024, 0, 16, 12, 0); // Jan 16, noon
      expect(getSleepNightDate(date)).toBe('2024-01-15');
    });

    it('wakeup at 5pm belongs to previous day night', () => {
      const date = new Date(2024, 0, 16, 17, 0); // Jan 16, 5pm
      expect(getSleepNightDate(date)).toBe('2024-01-15');
    });

    it('handles midnight correctly (belongs to previous day)', () => {
      const date = new Date(2024, 0, 16, 0, 0); // Jan 16, midnight
      expect(getSleepNightDate(date)).toBe('2024-01-15');
    });
  });
});

describe('Sleep Sample Grouping', () => {
  const makeSample = (
    stage: SleepStage,
    startHour: number,
    durationMinutes: number,
    dayOffset: number = 0
  ): SleepSample => {
    const startDate = new Date(2024, 0, 15 + dayOffset, startHour, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    return {
      stage,
      startDate,
      endDate,
      durationMinutes,
    };
  };

  describe('groupSamplesByNight', () => {
    it('groups samples from same night together', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.Core, 22, 120, 0), // 10pm, 2h
        makeSample(SleepStage.Deep, 0, 60, 1), // midnight next day
        makeSample(SleepStage.REM, 5, 90, 1), // 5am next day
      ];

      const groups = groupSamplesByNight(samples);

      expect(groups.size).toBe(1);
      expect(groups.get('2024-01-15')?.length).toBe(3);
    });

    it('separates samples from different nights', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.Core, 22, 120, 0), // Jan 15 night
        makeSample(SleepStage.Core, 22, 120, 1), // Jan 16 night
      ];

      const groups = groupSamplesByNight(samples);

      expect(groups.size).toBe(2);
      expect(groups.get('2024-01-15')?.length).toBe(1);
      expect(groups.get('2024-01-16')?.length).toBe(1);
    });
  });

  describe('hasDetailedSleepStages', () => {
    it('returns true when iOS 16+ stages present', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.Core, 22, 60),
        makeSample(SleepStage.Deep, 23, 60),
      ];

      expect(hasDetailedSleepStages(samples)).toBe(true);
    });

    it('returns false for legacy sleep data', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.InBed, 22, 30),
        makeSample(SleepStage.Asleep, 22, 420),
      ];

      expect(hasDetailedSleepStages(samples)).toBe(false);
    });

    it('returns true if any detailed stage present', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.Asleep, 22, 300),
        makeSample(SleepStage.REM, 3, 30), // One REM segment
      ];

      expect(hasDetailedSleepStages(samples)).toBe(true);
    });
  });
});

describe('Sleep Night Aggregation', () => {
  const makeSample = (
    stage: SleepStage,
    durationMinutes: number
  ): SleepSample => ({
    stage,
    startDate: new Date(2024, 0, 15, 22, 0),
    endDate: new Date(2024, 0, 15, 22, durationMinutes),
    durationMinutes,
  });

  describe('aggregateSleepNight', () => {
    it('calculates total in bed and asleep time', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.InBed, 30),
        makeSample(SleepStage.Core, 120),
        makeSample(SleepStage.Deep, 90),
        makeSample(SleepStage.REM, 60),
        makeSample(SleepStage.Awake, 20),
      ];

      const night = aggregateSleepNight('2024-01-15', samples);

      // Total in bed: 30 + 120 + 90 + 60 + 20 = 320
      expect(night.totalInBedMinutes).toBe(320);
      // Total asleep: 120 + 90 + 60 = 270 (excludes InBed and Awake)
      expect(night.totalAsleepMinutes).toBe(270);
    });

    it('breaks down by sleep stage', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.Awake, 15),
        makeSample(SleepStage.Core, 180),
        makeSample(SleepStage.Deep, 60),
        makeSample(SleepStage.REM, 90),
      ];

      const night = aggregateSleepNight('2024-01-15', samples);

      expect(night.stages.awake).toBe(15);
      expect(night.stages.core).toBe(180);
      expect(night.stages.deep).toBe(60);
      expect(night.stages.rem).toBe(90);
    });

    it('calculates sleep efficiency', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.Awake, 30),
        makeSample(SleepStage.Core, 270), // 4.5 hours
      ];

      const night = aggregateSleepNight('2024-01-15', samples);

      // 270 asleep / 300 in bed = 90%
      expect(night.sleepEfficiency).toBe(90);
    });

    it('handles legacy asleep data', () => {
      const samples: SleepSample[] = [
        makeSample(SleepStage.InBed, 30),
        makeSample(SleepStage.Asleep, 420), // 7 hours
      ];

      const night = aggregateSleepNight('2024-01-15', samples);

      expect(night.hasDetailedStages).toBe(false);
      expect(night.stages.asleepUndifferentiated).toBe(420);
      expect(night.totalAsleepMinutes).toBe(420);
    });

    it('returns zero efficiency for no data', () => {
      const night = aggregateSleepNight('2024-01-15', []);

      expect(night.sleepEfficiency).toBe(0);
      expect(night.totalInBedMinutes).toBe(0);
      expect(night.totalAsleepMinutes).toBe(0);
    });
  });
});

describe('Sleep Statistics', () => {
  describe('calculateAverageSleepDuration', () => {
    it('calculates average excluding empty nights', () => {
      const nights: SleepNight[] = [
        {
          date: '2024-01-15',
          totalAsleepMinutes: 420, // 7 hours
          totalInBedMinutes: 480,
          hasDetailedStages: true,
          stages: { awake: 0, core: 0, deep: 0, rem: 0, asleepUndifferentiated: 0 },
          samples: [],
          sleepEfficiency: 87,
        },
        {
          date: '2024-01-16',
          totalAsleepMinutes: 480, // 8 hours
          totalInBedMinutes: 520,
          hasDetailedStages: true,
          stages: { awake: 0, core: 0, deep: 0, rem: 0, asleepUndifferentiated: 0 },
          samples: [],
          sleepEfficiency: 92,
        },
        {
          date: '2024-01-17',
          totalAsleepMinutes: 0, // No data
          totalInBedMinutes: 0,
          hasDetailedStages: false,
          stages: { awake: 0, core: 0, deep: 0, rem: 0, asleepUndifferentiated: 0 },
          samples: [],
          sleepEfficiency: 0,
        },
      ];

      // Average of 420 and 480 = 450
      expect(calculateAverageSleepDuration(nights)).toBe(450);
    });

    it('returns 0 for all empty nights', () => {
      const nights: SleepNight[] = [
        {
          date: '2024-01-15',
          totalAsleepMinutes: 0,
          totalInBedMinutes: 0,
          hasDetailedStages: false,
          stages: { awake: 0, core: 0, deep: 0, rem: 0, asleepUndifferentiated: 0 },
          samples: [],
          sleepEfficiency: 0,
        },
      ];

      expect(calculateAverageSleepDuration(nights)).toBe(0);
    });
  });
});
