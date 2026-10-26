// Zaman: sayaç görmeden hedef süre geçince dur.
import { makeRng } from '../../../shared/rng.js';
import { curve } from '../scoring.js';

export function generate(date) {
  return { target: makeRng(date + ':zaman').int(40, 99) / 10 };
}

export function score(puzzle, { elapsed }) {
  return curve(Math.abs(elapsed - puzzle.target), 1.6);
}
