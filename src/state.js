// Cihazda tutulan durum: günün ilerlemesi, seri, kimlik ve tema.
import { istanbulDate, addDays } from '../shared/date.js';
import { dailySet } from '../shared/rotation.js';

const KEY = 'sezgi-v1';
const THEME_KEY = 'sezgi-tema';

// localStorage erişilemezse (gizli mod, kota, engelleme) bellek içi Map'e düşer.
export function safeLocalStorage(backing = globalThis.localStorage) {
  const mem = new Map();
  const attempt = (fn, fallback) => { try { return backing ? fn() : fallback(); } catch { return fallback(); } };
  return {
    getItem: k => attempt(() => backing.getItem(k) ?? (mem.has(k) ? mem.get(k) : null), () => (mem.has(k) ? mem.get(k) : null)),
    setItem: (k, v) => { mem.set(k, String(v)); attempt(() => backing.setItem(k, String(v)), () => {}); },
    removeItem: k => { mem.delete(k); attempt(() => backing.removeItem(k), () => {}); },
  };
}

const newDay = date => ({ date, set: dailySet(date), scores: {}, inProgress: null, submitted: false, ranks: null });

export function createState({ storage = safeLocalStorage(), now = () => new Date() } = {}) {
  let data;
  try { data = JSON.parse(storage.getItem(KEY)) ?? {}; } catch { data = {}; }
  const save = () => storage.setItem(KEY, JSON.stringify(data));
  const todayDate = () => istanbulDate(now());

  // Gün döndüyse (yarım set dahil) eski gün düşer.
  function day() {
    const date = todayDate();
    if (data.day?.date !== date) { data.day = newDay(date); save(); }
    return data.day;
  }

  // Sayfa açılışında: "Hazırım!"dan sonra bitirilmeyen oyun 0 sayılır.
  const d0 = day();
  if (d0.inProgress && !(d0.inProgress in d0.scores)) {
    d0.scores[d0.inProgress] = 0;
    d0.inProgress = null;
    save();
  }

  const isComplete = () => { const d = day(); return d.set.every(id => id in d.scores); };

  function completeStreak() {
    const today = todayDate(), s = data.streak ?? { count: 0, last: null };
    if (s.last === today) return;
    data.streak = { count: s.last === addDays(today, -1) ? s.count + 1 : 1, last: today };
  }

  return {
    today: () => day(),
    nextGame: () => { const d = day(); return d.set.find(id => !(id in d.scores)) ?? null; },
    startGame(id) { const d = day(); if (d.set.includes(id) && !(id in d.scores)) { d.inProgress = id; save(); } },
    finishGame(id, score) {
      const d = day();
      if (d.inProgress !== id) return; // yalnızca bu gün başlatılmış oyun puanlanır
      d.scores[id] = score;
      d.inProgress = null;
      if (isComplete()) completeStreak();
      save();
    },
    isComplete,
    markSubmitted(ranks) { const d = day(); d.submitted = true; d.ranks = ranks; save(); },
    streak() {
      const s = data.streak, today = todayDate();
      return s && (s.last === today || s.last === addDays(today, -1)) ? s.count : 0;
    },
    identity: () => data.identity ?? null,
    setIdentity(identity) { data.identity = identity; save(); },
    theme: () => { const t = storage.getItem(THEME_KEY); return t === 'dark' || t === 'light' ? t : null; },
    setTheme: t => storage.setItem(THEME_KEY, t),
  };
}
