import { test, expect, vi, afterEach } from 'vitest';
import { register, submitScore, getBoard, getMe, ApiError } from '../../src/api.js';

afterEach(() => vi.unstubAllGlobals());

const ok = data => vi.fn(async () => new Response(JSON.stringify(data), { status: 200 }));

test('register POST eder ve JSON döner', async () => {
  const f = ok({ token: 't', nick: 'sl-1234' });
  vi.stubGlobal('fetch', f);
  expect(await register()).toEqual({ token: 't', nick: 'sl-1234' });
  expect(f.mock.calls[0][0]).toBe('/api/register');
  expect(f.mock.calls[0][1].method).toBe('POST');
});

test('submitScore gövdeyi JSON gönderir', async () => {
  const f = ok({ already: false });
  vi.stubGlobal('fetch', f);
  await submitScore({ token: 't', date: '2026-11-03', scores: { nokta: 1 } });
  expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ token: 't', date: '2026-11-03', scores: { nokta: 1 } });
});

test('getBoard sorgu parametreleri', async () => {
  const f = ok({ top: [] });
  vi.stubGlobal('fetch', f);
  await getBoard('game', { game: 'aci', date: '2026-11-03' });
  expect(f.mock.calls[0][0]).toBe('/api/board?type=game&game=aci&date=2026-11-03');
  await getBoard('day');
  expect(f.mock.calls[1][0]).toBe('/api/board?type=day');
});

test('getMe başlığa token koyar', async () => {
  const f = ok({ day: null });
  vi.stubGlobal('fetch', f);
  await getMe('abc', '2026-11-03');
  expect(f.mock.calls[0][0]).toBe('/api/me?date=2026-11-03');
  expect(f.mock.calls[0][1].headers['x-sezgi-token']).toBe('abc');
});

test('HTTP hatası ApiError(status) fırlatır', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Geçersiz puan' }), { status: 400 })));
  await expect(register()).rejects.toMatchObject({ name: 'ApiError', status: 400, message: 'Geçersiz puan' });
});

test('ağ hatası ApiError(0) fırlatır', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
  const e = await register().catch(x => x);
  expect(e).toBeInstanceOf(ApiError);
  expect(e.status).toBe(0);
});
