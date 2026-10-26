// Merkez: üçgenin ağırlık merkezine dokun.
import { makeRng } from '../../../shared/rng.js';
import { curve } from '../scoring.js';

const MIN_AREA = 0.13;

const area = pts =>
  Math.abs((pts[1].x - pts[0].x) * (pts[2].y - pts[0].y) - (pts[2].x - pts[0].x) * (pts[1].y - pts[0].y)) / 2;

export function generate(date) {
  const rng = makeRng(date + ':merkez');
  let pts;
  do {
    pts = [0, 1, 2].map(() => ({ x: rng.float(0.08, 0.92), y: rng.float(0.08, 0.92) }));
  } while (area(pts) < MIN_AREA);
  return { pts };
}

export const centroid = ({ pts }) => ({ x: (pts[0].x + pts[1].x + pts[2].x) / 3, y: (pts[0].y + pts[1].y + pts[2].y) / 3 });

// Hata ekran uzayında (x·aspect, y) ölçülür ve üçgenin boyutuna bölünür: kare ve geniş alanda aynı zorluk.
export function score(puzzle, { x, y, aspect }) {
  const c = centroid(puzzle);
  const screen = puzzle.pts.map(p => ({ x: p.x * aspect, y: p.y }));
  const dist = Math.hypot((x - c.x) * aspect, y - c.y);
  return curve(dist / Math.sqrt(area(screen)), 0.3);
}
