import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitTaps, REF_BEATS, FREE_BEATS } from '../../src/logic/puzzles/ritim.js';

const I = 500, t0 = 1000;
const beat = k => t0 + k * I;

test('eşlik dokunuşları yetmezse ses durmaz', () => {
  assert.deepEqual(splitTaps([beat(0), beat(1)], t0, I), { stopBeat: null, offsets: [] });
});

test('4. eşlik dokunuşunun vuruşunda ses durur, serbest dokunuşlar sonraki vuruşlara göre ölçülür', () => {
  // Oyuncu 3. vuruştan itibaren eşlik ediyor: 2,3,4,5 → ses 5. vuruşta durur.
  const sync = [2, 3, 4, 5].map(beat);
  const free = [6, 7, 8].map((k, j) => beat(k) + (j === 1 ? 40 : -20));
  const r = splitTaps([...sync, ...free], t0, I);
  assert.equal(r.stopBeat, 5);
  assert.deepEqual(r.offsets, [-20, 40, -20]);
});

test('ilk vuruştan çok önceki dokunuş sayılmaz', () => {
  const r = splitTaps([t0 - 400, ...[0, 1, 2, 3].map(beat), beat(4) + 10], t0, I);
  assert.equal(r.stopBeat, 3);
  assert.deepEqual(r.offsets, [10]);
});

test('en fazla FREE_BEATS serbest dokunuş ölçülür', () => {
  const taps = Array.from({ length: REF_BEATS + FREE_BEATS + 3 }, (_, k) => beat(k));
  assert.equal(splitTaps(taps, t0, I).offsets.length, FREE_BEATS);
});
