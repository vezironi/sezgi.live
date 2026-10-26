// API handler fabrikaları: redis ve saat enjekte edilir (test edilebilirlik için).
import { keys, TTL } from './keys.js';
import { istanbulDate, weekStart, daysBetween, secondsSinceIstanbulMidnight } from '../../shared/date.js';
import { dailySet } from '../../shared/rotation.js';
import { GAME_IDS } from '../../shared/games.js';
import { validateSubmission } from '../../shared/validate.js';

// Türk mobil operatörleri çok sayıda aboneyi aynı IP'nin arkasına koyar: kısa patlama sınırı + geniş günlük sınır.
const REGISTER_PER_MINUTE = 10;
const REGISTER_PER_DAY = 300;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'yerel';
}

function newToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

async function claimNick(redis, token) {
  for (let attempt = 0; ; attempt++) {
    const digits = 4 + Math.floor(attempt / 10);
    const lo = 10 ** (digits - 1);
    const nick = 'sl-' + (lo + Math.floor(Math.random() * 9 * lo));
    if (await redis.set(keys.nick(nick), token, { nx: true })) return nick;
  }
}

export function makeRegister({ redis, now }) {
  return async req => {
    if (req.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405);
    const ip = clientIp(req), t = now();
    const minuteKey = keys.rlMinute(ip, Math.floor(t.getTime() / 60000));
    const dayKey = keys.rl(ip, istanbulDate(t));
    const [perMinute, perDay] = await Promise.all([redis.incr(minuteKey), redis.incr(dayKey)]);
    if (perMinute === 1) await redis.expire(minuteKey, 60);
    if (perDay === 1) await redis.expire(dayKey, TTL.rl);
    if (perMinute > REGISTER_PER_MINUTE || perDay > REGISTER_PER_DAY) return json({ error: 'Çok fazla deneme' }, 429);

    const token = newToken();
    const nick = await claimNick(redis, token);
    await redis.set(keys.id(token), nick);
    return json({ token, nick });
  };
}

// Bileşik skor: puan · 1e6 + eşitlik bozucu (erken gönderen yüksek). Puan = floor(c / 1e6).
const SCALE = 1e6;
const TIE_MAX = 999999;
const BOARD_CACHE = 'public, s-maxage=45, stale-while-revalidate=60';
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const pointsOf = composite => Math.floor(composite / SCALE);

// İki tur: önce tüm puanlar ve oyuncu sayıları, sonra yalnızca gereken sıra sayımları.
async function ranksFor(redis, nick, date) {
  const dayKey = keys.day(date), weekKey = keys.week(weekStart(date));
  const set = dailySet(date);
  const boards = [dayKey, weekKey, ...set.map(id => keys.game(date, id))];

  const p1 = redis.pipeline();
  boards.forEach(k => p1.zscore(k, nick));
  p1.zcard(dayKey);
  p1.zcard(weekKey);
  const r1 = await p1.exec();
  const scores = r1.slice(0, boards.length).map(c => (c === null || c === undefined ? null : pointsOf(Number(c))));
  const [dayPlayers, weekPlayers] = r1.slice(boards.length);

  const present = boards.map((k, i) => [k, scores[i]]).filter(([, sc]) => sc !== null);
  const ranks = {};
  if (present.length) {
    const p2 = redis.pipeline();
    present.forEach(([k, sc]) => p2.zcount(k, (sc + 1) * SCALE, '+inf'));
    (await p2.exec()).forEach((above, i) => { ranks[present[i][0]] = Number(above) + 1; });
  }

  const at = (i, extra = {}) => (scores[i] === null ? null : { score: scores[i], rank: ranks[boards[i]], ...extra });
  const games = {};
  set.forEach((id, i) => { const g = at(i + 2); if (g) games[id] = g; });
  return { nick, day: at(0, { players: dayPlayers }), week: at(1, { players: weekPlayers }), games };
}

// Tablolar en fazla 8 gün tutulur; gelecek için 1 günlük saat farkı payı.
function dateAllowed(date, now) {
  if (!DATE_RE.test(date)) return false;
  const offset = daysBetween(istanbulDate(now), date);
  return offset >= -8 && offset <= 1;
}

