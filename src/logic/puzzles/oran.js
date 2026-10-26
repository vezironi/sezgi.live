// Oran: çizgide başlangıçtan p/q uzaklıktaki noktayı işaretle.
import { makeRng } from '../../../shared/rng.js';
import { curve } from '../scoring.js';

const FRACTIONS = [[1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6], [5, 6], [2, 7], [3, 7], [4, 7], [3, 8], [5, 8], [4, 9], [7, 9]];
const MARGIN = 0.067;

export function generate(date) {
  const rng = makeRng(date + ':oran');
  const [p, q] = rng.pick(FRACTIONS);
  const fromLeft = rng.next() < 0.5;
  const len = rng.float(0.55, 0.87);
  const x1 = rng.float(MARGIN, 1 - MARGIN - len);
  return { p, q, fromLeft, x1, x2: x1 + len, y: rng.float(0.43, 0.57) };
}

export function target({ p, q, fromLeft, x1, x2 }) {
  const len = x2 - x1;
  return fromLeft ? x1 + (len * p) / q : x2 - (len * p) / q;
}

export function score(puzzle, { x }) {
  return curve(Math.abs(x - target(puzzle)) / (puzzle.x2 - puzzle.x1), 0.07);
}
