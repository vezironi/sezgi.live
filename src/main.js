import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito';
import './styles/base.css';
import './styles/screens.css';
import './styles/games.css';
import './styles/tournament.css';
import { createState } from './state.js';
import * as home from './ui/screens/home.js';
import * as intro from './ui/screens/intro.js';
import * as play from './ui/screens/play.js';
import * as results from './ui/screens/results.js';
import * as board from './ui/screens/board.js';
import * as practice from './ui/screens/practice.js';
import * as tjoin from './ui/screens/tjoin.js';
import * as tlobby from './ui/screens/tlobby.js';
import * as twait from './ui/screens/twait.js';
import * as tresults from './ui/screens/tresults.js';
import * as tmsg from './ui/screens/tmsg.js';
import { createSession } from './tournament/session.js';
import { submitDay, ensureIdentity } from './submit.js';
import { createPractice } from './practice.js';
import { GAMES } from '../shared/games.js';
import { syncThemeColor } from './ui/theme.js';

const app = document.getElementById('app');
const state = createState();
const screens = { home, intro, play, results, board, practice, tjoin, tlobby, twait, tresults, tmsg };

// Her ekranın sekme başlığı; ana sayfa index.html'deki SEO başlığını korur.
const HOME_TITLE = document.title;
const titleFor = (name, params) => {
  const page = {
    results: 'Sonucun', board: 'Skor Tablosu', practice: 'Antrenman',
    tjoin: 'Turnuva', tlobby: 'Turnuva lobisi', twait: 'Turnuva', tresults: 'Turnuva sonucu', tmsg: 'Turnuva',
  }[name]
    ?? (params.id && GAMES[params.id] ? GAMES[params.id].ad + (params.practice ? ' · Antrenman' : params.tournament ? ' · Turnuva' : '') : null);
  return page ? `${page} | sezgi.live` : HOME_TITLE;
};

let cleanups = [];
const bag = { add: fn => cleanups.push(fn) };

function go(name, params = {}) {
  cleanups.forEach(fn => { try { fn(); } catch { /* temizlik hatası akışı bozmasın */ } });
  cleanups = [];
  app.removeAttribute('style');
  app.dataset.screen = name;
  document.title = titleFor(name, params);
  window.scrollTo(0, 0);
  screens[name].render(app, ctx, params);
}

const ctx = {
  state,
  go,
  bag,
  practice: null,
  // Günün oyunlarını yeni sorularla, sıralamaya saymadan yeniden oynat.
  startPractice() {
    ctx.practice = createPractice(state.today().set);
    go('intro', { id: ctx.practice.nextGame(), practice: true });
  },
  // Turnuva: adres /t/<KOD>; oturum sunucuyu sorgulayıp ekranları kendisi seçer.
  tournament: null,
  openTournament(code, { replace = false, view = null } = {}) {
    ctx.tournament?.stop();
    history[replace ? 'replaceState' : 'pushState'](null, '', '/t/' + code);
    ctx.tournament = createSession(ctx, code);
    ctx.tournament.begin(view);
  },
  closeTournament() {
    ctx.tournament?.stop();
    ctx.tournament = null;
    history.replaceState(null, '', '/');
    go('home');
  },
};

const tourCode = () => location.pathname.match(/^\/t\/([A-Za-z0-9]{5})\/?$/)?.[1].toUpperCase() ?? null;

window.addEventListener('popstate', () => {
  const code = tourCode();
  if (code) ctx.openTournament(code, { replace: true });
  else if (ctx.tournament) { ctx.tournament.stop(); ctx.tournament = null; go('home'); }
});

// Kimliği arka planda al; tamamlanmış ama gönderilememiş gün varsa yeniden dene.
if (state.isComplete() && !state.today().submitted) submitDay(state).catch(() => {});
else ensureIdentity(state).catch(() => {});

syncThemeColor();

if (import.meta.env.DEV) window.__go = go;

const startCode = tourCode();
if (startCode) ctx.openTournament(startCode, { replace: true });
else go('home');
