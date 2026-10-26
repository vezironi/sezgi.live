// Tanıtım ve oyun ekranlarının üst çubuğu: çıkış, günün ilerleme çubuğu, tema.
import { GAMES } from '../../shared/games.js';
import { $ } from './dom.js';
import { themeButton, bindThemeButton } from './theme.js';

// progress: { set, scores } — günlük oyunda state.today(), antrenmanda antrenman oturumu.
export function gameBar(progress, currentId) {
  const t = progress;
  const segs = t.set.map(id => {
    if (id in t.scores) return `<i class="d" style="--gc2:${GAMES[id].gc}"></i>`;
    if (id === currentId) return `<i style="background:${GAMES[id].gc};opacity:.45"></i>`;
    return '<i></i>';
  }).join('');
  return `<div class="gbar"><button class="iconbtn" id="x" title="Çık" aria-label="Ana sayfaya dön">✕</button><div class="prog">${segs}</div>${themeButton()}</div>`;
}

export function bindGameBar(state, onExit) {
  bindThemeButton(state);
  $('x').onclick = onExit;
}
