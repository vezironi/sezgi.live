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
import { submitDay, ensureIdentity } from './submit.js';

const app = document.getElementById('app');
const state = createState();
const screens = { home, intro, play, results, board };

let cleanups = [];
const bag = { add: fn => cleanups.push(fn) };

function go(name, params = {}) {
  cleanups.forEach(fn => { try { fn(); } catch { /* temizlik hatası akışı bozmasın */ } });
  cleanups = [];
  app.removeAttribute('style');
  app.dataset.screen = name;
  window.scrollTo(0, 0);
  screens[name].render(app, ctx, params);
}

const ctx = { state, go, bag };

// Kimliği arka planda al; tamamlanmış ama gönderilememiş gün varsa yeniden dene.
if (state.isComplete() && !state.today().submitted) submitDay(state).catch(() => {});
else ensureIdentity(state).catch(() => {});

if (import.meta.env.DEV) window.__go = go;

go('home');
