import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTourStore } from '../../src/tournament/store.js';
import { safeLocalStorage } from '../../src/state.js';

const memory = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
};

test('pid ve son ad saklanır, kalıcıdır', () => {
  const backing = memory();
  const a = createTourStore(safeLocalStorage(backing));
  a.setPid('K7QXA', 'p1');
  a.setLastName('Ayşe');
  const b = createTourStore(safeLocalStorage(backing));
  assert.equal(b.pid('K7QXA'), 'p1');
  assert.equal(b.lastName(), 'Ayşe');
  assert.equal(b.pid('ZZZZZ'), null);
});

test('forget pid ve başlatma kaydını siler', () => {
  const s = createTourStore(safeLocalStorage(memory()));
  s.setPid('K7QXA', 'p1');
  s.setStarted('K7QXA', { no: 1, step: 2 });
  assert.deepEqual(s.started('K7QXA'), { no: 1, step: 2 });
  s.forget('K7QXA');
  assert.equal(s.pid('K7QXA'), null);
  assert.equal(s.started('K7QXA'), null);
});

test('clearStarted yalnızca başlatma kaydını siler', () => {
  const s = createTourStore(safeLocalStorage(memory()));
  s.setPid('K7QXA', 'p1');
  s.setStarted('K7QXA', { no: 1, step: 0 });
  s.clearStarted('K7QXA');
  assert.equal(s.started('K7QXA'), null);
  assert.equal(s.pid('K7QXA'), 'p1');
});

test('bozuk kayıtla boş başlar', () => {
  const s = createTourStore(safeLocalStorage({ getItem: () => '{', setItem() {}, removeItem() {} }));
  assert.equal(s.pid('K7QXA'), null);
  assert.equal(s.lastName(), '');
});
