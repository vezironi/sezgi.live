import { fmtSec } from './common.js';

export const prompt = p => `<strong>${fmtSec(p.target)} saniye</strong> geçti dediğin an dokun. Sayaç yok, sadece iç saatin.`;

export function mount({ stage, puzzle, onAnswer, bag }) {
  stage.innerHTML = '<button class="timer-btn" id="b">Başlat</button>';
  const b = stage.querySelector('#b');
  let t0 = 0, done = false;

  const press = () => {
    if (done) return;
    if (!t0) {
      t0 = performance.now();
      b.textContent = 'Dur!';
      b.classList.add('run');
      return;
    }
    const E = (performance.now() - t0) / 1000, diff = E - puzzle.target;
    done = true;
    b.classList.remove('run');
    b.disabled = true;
    b.innerHTML = `${fmtSec(E)}<br><span style="font-size:16px">saniye</span>`;
    const verdict = Math.abs(diff) < 0.05 ? 'Tam isabet!' : `<b>${fmtSec(Math.abs(diff))} sn</b> ${diff > 0 ? 'geç' : 'erken'} kaldın.`;
    onAnswer({ elapsed: E }, `Hedef <b>${fmtSec(puzzle.target)} sn</b>. ${verdict}`);
  };

  b.onpointerdown = e => { e.preventDefault(); press(); };
  const onKey = e => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) press();
  };
  document.addEventListener('keydown', onKey);
  bag.add(() => document.removeEventListener('keydown', onKey));
}
