import { test, expect } from 'vitest';
import { PUZZLES } from '../../src/logic/puzzles/index.js';
import { GAME_IDS } from '../../shared/games.js';
import { addDays } from '../../shared/date.js';

const D = '2026-11-03';
const days = Array.from({ length: 60 }, (_, i) => addDays('2027-03-01', i));

test('8 oyunun hepsi kayıtlı', () => expect(Object.keys(PUZZLES).sort()).toEqual([...GAME_IDS].sort()));

test.each(['merkez', 'yorunge', 'ritim', 'oran'])('%s deterministik', id => {
  expect(PUZZLES[id].generate(D)).toEqual(PUZZLES[id].generate(D));
});

const area = pts => Math.abs((pts[1].x - pts[0].x) * (pts[2].y - pts[0].y) - (pts[2].x - pts[0].x) * (pts[1].y - pts[0].y)) / 2;

test('merkez üçgeni alan içinde ve yeterince büyük', () => {
  for (const d of days) {
    const p = PUZZLES.merkez.generate(d);
    expect(p.pts).toHaveLength(3);
    p.pts.forEach(q => { expect(q.x).toBeGreaterThanOrEqual(0.08); expect(q.x).toBeLessThanOrEqual(0.92); expect(q.y).toBeGreaterThanOrEqual(0.08); expect(q.y).toBeLessThanOrEqual(0.92); });
    expect(area(p.pts)).toBeGreaterThanOrEqual(0.13);
  }
});

test('merkez ağırlık merkezi her oranda 100', () => {
  const p = PUZZLES.merkez.generate(D);
  const c = { x: (p.pts[0].x + p.pts[1].x + p.pts[2].x) / 3, y: (p.pts[0].y + p.pts[1].y + p.pts[2].y) / 3 };
  expect(PUZZLES.merkez.score(p, { ...c, aspect: 1 })).toBe(100);
  expect(PUZZLES.merkez.score(p, { ...c, aspect: 1.6 })).toBe(100);
});

test('merkez hata üçgen boyutuna göre göreli', () => {
  const p = { pts: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] }; // alan 0.5, √alan ≈ 0.7071
  const c = { x: 1 / 3, y: 1 / 3 };
  expect(PUZZLES.merkez.score(p, { x: c.x + 0.3 * Math.SQRT1_2, y: c.y, aspect: 1 })).toBe(5);
});

test('yörünge iniş noktası zeminde ve aralıkta', () => {
  for (const d of days) {
    const p = PUZZLES.yorunge.generate(d);
    const y = p.y0 - p.vy * p.tL + 0.5 * p.g * p.tL ** 2;
    expect(y).toBeCloseTo(p.ground, 6);
    expect(p.x0 + p.vx * p.tL).toBeCloseTo(p.xL, 6);
    expect(p.xL).toBeGreaterThanOrEqual(0.5);
    expect(p.xL).toBeLessThanOrEqual(0.93);
    expect(p.y0 - p.vy ** 2 / (2 * p.g)).toBeGreaterThan(0); // tepe noktası alan içinde
    expect(p.hideAt / p.tL).toBeGreaterThanOrEqual(0.38);
    expect(p.hideAt / p.tL).toBeLessThanOrEqual(0.52);
  }
});

test('yörünge puanı', () => {
  const p = PUZZLES.yorunge.generate(D);
  expect(PUZZLES.yorunge.score(p, { x: p.xL })).toBe(100);
  expect(PUZZLES.yorunge.score(p, { x: p.xL - 0.16 })).toBe(5);
});

test('ritim bpm aralığı ve puan', () => {
  for (const d of days) { const p = PUZZLES.ritim.generate(d); expect(p.bpm).toBeGreaterThanOrEqual(80); expect(p.bpm).toBeLessThanOrEqual(128); }
  expect(PUZZLES.ritim.score({ bpm: 100 }, { offsets: Array(8).fill(0) })).toBe(100);
  expect(PUZZLES.ritim.score({ bpm: 100 }, { offsets: Array(8).fill(-120) })).toBe(5);
  expect(PUZZLES.ritim.score({ bpm: 100 }, { offsets: [120, -120, 120, -120, 120, -120, 120, -120] })).toBe(5);
});

test('oran çizgisi alan içinde, kesir listeden', () => {
  for (const d of days) {
    const p = PUZZLES.oran.generate(d);
    expect(p.x1).toBeGreaterThanOrEqual(0.06);
    expect(p.x2).toBeLessThanOrEqual(0.94);
    expect(p.x2 - p.x1).toBeGreaterThanOrEqual(0.55);
    expect(p.x2 - p.x1).toBeLessThanOrEqual(0.87);
    expect(p.p).toBeLessThan(p.q);
  }
});

test('oran hedef ve tolerans', () => {
  const p = { p: 1, q: 4, fromLeft: false, x1: 0.1, x2: 0.9, y: 0.5 };
  expect(PUZZLES.oran.target(p)).toBeCloseTo(0.7, 9);
  expect(PUZZLES.oran.score(p, { x: 0.7 })).toBe(100);
  expect(PUZZLES.oran.score(p, { x: 0.7 + 0.07 * 0.8 })).toBe(5);
  expect(PUZZLES.oran.target({ ...p, fromLeft: true })).toBeCloseTo(0.3, 9);
});
