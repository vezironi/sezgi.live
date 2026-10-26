// Açı: kesikli çizgiden (0°) saat yönünün tersine istenen açıyı kur.
import { makeRng } from '../../../shared/rng.js';
import { curve } from '../scoring.js';

export function generate(date) {
  return { target: makeRng(date + ':aci').int(15, 345) };
}

export function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function score(puzzle, { angle }) {
  return curve(angleDiff(angle, puzzle.target), 22);
}
