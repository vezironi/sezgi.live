import { later } from './common.js';
import { REF_BEATS, FREE_BEATS, splitTaps } from '../logic/puzzles/ritim.js';
import { UI, icon } from '../ui/icons.js';

export const prompt = () => 'Ritme <strong>4 kez</strong> dokunarak eşlik et. Ses kesilince aynı tempoyla <strong>8 kez</strong> daha dokun.';

const LEAD_MS = 600;
const LOOKAHEAD_S = 0.12; // ses saatinde ne kadar ilerisi planlanır; ses kesilince en fazla bu kadarı iptal edilir

export function mount({ stage, puzzle, onAnswer, bag }) {
  const I = 60000 / puzzle.bpm;
  let actx = null, tStart = 0, a0 = 0, phase = 'ready';
  let nextBeat = 0, stopAt = Infinity; // stopAt: son çalınacak vuruş (4. eşlik dokunuşunda belirlenir)
  const taps = [], voices = [];
  stage.innerHTML = `<button class="timer-btn" id="b">Başlat</button>
    <div class="beats" id="bt">${'<i></i>'.repeat(FREE_BEATS)}</div>
    <div class="hint" id="hn">${icon(UI.sound, { size: 15, cls: 'inl' })} Sesin açık olsun · Bilgisayarda boşluk tuşu da olur</div>`;
  const b = stage.querySelector('#b'), dots = [...stage.querySelectorAll('#bt i')], hint = stage.querySelector('#hn');
  const pulse = cls => { b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls); };

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
    return g;
  };

  // Metronom durana kadar vuruşları kısa aralıklarla ses saatinde planlar; görsel nabız aynı ızgaraya bağlı.
  const schedule = () => {
    while (nextBeat <= stopAt && a0 + (nextBeat * I) / 1000 < actx.currentTime + LOOKAHEAD_S) {
      const k = nextBeat++;
      voices.push({ k, g: blip(a0 + (k * I) / 1000, k % 4 === 0) });
      later(bag, () => { if (k <= stopAt) pulse('beat'); }, tStart + k * I - performance.now());
    }
  };

  const stopSound = beat => {
    stopAt = beat;
    for (const v of voices) if (v.k > beat) v.g.disconnect(); // planlanmış ama çalınmaması gereken vuruşlar
    hint.textContent = 'Ses kesildi, aynı tempoyla devam et!';
  };

  const finish = offsets => {
    phase = 'done';
    b.disabled = true;
    const mean = offsets.reduce((a, o) => a + Math.abs(o), 0) / offsets.length;
    const avgInterval = I + (offsets[offsets.length - 1] - offsets[0]) / (offsets.length - 1);
    const pct = Math.round((I / avgInterval - 1) * 100);
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

  // Vuruşlar ses saatinde planlanır; ızgara aynı ana performance.now() ile bağlanır. Metronom oyuncu 4 kez eşlik edene kadar susmaz.
  const begin = () => {
    a0 = actx.currentTime + LEAD_MS / 1000;
    // Ses çıkış gecikmesi kadar ızgarayı kaydır (özellikle mobil/Bluetooth).
    tStart = performance.now() + LEAD_MS + (actx.outputLatency || actx.baseLatency || 0) * 1000;
    phase = 'run';
    b.textContent = 'Dokun';
    hint.textContent = `Ritme eşlik et · 0/${REF_BEATS}`;
    schedule();
    const timer = setInterval(() => { if (nextBeat <= stopAt) schedule(); }, 25);
    bag.add(() => clearInterval(timer));
  };

  const tap = () => {
    if (phase !== 'run') return;
    taps.push(performance.now());
    pulse('hit');
    const { stopBeat, offsets } = splitTaps(taps, tStart, I);
    if (stopBeat === null) {
      hint.textContent = `Ritme eşlik et · ${taps.filter(x => x >= tStart - I / 2).length}/${REF_BEATS}`;
      return;
    }
    if (stopAt === Infinity) stopSound(stopBeat);
    dots.forEach((el, i) => el.classList.toggle('on', i < offsets.length));
    if (offsets.length >= FREE_BEATS) finish(offsets);
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
