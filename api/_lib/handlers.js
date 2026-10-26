// API handler fabrikaları: redis ve saat enjekte edilir (test edilebilirlik için).
import { keys, TTL } from './keys.js';
import { istanbulDate, weekStart, daysBetween, secondsSinceIstanbulMidnight } from '../../shared/date.js';
import { dailySet } from '../../shared/rotation.js';
import { GAME_IDS } from '../../shared/games.js';
import { validateSubmission } from '../../shared/validate.js';

const REGISTER_LIMIT = 20;

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
    const rl = keys.rl(clientIp(req), istanbulDate(now()));
    const count = await redis.incr(rl);
    if (count === 1) await redis.expire(rl, TTL.rl);
    if (count > REGISTER_LIMIT) return json({ error: 'Çok fazla deneme' }, 429);

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

async function standing(redis, key, member) {
  const c = await redis.zscore(key, member);
  if (c === null || c === undefined) return null;
  const score = pointsOf(Number(c));
  const above = await redis.zcount(key, (score + 1) * SCALE, '+inf');
  return { score, rank: above + 1 };
}

async function ranksFor(redis, nick, date) {
  const dayKey = keys.day(date), weekKey = keys.week(weekStart(date));
  const [day, week] = await Promise.all([standing(redis, dayKey, nick), standing(redis, weekKey, nick)]);
  if (day) day.players = await redis.zcard(dayKey);
  if (week) week.players = await redis.zcard(weekKey);
  const games = {};
  for (const id of dailySet(date)) {
    const g = await standing(redis, keys.game(date, id), nick);
    if (g) games[id] = g;
  }
  return { nick, day, week, games };
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

    const p = redis.pipeline();
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
    await p.exec();

    return json({ already: false, ...(await ranksFor(redis, nick, v.date)) });
  };
}

export function makeBoard({ redis, now }) {
  return async req => {
    const q = new URL(req.url).searchParams;
    const type = q.get('type');
    const date = q.get('date') ?? istanbulDate(now());
    if (!DATE_RE.test(date)) return json({ error: 'Geçersiz tarih' }, 400);
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
    if (!DATE_RE.test(date)) return json({ error: 'Geçersiz tarih' }, 400, { 'cache-control': 'private, no-store' });
    const nick = await nickFor(redis, req.headers.get('x-sezgi-token'));
    if (!nick) return json({ error: 'Bilinmeyen kimlik' }, 401, { 'cache-control': 'private, no-store' });
    return json(await ranksFor(redis, nick, date), 200, { 'cache-control': 'private, no-store' });
  };
}
