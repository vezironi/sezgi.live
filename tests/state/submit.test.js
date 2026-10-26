import { test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/api.js', () => ({ register: vi.fn(), submitScore: vi.fn() }));
const api = await import('../../src/api.js');
const { submitDay, ensureIdentity } = await import('../../src/submit.js');
const { createState } = await import('../../src/state.js');

const memory = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
let state;
const now = () => new Date('2026-11-03T09:00:00Z');
const completeDay = st => st.today().set.forEach(id => { st.startGame(id); st.finishGame(id, 60); });

beforeEach(() => {
  vi.resetAllMocks();
  state = createState({ storage: memory(), now });
});

test('eşzamanlı ensureIdentity tek kayıt yapar', async () => {
  api.register.mockResolvedValue({ token: 't1', nick: 'sl-1111' });
  const [a, b] = await Promise.all([ensureIdentity(state), ensureIdentity(state)]);
  expect(api.register).toHaveBeenCalledTimes(1);
  expect(a).toEqual(b);
  expect(state.identity()).toEqual({ token: 't1', nick: 'sl-1111' });
});

test('submitDay kimlik alıp gönderir ve işaretler', async () => {
  completeDay(state);
  api.register.mockResolvedValue({ token: 't1', nick: 'sl-1111' });
  api.submitScore.mockResolvedValue({ nick: 'sl-1111', day: { rank: 1 } });
  await submitDay(state);
  expect(api.submitScore.mock.calls[0][0]).toMatchObject({ token: 't1', date: '2026-11-03' });
  expect(state.today()).toMatchObject({ submitted: true, ranks: { day: { rank: 1 } } });
});

test('açılış kaydı ile gönderim aynı anda olursa tek kimlik', async () => {
  completeDay(state);
  api.register.mockResolvedValue({ token: 't1', nick: 'sl-1111' });
  api.submitScore.mockResolvedValue({ nick: 'sl-1111', day: { score: 60, rank: 1, players: 1 } });
  await Promise.all([ensureIdentity(state), submitDay(state)]);
  expect(api.register).toHaveBeenCalledTimes(1);
});

test('sunucu "zaten gönderildi" deyip sıra döndürmezse gün işaretlenmez', async () => {
  completeDay(state);
  state.setIdentity({ token: 't', nick: 'sl-1' });
  api.submitScore.mockResolvedValue({ already: true, nick: 'sl-1', day: null, week: null, games: {} });
  await expect(submitDay(state)).rejects.toBeTruthy();
  expect(state.today().submitted).toBe(false);
});

test('401 kimliği siler, hata yükselir, işaretlenmez', async () => {
  completeDay(state);
  state.setIdentity({ token: 'eski', nick: 'sl-2222' });
  api.submitScore.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
  await expect(submitDay(state)).rejects.toMatchObject({ status: 401 });
  expect(state.identity()).toBeNull();
  expect(state.today().submitted).toBe(false);
});
