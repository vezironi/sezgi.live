import './styles/base.css';
import './styles/screens.css';
import './styles/games.css';
import { createState } from './state.js';
import { register } from './api.js';
import * as home from './ui/screens/home.js';
import * as intro from './ui/screens/intro.js';
import * as play from './ui/screens/play.js';

const app = document.getElementById('app');
const state = createState();
const screens = { home, intro, play };

let cleanups = [];
const bag = { add: fn => cleanups.push(fn) };

function go(name, params = {}) {
  cleanups.forEach(fn => { try { fn(); } catch { /* temizlik hatası akışı bozmasın */ } });
  cleanups = [];
  app.removeAttribute('style');
  window.scrollTo(0, 0);
  screens[name].render(app, ctx, params);
}

const ctx = { state, go, bag };

// Kimlik yoksa arka planda al; başarısızsa skor gönderiminde tekrar denenir.
if (!state.identity()) register().then(id => state.setIdentity(id)).catch(() => {});

if (import.meta.env.DEV) window.__go = go;

go('home');
