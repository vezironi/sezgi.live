import { GAMES } from '../../../shared/games.js';
import { dayScore, rankFor, shareText } from '../../logic/scoring.js';
import { submitDay } from '../../submit.js';
import { ICONS } from '../icons.js';
import { $, esc, gvars, nf } from '../dom.js';
import { topBar, bindTopBar } from '../topbar.js';
import { countdownFooter, startCountdown } from './home.js';

function ranksCard(r) {
  const cell = (label, value) => `<div><small>${label}</small><b>${value}</b></div>`;
  return `<div class="subok">
    <div>✓ <b>${esc(r.nick)}</b> olarak gönderildi</div>
    <div class="two">
      ${cell('Bugün', r.day ? `${nf(r.day.rank)}.` : '–')}
      ${cell('Haftalık genel', r.week ? `${nf(r.week.rank)}.` : '–')}
      ${cell('Hafta puanın', r.week ? nf(r.week.score) : '–')}
    </div>
    ${r.day ? `<span>${nf(r.day.players)} oyuncu arasında</span>` : ''}
  </div>`;
}

export function render(app, ctx) {
  const { state, go, bag } = ctx;
  if (!state.isComplete()) return go('home');
  const t = state.today();
  const day = dayScore(t.set.map(id => t.scores[id]));
  const text = shareText(t.date, t.set, t.scores);

  app.innerHTML = `${topBar(state)}
    <div class="res"><div class="n" id="tn">0</div><div class="of">/ 100 · günün puanı</div><div class="rank">${rankFor(day)}</div></div>
    <div>${t.set.map(id => `<div class="rrow" style="${gvars(GAMES[id])}">
        <div class="gicon">${ICONS[id]}</div><div class="nm" style="width:72px">${GAMES[id].ad}</div>
        <div class="bar"><i style="width:0" data-w="${t.scores[id]}"></i></div><div class="sc">${t.scores[id]}</div>
      </div>`).join('')}</div>
    <div id="sub"></div>
    <div class="btnrow"><button class="btn" id="cp">Paylaş</button><button class="btn alt" id="lb2">🏆 Sıralama</button></div>
    ${countdownFooter()}`;

  bindTopBar(ctx, 'results');
  startCountdown(ctx);
  $('lb2').onclick = () => go('board', { back: 'results' });

  // Puan sayarak yükselir, çubuklar dolar.
  const tn = $('tn'), t0 = performance.now();
  let raf = requestAnimationFrame(function step(now) {
    const k = Math.min(1, (now - t0) / 1100);
    tn.textContent = Math.round(day * (1 - (1 - k) ** 3));
    if (k < 1) raf = requestAnimationFrame(step);
  });
  bag.add(() => cancelAnimationFrame(raf));
  requestAnimationFrame(() => app.querySelectorAll('.bar i').forEach(i => {
    i.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1)';
    i.style.width = i.dataset.w + '%';
  }));

  $('cp').onclick = async function () {
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); this.textContent = 'Kopyalandı ✓'; }
    } catch (e) {
      if (e?.name !== 'AbortError') this.textContent = 'Metni seçip kopyala';
    }
  };

  const sub = $('sub');
  const send = () => {
    sub.innerHTML = '<div class="subok"><span>Skor gönderiliyor…</span></div>';
    submitDay(state).then(
      ranks => { if (sub.isConnected) sub.innerHTML = ranksCard(ranks); },
      e => {
        if (!sub.isConnected) return;
        const final = e.status === 400;
        sub.innerHTML = `<div class="subfail">${final ? 'Skor kabul edilmedi: gün değişmiş olabilir.' : 'Skor gönderilemedi.'}
          ${final ? '' : '<button class="btn alt" id="retry">Tekrar dene</button>'}</div>`;
        if (!final) $('retry').onclick = send;
      },
    );
  };
  if (t.submitted && t.ranks) sub.innerHTML = ranksCard(t.ranks);
  else send();
}
