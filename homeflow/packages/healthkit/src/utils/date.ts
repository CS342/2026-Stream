/**
 * Date Utilities for HealthKit
 *
 * Helper functions for date range calculations, bucketing samples by day,
 * and handling timezone considerations for health data.
 */

/**
 * Date range with start and end dates
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get a date range for the last N days (including today)
 * @param days Number of days to include (7 = last 7 days including today)
 * @returns DateRange with start at midnight N-1 days ago and end at current time
 */
export function getDateRange(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Get the start and end of a specific day in local timezone
 * @param date Any date within the desired day
 * @returns DateRange from 00:00:00.000 to 23:59:59.999
 */
export function getDayBoundaries(date: Date): DateRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Format a date as YYYY-MM-DD string (local timezone)
 * @param date Date to format
 * @returns String in YYYY-MM-DD format
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date (at midnight local time)
 * @param dateKey String in YYYY-MM-DD format
 * @returns Date at midnight local time
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Generate an array of date keys for a range
 * @param range Date range to generate keys for
 * @returns Array of YYYY-MM-DD strings for each day in the range
 */
export function getDateKeysInRange(range: DateRange): string[] {
  const keys: string[] = [];
  const current = new Date(range.start);
  current.setHours(0, 0, 0, 0);

  const endDate = new Date(range.end);
  endDate.setHours(23, 59, 59, 999);

  while (current <= endDate) {
    keys.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return keys;
}

/**
 * Bucket items by day using a date extraction function
 * @param items Array of items to bucket
 * @param extractDate Function to extract a Date from each item
 * @returns Map of YYYY-MM-DD date keys to arrays of items
 */
export function bucketByDay<T>(
  items: T[],
  extractDate: (item: T) => Date
): Map<string, T[]> {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const date = extractDate(item);
    const key = formatDateKey(date);

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(item);
  }

  return buckets;
}

/**
 * Calculate duration in minutes between two dates
 * @param start Start date
 * @param end End date
 * @returns Duration in minutes (rounded)
 */
export function durationInMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Check if a date falls within a range
 * @param date Date to check
 * @param range Range to check against
 * @returns True if date is within range (inclusive)
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

/**
 * Get the date N days ago at midnight
 * @param days Number of days ago
 * @returns Date at midnight N days ago
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Check if two dates are on the same calendar day (local timezone)
 * @param date1 First date
 * @param date2 Second date
 * @returns True if both dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateKey(date1) === formatDateKey(date2);
}

/**
 * Get the start of today at midnight
 * @returns Today at 00:00:00.000
 */
export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the end of today at 23:59:59.999
 * @returns Today at 23:59:59.999
 */
export function endOfToday(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}
