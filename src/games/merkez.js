import { fromEvent, toPx } from './common.js';
import { centroid } from '../logic/puzzles/merkez.js';

export const prompt = () => 'Üçgenin <strong>denge noktasına</strong> dokun. Kartondan kesilse parmağının ucunda duracağı yer.';

export function mount({ stage, puzzle, L, game, onAnswer }) {
  const pts = puzzle.pts.map(p => toPx(p, L));
  const C = toPx(centroid(puzzle), L);
  let U = null;
  stage.innerHTML = `<svg viewBox="0 0 ${L.W} ${L.H}"></svg>`;
  const sv = stage.querySelector('svg');

  const draw = () => {
    let s = `<polygon points="${pts.map(p => `${p.x},${p.y}`).join(' ')}" fill="${game.gc}" fill-opacity=".2" stroke="${game.gc}" stroke-width="4" stroke-linejoin="round"/>`;
    if (U) {
      s += `<line x1="${U.x}" y1="${U.y}" x2="${C.x}" y2="${C.y}" style="stroke:var(--fg)" stroke-width="2" stroke-dasharray="3 4"/>
        <circle cx="${C.x}" cy="${C.y}" r="9" style="fill:var(--ok);stroke:var(--surface)" stroke-width="3"/>
        <circle cx="${U.x}" cy="${U.y}" r="8" style="fill:var(--fg);stroke:var(--surface)" stroke-width="3"/>`;
    }
    sv.innerHTML = s;
  };

  draw();
  sv.onpointerdown = e => {
    if (U) return;
    U = fromEvent(e, sv, L);
    draw();
    const dist = Math.hypot(U.x - C.x, U.y - C.y);
    onAnswer({ x: U.x / L.W, y: U.y / L.H, aspect: L.W / L.H },
      `Yeşil nokta gerçek merkez. ${dist < 4 ? 'Neredeyse tam üstü!' : `Arada <b>${Math.round(dist)}</b> birim var.`}`);
  };
}
