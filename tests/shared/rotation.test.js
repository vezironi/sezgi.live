import { test, expect } from 'vitest';
import { GAME_IDS, GAMES } from '../../shared/games.js';
import { dailySet } from '../../shared/rotation.js';
import { addDays } from '../../shared/date.js';

test('8 oyun metası', () => {
  expect(GAME_IDS).toEqual(['nokta', 'aci', 'zaman', 'renk', 'merkez', 'yorunge', 'ritim', 'oran']);
  expect(GAMES.aci).toMatchObject({ ad: 'Açı', gc: '#6c4cff', gce: '#4f31d9' });
  expect(GAMES.yorunge.ad).toBe('Yörünge');
});

test('5 farklı geçerli oyun', () => {
  const s = dailySet('2026-10-26');
  expect(s).toHaveLength(5);
  expect(new Set(s).size).toBe(5);
  s.forEach(id => expect(GAME_IDS).toContain(id));
});

test('deterministik', () => expect(dailySet('2026-12-01')).toEqual(dailySet('2026-12-01')));

test('hiçbir oyun art arda 2 günden fazla dışarıda kalmaz (400 gün)', () => {
  const absent = Object.fromEntries(GAME_IDS.map(id => [id, 0]));
  for (let i = 0; i < 400; i++) {
    const s = dailySet(addDays('2026-10-26', i));
    for (const id of GAME_IDS) {
      absent[id] = s.includes(id) ? 0 : absent[id] + 1;
      expect(absent[id]).toBeLessThanOrEqual(2);
    }
  }
});

test('günler arasında set değişir', () => {
  const sets = new Set();
  for (let i = 0; i < 10; i++) sets.add(dailySet(addDays('2026-10-26', i)).join(','));
  expect(sets.size).toBeGreaterThan(5);
});

test('LAUNCH öncesi tarih hata vermez', () => expect(dailySet('2026-01-01')).toHaveLength(5));
