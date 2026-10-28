// Turnuva kurma / katılma formu: yalnızca ad sorulur.
import { tournament } from '../../api.js';
import { createTourStore } from '../../tournament/store.js';
import { NAME_MAX } from '../../../shared/tournament.js';
import { UI, icon } from '../icons.js';
import { $ } from '../dom.js';
import { themeButton, bindThemeButton } from '../theme.js';

export function render(app, ctx, { create = false } = {}) {
  const { state, go } = ctx;
  const session = create ? null : ctx.tournament;
  const store = createTourStore();

  app.innerHTML = `<div class="gbar"><button class="iconbtn" id="bk" title="Geri" aria-label="Geri">${icon(UI.back)}</button>
      <div class="lbtitle">${create ? 'Turnuva kur' : 'Turnuvaya katıl'}</div><div class="sp"></div>${themeButton()}</div>
    <div class="intro">
      <div class="gicon big tgicon">${icon(UI.users, { size: 56, stroke: 2.2 })}</div>
      ${create ? '' : `<div class="no">Lobi · ${session.code}</div>`}
      <h2>${create ? 'Arkadaşlarınla yarış' : 'Adını yaz, katıl'}</h2>
      <p class="lead">${create
        ? 'Lobiyi kur, linki arkadaşlarına gönder. Herkes aynı oyunları aynı anda kendi ekranında oynar.'
        : 'Lobideki herkes bu adı görecek.'}</p>
    </div>
    <form class="tform" id="f" autocomplete="off">
      <input class="tinput" id="nm" maxlength="${NAME_MAX}" placeholder="Adın" aria-label="Adın" value="">
      <div class="terr" id="er" role="alert"></div>
      <button class="btn" id="go" type="submit">${create ? 'Turnuva kur' : 'Katıl'}</button>
    </form>`;

  bindThemeButton(state);
  const nm = $('nm');
  nm.value = store.lastName();
  $('bk').onclick = () => (session ? session.leave() : go('home'));

  $('f').onsubmit = async e => {
    e.preventDefault();
    const name = nm.value.trim();
    if (!name) { $('er').textContent = 'Bir ad yaz'; nm.focus(); return; }
    const btn = $('go');
    btn.disabled = true;
    $('er').textContent = '';
    try {
      if (create) {
        const res = await tournament('create', { name });
        store.setPid(res.view.code, res.pid);
        store.setLastName(name);
        ctx.openTournament(res.view.code, { view: res.view });
      } else {
        await session.join(name);
      }
    } catch (err) {
      if (!btn.isConnected) return;
      btn.disabled = false;
      $('er').textContent = err.status === 0 ? 'Bağlantı kurulamadı, tekrar dene' : err.message;
    }
  };
}
