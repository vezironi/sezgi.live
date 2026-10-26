import { test, expect } from 'vitest';
import { curve, dayScore, rankFor, squareFor, shareText } from '../../src/logic/scoring.js';
import { dayScore as sharedDayScore } from '../../shared/games.js';

test('curve', () => {
  expect(curve(0, 10)).toBe(100);
  expect(curve(10, 10)).toBe(5);
  expect(curve(-10, 10)).toBe(5);
  expect(curve(NaN, 10)).toBe(0);
  expect(curve(Infinity, 10)).toBe(0);
});

test('dayScore ortalama yuvarlar', () => {
  expect(dayScore([92, 78, 88, 61, 93])).toBe(82);
  expect(dayScore([100, 100, 100, 100, 100])).toBe(100);
  expect(sharedDayScore).toBe(dayScore);
});

test('rütbe eşikleri', () => {
  expect(rankFor(90)).toBe('🦅 Kartal Gözü');
  expect(rankFor(89)).toBe('🎯 Keskin');
  expect(rankFor(76)).toBe('🎯 Keskin');
  expect(rankFor(75)).toBe('💪 Sağlam');
  expect(rankFor(60)).toBe('💪 Sağlam');
  expect(rankFor(40)).toBe('🙂 İdare Eder');
  expect(rankFor(39)).toBe('🌫️ Bulanık');
});

test('kareler', () => {
  expect([85, 84, 65, 64, 40, 39].map(squareFor)).toEqual(['🟩', '🟨', '🟨', '🟧', '🟧', '🟥']);
});

test('paylaşım metni', () => {
  expect(shareText('2026-11-30', ['nokta', 'aci', 'zaman', 'renk', 'merkez'], { nokta: 92, aci: 78, zaman: 88, renk: 61, merkez: 93 }))
    .toBe('sezgi.live #36 · 82/100\n🎯 Keskin\n🟩 Nokta 92\n🟨 Açı 78\n🟩 Zaman 88\n🟧 Renk 61\n🟩 Merkez 93\nsezgi.live');
});
