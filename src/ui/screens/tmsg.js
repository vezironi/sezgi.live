// Turnuva durum mesajları: atıldın, tur sürüyor, lobi yok.
import { UI, icon } from '../icons.js';
import { $ } from '../dom.js';
import { themeButton, bindThemeButton } from '../theme.js';

const TEXT = {
  kicked: { title: 'Lobiden çıkarıldın', lead: 'Lobi sahibi seni listeden çıkardı. İstersen yeni bir adla tekrar katılabilirsin.' },
  running: { title: 'Turnuva sürüyor', lead: 'Bu tur bitince katılabilirsin. Bu sayfayı açık tut, sıra gelince form açılacak.' },
  missing: { title: 'Bu lobi bulunamadı', lead: 'Link yanlış olabilir ya da lobi bir gün kullanılmadığı için silindi.' },
};

export function render(app, ctx, { kind }) {
  const { state, go } = ctx;
  const t = TEXT[kind];
  const session = ctx.tournament;

  app.innerHTML = `<div class="gbar"><button class="iconbtn" id="bk" title="Ana sayfa" aria-label="Ana sayfa">${icon(UI.back)}</button>
      <div class="lbtitle">Turnuva</div><div class="sp"></div>${themeButton()}</div>
    <div class="intro">
      <div class="gicon big tgicon">${icon(kind === 'running' ? UI.loader : kind === 'kicked' ? UI.logout : UI.alert, { size: 56, stroke: 2.2 })}</div>
      ${session ? `<div class="no">Lobi · ${session.code}</div>` : ''}
      <h2>${t.title}</h2>
      <p class="lead">${t.lead}</p>
    </div>
    ${kind === 'kicked' ? '<button class="btn" id="re">Yeni adla katıl</button>' : ''}
    <button class="btn alt" id="hm">${icon(UI.home)} Ana sayfa</button>`;

  bindThemeButton(state);
  const home = () => (session ? session.leave() : go('home'));
  $('bk').onclick = home;
  $('hm').onclick = home;
  if (kind === 'kicked') $('re').onclick = () => session.rejoin();
}
