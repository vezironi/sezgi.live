import { test, expect } from 'vitest';
import { createPractice } from '../../src/practice.js';
import { PUZZLES } from '../../src/logic/puzzles/index.js';

const SET = ['renk', 'nokta', 'aci', 'yorunge', 'zaman'];

test('sırayla ilerler ve tamamlanır', () => {
  const p = createPractice(SET, 1);
  expect(p.nextGame()).toBe('renk');
  p.finish('renk', 80);
  expect(p.nextGame()).toBe('nokta');
  SET.slice(1).forEach(id => p.finish(id, 50));
  expect(p.isComplete()).toBe(true);
  expect(p.nextGame()).toBeNull();
});

test('aynı oyun iki kez puanlanmaz, setin dışı yok sayılır', () => {
  const p = createPractice(SET, 1);
  p.finish('renk', 80);
  p.finish('renk', 10);
  p.finish('oran', 99);
  expect(p.scores).toEqual({ renk: 80 });
});

test('her antrenman yeni sorular üretir', () => {
  const a = createPractice(SET, 1), b = createPractice(SET, 2);
  expect(PUZZLES.aci.generate(a.seed('aci'))).not.toEqual(PUZZLES.aci.generate(b.seed('aci')));
  expect(a.seed('aci')).not.toBe('2026-10-26');
});

test('günlük set dizisi kopyalanır', () => {
  const src = SET.slice();
  const p = createPractice(src, 1);
  src.pop();
  expect(p.set).toHaveLength(5);
});
