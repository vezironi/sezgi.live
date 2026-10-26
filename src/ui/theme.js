import { $ } from './dom.js';
import { UI, icon } from './icons.js';

const THEME_COLORS = { light: '#f6f4ff', dark: '#121119' };

const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const glyph = theme => icon(theme === 'dark' ? UI.sun : UI.moon);

// Tarayıcı çubuğunun rengi seçili temayı izlesin (cihaz ayarından farklı seçilmiş olsa bile).
export function syncThemeColor() {
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    m.removeAttribute('media');
    m.setAttribute('content', THEME_COLORS[current()]);
  });
}

export function themeButton() {
  return `<button class="iconbtn" id="tm" title="Tema" aria-label="Temayı değiştir">${glyph(current())}</button>`;
}

export function bindThemeButton(state) {
  const b = $('tm');
  if (!b) return;
  b.onclick = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    state.setTheme(next);
    b.innerHTML = glyph(next);
    syncThemeColor();
  };
}
