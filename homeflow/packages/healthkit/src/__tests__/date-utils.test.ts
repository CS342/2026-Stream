/**
 * Date Utilities Tests
 *
 * Tests for date range bucketing, day boundary calculations,
 * and other date utility functions.
 */

import {
  getDateRange,
  getDayBoundaries,
  formatDateKey,
  parseDateKey,
  getDateKeysInRange,
  bucketByDay,
  durationInMinutes,
  isDateInRange,
  isSameDay,
} from '../utils/date';

describe('Date Utilities', () => {
  describe('formatDateKey', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      expect(formatDateKey(date)).toBe('2024-01-15');
    });

    it('pads single digit months and days', () => {
      const date = new Date(2024, 8, 5); // Sep 5, 2024
      expect(formatDateKey(date)).toBe('2024-09-05');
    });

    it('handles end of year', () => {
      const date = new Date(2024, 11, 31); // Dec 31, 2024
      expect(formatDateKey(date)).toBe('2024-12-31');
    });
  });

  describe('parseDateKey', () => {
    it('parses YYYY-MM-DD to date at midnight', () => {
      const date = parseDateKey('2024-01-15');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });

    it('round-trips with formatDateKey', () => {
      const original = '2024-06-20';
      const parsed = parseDateKey(original);
      expect(formatDateKey(parsed)).toBe(original);
    });
  });

  describe('getDayBoundaries', () => {
    it('returns start and end of day', () => {
      const date = new Date(2024, 5, 15, 14, 30); // Jun 15, 2024, 2:30pm
      const { start, end } = getDayBoundaries(date);

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);

      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);

      // Same day
      expect(formatDateKey(start)).toBe('2024-06-15');
      expect(formatDateKey(end)).toBe('2024-06-15');
    });
  });

  describe('getDateRange', () => {
    it('returns range for last N days', () => {
      const { start, end } = getDateRange(7);

      // End should be now (or very close)
      const now = new Date();
      expect(end.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(end.getTime()).toBeGreaterThan(now.getTime() - 1000);

      // Start should be 6 days ago at midnight
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      sixDaysAgo.setHours(0, 0, 0, 0);
      expect(start.getTime()).toBe(sixDaysAgo.getTime());
    });

    it('returns single day for days=1', () => {
      const { start } = getDateRange(1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(start.getTime()).toBe(today.getTime());
    });
  });

  describe('getDateKeysInRange', () => {
    it('returns array of date keys for range', () => {
      const start = new Date(2024, 0, 1); // Jan 1
      start.setHours(0, 0, 0, 0);
      const end = new Date(2024, 0, 5); // Jan 5
      end.setHours(23, 59, 59, 999);

      const keys = getDateKeysInRange({ start, end });

      expect(keys).toEqual([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05',
      ]);
    });

    it('returns single key for same-day range', () => {
      const date = new Date(2024, 5, 15);
      const { start, end } = getDayBoundaries(date);
      const keys = getDateKeysInRange({ start, end });

      expect(keys).toEqual(['2024-06-15']);
    });

    it('handles month boundaries', () => {
      const start = new Date(2024, 0, 30);
      start.setHours(0, 0, 0, 0);
      const end = new Date(2024, 1, 2);
      end.setHours(23, 59, 59, 999);

      const keys = getDateKeysInRange({ start, end });

      expect(keys).toEqual([
        '2024-01-30',
        '2024-01-31',
        '2024-02-01',
        '2024-02-02',
      ]);
    });
  });

  describe('bucketByDay', () => {
    it('groups items by day', () => {
      const items = [
        { id: 1, timestamp: new Date(2024, 0, 15, 10, 0) },
        { id: 2, timestamp: new Date(2024, 0, 15, 14, 0) },
        { id: 3, timestamp: new Date(2024, 0, 16, 9, 0) },
        { id: 4, timestamp: new Date(2024, 0, 16, 18, 0) },
        { id: 5, timestamp: new Date(2024, 0, 17, 12, 0) },
      ];

      const buckets = bucketByDay(items, (item) => item.timestamp);

      expect(buckets.get('2024-01-15')?.length).toBe(2);
      expect(buckets.get('2024-01-16')?.length).toBe(2);
      expect(buckets.get('2024-01-17')?.length).toBe(1);
    });

    it('handles empty array', () => {
      const buckets = bucketByDay([], (item: { date: Date }) => item.date);
      expect(buckets.size).toBe(0);
    });
  });

  describe('durationInMinutes', () => {
    it('calculates duration between dates', () => {
      const start = new Date(2024, 0, 15, 10, 0);
      const end = new Date(2024, 0, 15, 11, 30);

      expect(durationInMinutes(start, end)).toBe(90);
    });

    it('rounds to nearest minute', () => {
      const start = new Date(2024, 0, 15, 10, 0, 0);
      const end = new Date(2024, 0, 15, 10, 5, 29); // 5.48 minutes

      expect(durationInMinutes(start, end)).toBe(5);
    });

    it('handles overnight duration', () => {
      const start = new Date(2024, 0, 15, 23, 0);
      const end = new Date(2024, 0, 16, 7, 0);

      expect(durationInMinutes(start, end)).toBe(480); // 8 hours
    });
  });

  describe('isDateInRange', () => {
    it('returns true for date within range', () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 0, 31);
      const date = new Date(2024, 0, 15);

      expect(isDateInRange(date, { start, end })).toBe(true);
    });

    it('returns true for date at boundaries', () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 0, 31);

      expect(isDateInRange(start, { start, end })).toBe(true);
      expect(isDateInRange(end, { start, end })).toBe(true);
    });

    it('returns false for date outside range', () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 0, 31);
      const date = new Date(2024, 1, 1);

      expect(isDateInRange(date, { start, end })).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('returns true for same calendar day', () => {
      const date1 = new Date(2024, 0, 15, 10, 0);
      const date2 = new Date(2024, 0, 15, 22, 30);

      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('returns false for different days', () => {
      const date1 = new Date(2024, 0, 15, 23, 59);
      const date2 = new Date(2024, 0, 16, 0, 1);

      expect(isSameDay(date1, date2)).toBe(false);
    });
  });
});
