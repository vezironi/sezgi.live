import { count321, later } from './common.js';
import { angleDiff } from '../logic/puzzles/aci.js';

export const prompt = (p, L) =>
  `Renk <strong>2 saniye</strong> görünecek. Sonra renk kutusunda ${L.wide ? 'fareyi sürükle' : 'parmağını gezdir'}, bıraktığın an kaydedilir.`;

const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

export function mount({ stage, puzzle, L, onAnswer, bag }) {
  const { h: H, l: LT, s: S } = puzzle;
  // Beyaz/siyah katman HSL açıklığıyla birebir eşleşir: üst %85, orta %50, alt %15.
  const hues = Array.from({ length: 13 }, (_, i) => hsl(i * 30, S, 50)).join(',');

  count321(stage, bag).then(() => {
    stage.innerHTML = `<div style="position:absolute;inset:0;background:${hsl(H, S, LT)}"></div>`;
    later(bag, () => {
      let h = null, l = null, drag = false, done = false;
      stage.innerHTML = `<div class="cp ${L.wide ? 'wide' : ''}">
          <div class="cp-box" id="pk" style="background:linear-gradient(to bottom,rgba(255,255,255,.7),rgba(255,255,255,0) 50%,rgba(0,0,0,0) 50%,rgba(0,0,0,.7)),linear-gradient(to right,${hues})">
            <div class="cp-ring" id="ring"></div>
            <div class="hint" id="hn">Rengi bul ve bırak</div>
          </div>
          <div class="cp-pv" id="pv"><span>Seninki</span></div>
        </div>`;
      const pk = stage.querySelector('#pk'), pv = stage.querySelector('#pv'), ring = stage.querySelector('#ring');

      const pick = e => {
        const r = pk.getBoundingClientRect();
        const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        h = Math.round(fx * 359);
        l = Math.round(85 - fy * 70);
        pv.style.background = hsl(h, S, l);
        pv.classList.add('on');
        Object.assign(ring.style, { display: 'block', left: fx * 100 + '%', top: fy * 100 + '%', background: hsl(h, S, l) });
      };

      pk.onpointerdown = e => {
        if (done) return;
        drag = true;
        pk.setPointerCapture(e.pointerId);
        stage.querySelector('#hn').style.opacity = 0;
        pick(e);
      };
      pk.onpointermove = e => { if (drag && !done) pick(e); };
      pk.onpointerup = () => {
        if (!drag || done || h === null) return;
        drag = false;
        done = true;
        stage.innerHTML = `<div style="position:absolute;inset:0;display:flex">
          <div class="cp-res" style="background:${hsl(H, S, LT)}">Doğrusu</div>
          <div class="cp-res" style="background:${hsl(h, S, l)}">Seninki</div></div>`;
        onAnswer({ h, l }, `Ton farkı <b>${angleDiff(h, H)}°</b>, açıklık farkı <b>%${Math.abs(l - LT)}</b>.`);
      };
    }, 2000);
  });
}
