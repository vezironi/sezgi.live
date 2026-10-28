import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPractice, createPracticeStats } from '../../src/practice.js';
import { safeLocalStorage } from '../../src/state.js';

const memory = () => {
  const m = new Map();
  return safeLocalStorage({ getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) });
};

test('hiç oynanmamış oyunun istatistiği yok', () => {
  assert.equal(createPracticeStats(memory()).get('nokta'), null);
});

test('denemeler en iyi, yuvarlanmış ortalama ve sayı olarak tutulur', () => {
  const s = createPracticeStats(memory());
  assert.deepEqual(s.record('nokta', 70), { best: 70, avg: 70, count: 1, record: true });
  assert.deepEqual(s.record('nokta', 50), { best: 70, avg: 60, count: 2, record: false });
  assert.deepEqual(s.record('nokta', 91), { best: 91, avg: 70, count: 3, record: true });
  assert.deepEqual(s.get('nokta'), { best: 91, avg: 70, count: 3 });
  assert.equal(s.get('aci'), null);
});

test('eşit puan rekor sayılmaz', () => {
  const s = createPracticeStats(memory());
  s.record('aci', 80);
  assert.equal(s.record('aci', 80).record, false);
});

test('istatistikler kalıcıdır, bozuk kayıtla boş başlar', () => {
  const st = memory();
  createPracticeStats(st).record('renk', 40);
  assert.deepEqual(createPracticeStats(st).get('renk'), { best: 40, avg: 40, count: 1 });
  const bad = safeLocalStorage({ getItem: () => '{', setItem() {}, removeItem() {} });
  assert.equal(createPracticeStats(bad).get('renk'), null);
});

test('antrenman oturumu tek oyunludur, her denemede yeni soru', () => {
  const p = createPractice('zaman', createPracticeStats(memory()), 7);
  assert.deepEqual(p.set, ['zaman']);
  assert.deepEqual(p.scores, {});
  const first = p.seed('zaman');
  const r = p.finish('zaman', 65);
  assert.equal(r.count, 1);
  assert.deepEqual(p.scores, { zaman: 65 });
  p.again();
  assert.deepEqual(p.scores, {});
  assert.notEqual(p.seed('zaman'), first);
});

test('oturum aynı denemeyi iki kez kaydetmez', () => {
  const stats = createPracticeStats(memory());
  const p = createPractice('oran', stats, 1);
  p.finish('oran', 50);
  p.finish('oran', 90);
  assert.deepEqual(stats.get('oran'), { best: 50, avg: 50, count: 1 });
});
