import { test, expect } from 'vitest';
import {
  LAUNCH_DATE, istanbulDate, addDays, puzzleNumber, weekStart,
  secondsSinceIstanbulMidnight, msUntilIstanbulMidnight, formatCountdown, formatLongDate,
} from '../../shared/date.js';

test('LAUNCH_DATE', () => expect(LAUNCH_DATE).toBe('2026-10-26'));

test('İstanbul günü UTC 21:00 sınırı', () => {
  expect(istanbulDate(new Date('2026-10-26T20:59:59Z'))).toBe('2026-10-26');
  expect(istanbulDate(new Date('2026-10-26T21:00:00Z'))).toBe('2026-10-27');
});

test('puzzleNumber', () => {
  expect(puzzleNumber('2026-10-26')).toBe(1);
  expect(puzzleNumber('2026-11-05')).toBe(11);
});

test('weekStart Pazartesi', () => {
  expect(weekStart('2026-10-26')).toBe('2026-10-26');
  expect(weekStart('2026-11-01')).toBe('2026-10-26');
  expect(weekStart('2026-11-02')).toBe('2026-11-02');
});

test('addDays ay/yıl geçişi', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
});

test('gece yarısı hesapları', () => {
  expect(msUntilIstanbulMidnight(new Date('2026-10-26T20:59:00Z'))).toBe(60000);
  expect(secondsSinceIstanbulMidnight(new Date('2026-10-26T21:00:30Z'))).toBe(30);
  expect(formatCountdown(3723000)).toBe('01:02:03');
});

test('formatLongDate', () => expect(formatLongDate('2026-10-26')).toBe('26 Ekim Pazartesi'));
