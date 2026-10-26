import { count321, later } from './common.js';

export const prompt = () => 'Noktalar <strong>2 saniye</strong> görünecek. Sayma, tahmin et!';

export function mount({ stage, below, puzzle, L, game, onAnswer, bag }) {
  const draw = () => {
    stage.innerHTML = `<canvas width="${L.W * 2}" height="${L.H * 2}"></canvas>`;
    const cx = stage.firstChild.getContext('2d');
    cx.fillStyle = game.gc;
    for (const d of puzzle.dots) {
      cx.beginPath();
      cx.arc(d.x * L.W * 2, d.y * L.H * 2, 10, 0, Math.PI * 2);
      cx.fill();
    }
  };
  count321(stage, bag).then(() => {
    draw();
    later(bag, () => {
      stage.innerHTML = '<div class="cnt" style="animation:none;font-size:90px;opacity:.25">?</div>';
      below.innerHTML = `<form class="answer" id="fm"><input type="number" id="ans" placeholder="Kaç?" inputmode="numeric" autocomplete="off" aria-label="Kaç nokta gördün?"><button aria-label="Gönder">→</button></form>`;
      const input = below.querySelector('#ans');
      input.focus();
      below.querySelector('#fm').onsubmit = e => {
        e.preventDefault();
        const v = parseInt(input.value, 10);
        if (!Number.isFinite(v)) { input.focus(); return; }
        below.innerHTML = '';
        draw();
        onAnswer({ guess: v }, `Doğrusu <b>${puzzle.count}</b>, sen <b>${v}</b> dedin.`);
      };
    }, 2000);
  });
}
