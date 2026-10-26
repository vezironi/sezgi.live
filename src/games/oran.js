import { fromEvent } from './common.js';
import { target } from '../logic/puzzles/oran.js';

export const prompt = p => `Çizgide <strong>başlangıçtan ${p.p}/${p.q}</strong> uzaklıktaki noktayı işaretle. Bıraktığın an kaydedilir.`;

export function mount({ stage, puzzle, L, game, onAnswer }) {
  const x1 = puzzle.x1 * L.W, x2 = puzzle.x2 * L.W, Y = puzzle.y * L.H, len = x2 - x1;
  const TX = target(puzzle) * L.W, SX = puzzle.fromLeft ? x1 : x2;
  let U = null, drag = false, done = false;
  stage.innerHTML = `<svg viewBox="0 0 ${L.W} ${L.H}"></svg><div class="hint" id="hn">Çizgi üzerinde sürükle</div>`;
  const sv = stage.querySelector('svg'), hint = stage.querySelector('#hn');

  const draw = () => {
    let s = `<line x1="${x1}" y1="${Y}" x2="${x2}" y2="${Y}" style="stroke:var(--fg)" stroke-width="6" stroke-linecap="round"/>
      <line x1="${x1}" y1="${Y - 16}" x2="${x1}" y2="${Y + 16}" style="stroke:var(--fg)" stroke-width="4" stroke-linecap="round"/>
      <line x1="${x2}" y1="${Y - 16}" x2="${x2}" y2="${Y + 16}" style="stroke:var(--fg)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${SX}" cy="${Y}" r="9" fill="${game.gc}"/>
      <text x="${Math.min(L.W - 50, Math.max(50, SX))}" y="${Y + 46}" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="700" font-size="17" fill="${game.gc}">başlangıç</text>`;
    if (done) {
      s += `<line x1="${TX}" y1="${Y - 34}" x2="${TX}" y2="${Y + 34}" style="stroke:var(--ok)" stroke-width="4" stroke-dasharray="3 5" stroke-linecap="round"/>
        <circle cx="${TX}" cy="${Y - 38}" r="7" style="fill:var(--ok)"/>`;
    }
    if (U !== null) {
      s += `<path d="M${U} ${Y - 12} l-12 -20 h24 z" fill="${game.gc}" style="stroke:var(--surface)" stroke-width="3" stroke-linejoin="round"/>
        <line x1="${U}" y1="${Y - 12}" x2="${U}" y2="${Y + 12}" stroke="${game.gc}" stroke-width="4"/>`;
    }
    sv.innerHTML = s;
  };
  const move = e => { U = Math.min(x2, Math.max(x1, fromEvent(e, sv, L).x)); draw(); };

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
    if (!drag || done) return;
    drag = false;
    done = true;
    draw();
    const err = Math.abs(U - TX) / len;
    onAnswer({ x: U / L.W }, `Yeşil çizgi doğru yer. Sapman çizgi boyunun <b>%${(err * 100).toFixed(1).replace('.', ',')}</b>'i kadar.`);
  };
}
