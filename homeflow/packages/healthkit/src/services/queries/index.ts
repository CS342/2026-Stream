/**
 * HealthKit Query Modules
 *
 * Provides high-level query functions for activity, sleep, and vitals data.
 */

// Activity queries
export {
  getDailyActivity,
  getRecentActivity,
  calculateSedentaryMinutes,
} from './activity';

// Sleep queries
export {
  getSleep,
  getRecentSleep,
  getSleepNightDate,
  groupSamplesByNight,
  hasDetailedSleepStages,
  aggregateSleepNight,
  calculateAverageSleepDuration,
} from './sleep';

// Vitals queries
export {
  getVitals,
  getRecentVitals,
  getHeartRateSamples,
  calculateAverageRestingHR,
  calculateAverageHRV,
  FUTURE_WATCH_METRICS,
} from './vitals';
