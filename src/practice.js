// Antrenman: istenen oyunu yeni sorularla üst üste oynamak. Her zaman açık; sıralamaya, seriye
// ve günün puanına etki etmez. Oyun başına en iyi puan ve ortalama yalnızca bu cihazda tutulur.
import { safeLocalStorage } from './state.js';

const KEY = 'sezgi-antrenman';

export function createPracticeStats(storage = safeLocalStorage()) {
  let data;
  try { data = JSON.parse(storage.getItem(KEY)) ?? {}; } catch { data = {}; }
  if (typeof data !== 'object' || Array.isArray(data)) data = {};
  const view = s => ({ best: s.best, avg: Math.round(s.sum / s.count), count: s.count });

  return {
    get: id => (data[id]?.count ? view(data[id]) : null),
    record(id, score) {
      const prev = data[id]?.count ? data[id] : null;
      const s = prev ? { best: Math.max(prev.best, score), sum: prev.sum + score, count: prev.count + 1 } : { best: score, sum: score, count: 1 };
      data[id] = s;
      storage.setItem(KEY, JSON.stringify(data));
      return { ...view(s), record: !prev || score > prev.best };
    },
  };
}

// intro/play ekranlarının beklediği oturum biçimi (set, scores, seed) ile tek oyunluk antrenman.
export function createPractice(id, stats = createPracticeStats(), seedBase = Date.now()) {
  let attempt = 0;
  let scores = {};
  return {
    id,
    set: [id],
    get scores() { return scores; },
    seed: gid => `antrenman:${seedBase}:${attempt}:${gid}`,
    finish(gid, score) {
      if (gid !== id || gid in scores) return null;
      scores = { [gid]: score };
      return stats.record(gid, score);
    },
    again() { attempt++; scores = {}; },
    stats: () => stats.get(id),
  };
}
