import { fromEvent } from './common.js';
import { angleDiff } from '../logic/puzzles/aci.js';

export const prompt = p => `Kesikli çizgiden saat yönünün tersine <strong>${p.target}°</strong> aç. Bıraktığın an kaydedilir.`;

const R = 115, CY = 150;

export function mount({ stage, puzzle, L, game, onAnswer }) {
  const CX = L.W / 2;
  let A = 0, done = false, drag = false, moved = false;
  stage.innerHTML = `<svg viewBox="0 0 ${L.W} ${L.H}"></svg><div class="hint" id="hn">Tutamağı sürükle</div>`;
  const sv = stage.querySelector('svg'), hint = stage.querySelector('#hn');
  const P = (deg, r) => [CX + r * Math.cos((deg * Math.PI) / 180), CY - r * Math.sin((deg * Math.PI) / 180)];
  const arc = (deg, r) => {
    const [x, y] = P(deg, r);
    return `M${CX + r} ${CY} A${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${x} ${y}`;
  };

  const draw = () => {
    const [hx, hy] = P(A, R);
    let s = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" style="stroke:var(--muted)" stroke-opacity=".2" stroke-width="2"/>
      <line x1="${CX}" y1="${CY}" x2="${CX + 120}" y2="${CY}" style="stroke:var(--muted)" stroke-width="3" stroke-dasharray="8 7" stroke-linecap="round"/>
      ${A > 0.5 ? `<path d="${arc(A, 38)}" fill="none" stroke="${game.gc}" stroke-width="4" stroke-linecap="round"/>` : ''}`;
    if (done) {
      const [tx, ty] = P(puzzle.target, R);
      s += `<line x1="${CX}" y1="${CY}" x2="${tx}" y2="${ty}" style="stroke:var(--ok)" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/>
        <circle cx="${tx}" cy="${ty}" r="8" style="fill:var(--ok)"/>`;
    }
    s += `<line x1="${CX}" y1="${CY}" x2="${hx}" y2="${hy}" style="stroke:var(--fg)" stroke-width="5" stroke-linecap="round"/>
      <circle cx="${CX}" cy="${CY}" r="7" style="fill:var(--fg)"/>
      <circle cx="${hx}" cy="${hy}" r="17" fill="${game.gc}" style="stroke:var(--surface)" stroke-width="4"/>`;
    sv.innerHTML = s;
  };
  const move = e => {
    const { x, y } = fromEvent(e, sv, L);
    A = ((Math.atan2(CY - y, x - CX) * 180) / Math.PI + 360) % 360;
    moved = true;
    draw();
  };

  draw();
  sv.onpointerdown = e => {
    if (done) return;
    drag = true;
    sv.setPointerCapture(e.pointerId);
    hint.style.opacity = 0;
    move(e);
  };
  sv.onpointermove = e => { if (drag && !done) move(e); };
  sv.onpointerup = () => {
    if (!drag || done || !moved) return;
    drag = false;
    done = true;
    draw();
    onAnswer({ angle: A }, `Hedef <b>${puzzle.target}°</b>, sen <b>${Math.round(A)}°</b> yaptın. Fark <b>${Math.round(angleDiff(A, puzzle.target))}°</b>.`);
  };
}
