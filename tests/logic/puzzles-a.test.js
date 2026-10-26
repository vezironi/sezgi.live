import { test, expect } from 'vitest';
import { PUZZLES } from '../../src/logic/puzzles/index.js';

const D = '2026-11-03';
const g = id => PUZZLES[id].generate(D);

test.each(['nokta', 'aci', 'zaman', 'renk'])('%s deterministik', id => {
  expect(PUZZLES[id].generate(D)).toEqual(PUZZLES[id].generate(D));
});

test('günler farklı bulmaca verir', () => {
  expect(PUZZLES.aci.generate('2026-11-03')).not.toEqual(PUZZLES.aci.generate('2026-11-04'));
});

test('nokta aralık, sayı ve yerleşim', () => {
  const p = g('nokta');
  expect(p.count).toBeGreaterThanOrEqual(45);
  expect(p.count).toBeLessThanOrEqual(85);
  expect(p.dots).toHaveLength(p.count);
  p.dots.forEach(d => { expect(d.x).toBeGreaterThanOrEqual(0.05); expect(d.x).toBeLessThanOrEqual(0.95); expect(d.y).toBeGreaterThanOrEqual(0.05); expect(d.y).toBeLessThanOrEqual(0.95); });
});

test('aci, zaman, renk aralıkları', () => {
  for (let i = 1; i <= 28; i++) {
    const d = `2027-02-${String(i).padStart(2, '0')}`;
    const a = PUZZLES.aci.generate(d), z = PUZZLES.zaman.generate(d), r = PUZZLES.renk.generate(d);
    expect(a.target).toBeGreaterThanOrEqual(15); expect(a.target).toBeLessThanOrEqual(345);
    expect(z.target).toBeGreaterThanOrEqual(4); expect(z.target).toBeLessThanOrEqual(9.9);
    expect(Math.round(z.target * 10)).toBeCloseTo(z.target * 10, 9);
    expect(r.h).toBeGreaterThanOrEqual(0); expect(r.h).toBeLessThanOrEqual(359);
    expect(r.l).toBeGreaterThanOrEqual(32); expect(r.l).toBeLessThanOrEqual(68); expect(r.s).toBe(78);
  }
});

test('mükemmel cevap 100', () => {
  expect(PUZZLES.nokta.score(g('nokta'), { guess: g('nokta').count })).toBe(100);
  expect(PUZZLES.aci.score(g('aci'), { angle: g('aci').target })).toBe(100);
  expect(PUZZLES.zaman.score(g('zaman'), { elapsed: g('zaman').target })).toBe(100);
  expect(PUZZLES.renk.score(g('renk'), { h: g('renk').h, l: g('renk').l })).toBe(100);
});

test('toleranslar', () => {
  expect(PUZZLES.nokta.score({ count: 100, dots: [] }, { guess: 135 })).toBe(5);
  expect(PUZZLES.aci.score({ target: 100 }, { angle: 122 })).toBe(5);
  expect(PUZZLES.zaman.score({ target: 5 }, { elapsed: 6.6 })).toBe(5);
  expect(PUZZLES.renk.score({ h: 100, l: 50, s: 78 }, { h: 160, l: 50 })).toBe(45);
});

test('açı 359/1 sarması', () => {
  expect(PUZZLES.aci.score({ target: 359 }, { angle: 1 })).toBe(PUZZLES.aci.score({ target: 10 }, { angle: 12 }));
});

test('nokta anlamsız giriş NaN üretmez', () => {
  const p = { count: 60, dots: [] };
  for (const guess of [0, -5, 99999, NaN]) {
    const s = PUZZLES.nokta.score(p, { guess });
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
  }
  expect(PUZZLES.nokta.score(p, { guess: 0 })).toBe(0);
});

test('renk ton sarması', () => {
  expect(PUZZLES.renk.score({ h: 355, l: 50, s: 78 }, { h: 5, l: 50 })).toBe(PUZZLES.renk.score({ h: 100, l: 50, s: 78 }, { h: 110, l: 50 }));
});
