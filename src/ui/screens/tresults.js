// Turnuva sonucu: sıralama, oyun oyun puan tablosu, yeni tur / lobiye dön.
import { GAMES } from '../../../shared/games.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, esc, gvars } from '../dom.js';
import { themeButton, bindThemeButton } from '../theme.js';

const MEDAL_COLORS = ['#f5b301', '#9aa4b2', '#c9773b'];
const rankCell = rank => (rank <= 3 ? `<span class="medal" style="color:${MEDAL_COLORS[rank - 1]}">${icon(UI.medal, { size: 22 })}</span>` : rank);

export function render(app, ctx) {
  const { state, bag } = ctx;
  const session = ctx.tournament;

  app.innerHTML = `<div class="gbar"><button class="iconbtn" id="bk" title="Lobiden çık" aria-label="Lobiden çık">${icon(UI.back)}</button>
      <div class="lbtitle" id="tt"></div><div class="sp"></div>${themeButton()}</div>
    <div class="lblist" id="rk"></div>
    <div class="tlbl">Oyun oyun puanlar</div>
    <div class="ttable" id="tb"></div>
    <div id="act"></div>`;

  bindThemeButton(state);
  const leave = () => { if (confirm('Lobiden çıkmak istiyor musun?')) session.leave(); };
  $('bk').onclick = leave;

  const draw = view => {
    const r = view.round, res = r.results, meId = view.me?.id;
    $('tt').textContent = `Turnuva sonucu · Tur ${r.no}`;
    $('rk').innerHTML = res.map(p => `<div class="lbrow${p.rank <= 3 ? ' top' : ''}${p.id === meId ? ' mine' : ''}">
        <div class="rk">${rankCell(p.rank)}</div><div class="nk">${esc(p.name)}${p.id === meId ? ' <small>(sen)</small>' : ''}</div><div class="sc">${p.total}</div>
      </div>`).join('');
    $('tb').innerHTML = `<table><thead><tr><th></th>${r.games.map(id => `<th><span class="gicon" style="${gvars(GAMES[id])}" title="${GAMES[id].ad}">${ICONS[id]}</span></th>`).join('')}</tr></thead>
      <tbody>${res.map(p => `<tr${p.id === meId ? ' class="mine"' : ''}><td class="tn">${esc(p.name)}</td>${p.scores.map(s => `<td>${s}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    $('act').innerHTML = view.me?.owner
      ? `<button class="btn" id="ag">${icon(UI.replay)} Yeni tur başlat</button><button class="btn alt" id="lb">Lobiye dön</button>`
      : `<div class="twaitnote">${icon(UI.loader, { size: 18, cls: 'spin' })} Lobi sahibinin yeni turu başlatması bekleniyor</div>
         <button class="btn alt" id="lv">${icon(UI.logout)} Lobiden çık</button>`;
    const run = (btn, action) => {
      btn.disabled = true;
      session.act(action).catch(err => { btn.disabled = false; alert(err.message); });
    };
    if (view.me?.owner) {
      $('ag').onclick = function () { run(this, 'again'); };
      $('lb').onclick = function () { run(this, 'lobby'); };
    } else $('lv').onclick = leave;
  };

  draw(session.view);
  // Sahiplik değişirse düğmeler güncellensin; aynı görünümde gereksiz yeniden çizim yapılmasın.
  let last = '';
  bag.add(session.onView(v => {
    const k = JSON.stringify([v.me?.owner, v.round?.results]);
    if (k !== last) { last = k; draw(v); }
  }));
}
