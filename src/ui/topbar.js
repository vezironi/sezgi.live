// Ana sayfa ve sonuç ekranındaki üst çubuk: logo, seri, skor tablosu, tema.
import { $ } from './dom.js';
import { UI, icon } from './icons.js';
import { themeButton, bindThemeButton } from './theme.js';

export function topBar(state) {
  return `<div class="top">
    <div class="logo"><div class="mark"></div><div>sezgi<span>.live</span></div></div>
    <div class="sp"></div>
    <div class="pill" title="Seri">${icon(UI.flame, { size: 16, stroke: 2.4 })}${state.streak()}</div>
    <button class="iconbtn" id="lb" title="Skor tablosu" aria-label="Skor tablosu">${icon(UI.trophy)}</button>
    ${themeButton()}
  </div>`;
}

export function bindTopBar({ state, go }, back) {
  bindThemeButton(state);
  $('lb').onclick = () => go('board', { back });
}
