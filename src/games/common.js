// Renderer'ların ortak yardımcıları.

export const DESKTOP_QUERY = '(min-width: 820px)';

// Oyun alanının iç koordinatları; oyun başında bir kez belirlenir.
export function layout() {
  const wide = typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches;
  return { wide, W: wide ? 480 : 300, H: 300 };
}

export const toPx = (p, L) => ({ x: p.x * L.W, y: p.y * L.H });

// İşaretçi olayını elemanın iç koordinatlarına çevirir.
export function fromEvent(e, el, L) {
  const r = el.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * L.W, y: ((e.clientY - r.top) / r.height) * L.H };
}

export function later(bag, fn, ms) {
  const t = setTimeout(fn, ms);
  bag.add(() => clearTimeout(t));
}

// Büyük 3-2-1 sayımı (her biri 750 ms).
export function count321(stage, bag) {
  return new Promise(resolve => {
    let n = 3;
    const tick = () => {
      if (n === 0) { stage.innerHTML = ''; resolve(); return; }
      stage.innerHTML = `<div class="cnt">${n}</div>`;
      n--;
      later(bag, tick, 750);
    };
    tick();
  });
}

export const fmtSec = n => n.toFixed(1).replace('.', ',');
