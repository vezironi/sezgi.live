// Sunucuya gelen skor gönderiminin doğrulaması.
import { dailySet } from './rotation.js';
import { dayScore } from './games.js';
import { istanbulDate, addDays, secondsSinceIstanbulMidnight } from './date.js';

export const GRACE_SECONDS = 300;

const fail = error => ({ ok: false, error });

export function validateSubmission(body, now) {
  if (!body || typeof body !== 'object') return fail('Geçersiz istek');
  const { token, date, scores } = body;
  if (typeof token !== 'string' || !/^[0-9a-f]{32,64}$/.test(token)) return fail('Geçersiz kimlik');

  const today = istanbulDate(now);
  const inGrace = date === addDays(today, -1) && secondsSinceIstanbulMidnight(now) <= GRACE_SECONDS;
  if (date !== today && !inGrace) return fail('Geçersiz tarih');

  if (!scores || typeof scores !== 'object') return fail('Puan yok');
  const set = dailySet(date);
  const keys = Object.keys(scores);
  if (keys.length !== set.length || !set.every(id => keys.includes(id))) return fail('Oyun seti uyuşmuyor');
  if (!set.every(id => Number.isInteger(scores[id]) && scores[id] >= 0 && scores[id] <= 100)) return fail('Geçersiz puan');

  return { ok: true, date, scores, day: dayScore(set.map(id => scores[id])) };
}
