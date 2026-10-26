// Ana sayfa ve sonuç ekranındaki üst çubuk: logo, seri, skor tablosu, tema.
import { $ } from './dom.js';
import { themeButton, bindThemeButton } from './theme.js';

export function topBar(state) {
  return `<div class="top">
    <div class="logo"><div class="mark"></div><div>sezgi<span>.live</span></div></div>
    <div class="sp"></div>
    <div class="pill" title="Seri">🔥 ${state.streak()}</div>
    <button class="iconbtn" id="lb" title="Skor tablosu" aria-label="Skor tablosu">🏆</button>
    ${themeButton()}
  </div>`;
}

export function bindTopBar({ state, go }, back) {
  bindThemeButton(state);
  $('lb').onclick = () => go('board', { back });
}
