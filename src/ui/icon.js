// Lucide ikon düğümlerini ([etiket, öznitelikler][]) satır içi SVG metnine çevirir.
import { esc } from './dom.js';

export function icon(node, { size = 20, stroke = 2, cls = '' } = {}) {
  const children = node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="ic${cls ? ' ' + cls : ''}" aria-hidden="true">${children}</svg>`;
}
