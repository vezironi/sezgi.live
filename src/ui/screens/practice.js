// Antrenman: oyun seçimi. Her oyunun yanında bu cihazdaki en iyi puan, ortalama ve deneme sayısı.
import { GAMES, GAME_IDS } from '../../../shared/games.js';
import { createPracticeStats } from '../../practice.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, gvars } from '../dom.js';
import { themeButton, bindThemeButton } from '../theme.js';

export function render(app, ctx) {
  const { state, go } = ctx;
  const stats = createPracticeStats();

  const cards = GAME_IDS.map(id => {
    const g = GAMES[id], s = stats.get(id);
    return `<button class="gcard pcard" data-g="${id}" style="${gvars(g)}">
      <div class="gicon">${ICONS[id]}</div>
      <div><div class="gname">${g.ad}</div><div class="gdesc">${g.ds}</div></div>
      <div class="pstat">${s ? `en iyi <b>${s.best}</b><br>ort. ${s.avg} · ${s.count} deneme` : 'henüz<br>oynanmadı'}</div>
    </button>`;
  }).join('');

  app.innerHTML = `<div class="gbar"><button class="iconbtn" id="bk" title="Ana sayfa" aria-label="Ana sayfa">${icon(UI.back)}</button>
      <div class="lbtitle">Antrenman</div><div class="sp"></div>${themeButton()}</div>
    <div class="psub">Bir oyun seç, istediğin kadar oyna. Sıralamaya sayılmaz.</div>
    <div class="pgames" id="pg">${cards}</div>`;

  bindThemeButton(state);
  $('bk').onclick = () => go('home');
  $('pg').onclick = e => {
    const card = e.target.closest('[data-g]');
    if (card) ctx.startPractice(card.dataset.g);
  };
}
