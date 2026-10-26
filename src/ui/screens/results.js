import { GAMES } from '../../../shared/games.js';
import { dayScore, rankFor, shareText } from '../../logic/scoring.js';
import { submitDay } from '../../submit.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, esc, gvars, nf } from '../dom.js';
import { topBar, bindTopBar } from '../topbar.js';
import { countdownFooter, startCountdown } from './home.js';

// Skor gönderim kartı: gönderiliyor / gönderildi / hata durumları aynı kalıpta.
function rankTile(node, color, value, label) {
  return `<div class="rc-tile" style="--c:${color}"><span class="rc-ic">${icon(node, { size: 18, stroke: 2.4 })}</span><b>${value}</b><small>${label}</small></div>`;
}

function ranksCard(r) {
  return `<div class="rcard">
    <div class="rc-head">
      <span class="rc-badge ok">${icon(UI.check, { size: 22, stroke: 2.4 })}</span>
      <div><div class="rc-title">Skorun sıralamaya girdi</div>
        <div class="rc-sub"><b>${esc(r.nick)}</b>${r.day ? ` · ${nf(r.day.players)} oyuncu arasında` : ''}</div></div>
    </div>
    <div class="rc-tiles">
      ${rankTile(UI.calendar, '#6c4cff', r.day ? `#${nf(r.day.rank)}` : '–', 'Bugün')}
      ${rankTile(UI.trophy, '#ff9f1c', r.week ? `#${nf(r.week.rank)}` : '–', 'Haftalık genel')}
      ${rankTile(UI.star, '#16b3a3', r.week ? nf(r.week.score) : '–', 'Hafta puanın')}
    </div>
  </div>`;
}

const pendingCard = () => `<div class="rcard">
    <div class="rc-head"><span class="rc-badge spin">${icon(UI.loader, { size: 22, stroke: 2.4 })}</span>
      <div><div class="rc-title">Skorun gönderiliyor…</div><div class="rc-sub">Sıran birazdan burada</div></div></div>
  </div>`;

const failCard = final => `<div class="rcard">
    <div class="rc-head"><span class="rc-badge bad">${icon(UI.alert, { size: 22, stroke: 2.4 })}</span>
      <div><div class="rc-title">${final ? 'Skor kabul edilmedi' : 'Skor gönderilemedi'}</div>
        <div class="rc-sub">${final ? 'Gün değişmiş olabilir.' : 'Bağlantını kontrol edip tekrar dene.'}</div></div></div>
    ${final ? '' : `<button class="btn alt" id="retry">${icon(UI.replay)} Tekrar dene</button>`}
  </div>`;

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
    <div class="btnrow"><button class="btn" id="cp">${icon(UI.share)} Paylaş</button><button class="btn alt" id="lb2">${icon(UI.trophy)} Sıralama</button></div>
    <button class="btn alt" id="again">${icon(UI.replay)} Tekrar oyna <small class="btn-note">· sıralamaya sayılmaz</small></button>
    ${countdownFooter()}`;

  bindTopBar(ctx, 'results');
  startCountdown(ctx);
  $('lb2').onclick = () => go('board', { back: 'results' });
  $('again').onclick = ctx.startPractice;

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
      else { await navigator.clipboard.writeText(text); this.innerHTML = `${icon(UI.check)} Kopyalandı`; }
    } catch (e) {
      if (e?.name !== 'AbortError') this.textContent = 'Kopyalanamadı';
    }
  };

  const sub = $('sub');
  const send = () => {
    sub.innerHTML = pendingCard();
    submitDay(state).then(
      ranks => { if (sub.isConnected) sub.innerHTML = ranksCard(ranks); },
      e => {
        if (!sub.isConnected) return;
        const final = e.status === 400;
        sub.innerHTML = failCard(final);
        if (!final) $('retry').onclick = send;
      },
    );
  };
  if (t.submitted && t.ranks) sub.innerHTML = ranksCard(t.ranks);
  else send();
}
