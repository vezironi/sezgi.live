import { test, expect } from 'vitest';
import { makeRegister } from '../../api/_lib/handlers.js';
import { createFakeRedis } from '../../api/_lib/fake-redis.js';

const now = new Date('2026-11-03T12:00:00Z');
const post = (headers = {}) => new Request('http://x/api/register', { method: 'POST', headers });

test('kayıt benzersiz sl- takma ad ve token verir', async () => {
  const h = makeRegister({ redis: createFakeRedis(), now: () => now });
  const a = await (await h(post())).json();
  const b = await (await h(post())).json();
  expect(a.nick).toMatch(/^sl-\d{4,}$/);
  expect(a.token).toMatch(/^[0-9a-f]{32}$/);
  expect(a.nick).not.toBe(b.nick);
  expect(a.token).not.toBe(b.token);
});

test('takma ad token ile eşlenir', async () => {
  const redis = createFakeRedis();
  const h = makeRegister({ redis, now: () => now });
  const a = await (await h(post())).json();
  expect(await redis.get('id:' + a.token)).toBe(a.nick);
  expect(await redis.get('nick:' + a.nick)).toBe(a.token);
});

test('4 hane doluysa 5 haneye geçer', async () => {
  const redis = createFakeRedis();
  for (let n = 1000; n <= 9999; n++) await redis.set('nick:sl-' + n, 'x');
  const h = makeRegister({ redis, now: () => now });
  const a = await (await h(post())).json();
  expect(a.nick).toMatch(/^sl-\d{5}$/);
});

test('IP hız sınırı', async () => {
  const h = makeRegister({ redis: createFakeRedis(), now: () => now });
  const req = () => post({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' });
  for (let i = 0; i < 20; i++) expect((await h(req())).status).toBe(200);
  const r = await h(req());
  expect(r.status).toBe(429);
  expect((await r.json()).error).toBe('Çok fazla deneme');
  expect((await h(post({ 'x-forwarded-for': '5.6.7.8' }))).status).toBe(200);
});

test('POST dışı 405', async () => {
  const h = makeRegister({ redis: createFakeRedis(), now: () => now });
  expect((await h(new Request('http://x/api/register'))).status).toBe(405);
});
