/**
 * HealthKit Service
 *
 * Abstraction layer over @kingstinct/react-native-healthkit.
 * Handles platform detection and provides a clean API.
 */

import { Platform } from 'react-native';
import type {
  HealthSample,
  HealthStatistics,
  HealthQueryOptions,
  SleepSample,
  SleepStage,
  PermissionResult,
} from '../types';
import { SleepStage as SleepStageEnum } from '../types';
import { SampleType, getUnitForType } from '../sample-types';
import type {
  QuantityTypeIdentifier,
  SampleTypeIdentifierWriteable,
  ObjectTypeIdentifier,
  QuantitySample,
} from '@kingstinct/react-native-healthkit';

// Dynamically import HealthKit only on iOS
let healthKit: typeof import('@kingstinct/react-native-healthkit') | null = null;

if (Platform.OS === 'ios') {
  try {
    healthKit = require('@kingstinct/react-native-healthkit');
  } catch {
    // HealthKit not available (e.g., in tests or Expo Go)
    healthKit = null;
  }
}

/**
 * Apple HealthKit sleep analysis values
 * These map to HKCategoryValueSleepAnalysis in HealthKit
 */
export enum HKSleepValue {
  InBed = 0,
  Asleep = 1,
  Awake = 2,
  // iOS 16+ sleep stages
  Core = 3,
  Deep = 4,
  REM = 5,
}

/**
 * Map HealthKit sleep value to our SleepStage enum
 */
export function mapHKSleepValueToStage(value: number): SleepStage {
  switch (value) {
    case HKSleepValue.InBed:
      return SleepStageEnum.InBed;
    case HKSleepValue.Asleep:
      return SleepStageEnum.Asleep;
    case HKSleepValue.Awake:
      return SleepStageEnum.Awake;
    case HKSleepValue.Core:
      return SleepStageEnum.Core;
    case HKSleepValue.Deep:
      return SleepStageEnum.Deep;
    case HKSleepValue.REM:
      return SleepStageEnum.REM;
    default:
      return SleepStageEnum.Unknown;
  }
}

/**
 * HealthKit Service Interface
 */
export interface IHealthKitService {
  isAvailable(): boolean;
  requestAuthorization(
    readTypes: SampleType[],
    writeTypes?: SampleType[]
  ): Promise<boolean>;
  requestAuthorizationWithStatus(
    readTypes: SampleType[],
    writeTypes?: SampleType[]
  ): Promise<PermissionResult>;
  getMostRecentSample(type: SampleType): Promise<HealthSample | null>;
  querySamples(
    type: SampleType,
    options: HealthQueryOptions
  ): Promise<HealthSample[]>;
  querySleepSamples(options: HealthQueryOptions): Promise<SleepSample[]>;
  getStatistics(
    type: SampleType,
    options: HealthQueryOptions
  ): Promise<HealthStatistics | null>;
  getTodaySteps(): Promise<number>;
  getTodayActiveEnergy(): Promise<number>;
}

class HealthKitServiceImpl implements IHealthKitService {
  /**
   * Check if HealthKit is available on this device
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && healthKit !== null;
  }

  /**
   * Request authorization for the specified sample types
   */
  async requestAuthorization(
    readTypes: SampleType[],
    writeTypes: SampleType[] = []
  ): Promise<boolean> {
    if (!this.isAvailable() || !healthKit) {
      return false;
    }

    try {
      // requestAuthorization(toShare, toRead) - write types first, then read types
      const write = writeTypes as unknown as SampleTypeIdentifierWriteable[];
      const read = readTypes as unknown as ObjectTypeIdentifier[];

      await healthKit.requestAuthorization(write, read);
      return true;
    } catch (error) {
      console.error('HealthKit authorization failed:', error);
      return false;
    }
  }

  /**
   * Request authorization with detailed status information
   * Note: HealthKit privacy model means read permissions always appear as "not determined"
   * even when granted. We can only reliably check write permission status.
   */
  async requestAuthorizationWithStatus(
    readTypes: SampleType[],
    writeTypes: SampleType[] = []
  ): Promise<PermissionResult> {
    if (!this.isAvailable() || !healthKit) {
      return {
        ok: false,
        granted: [],
        denied: [],
        notDetermined: [...readTypes, ...writeTypes],
      };
    }

    try {
      const write = writeTypes as unknown as SampleTypeIdentifierWriteable[];
      const read = readTypes as unknown as ObjectTypeIdentifier[];

      await healthKit.requestAuthorization(write, read);

      // Check authorization status for write types
      // Note: For read types, HealthKit always returns "not determined" for privacy
      const granted: string[] = [];
      const denied: string[] = [];
      const notDetermined: string[] = [...readTypes]; // Read types are always "unknown"

      for (const writeType of writeTypes) {
        try {
          const status = await healthKit.authorizationStatusFor(
            writeType as unknown as SampleTypeIdentifierWriteable
          );
          // Status: 0 = notDetermined, 1 = sharingDenied, 2 = sharingAuthorized
          if (status === 2) {
            granted.push(writeType);
          } else if (status === 1) {
            denied.push(writeType);
          } else {
            notDetermined.push(writeType);
          }
        } catch {
          // If we can't get status, assume not determined
          notDetermined.push(writeType);
        }
      }

      return {
        ok: true,
        granted,
        denied,
        notDetermined,
      };
    } catch (error) {
      console.error('HealthKit authorization failed:', error);
      return {
        ok: false,
        granted: [],
        denied: [],
        notDetermined: [...readTypes, ...writeTypes],
      };
    }
  }

