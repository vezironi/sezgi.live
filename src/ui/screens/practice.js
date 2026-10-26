// Antrenman sonucu: sıralamaya gönderilmez; günün resmi puanıyla yan yana gösterilir.
import { GAMES } from '../../../shared/games.js';
import { dayScore, rankFor } from '../../logic/scoring.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, gvars } from '../dom.js';
import { topBar, bindTopBar } from '../topbar.js';

export function render(app, ctx) {
  const { state, go } = ctx;
  const p = ctx.practice;
  if (!p || !p.isComplete()) return go('home');
  const score = dayScore(p.set.map(id => p.scores[id]));
  const t = state.today();
  const official = state.isComplete() ? dayScore(t.set.map(id => t.scores[id])) : null;

  app.innerHTML = `${topBar(state)}
    <div class="res">
      <span class="ptag">Antrenman · sıralamaya sayılmaz</span>
      <div class="n">${score}</div><div class="of">/ 100</div><div class="rank">${rankFor(score)}</div>
      ${official !== null ? `<div class="of" style="margin-top:10px">Bugünkü resmi puanın: <b>${official}</b></div>` : ''}
    </div>
    <div>${p.set.map(id => `<div class="rrow" style="${gvars(GAMES[id])}">
        <div class="gicon">${ICONS[id]}</div><div class="nm" style="width:72px">${GAMES[id].ad}</div>
        <div class="bar"><i style="width:${p.scores[id]}%"></i></div><div class="sc">${p.scores[id]}</div>
      </div>`).join('')}</div>
    <div class="btnrow"><button class="btn" id="again">${icon(UI.replay)} Tekrar oyna</button><button class="btn alt" id="home">${icon(UI.home)} Ana sayfa</button></div>`;

  bindTopBar(ctx, 'practice');
  $('again').onclick = ctx.startPractice;
  $('home').onclick = () => go('home');
}
