import { test, expect } from 'vitest';
import { makeRng, hashString } from '../../shared/rng.js';

test('aynı tohum aynı dizi', () => {
  const a = makeRng('x'), b = makeRng('x');
  expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
});

test('farklı tohum farklı dizi', () => {
  expect(makeRng('x').next()).not.toBe(makeRng('y').next());
});

test('int kapsayıcı ve aralıkta', () => {
  const r = makeRng(1);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = r.int(3, 5);
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThanOrEqual(5);
    seen.add(v);
  }
  expect(seen.size).toBe(3);
});

test('next [0,1) aralığında', () => {
  const r = makeRng('z');
  for (let i = 0; i < 1000; i++) { const v = r.next(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});

test('shuffle kopya döner ve elemanları korur', () => {
  const src = [1, 2, 3, 4, 5];
  const out = makeRng(7).shuffle(src);
  expect(src).toEqual([1, 2, 3, 4, 5]);
  expect([...out].sort()).toEqual(src);
});

test('hashString uint32', () => {
  const h = hashString('sezgi');
  expect(Number.isInteger(h)).toBe(true);
  expect(h).toBeGreaterThanOrEqual(0);
  expect(h).toBeLessThan(2 ** 32);
});
