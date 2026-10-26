// Nokta: kısa süre gösterilen noktaların sayısını tahmin et.
import { makeRng } from '../../../shared/rng.js';
import { curve } from '../scoring.js';

const MIN_DIST = 0.045;

export function generate(date) {
  const rng = makeRng(date + ':nokta');
  const count = rng.int(45, 85);
  const dots = [];
  let minDist = MIN_DIST, tries = 0;
  while (dots.length < count) {
    const p = { x: rng.float(0.05, 0.95), y: rng.float(0.05, 0.95) };
    if (dots.every(q => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 >= minDist ** 2)) dots.push(p);
    if (++tries % 2000 === 0) minDist *= 0.9; // sıkışırsa eşiği gevşet
  }
  return { count, dots };
}

export function score(puzzle, { guess }) {
  return curve(Math.abs(guess - puzzle.count) / puzzle.count, 0.35);
}
