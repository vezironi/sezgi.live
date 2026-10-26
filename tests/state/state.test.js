import { test, expect, beforeEach } from 'vitest';
import { createState, safeLocalStorage } from '../../src/state.js';
import { dailySet } from '../../shared/rotation.js';

const memory = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
let storage, clock;
const now = () => clock;
const at = iso => { clock = new Date(iso); };
const DATE = '2026-11-03';
const set = dailySet(DATE);
const fresh = () => createState({ storage, now });
const completeDay = st => st.today().set.forEach(id => { st.startGame(id); st.finishGame(id, 50); });

beforeEach(() => { storage = memory(); at('2026-11-03T09:00:00Z'); });

test('yeni gün seti dailySet', () => {
  const t = fresh().today();
  expect(t).toMatchObject({ date: DATE, set, scores: {}, inProgress: null, submitted: false, ranks: null });
});

test('nextGame sıradaki puansız oyun', () => {
  const st = fresh();
  expect(st.nextGame()).toBe(set[0]);
  st.startGame(set[0]); st.finishGame(set[0], 77);
  expect(st.nextGame()).toBe(set[1]);
  expect(fresh().today().scores[set[0]]).toBe(77);
});

test('aynı oturumda oynanan oyun 0 yapılmaz', () => {
  const st = fresh();
  st.startGame(set[0]);
  expect(st.today().scores[set[0]]).toBeUndefined();
  expect(st.today().inProgress).toBe(set[0]);
});

test('terk edilen oyun 0 ve sıradakine geçilir', () => {
  fresh().startGame(set[0]);
  const st2 = fresh();
  expect(st2.today().scores[set[0]]).toBe(0);
  expect(st2.today().inProgress).toBeNull();
  expect(st2.nextGame()).toBe(set[1]);
});

test('aynı oyun ikinci kez puanlanmaz', () => {
  const st = fresh();
  st.startGame(set[0]); st.finishGame(set[0], 40);
  st.finishGame(set[0], 99);
  expect(st.today().scores[set[0]]).toBe(40);
  st.finishGame('yok', 99);
  expect(st.today().scores.yok).toBeUndefined();
});

test('tamamlanan gün yeniden oynatılmaz', () => {
  const st = fresh();
  completeDay(st);
  expect(st.isComplete()).toBe(true);
  expect(fresh().nextGame()).toBeNull();
});

test('markSubmitted kalıcı', () => {
  const st = fresh();
  completeDay(st);
  st.markSubmitted({ day: { rank: 3 } });
  expect(fresh().today()).toMatchObject({ submitted: true, ranks: { day: { rank: 3 } } });
});

test('gece yarısını geçen yarım set düşer', () => {
  const st = fresh();
  st.startGame(set[0]); st.finishGame(set[0], 90);
  at('2026-11-03T21:01:00Z');
  const st2 = fresh();
  expect(st2.today().date).toBe('2026-11-04');
  expect(st2.today().scores).toEqual({});
  expect(st2.streak()).toBe(0);
});

test('oturum açıkken gün dönerse yeni güne geçer', () => {
  const st = fresh();
  st.startGame(set[0]);
  at('2026-11-03T21:01:00Z');
  st.finishGame(set[0], 90); // eski günün oyunu: yeni güne yazılmaz
  expect(st.today().date).toBe('2026-11-04');
  expect(Object.values(st.today().scores)).toEqual([]);
});

test('seri', () => {
  for (const d of ['2026-11-03', '2026-11-04', '2026-11-05']) { at(d + 'T09:00:00Z'); completeDay(fresh()); }
  expect(fresh().streak()).toBe(3);
  at('2026-11-06T09:00:00Z');
  expect(fresh().streak()).toBe(3); // bugün henüz oynamadı ama dün tamamladı
  at('2026-11-07T09:00:00Z');
  expect(fresh().streak()).toBe(0); // bir gün atlandı
  completeDay(fresh());
  expect(fresh().streak()).toBe(1);
});

test('kimlik ve tema', () => {
  const st = fresh();
  expect(st.identity()).toBeNull();
  st.setIdentity({ token: 't', nick: 'sl-1234' });
  expect(fresh().identity()).toEqual({ token: 't', nick: 'sl-1234' });
  expect(st.theme()).toBeNull();
  st.setTheme('dark');
  expect(storage.getItem('sezgi-tema')).toBe('dark');
  expect(fresh().theme()).toBe('dark');
});

test('bozuk kayıt sıfırdan başlar', () => {
  storage.setItem('sezgi-v1', '{bozuk');
  expect(fresh().today().set).toEqual(set);
});

test('storage throw ederse çalışmaya devam eder', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const s = createState({ storage: safeLocalStorage(bad), now });
  const id = s.today().set[0];
  s.startGame(id); s.finishGame(id, 70);
  expect(s.today().scores[id]).toBe(70);
  s.setTheme('light');
  expect(s.theme()).toBe('light');
});

test('localStorage erişimi (getter) throw ederse uygulama açılır', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    const s = createState({ now });
    const id = s.today().set[0];
    s.startGame(id); s.finishGame(id, 55);
    expect(s.today().scores[id]).toBe(55);
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc); else delete globalThis.localStorage;
  }
});

test('localStorage yoksa bellek kullanılır', () => {
  const s = safeLocalStorage(undefined);
  s.setItem('a', '1');
  expect(s.getItem('a')).toBe('1');
});
