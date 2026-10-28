import { GAMES } from '../../../shared/games.js';
import { puzzleNumber, formatLongDate, msUntilIstanbulMidnight, formatCountdown } from '../../../shared/date.js';
import { dayScore, rankFor } from '../../logic/scoring.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, gvars } from '../dom.js';
import { topBar, bindTopBar } from '../topbar.js';

export function countdownFooter() {
  return `<div class="ft">Yeni bulmaca <b id="cd">${formatCountdown(msUntilIstanbulMidnight(new Date()))}</b> sonra</div>`;
}

// Geri sayımı her saniye günceller; gün dönünce ana sayfayı yeniden çizer.
export function startCountdown({ go, bag }) {
  const timer = setInterval(() => {
    const ms = msUntilIstanbulMidnight(new Date());
    const el = $('cd');
    if (el) el.textContent = formatCountdown(ms);
    if (ms <= 1000) setTimeout(() => go('home'), 1200);
  }, 1000);
  bag.add(() => clearInterval(timer));
}

export function render(app, ctx) {
  const { state, go } = ctx;
  const t = state.today();
  const complete = state.isComplete();
  const started = Object.keys(t.scores).length > 0;
  const extraButtons = `<button class="btn alt" id="train">${icon(UI.target)} Antrenman</button>
    <button class="btn alt" id="tour">${icon(UI.users)} Arkadaşlarla turnuva</button>`;

  const cards = t.set.map((id, i) => {
    const g = GAMES[id], done = id in t.scores;
    return `<div class="gcard ${done ? 'done' : ''}" style="${gvars(g)}">
      <div class="gicon">${ICONS[id]}</div>
      <div><div class="gname">${g.ad}</div><div class="gdesc">${g.ds}</div></div>
      <div class="gnum ${done ? 'score' : ''}">${done ? icon(UI.check, { size: 14, stroke: 2.6 }) + t.scores[id] : i + 1}</div>
    </div>`;
  }).join('');

  const main = complete
    ? (() => {
        const day = dayScore(t.set.map(id => t.scores[id]));
        return `<div class="daycard"><div class="lbl">Bugünün puanın</div><div class="n">${day}</div><div class="lbl">/ 100</div><div class="rank">${rankFor(day)}</div></div>
          <button class="btn" id="go">Sonucu gör</button>
          ${extraButtons}`;
      })()
    : `<div class="games">${cards}</div>
       <button class="btn" id="go">${started ? 'Devam et' : 'Başla'}</button>
       ${extraButtons}`;

  app.innerHTML = `${topBar(state)}
    <div class="hero"><div class="no">#${puzzleNumber(t.date)} · ${formatLongDate(t.date)}</div><h1>${complete ? 'Bugünü tamamladın!' : 'Bugünün 5 oyunu'}</h1></div>
    ${main}
    ${countdownFooter()}`;

  bindTopBar(ctx, 'home');
  $('go').onclick = () => (complete ? go('results') : go('intro', { id: state.nextGame() }));
  $('train').onclick = () => go('practice');
  $('tour').onclick = () => go('tjoin', { create: true });
  startCountdown(ctx);
}
