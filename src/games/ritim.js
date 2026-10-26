import { later } from './common.js';
import { REF_BEATS, FREE_BEATS } from '../logic/puzzles/ritim.js';

export const prompt = () => 'İlk <strong>4 vuruşu</strong> dinle ve eşlik et. Ses kesilince aynı tempoyla <strong>8 kez</strong> daha dokun.';

const LEAD_MS = 600;

export function mount({ stage, puzzle, onAnswer, bag }) {
  const I = 60000 / puzzle.bpm;
  let actx = null, tStart = 0, phase = 'ready';
  const taps = [];
  stage.innerHTML = `<button class="timer-btn" id="b">Başlat</button>
    <div class="beats" id="bt">${'<i></i>'.repeat(FREE_BEATS)}</div>
    <div class="hint" id="hn">🔊 Sesin açık olsun · Bilgisayarda boşluk tuşu da olur</div>`;
  const b = stage.querySelector('#b'), dots = [...stage.querySelectorAll('#bt i')], hint = stage.querySelector('#hn');
  const pulse = cls => { b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls); };
  const freeTaps = () => taps.filter(x => x > tStart + (REF_BEATS - 0.5) * I);

  const blip = (when, accent) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine';
    o.frequency.value = accent ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.5, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    o.connect(g).connect(actx.destination);
    o.start(when);
    o.stop(when + 0.1);
  };

  const finish = () => {
    phase = 'done';
    b.disabled = true;
    const free = freeTaps().slice(0, FREE_BEATS);
    const offsets = free.map((x, j) => x - (tStart + (REF_BEATS + j) * I));
    const mean = offsets.reduce((a, o) => a + Math.abs(o), 0) / offsets.length;
    const intervals = free.slice(1).map((x, j) => x - free[j]);
    const pct = Math.round((I / (intervals.reduce((a, c) => a + c, 0) / intervals.length) - 1) * 100);
    b.innerHTML = `${Math.round(mean)}<br><span style="font-size:16px">ms sapma</span>`;
    const tempo = Math.abs(pct) < 2 ? 'Temponu çok iyi korudun!' : `Temponu <b>%${Math.abs(pct)}</b> ${pct > 0 ? 'hızlandırdın' : 'yavaşlattın'}.`;
    onAnswer({ offsets }, `Tempo <b>${puzzle.bpm} BPM</b>. Ortalama sapman <b>${Math.round(mean)} ms</b>. ${tempo}`);
  };

  // iOS Safari sesi yalnızca click/keydown gibi bir hareketle açar; bağlam askıdaysa resume edilir.
  const start = async () => {
    if (phase !== 'ready') return;
    phase = 'starting';
    actx = new (window.AudioContext || window.webkitAudioContext)();
    try { await actx.resume(); } catch { /* ses açılamazsa görsel nabız yine çalışır */ }
    const unlock = actx.createBufferSource();
    unlock.buffer = actx.createBuffer(1, 1, 22050);
    unlock.connect(actx.destination);
    unlock.start();
    begin();
  };

  // Referans vuruşlar ses saatinde planlanır; ızgara aynı ana performance.now() ile bağlanır.
  const begin = () => {
    const a0 = actx.currentTime + LEAD_MS / 1000;
    for (let k = 0; k < REF_BEATS; k++) blip(a0 + (k * I) / 1000, k === 0);
    // Ses çıkış gecikmesi kadar ızgarayı kaydır (özellikle mobil/Bluetooth).
    tStart = performance.now() + LEAD_MS + (actx.outputLatency || actx.baseLatency || 0) * 1000;
    phase = 'run';
    b.textContent = 'Dokun';
    hint.textContent = 'Dinle ve eşlik et…';
    for (let k = 0; k < REF_BEATS; k++) later(bag, () => pulse('beat'), LEAD_MS + k * I);
    later(bag, () => { hint.textContent = 'Ses kesildi, devam et!'; }, LEAD_MS + (REF_BEATS - 0.5) * I);
  };

  const tap = () => {
    if (phase !== 'run') return;
    taps.push(performance.now());
    pulse('hit');
    const n = freeTaps().length;
    dots.forEach((el, i) => el.classList.toggle('on', i < n));
    if (n >= FREE_BEATS) finish();
  };

  // Başlatma click ile (iOS ses kilidi), vuruşlar pointerdown ile (en düşük gecikme).
  b.onclick = start;
  b.onpointerdown = e => { if (phase === 'run') { e.preventDefault(); tap(); } };
  const onKey = e => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (e.repeat) return;
    if (phase === 'ready') start(); else tap();
  };
  document.addEventListener('keydown', onKey);
  bag.add(() => { document.removeEventListener('keydown', onKey); if (actx) actx.close(); });
}
