// Yörünge: yolun ortasında kaybolan topun zemine düşeceği yeri tahmin et.
// Birimler: x alan genişliğine, y alan yüksekliğine göre (0-1), t saniye.
import { makeRng } from '../../../shared/rng.js';
import { curve } from '../scoring.js';

export const X0 = 0.11;
export const GROUND = 0.907;
export const GRAVITY = 1.4;

export function generate(date) {
  const rng = makeRng(date + ':yorunge');
  const y0 = rng.float(0.5, 0.78);
  const vy = rng.float(0.57, 0.83);
  const tL = (vy + Math.sqrt(vy * vy + 2 * GRAVITY * (GROUND - y0))) / GRAVITY;
  const xL = rng.float(0.5, 0.93);
  return { x0: X0, y0, ground: GROUND, g: GRAVITY, vy, vx: (xL - X0) / tL, tL, xL, hideAt: tL * rng.float(0.38, 0.52) };
}

export const position = (p, t) => ({ x: p.x0 + p.vx * t, y: p.y0 - p.vy * t + 0.5 * p.g * t * t });

export function score(puzzle, { x }) {
  return curve(Math.abs(x - puzzle.xL), 0.16);
}
