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

// Dokunuşları ayırır: ilk REF_BEATS dokunuş ritme eşlik; ses 4. eşlik dokunuşuna en yakın vuruşta (stopBeat) kesilir.
// Sonraki en fazla FREE_BEATS dokunuş, stopBeat'ten sonraki vuruşlara göre ölçülür.
// İlk vuruştan yarım aralıktan daha önceki dokunuşlar sayılmaz.
export function splitTaps(taps, tStart, I) {
  const valid = taps.filter(x => x >= tStart - I / 2);
  if (valid.length < REF_BEATS) return { stopBeat: null, offsets: [] };
  const stopBeat = Math.max(0, Math.round((valid[REF_BEATS - 1] - tStart) / I));
  const offsets = valid.slice(REF_BEATS, REF_BEATS + FREE_BEATS).map((x, j) => x - (tStart + (stopBeat + 1 + j) * I));
  return { stopBeat, offsets };
}
