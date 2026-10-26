export const $ = id => document.getElementById(id);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

export const gvars = game => `--gc:${game.gc};--gce:${game.gce}`;

export const nf = n => Number(n).toLocaleString('tr-TR');
