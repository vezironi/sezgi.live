// Renk: 2 sn gösterilen rengi ton/açıklık seçicisinde yeniden bul.
import { makeRng } from '../../../shared/rng.js';
import { angleDiff } from './aci.js';

export const SATURATION = 78;

export function generate(date) {
  const rng = makeRng(date + ':renk');
  return { h: rng.int(0, 359), l: rng.int(32, 68), s: SATURATION };
}

export function colorDistance(puzzle, { h, l }) {
  return Math.sqrt((angleDiff(h, puzzle.h) / 60) ** 2 + ((l - puzzle.l) / 15) ** 2);
}

export function score(puzzle, answer) {
  const d = colorDistance(puzzle, answer);
  const v = Math.round(100 * Math.exp(-0.8 * d * d));
  return Number.isFinite(v) ? v : 0;
}
