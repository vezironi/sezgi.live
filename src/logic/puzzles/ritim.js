// Ritim: ses kesildikten sonra tempoyu koru.
import { makeRng } from '../../../shared/rng.js';
import { curve } from '../scoring.js';

export const REF_BEATS = 4;
export const FREE_BEATS = 8;

export function generate(date) {
  return { bpm: makeRng(date + ':ritim').int(80, 128) };
}

// offsets: serbest vuruşların beklenen ızgaraya göre sapması (ms).
export function score(puzzle, { offsets }) {
  const mean = offsets.reduce((a, o) => a + Math.abs(o), 0) / offsets.length;
  return curve(mean, 120);
}
