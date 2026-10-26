import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito';
import './styles/base.css';
import './styles/screens.css';
import './styles/games.css';
import { createState } from './state.js';
import * as home from './ui/screens/home.js';
import * as intro from './ui/screens/intro.js';
import * as play from './ui/screens/play.js';
import * as results from './ui/screens/results.js';
import * as board from './ui/screens/board.js';
import * as practice from './ui/screens/practice.js';
import { submitDay, ensureIdentity } from './submit.js';
import { createPractice } from './practice.js';
import { GAMES } from '../shared/games.js';
import { syncThemeColor } from './ui/theme.js';

const app = document.getElementById('app');
const state = createState();
const screens = { home, intro, play, results, board, practice };

// Her ekranın sekme başlığı; ana sayfa index.html'deki SEO başlığını korur.
const HOME_TITLE = document.title;
const titleFor = (name, params) => {
  const page = { results: 'Sonucun', board: 'Skor Tablosu', practice: 'Antrenman' }[name]
    ?? (params.id && GAMES[params.id] ? GAMES[params.id].ad + (params.practice ? ' · Antrenman' : '') : null);
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
};

// Kimliği arka planda al; tamamlanmış ama gönderilememiş gün varsa yeniden dene.
if (state.isComplete() && !state.today().submitted) submitDay(state).catch(() => {});
else ensureIdentity(state).catch(() => {});

syncThemeColor();

if (import.meta.env.DEV) window.__go = go;

go('home');
