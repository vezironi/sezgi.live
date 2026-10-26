import { GAMES } from '../../../shared/games.js';
import { PUZZLES } from '../../logic/puzzles/index.js';
import { RENDERERS } from '../../games/index.js';
import { layout } from '../../games/common.js';
import { ICONS } from '../icons.js';
import { $, gvars } from '../dom.js';
import { gameBar, bindGameBar } from '../gamebar.js';

export function render(app, ctx, { id, practice = false }) {
  const { state, go, bag } = ctx;
  const g = GAMES[id], R = RENDERERS[id], L = layout();
  // Antrenmanda her seferinde yeni sorular; günlük oyunda herkes için aynı soru.
  const session = practice ? ctx.practice : null;
  const puzzle = PUZZLES[id].generate(practice ? session.seed(id) : state.today().date);
  let answered = false;

  app.setAttribute('style', gvars(g));
  app.innerHTML = `${gameBar(practice ? session : state.today(), id)}
    <div class="gtitle"><div class="gicon">${ICONS[id]}</div><h2>${g.ad}</h2>${practice ? '<span class="ptag">Antrenman</span>' : ''}</div>
    <div class="prompt">${R.prompt(puzzle, L)}</div>
    <div class="stage" id="st" style="aspect-ratio:${L.wide ? '16 / 10' : '1 / 1'}"></div>
    <div id="below"></div>
    <div id="fb"></div>`;

  bindGameBar(state, () => {
    // Günlük oyunun ortasında çıkmak, sayfayı kapatmakla aynı sayılır: oyun 0 puan. Antrenmanda kural yok.
    if (!practice && !answered) {
      if (!confirm('Çıkarsan bu oyun 0 puan sayılır. Emin misin?')) return;
      state.finishGame(id, 0);
    }
    go('home');
  });

  R.mount({
    stage: $('st'),
    below: $('below'),
    puzzle,
    L,
    game: g,
    bag,
    onAnswer(answer, html) {
      if (answered) return;
      answered = true;
      const score = PUZZLES[id].score(puzzle, answer);
      let next;
      if (practice) { session.finish(id, score); next = session.nextGame(); }
      else { state.finishGame(id, score); next = state.nextGame(); }
      $('fb').innerHTML = `<div class="fb"><div class="pts">${score}<small>puan</small></div><div class="tx">${html}</div></div>
        <button class="btn" id="next">${next ? 'Devam →' : 'Sonucu gör'}</button>`;
      $('next').onclick = () => {
        if (next) go('intro', { id: next, practice });
        else go(practice ? 'practice' : 'results');
      };
      $('next').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  });
}