  /**
   * Get the most recent sample for a given type
   */
  async getMostRecentSample(type: SampleType): Promise<HealthSample | null> {
    if (!this.isAvailable() || !healthKit) {
      return null;
    }

    try {
      const sample = await healthKit.getMostRecentQuantitySample(
        type as QuantityTypeIdentifier
      );

      if (!sample) {
        return null;
      }

      return {
        value: sample.quantity,
        unit: sample.unit || getUnitForType(type),
        startDate: new Date(sample.startDate),
        endDate: new Date(sample.endDate),
        sourceName: sample.sourceRevision?.source?.name,
        sourceId: sample.sourceRevision?.source?.bundleIdentifier,
      };
    } catch (error) {
      console.error(`Failed to get sample for ${type}:`, error);
      return null;
    }
  }

  /**
   * Query samples within a date range
   */
  async querySamples(
    type: SampleType,
    options: HealthQueryOptions
  ): Promise<HealthSample[]> {
    if (!this.isAvailable() || !healthKit) {
      return [];
    }

    try {
      const samples = await healthKit.queryQuantitySamples(
        type as QuantityTypeIdentifier,
        {
          filter: {
            startDate: options.startDate,
            endDate: options.endDate,
          },
          limit: options.limit,
          ascending: options.ascending,
        }
      );

      return samples.map((sample: QuantitySample) => ({
        value: sample.quantity,
        unit: sample.unit || getUnitForType(type),
        startDate: new Date(sample.startDate),
        endDate: new Date(sample.endDate),
        sourceName: sample.sourceRevision?.source?.name,
        sourceId: sample.sourceRevision?.source?.bundleIdentifier,
      }));
    } catch (error) {
      console.error(`Failed to query samples for ${type}:`, error);
      return [];
    }
  }

  /**
   * Query sleep analysis samples (category type, not quantity)
   * Returns sleep segments with their stage and duration
   */
  async querySleepSamples(options: HealthQueryOptions): Promise<SleepSample[]> {
    if (!this.isAvailable() || !healthKit) {
      return [];
    }

    try {
      // queryCategorySamples has different signatures in iOS vs non-iOS type definitions
      // On iOS it accepts options, use type assertion to handle this
      const queryCategorySamplesFn = healthKit.queryCategorySamples as (
        identifier: string,
        options?: {
          filter?: { startDate?: Date; endDate?: Date };
          limit?: number;
          ascending?: boolean;
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) => Promise<readonly any[]>;

      const samples = await queryCategorySamplesFn(
        'HKCategoryTypeIdentifierSleepAnalysis',
        {
          filter: {
            startDate: options.startDate,
            endDate: options.endDate,
          },
          limit: options.limit,
          ascending: options.ascending ?? true,
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return samples.map((sample: any) => {
        const startDate = new Date(sample.startDate);
        const endDate = new Date(sample.endDate);
        const durationMinutes = Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60)
        );

        return {
          stage: mapHKSleepValueToStage(sample.value),
          startDate,
          endDate,
          durationMinutes,
          sourceName: sample.sourceRevision?.source?.name,
        };
      });
    } catch (error) {
      console.error('Failed to query sleep samples:', error);
      return [];
    }
  }

  /**
   * Get aggregated statistics for a date range
   */
  async getStatistics(
    type: SampleType,
    options: HealthQueryOptions
  ): Promise<HealthStatistics | null> {
    if (!this.isAvailable() || !healthKit) {
      return null;
    }

    try {
      const stats = await healthKit.queryStatisticsForQuantity(
        type as QuantityTypeIdentifier,
        ['cumulativeSum', 'discreteAverage', 'discreteMin', 'discreteMax'],
        {
          filter: {
            startDate: options.startDate,
            endDate: options.endDate,
          },
        }
      );

      return {
        sum: stats.sumQuantity?.quantity,
        average: stats.averageQuantity?.quantity,
        min: stats.minimumQuantity?.quantity,
        max: stats.maximumQuantity?.quantity,
        count: 0, // Not directly available from this API
        unit: stats.sumQuantity?.unit || getUnitForType(type),
      };
    } catch (error) {
      console.error(`Failed to get statistics for ${type}:`, error);
      return null;
    }
  }

  /**
   * Get today's total step count
   */
  async getTodaySteps(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const stats = await this.getStatistics(SampleType.stepCount, {
      startDate: today,
      endDate: now,
    });

    return stats?.sum || 0;
  }

  /**
   * Get today's total active energy burned
   */
  async getTodayActiveEnergy(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const stats = await this.getStatistics(SampleType.activeEnergyBurned, {
      startDate: today,
      endDate: now,
    });

    return stats?.sum || 0;
  }
}

/**
 * Singleton instance of the HealthKit service
 */
export const HealthKitService = new HealthKitServiceImpl();
