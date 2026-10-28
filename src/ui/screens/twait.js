// Oyunlar arası bekleme: kendi puanın, kimin bitirdiği, kalan süre. Başkalarının puanı sona saklanır.
import { GAMES } from '../../../shared/games.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, esc, gvars } from '../dom.js';
import { gameBar, bindGameBar } from '../gamebar.js';

export const clock = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const STATUS = {
  done: ['ok', 'bitti'],
  playing: ['', 'oynuyor…'],
  gone: ['bad', 'bağlantı koptu'],
};

export function render(app, ctx, { step, abandon = false }) {
  const { state, bag } = ctx;
  const session = ctx.tournament;
  // Yenileme: "Hazırım"dan sonra yarıda kalan oyun 0 sayılır.
  if (abandon) session.finish(0);

  const draw = () => {
    const v = session.view, r = v.round;
    const n = r.games.length;
    const between = r.step >= n || session.serverNow() < r.stepStart;
    const cur = Math.min(r.step, n - 1);
    const g = GAMES[r.games[cur]]; // geçişte sıradaki oyun, son adımdan sonra son oyun
    app.setAttribute('style', gvars(g));

    let body;
    if (between) {
      const nextId = r.step < n ? r.games[r.step] : null;
      body = `<div class="intro">
          <div class="gicon big">${nextId ? ICONS[nextId] : icon(UI.trophy, { size: 56, stroke: 2.2 })}</div>
          <div class="no">${r.step > 0 ? 'Oyun bitti!' : 'Başlıyor'}</div>
          <h2>${nextId ? `Sıradaki: ${GAMES[nextId].ad}` : 'Sonuçlar geliyor…'}</h2>
          ${nextId ? `<p class="lead">Oyun ${r.step + 1} / ${n} · <b id="tc">${clock(r.stepStart - session.serverNow())}</b></p>` : ''}
        </div>`;
    } else {
      const mine = r.mine[cur];
      const nextName = cur + 1 < n ? `sıradaki oyun: <b>${GAMES[r.games[cur + 1]].ad}</b> (${cur + 2}/${n})` : '<b>sonuçlar</b>';
      body = `<div class="twbig">
          <div class="no">${g.ad} bitti</div>
          <div class="n">${mine ?? 0}<small>/100</small></div>
          <div class="twaitnote">${icon(UI.loader, { size: 18, cls: 'spin' })} Diğerleri bekleniyor…</div>
        </div>
        <div class="plist">${r.roster.map(p => {
          const [cls, label] = STATUS[p.status];
          return `<div class="prow${v.me && p.id === v.me.id ? ' me' : ''}"><span class="pnm">${esc(p.name)}</span><span class="pst ${cls}">${p.status === 'done' ? icon(UI.check, { size: 15, stroke: 2.6 }) + ' ' : ''}${label}</span></div>`;
        }).join('')}</div>
        <div class="ft">En geç <b id="tc">${clock(session.deadlineLeft())}</b> sonra ${nextName}</div>`;
    }
    $('tw').innerHTML = body;
    $('tb').innerHTML = gameBar(session, r.step < n ? r.games[r.step] : null);
    bindGameBar(state, exit);
  };

  const exit = () => { if (confirm('Turnuvadan ayrılmak istiyor musun?')) session.leave(); };

  app.innerHTML = '<div id="tb"></div><div id="tw"></div>';
  draw();
  bag.add(session.onView(draw));

  // Geri sayım her saniye; tam çizim yalnızca görünüm değişince.
  const t = setInterval(() => {
    const el = $('tc'), r = session.view.round;
    if (!el) return;
    const between = r.step >= r.games.length || session.serverNow() < r.stepStart;
    el.textContent = clock(between ? r.stepStart - session.serverNow() : session.deadlineLeft());
  }, 1000);
  bag.add(() => clearInterval(t));
}
