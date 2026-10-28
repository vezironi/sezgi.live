// Turnuva lobisi: paylaşım linki, oyuncular, oyun seçimi ve (sahipte) başlatma.
import { GAMES, GAME_IDS } from '../../../shared/games.js';
import { MAX_PLAYERS, MIN_PLAYERS, NAME_MAX } from '../../../shared/tournament.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, esc, gvars } from '../dom.js';
import { themeButton, bindThemeButton } from '../theme.js';

export const shareUrl = code => `${location.origin}/t/${code}`;

// Link kopyalama: mobilde paylaşım menüsü, masaüstünde panoya.
export async function shareLink(btn, code) {
  const url = shareUrl(code);
  try {
    if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) await navigator.share({ title: 'sezgi.live turnuvası', url });
    else { await navigator.clipboard.writeText(url); btn.innerHTML = `${icon(UI.check, { size: 16 })} Kopyalandı`; }
  } catch (e) {
    if (e?.name !== 'AbortError') btn.textContent = 'Kopyalanamadı';
  }
}

export function playerRows(view, { kick = false } = {}) {
  return view.players.map(p => {
    const mine = view.me && p.id === view.me.id;
    return `<div class="prow${mine ? ' me' : ''}">
      <span class="pav" style="--h:${parseInt(p.id.slice(0, 2), 16) * 1.4}"></span>
      <span class="pnm">${esc(p.name)}${mine ? ' <small>(sen)</small>' : ''}</span>
      ${p.owner ? `<span class="otag">${icon(UI.crown, { size: 13, stroke: 2.6 })} SAHİP</span>` : ''}
      ${mine ? '<button class="plink" data-rename>Adını değiştir</button>' : ''}
      ${kick && !p.owner && !mine ? `<button class="plink bad" data-kick="${p.id}">At</button>` : ''}
    </div>`;
  }).join('');
}

// Kendi satırında ad düzenleme; düzenleme sürerken liste yeniden çizilmez.
export function bindPlayerRows(box, session, ctxState) {
  box.onclick = async e => {
    const kick = e.target.closest('[data-kick]');
    if (kick) {
      const p = session.view.players.find(x => x.id === kick.dataset.kick);
      if (p && confirm(`${p.name} lobiden atılsın mı?`)) session.act('kick', { target: p.id }).catch(err => alert(err.message));
      return;
    }
    if (!e.target.closest('[data-rename]')) return;
    ctxState.editing = true;
    const row = box.querySelector('.prow.me');
    row.innerHTML = `<input class="tinput sm" id="rn" maxlength="${NAME_MAX}" value="${esc(session.view.me.name)}" aria-label="Yeni ad">
      <button class="plink" id="rnok">Kaydet</button><div class="terr" id="rner"></div>`;
    const input = $('rn');
    input.focus();
    input.select();
    const save = async () => {
      const name = input.value.trim();
      if (!name || name === session.view.me.name) { ctxState.editing = false; ctxState.redraw(); return; }
      try {
        await session.act('rename', { name });
        ctxState.editing = false;
        ctxState.redraw();
      } catch (err) {
        if ($('rner')) $('rner').textContent = err.message;
      }
    };
    $('rnok').onclick = save;
    input.onkeydown = ev => {
      if (ev.key === 'Enter') save();
      if (ev.key === 'Escape') { ctxState.editing = false; ctxState.redraw(); }
    };
  };
}

export function render(app, ctx) {
  const { state, bag } = ctx;
  const session = ctx.tournament;
  const ui = { editing: false, redraw: () => {} };

  app.innerHTML = `<div class="gbar"><button class="iconbtn" id="bk" title="Lobiden çık" aria-label="Lobiden çık">${icon(UI.back)}</button>
      <div class="lbtitle">Turnuva lobisi</div><div class="sp"></div>${themeButton()}</div>
    <div class="tcard tlinkcard">
      <div class="tlbl">Arkadaşlarına gönder</div>
      <div class="tlink"><span>${esc(shareUrl(session.code).replace(/^https?:\/\//, ''))}</span>
        <button class="plink" id="cp">${icon(UI.copy, { size: 16 })} Kopyala</button></div>
    </div>
    <div class="tlbl" id="pc"></div>
    <div class="plist" id="pl"></div>
    <div class="tlbl" id="gc"></div>
    <div class="tchips" id="gs"></div>
    <div id="act"></div>`;

  bindThemeButton(state);
  $('bk').onclick = () => { if (confirm('Lobiden çıkmak istiyor musun?')) session.leave(); };
  $('cp').onclick = function () { shareLink(this, session.code); };

  const draw = view => {
    const owner = !!view.me?.owner;
    $('pc').textContent = `Oyuncular · ${view.players.length}/${MAX_PLAYERS}`;
    if (!ui.editing) $('pl').innerHTML = playerRows(view, { kick: owner });
    $('gc').innerHTML = `Oyunlar · ${view.games.length} seçili${owner ? ' <small>(dokunarak seç)</small>' : ''}`;
    $('gs').innerHTML = GAME_IDS.map(id => `<button class="chip${view.games.includes(id) ? ' on' : ''}" data-g="${id}" style="${gvars(GAMES[id])}" ${owner ? '' : 'disabled'}>
        <span class="gicon">${ICONS[id]}</span>${GAMES[id].ad}</button>`).join('');
    const enough = view.players.length >= MIN_PLAYERS;
    $('act').innerHTML = owner
      ? `<button class="btn" id="st" ${enough ? '' : 'disabled'}>Turnuvayı başlat</button>
         <div class="ft">${enough ? `${view.games.length} oyun · herkes aynı soruları görür` : 'En az 2 oyuncu gerekli'}</div>`
      : `<div class="twaitnote">${icon(UI.loader, { size: 18, cls: 'spin' })} Lobi sahibinin başlatması bekleniyor</div>`;
    if (owner) $('st').onclick = function () {
      this.disabled = true;
      session.act('start').catch(err => { this.disabled = false; alert(err.message); });
    };
  };
  ui.redraw = () => draw(session.view);

  bindPlayerRows($('pl'), session, ui);
  $('gs').onclick = e => {
    const chip = e.target.closest('[data-g]');
    if (!chip || chip.disabled) return;
    const id = chip.dataset.g, cur = session.view.games;
    const next = cur.includes(id) ? cur.filter(g => g !== id) : [...cur, id];
    if (!next.length) return; // en az bir oyun kalmalı
    chip.classList.toggle('on');
    session.act('games', { games: next }).catch(err => { alert(err.message); ui.redraw(); });
  };

  draw(session.view);
  bag.add(session.onView(draw));
}
