import { $ } from './dom.js';
import { UI, icon } from './icons.js';

const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const glyph = theme => icon(theme === 'dark' ? UI.sun : UI.moon);

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
  };
}
