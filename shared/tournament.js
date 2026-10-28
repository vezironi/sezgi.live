// Turnuva modunun saf mantığı: istemci ve sunucu aynı kodu kullanır.
import { GAME_IDS, dayScore } from './games.js';

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
export const NAME_MAX = 16;
// 0/O ve 1/I/L karışmasın diye çıkarıldı.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LEN = 5;

// Adım üst sınırı: tanıtımı okuma + oynama. Zaman ve Ritim daha uzun sürer.
export const STEP_LIMIT_MS = {
  nokta: 60000, aci: 60000, zaman: 75000, renk: 60000,
  merkez: 60000, yorunge: 60000, ritim: 75000, oran: 60000,
};
export const SUBMIT_GRACE_MS = 3000; // ağ gecikmesi payı
export const TRANSITION_MS = 2500;   // "Herkes bitirdi!" anı
export const LOBBY_IDLE_MS = 60000;
export const GAME_IDLE_MS = 20000;
export const OWNER_IDLE_MS = 120000; // sahip linki paylaşırken (WhatsApp vb.) sekmesi donabilir

const CONTROL = /[\u0000-\u001f\u007f]/;

export function normalizeName(raw) {
  if (typeof raw !== 'string' || CONTROL.test(raw)) return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= NAME_MAX ? name : null;
}

export const nameKey = name => name.toLocaleLowerCase('tr');

export function isCode(s) {
  return typeof s === 'string' && s.length === CODE_LEN && [...s].every(c => CODE_ALPHABET.includes(c));
}

export function validGames(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (new Set(list).size !== list.length || !list.every(id => GAME_IDS.includes(id))) return null;
  return GAME_IDS.filter(id => list.includes(id));
}

export const puzzleSeed = (code, round, id) => `turnuva:${code}:${round.no}:${round.seed}:${id}`;

// Turun hangi adımda olduğunu hesaplar. Adım i, kopmamış herkes gönderince ya da süre (+ pay) dolunca biter.
// Biten adımların anı `ends`'te kalıcıdır; yeni hesaplananlar `newEnds` ile döner ki sunucu yazsın.
export function resolveRound(round, subs, seen, ends, now) {
  const newEnds = {};
  let start = round.startedAt;
  for (let i = 0; i < round.games.length; i++) {
    const limit = STEP_LIMIT_MS[round.games[i]];
    let end = ends[i];
    if (end === undefined) {
      const finish = round.players.map(p => {
        const at = subs[i]?.[p]?.at;
        if (at !== undefined) return at;
        const last = seen[p] ?? 0;
        return now - last > GAME_IDLE_MS ? Math.max(start, last + GAME_IDLE_MS) : Infinity;
      });
      end = Math.min(start + limit + SUBMIT_GRACE_MS, Math.max(...finish));
      if (end > now) return { step: i, stepStart: start, cutoff: start + limit, done: false, newEnds };
      newEnds[i] = end;
    }
    start = end + TRANSITION_MS;
  }
  return { step: round.games.length, stepStart: start, cutoff: start, done: start <= now, newEnds };
}

// Sıralama: puan = oyun puanlarının ortalaması; eşitler aynı sırayı paylaşır (1, 1, 3).
export function standings(round, subs, names) {
  const rows = round.players.map(pid => {
    const scores = round.games.map((_, i) => subs[i]?.[pid]?.score ?? 0);
    return { pid, name: names[pid], scores, total: dayScore(scores) };
  });
  rows.sort((a, b) => b.total - a.total); // sort kararlı: eşitlikte tur sırası korunur
  return rows.map(r => ({ ...r, rank: rows.filter(o => o.total > r.total).length + 1 }));
}

export function pickOwner(players, seen, owner, now) {
  const alive = (pid, idle) => seen[pid] !== undefined && now - seen[pid] <= idle;
  if (players.some(p => p.pid === owner) && alive(owner, OWNER_IDLE_MS)) return owner;
  const next = players.filter(p => p.pid !== owner && alive(p.pid, LOBBY_IDLE_MS)).sort((a, b) => a.joinedAt - b.joinedAt)[0];
  return next ? next.pid : null;
}
