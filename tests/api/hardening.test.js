import { test, expect, beforeEach } from 'vitest';
import { makeRegister, makeScore, makeBoard, makeMe } from '../../api/_lib/handlers.js';
import { createFakeRedis } from '../../api/_lib/fake-redis.js';
import { createRedis } from '../../api/_lib/redis.js';
import { dailySet } from '../../shared/rotation.js';

let redis, clock;
const now = () => clock;
const DATE = '2026-11-03';
beforeEach(() => { redis = createFakeRedis(); clock = new Date('2026-11-03T09:00:00Z'); });

let ip = 0;
const player = async () => (await makeRegister({ redis, now })(new Request('http://x/api/register', { method: 'POST', headers: { 'x-forwarded-for': `9.9.9.${++ip}` } }))).json();
const submit = async (p, value) => {
  const scores = Object.fromEntries(dailySet(DATE).map(id => [id, value]));
  const res = await makeScore({ redis, now })(new Request('http://x/api/score', { method: 'POST', body: JSON.stringify({ token: p.token, date: DATE, scores }) }));
  return { status: res.status, body: await res.json() };
};

test('yazım başarısız olursa hak yanmaz: 503 döner, tekrar deneme puanı yazar', async () => {
  const a = await player();
  const realMulti = redis.multi;
  redis.multi = () => { const m = realMulti(); m.exec = async () => { throw new Error('upstash down'); }; return m; };
  const r1 = await submit(a, 70);
  expect(r1.status).toBe(503);
  redis.multi = realMulti;
  const r2 = await submit(a, 70);
  expect(r2.status).toBe(200);
  expect(r2.body).toMatchObject({ already: false, day: { score: 70, rank: 1 } });
});

test('aralık dışı tarihler reddedilir (uzak gelecek iş yükü)', async () => {
  const a = await player();
  const me = d => makeMe({ redis, now })(new Request(`http://x/api/me?date=${d}`, { headers: { 'x-sezgi-token': a.token } }));
  const board = d => makeBoard({ redis, now })(new Request(`http://x/api/board?type=day&date=${d}`));
  expect((await me('9999-12-31')).status).toBe(400);
  expect((await board('9999-12-31')).status).toBe(400);
  expect((await me('2026-11-05')).status).toBe(400);   // bugün + 2
  expect((await me('2026-10-20')).status).toBe(400);   // 14 gün önce
  expect((await me('2026-11-04')).status).toBe(200);   // bugün + 1 (saat farkı payı)
  expect((await board('2026-10-27')).status).toBe(200); // 7 gün önce
});

test('kayıt sınırı: dakikada 10, sonraki dakika yeniden açılır', async () => {
  const h = makeRegister({ redis, now });
  const req = () => new Request('http://x/api/register', { method: 'POST', headers: { 'x-forwarded-for': '5.5.5.5' } });
  for (let i = 0; i < 10; i++) expect((await h(req())).status).toBe(200);
  expect((await h(req())).status).toBe(429);
  clock = new Date('2026-11-03T09:01:00Z');
  expect((await h(req())).status).toBe(200);
});

test('kayıt sınırı: IP başına günde 300', async () => {
  const h = makeRegister({ redis, now });
  const req = () => new Request('http://x/api/register', { method: 'POST', headers: { 'x-forwarded-for': '6.6.6.6' } });
  let ok = 0;
  for (let m = 0; m < 31; m++) {
    clock = new Date(Date.UTC(2026, 10, 3, 9, m));
    for (let i = 0; i < 10; i++) if ((await h(req())).status === 200) ok++;
  }
  expect(ok).toBe(300);
});

test('Vercel üzerinde Redis bilgisi yoksa sessizce sahte veritabanına düşmez', () => {
  expect(() => createRedis({ VERCEL: '1' })).toThrow(/Redis/);
  expect(() => createRedis({})).not.toThrow();
});

test('sıra hesabı en fazla 3 tur Redis isteği yapar', async () => {
  const a = await player();
  await submit(a, 80);
  let trips = 0;
  const counted = new Proxy(redis, {
    get(target, prop) {
      const v = target[prop];
      if (typeof v !== 'function') return v;
      if (prop === 'pipeline' || prop === 'multi') {
        return () => { const p = v(); const exec = p.exec; p.exec = () => { trips++; return exec(); }; return p; };
      }
      return (...args) => { trips++; return v(...args); };
    },
  });
  const res = await makeMe({ redis: counted, now })(new Request('http://x/api/me', { headers: { 'x-sezgi-token': a.token } }));
  expect((await res.json()).day.rank).toBe(1);
  expect(trips).toBeLessThanOrEqual(3);
});
