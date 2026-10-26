import { test, expect } from 'vitest';
import { validateSubmission, GRACE_SECONDS } from '../../shared/validate.js';
import { dailySet } from '../../shared/rotation.js';

const now = new Date('2026-11-03T12:00:00Z');
const date = '2026-11-03';
const set = dailySet(date);
const body = (o = {}) => ({ token: 'a'.repeat(32), date, scores: Object.fromEntries(set.map(id => [id, 80])), ...o });

test('geçerli', () => {
  expect(GRACE_SECONDS).toBe(300);
  expect(validateSubmission(body(), now)).toMatchObject({ ok: true, date, day: 80 });
});

test('yanlış oyun seti', () => {
  expect(validateSubmission(body({ scores: { nokta: 1 } }), now).ok).toBe(false);
  const extra = { ...body().scores, [['nokta', 'aci', 'zaman', 'renk', 'merkez', 'yorunge', 'ritim', 'oran'].find(id => !set.includes(id))]: 50 };
  expect(validateSubmission(body({ scores: extra }), now).ok).toBe(false);
});

test('aralık dışı / ondalık / string puan', () => {
  for (const bad of [101, -1, 50.5, '50', null]) {
    const s = { ...body().scores, [set[0]]: bad };
    expect(validateSubmission(body({ scores: s }), now).ok).toBe(false);
  }
});

test('geçersiz token', () => {
  expect(validateSubmission(body({ token: 'xyz' }), now).ok).toBe(false);
  expect(validateSubmission(body({ token: undefined }), now).ok).toBe(false);
});

test('gövde yok / bozuk', () => {
  expect(validateSubmission(null, now).ok).toBe(false);
  expect(validateSubmission({ token: 'a'.repeat(32), date }, now).ok).toBe(false);
});

test('gece yarısı toleransı', () => {
  const y = '2026-11-02', ys = Object.fromEntries(dailySet(y).map(id => [id, 50]));
  expect(validateSubmission(body({ date: y, scores: ys }), new Date('2026-11-02T21:04:00Z')).ok).toBe(true);
  expect(validateSubmission(body({ date: y, scores: ys }), new Date('2026-11-02T21:06:00Z')).ok).toBe(false);
});

test('gelecek tarih reddedilir', () => {
  const t = '2026-11-04', ts = Object.fromEntries(dailySet(t).map(id => [id, 50]));
  expect(validateSubmission(body({ date: t, scores: ts }), now).ok).toBe(false);
});
