import { GAMES } from '../../../shared/games.js';
import { PUZZLES } from '../../logic/puzzles/index.js';
import { RENDERERS } from '../../games/index.js';
import { layout, later } from '../../games/common.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, gvars } from '../dom.js';
import { gameBar, bindGameBar } from '../gamebar.js';

export function render(app, ctx, { id, practice = false, tournament = false }) {
  const { state, go, bag } = ctx;
  const g = GAMES[id], R = RENDERERS[id], L = layout();
  // Antrenmanda ve turnuvada oturumun tohumu; günlük oyunda herkes için aynı soru.
  const tour = tournament ? ctx.tournament : null;
  const session = practice ? ctx.practice : tour;
  const puzzle = PUZZLES[id].generate(session ? session.seed(id) : state.today().date);
  let answered = false;

  app.setAttribute('style', gvars(g));
  app.innerHTML = `${gameBar(session ?? state.today(), id)}
    <div class="gtitle"><div class="gicon">${ICONS[id]}</div><h2>${g.ad}</h2>${practice ? '<span class="ptag">Antrenman</span>' : tour ? '<span class="ptag">Turnuva</span>' : ''}</div>
    <div class="prompt">${R.prompt(puzzle, L)}</div>
    <div class="stage" id="st" style="aspect-ratio:${L.wide ? '16 / 10' : '1 / 1'}"></div>
    <div id="below"></div>
    <div id="fb"></div>`;

  // Turnuva: oyuncunun puanını görüp sonra 0'a düşmemesi için süre dolunca oyun burada kesilir (ekranda süre yok).
  const tourEnd = (score, html) => {
    tour.hold();
    tour.finish(score);
    $('fb').innerHTML = `<div class="fb"><div class="pts">${score}<small>puan</small></div><div class="tx">${html}</div></div>
      <button class="btn" id="next">Devam ${icon(UI.next)}</button>`;
    $('next').onclick = () => tour.release();
    $('next').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  // Antrenman: aynı oyunu yeni soruyla tekrar oyna; en iyi puan ve ortalama bu cihazda tutulur.
  const practiceEnd = (score, html) => {
    const s = session.finish(id, score);
    $('fb').innerHTML = `<div class="fb"><div class="pts">${score}<small>puan</small></div><div class="tx">${html}</div></div>
      ${s.record && s.count > 1 ? `<div class="prec">${icon(UI.trophy, { size: 18, stroke: 2.4 })} Yeni rekor!</div>` : ''}
      <div class="pstats"><div><b>${s.best}</b><span>En iyi</span></div><div><b>${s.avg}</b><span>Ortalama</span></div><div><b>${s.count}</b><span>Deneme</span></div></div>
      <button class="btn go" id="next">${icon(UI.replay)} Tekrar oyna</button>
      <button class="btn alt" id="pick">Başka oyun seç</button>`;
    $('next').onclick = () => { session.again(); go('play', { id, practice: true }); };
    $('pick').onclick = () => go('practice');
    $('next').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (tour) {
    later(bag, () => {
      if (answered) return;
      answered = true;
      tourEnd(0, '<b>Süre doldu.</b> Bu oyundan 0 puan aldın.');
    }, Math.max(0, tour.msLeft()));
  }

  bindGameBar(state, () => {
    if (tour) {
      if (!answered && !confirm('Çıkarsan bu oyun 0 puan sayılır. Emin misin?')) return;
      if (!answered) { answered = true; tour.finish(0); } else tour.release();
      return;
    }
    if (practice) { go('practice'); return; }
    // Günlük oyunun ortasında çıkmak, sayfayı kapatmakla aynı sayılır: oyun 0 puan. Antrenmanda kural yok.
    if (!answered) {
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
      if (tour) { tourEnd(score, html); return; }
      if (practice) { practiceEnd(score, html); return; }
      state.finishGame(id, score);
      const next = state.nextGame();
      $('fb').innerHTML = `<div class="fb"><div class="pts">${score}<small>puan</small></div><div class="tx">${html}</div></div>
        <button class="btn" id="next">${next ? `Devam ${icon(UI.next)}` : 'Sonucu gör'}</button>`;
      $('next').onclick = () => (next ? go('intro', { id: next }) : go('results'));
      $('next').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  });
}
