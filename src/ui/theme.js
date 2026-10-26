import { $ } from './dom.js';

const current = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

export function themeButton() {
  return `<button class="iconbtn" id="tm" title="Tema" aria-label="Temayı değiştir">${current() === 'dark' ? '☀️' : '🌙'}</button>`;
}

export function bindThemeButton(state) {
  const b = $('tm');
  if (!b) return;
  b.onclick = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    state.setTheme(next);
    b.textContent = next === 'dark' ? '☀️' : '🌙';
  };
}
