import { GAMES } from '../../../shared/games.js';
import { puzzleNumber } from '../../../shared/date.js';
import { getBoard, getMe } from '../../api.js';
import { ICONS } from '../icons.js';
import { $, esc, gvars, nf } from '../dom.js';
import { themeButton, bindThemeButton } from '../theme.js';

const MEDALS = ['🥇', '🥈', '🥉'];

function subtitle(tab, date, players) {
  if (tab === 'day') return `#${puzzleNumber(date)} · ${nf(players)} oyuncu · günün puanı (en fazla 100)`;
  if (tab === 'week') return `Haftalık genel · günlük puanların toplamı · Pazartesi sıfırlanır`;
  return `Bugün · ${GAMES[tab].ad} oyununda en iyiler`;
}

function myRow(me, tab, played) {
  const mine = me && (tab === 'day' ? me.day : tab === 'week' ? me.week : me.games?.[tab]);
  if (!mine) {
    return `<div class="lbme empty">${played ? 'Bu tabloda henüz yoksun' : 'Bugünü oynayınca sen de burada olacaksın'}</div>`;
  }
  return `<div class="lbme"><div class="rk">${nf(mine.rank)}.</div><div class="nk">${esc(me.nick)} <span>(sen)</span></div><div class="sc">${nf(mine.score)}</div></div>`;
}

export function render(app, ctx, { back = 'home', tab = 'day' } = {}) {
  const { state, go } = ctx;
  const t = state.today(), id = state.identity();
  const isGame = tab !== 'day' && tab !== 'week';

  app.innerHTML = `<div class="gbar"><button class="iconbtn" id="bk" title="Geri" aria-label="Geri">←</button>
      <div class="lbtitle">Skor Tablosu</div><div class="sp"></div>
      ${id ? `<div class="pill" style="background:var(--surface2);color:var(--fg)">${esc(id.nick)}</div>` : ''}${themeButton()}</div>
    <div class="lbwrap">
      <div class="tabs"><button data-t="day" class="${tab === 'day' ? 'on' : ''}">Bugün</button><button data-t="week" class="${tab === 'week' ? 'on' : ''}">Haftalık genel</button></div>
      <div class="gtabs">${t.set.map(g => `<button data-t="${g}" class="chip ${tab === g ? 'on' : ''}" style="${gvars(GAMES[g])}"><span class="gicon">${ICONS[g]}</span>${GAMES[g].ad}</button>`).join('')}</div>
      <div class="lbsub" id="sub">&nbsp;</div>
      <div class="lblist" id="list">${'<div class="skel"></div>'.repeat(6)}</div>
      <div id="me"></div>
    </div>`;

  bindThemeButton(state);
  $('bk').onclick = () => go(back);
  app.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => go('board', { back, tab: b.dataset.t }); });

  const load = async () => {
    const list = $('list');
    list.innerHTML = '<div class="skel"></div>'.repeat(6);
    try {
      const [board, me] = await Promise.all([
        getBoard(isGame ? 'game' : tab, { game: isGame ? tab : undefined, date: t.date }),
        id ? getMe(id.token, t.date).catch(() => null) : null,
      ]);
      if (!list.isConnected) return;
      $('sub').textContent = subtitle(tab, t.date, board.players);
      list.innerHTML = board.top.length
        ? board.top.map(r => `<div class="lbrow ${r.rank <= 3 ? 'top' : ''}"><div class="rk">${MEDALS[r.rank - 1] ?? r.rank}</div><div class="nk">${esc(r.nick)}</div><div class="sc">${nf(r.score)}</div></div>`).join('')
        : '<div class="err">Henüz kimse yok. İlk sen ol!</div>';
      $('me').innerHTML = myRow(me, tab, state.isComplete());
    } catch {
      if (!list.isConnected) return;
      list.innerHTML = '<div class="err">Tablo yüklenemedi.<button class="btn alt" id="retry">Tekrar dene</button></div>';
      $('retry').onclick = load;
    }
  };
  load();
}
