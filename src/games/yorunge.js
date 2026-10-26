import { fromEvent } from './common.js';
import { position } from '../logic/puzzles/yorunge.js';

export const prompt = () => 'Top fırlatılacak ve havada <strong>kaybolacak</strong>. Yere nereye düşeceğini tahmin et ve oraya dokun.';

const SPEED = 0.8; // gerçek zamanın 0.8 katı

export function mount({ stage, puzzle, L, game, onAnswer, bag }) {
  const px = t => { const p = position(puzzle, t); return { x: p.x * L.W, y: p.y * L.H }; };
  const GY = puzzle.ground * L.H, X0 = puzzle.x0 * L.W, Y0 = puzzle.y0 * L.H;
  const path = (a, b) => {
    let d = '';
    for (let i = 0; i <= 40; i++) { const { x, y } = px(a + ((b - a) * i) / 40); d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }
    return d;
  };
  let t = 0, phase = 'ready', U = null, raf = 0;
  stage.innerHTML = `<svg viewBox="0 0 ${L.W} ${L.H}"></svg><div class="hint" id="hn">Fırlatmak için dokun</div>`;
  const sv = stage.querySelector('svg'), hint = stage.querySelector('#hn');
  bag.add(() => cancelAnimationFrame(raf));

  const draw = () => {
    let s = `<rect x="0" y="${GY}" width="${L.W}" height="${L.H - GY}" style="fill:var(--muted)" fill-opacity=".14"/>
      <line x1="0" y1="${GY}" x2="${L.W}" y2="${GY}" style="stroke:var(--muted)" stroke-width="3"/>
      <rect x="${X0 - 22}" y="${Y0 + 9}" width="44" height="${GY - Y0 - 9}" rx="6" style="fill:var(--muted)" fill-opacity=".3"/>`;
    if (t > 0) s += `<path d="${path(0, Math.min(t, puzzle.hideAt))}" fill="none" stroke="${game.gc}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>`;
    if (phase === 'done') {
      const XL = puzzle.xL * L.W;
      s += `<path d="${path(puzzle.hideAt, puzzle.tL)}" fill="none" style="stroke:var(--ok)" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>
        <circle cx="${XL}" cy="${GY}" r="9" style="fill:var(--ok);stroke:var(--surface)" stroke-width="3"/>
        <line x1="${U}" y1="${GY - 24}" x2="${U}" y2="${GY}" style="stroke:var(--fg)" stroke-width="3"/>
        <circle cx="${U}" cy="${GY - 28}" r="6" style="fill:var(--fg)"/>`;
    }
    if (phase === 'ready' || phase === 'fly') {
      const b = px(t);
      s += `<circle cx="${b.x}" cy="${b.y}" r="11" fill="${game.gc}" style="stroke:var(--surface)" stroke-width="3"/>`;
    }
    sv.innerHTML = s;
  };

  draw();
  stage.onpointerdown = e => {
    if (phase === 'ready') {
      phase = 'fly';
      hint.textContent = '';
      const t0 = performance.now();
      const step = now => {
        t = ((now - t0) / 1000) * SPEED;
        if (t >= puzzle.hideAt) { t = puzzle.hideAt; phase = 'guess'; hint.textContent = 'Nereye düşecek? Zemine dokun'; }
        draw();
        if (phase === 'fly') raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    } else if (phase === 'guess') {
      U = Math.min(L.W, Math.max(0, fromEvent(e, sv, L).x));
      phase = 'done';
      hint.textContent = '';
      draw();
      const err = Math.abs(U - puzzle.xL * L.W);
      onAnswer({ x: U / L.W }, `Yeşil nokta topun düştüğü yer. ${err < 4 ? 'Tam isabet!' : `Arada <b>${Math.round(err)}</b> birim var.`}`);
    }
  };
}
