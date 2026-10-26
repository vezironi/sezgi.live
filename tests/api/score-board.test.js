import { test, expect, beforeEach } from 'vitest';
import { makeRegister, makeScore, makeBoard, makeMe } from '../../api/_lib/handlers.js';
import { createFakeRedis } from '../../api/_lib/fake-redis.js';
import { dailySet } from '../../shared/rotation.js';

let redis, clock;
const at = iso => { clock = new Date(iso); };
const now = () => clock;
const DATE = '2026-11-03'; // Salı
const set = dailySet(DATE);

beforeEach(() => { redis = createFakeRedis(); at('2026-11-03T09:00:00Z'); });

let ipSeq = 0;
async function player() {
  const headers = { 'x-forwarded-for': `10.0.0.${++ipSeq}` }; // her oyuncu ayrı IP: kayıt hız sınırına takılmasın
  return (await makeRegister({ redis, now })(new Request('http://x/api/register', { method: 'POST', headers }))).json();
}
async function submit(p, value, date = DATE) {
  const scores = Object.fromEntries(dailySet(date).map(id => [id, value]));
  const res = await makeScore({ redis, now })(new Request('http://x/api/score', {
    method: 'POST', body: JSON.stringify({ token: p.token, date, scores }),
  }));
  return { status: res.status, body: await res.json() };
}
async function board(type, params = '') {
  const res = await makeBoard({ redis, now })(new Request(`http://x/api/board?type=${type}${params}`));
  return { status: res.status, headers: res.headers, body: await res.json() };
}
async function me(token, params = '') {
  const res = await makeMe({ redis, now })(new Request(`http://x/api/me?${params}`, { headers: { 'x-sezgi-token': token } }));
  return { status: res.status, headers: res.headers, body: await res.json() };
}

test('gönderim sıraları döner', async () => {
  const a = await player();
  const { status, body } = await submit(a, 80);
  expect(status).toBe(200);
  expect(body).toMatchObject({ already: false, nick: a.nick, day: { score: 80, rank: 1, players: 1 }, week: { score: 80, rank: 1, players: 1 } });
  expect(body.games[set[0]]).toEqual({ score: 80, rank: 1 });
});

test('ikinci gönderim idempotent', async () => {
  const a = await player();
  await submit(a, 80);
  const r2 = await submit(a, 100);
  expect(r2.status).toBe(200);
  expect(r2.body.already).toBe(true);
  expect(r2.body.day.score).toBe(80);
  expect(r2.body.week.score).toBe(80);
});

test('eşit puan aynı sıra, listede önce gönderen üstte', async () => {
  const a = await player(), b = await player(), c = await player();
  at('2026-11-03T07:00:00Z'); await submit(a, 70);
  at('2026-11-03T08:00:00Z'); await submit(b, 70);
  at('2026-11-03T08:30:00Z'); await submit(c, 90);
  const { body } = await board('day');
  expect(body.players).toBe(3);
  expect(body.top.map(r => [r.nick, r.rank, r.score])).toEqual([[c.nick, 1, 90], [a.nick, 2, 70], [b.nick, 2, 70]]);
  expect((await me(b.token)).body.day).toEqual({ score: 70, rank: 2, players: 3 });
});

test('haftalık toplam günleri biriktirir', async () => {
  const a = await player(), b = await player();
  at('2026-11-02T09:00:00Z'); await submit(a, 60, '2026-11-02');
  at('2026-11-03T09:00:00Z'); await submit(a, 70, '2026-11-03');
  await submit(b, 100, '2026-11-03');
  const { body } = await board('week');
  expect(body.top.map(r => [r.nick, r.score, r.rank])).toEqual([[a.nick, 130, 1], [b.nick, 100, 2]]);
});

test('haftalık tablo Pazartesi sıfırlanır', async () => {
  const a = await player();
  at('2026-11-01T09:00:00Z'); await submit(a, 60, '2026-11-01'); // Pazar
  at('2026-11-02T09:00:00Z'); await submit(a, 70, '2026-11-02'); // Pazartesi
  expect((await board('week', '&date=2026-11-02')).body.top[0].score).toBe(70);
  expect((await board('week', '&date=2026-11-01')).body.top[0].score).toBe(60);
});

test('gece yarısı toleransında dünün tablosuna yazar', async () => {
  const a = await player();
  at('2026-11-03T21:02:00Z');
  const r = await submit(a, 55, '2026-11-03');
  expect(r.status).toBe(200);
  expect((await board('day', '&date=2026-11-03')).body.top[0].score).toBe(55);
});

test('oyun tablosu ilk 20 ve oyun puanı', async () => {
  const ps = [];
  for (let i = 0; i < 22; i++) ps.push(await player());
  for (let i = 0; i < 22; i++) await submit(ps[i], 50 + i);
  const { body } = await board('game', `&game=${set[0]}`);
  expect(body.top).toHaveLength(20);
  expect(body.top[0]).toMatchObject({ nick: ps[21].nick, score: 71, rank: 1 });
  expect(body.players).toBe(22);
});

test('günlük ilk 100', async () => {
  for (let i = 0; i < 103; i++) await submit(await player(), i % 101);
  const { body } = await board('day');
  expect(body.top).toHaveLength(100);
  expect(body.players).toBe(103);
});

test('hatalar: bilinmeyen token 401, geçersiz gövde 400, geçersiz type 400', async () => {
  expect((await submit({ token: 'f'.repeat(32) }, 50)).status).toBe(401);
  const bad = await makeScore({ redis, now })(new Request('http://x/api/score', { method: 'POST', body: '{bozuk' }));
  expect(bad.status).toBe(400);
  expect((await board('yanlis')).status).toBe(400);
  expect((await board('game', '&game=yok')).status).toBe(400);
  expect((await board('day', '&date=2026-13-45')).status).toBe(400);
  expect((await me('f'.repeat(32))).status).toBe(401);
});

test('cache başlıkları', async () => {
  const a = await player();
  expect((await board('day')).headers.get('cache-control')).toBe('public, s-maxage=45, stale-while-revalidate=60');
  expect((await me(a.token)).headers.get('cache-control')).toBe('private, no-store');
});

test('me oynamadıysa null', async () => {
  const d = await player();
  const { body } = await me(d.token);
  expect(body.day).toBeNull();
  expect(body.week).toBeNull();
  expect(body.games).toEqual({});
});