async function nickFor(redis, token) {
  if (typeof token !== 'string' || !token) return null;
  return redis.get(keys.id(token));
}

export function makeScore({ redis, now }) {
  return async req => {
    if (req.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405);
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
    const t = now();
    const v = validateSubmission(body, t);
    if (!v.ok) return json({ error: v.error }, 400);
    const nick = await nickFor(redis, body.token);
    if (!nick) return json({ error: 'Bilinmeyen kimlik' }, 401);

    const claimed = await redis.set(keys.sub(v.date, body.token), 1, { nx: true, ex: TTL.day });
    if (!claimed) return json({ already: true, ...(await ranksFor(redis, nick, v.date)) });

    // Gece yarısı toleransında (dünün tarihi) saniye, o günün başından sayılır.
    const secs = secondsSinceIstanbulMidnight(t) + (istanbulDate(t) === v.date ? 0 : 86400);
    const monday = weekStart(v.date);
    const weekSecs = daysBetween(monday, v.date) * 86400 + secs;
    const dayKey = keys.day(v.date), weekKey = keys.week(monday);

    // MULTI: ya hepsi yazılır ya hiçbiri. Hata olursa gönderim hakkı geri verilir, istemci tekrar dener.
    const p = redis.multi();
    p.zadd(dayKey, { score: v.day * SCALE + (TIE_MAX - secs), member: nick });
    p.expire(dayKey, TTL.day);
    for (const id of Object.keys(v.scores)) {
      const k = keys.game(v.date, id);
      p.zadd(k, { score: v.scores[id] * SCALE + (TIE_MAX - secs), member: nick });
      p.expire(k, TTL.day);
    }
    p.zadd(weekKey, { nx: true }, { score: TIE_MAX - weekSecs, member: nick });
    p.zincrby(weekKey, v.day * SCALE, nick);
    p.expire(weekKey, TTL.week);
    try {
      await p.exec();
    } catch {
      await redis.del(keys.sub(v.date, body.token)).catch(() => {});
      return json({ error: 'Skor kaydedilemedi, tekrar dene' }, 503);
    }

    return json({ already: false, ...(await ranksFor(redis, nick, v.date)) });
  };
}

export function makeBoard({ redis, now }) {
  return async req => {
    const q = new URL(req.url).searchParams;
    const type = q.get('type');
    const date = q.get('date') ?? istanbulDate(now());
    if (!dateAllowed(date, now())) return json({ error: 'Geçersiz tarih' }, 400);
    let key, limit = 100;
    if (type === 'day') key = keys.day(date);
    else if (type === 'week') key = keys.week(weekStart(date));
    else if (type === 'game' && GAME_IDS.includes(q.get('game'))) { key = keys.game(date, q.get('game')); limit = 20; }
    else return json({ error: 'Geçersiz tablo' }, 400);

    const [flat, players] = await Promise.all([redis.zrange(key, 0, limit - 1, { rev: true, withScores: true }), redis.zcard(key)]);
    const top = [];
    for (let i = 0; i < flat.length; i += 2) {
      const score = pointsOf(Number(flat[i + 1]));
      const prev = top[top.length - 1];
      top.push({ rank: prev && prev.score === score ? prev.rank : top.length + 1, nick: String(flat[i]), score });
    }
    return json({ type, date, players, top }, 200, { 'cache-control': BOARD_CACHE });
  };
}

export function makeMe({ redis, now }) {
  return async req => {
    const q = new URL(req.url).searchParams;
    const date = q.get('date') ?? istanbulDate(now());
    if (!dateAllowed(date, now())) return json({ error: 'Geçersiz tarih' }, 400, { 'cache-control': 'private, no-store' });
    const nick = await nickFor(redis, req.headers.get('x-sezgi-token'));
    if (!nick) return json({ error: 'Bilinmeyen kimlik' }, 401, { 'cache-control': 'private, no-store' });
    return json(await ranksFor(redis, nick, date), 200, { 'cache-control': 'private, no-store' });
  };
}
