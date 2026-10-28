import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTournament } from '../../api/_lib/handlers.js';
import { createFakeRedis } from '../../api/_lib/fake-redis.js';
import { isCode, STEP_LIMIT_MS, SUBMIT_GRACE_MS, TRANSITION_MS, GAME_IDLE_MS } from '../../shared/tournament.js';

function setup() {
  const clock = { t: 1_000_000 };
  const h = makeTournament({ redis: createFakeRedis(), now: () => new Date(clock.t) });
  const call = (body, ip = '1.1.1.1') => h(new Request('http://x/api/turnuva', {
    method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body),
  })).then(async r => ({ status: r.status, body: await r.json() }));
  return { clock, call };
}

async function lobby(n = 2, games = ['nokta', 'aci']) {
  const s = setup();
  const c = await s.call({ action: 'create', name: 'Sahip' });
  const code = c.body.view.code;
  const pids = [c.body.pid];
  for (let i = 1; i < n; i++) pids.push((await s.call({ action: 'join', code, name: 'Oyuncu' + i })).body.pid);
  await s.call({ action: 'games', code, pid: pids[0], games });
  return { ...s, code, pids };
}

test('create lobi açar ve oluşturanı sahip yapar', async () => {
  const { call } = setup();
  const r = await call({ action: 'create', name: 'Ayşe' });
  assert.equal(r.status, 200);
  assert.match(r.body.pid, /^[0-9a-f]{32}$/);
  assert.equal(isCode(r.body.view.code), true);
  assert.equal(r.body.view.phase, 'lobby');
  assert.equal(r.body.view.me.owner, true);
  assert.equal(r.body.view.games.length, 5);
});

test('aynı ad (büyük/küçük harf farklı) reddedilir, gizli anahtarlar sızmaz', async () => {
  const { call } = setup();
  const c = await call({ action: 'create', name: 'İlker' });
  const code = c.body.view.code;
  const dup = await call({ action: 'join', code, name: 'ilker' });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error, 'Bu ad alınmış');
  const ok = await call({ action: 'join', code, name: 'Banu' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.view.players.length, 2);
  assert.equal(JSON.stringify(ok.body.view).includes(c.body.pid), false);
});

test('olmayan lobiye katılma 404', async () => {
  const { call } = setup();
  const r = await call({ action: 'join', code: 'AAAAA', name: 'x' });
  assert.equal(r.status, 404);
});

test('10 kişilik lobi dolu', async () => {
  const { call, code } = await lobby(10);
  const r = await call({ action: 'join', code, name: 'Fazla' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'Lobi dolu');
});

test('yalnızca sahip ve en az 2 oyuncuyla başlar', async () => {
  const one = await lobby(1);
  assert.equal((await one.call({ action: 'start', code: one.code, pid: one.pids[0] })).status, 409);
  const two = await lobby(2);
  assert.equal((await two.call({ action: 'start', code: two.code, pid: two.pids[1] })).status, 403);
  const ok = await two.call({ action: 'start', code: two.code, pid: two.pids[0] });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.view.phase, 'playing');
});

test('atılan oyuncu kicked görür ve tekrar katılamaz', async () => {
  const { call, code, pids } = await lobby(2);
  const v = (await call({ action: 'state', code, pid: pids[0] })).body.view;
  const target = v.players.find(p => !p.owner).id;
  assert.equal((await call({ action: 'kick', code, pid: pids[0], target })).status, 200);
  assert.equal((await call({ action: 'state', code, pid: pids[1] })).body.view.kicked, true);
  assert.equal((await call({ action: 'join', code, pid: pids[1], name: 'Geri' })).status, 403);
});

test('tam tur: paralel gönderim, adım geçişi, sonuç', async () => {
  const { call, clock, code, pids } = await lobby(2);
  await call({ action: 'start', code, pid: pids[0] });
  clock.t += 5000;
  const [a, b] = await Promise.all([
    call({ action: 'submit', code, pid: pids[0], step: 0, score: 80 }),
    call({ action: 'submit', code, pid: pids[1], step: 0, score: 60 }),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal((await call({ action: 'submit', code, pid: pids[0], step: 0, score: 90 })).status, 409);
  clock.t += TRANSITION_MS;
  const mid = (await call({ action: 'state', code, pid: pids[0] })).body.view;
  assert.equal(mid.round.step, 1);
  assert.deepEqual(mid.round.mine, { 0: 80 });
  assert.equal(mid.round.results, null);
  await call({ action: 'submit', code, pid: pids[0], step: 1, score: 40 });
  clock.t += STEP_LIMIT_MS.aci + SUBMIT_GRACE_MS + TRANSITION_MS + 1;
  const end = (await call({ action: 'state', code, pid: pids[1] })).body.view;
  assert.equal(end.phase, 'results');
  assert.deepEqual(end.round.results.map(r => [r.name, r.total, r.rank]), [['Sahip', 60, 1], ['Oyuncu1', 30, 2]]);
  assert.deepEqual(end.round.results[1].scores, [60, 0]);
});

test('kopan oyuncu beklenmez ve geri dönünce geçmiş değişmez', async () => {
  const { call, clock, code, pids } = await lobby(2);
  await call({ action: 'start', code, pid: pids[0] });
  clock.t += GAME_IDLE_MS + 1;
  await call({ action: 'submit', code, pid: pids[0], step: 0, score: 50 });
  const v1 = (await call({ action: 'state', code, pid: pids[0] })).body.view;
  assert.equal(v1.round.step, 1);
  const back = (await call({ action: 'state', code, pid: pids[1] })).body.view;
  assert.equal(back.round.step, 1);
  assert.equal(back.round.stepStart, v1.round.stepStart);
  assert.equal(v1.round.roster.length, 2);
});

test('süre dolduktan sonra gönderim reddedilir', async () => {
  const { call, clock, code, pids } = await lobby(2);
  await call({ action: 'start', code, pid: pids[0] });
  await call({ action: 'state', code, pid: pids[1] });
  clock.t += STEP_LIMIT_MS.nokta + SUBMIT_GRACE_MS + 1;
  const r = await call({ action: 'submit', code, pid: pids[1], step: 0, score: 50 });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'Süre doldu');
});

test('tur sürerken yeni katılım 423', async () => {
  const { call, code, pids } = await lobby(2);
  await call({ action: 'start', code, pid: pids[0] });
  const r = await call({ action: 'join', code, name: 'Geç' });
  assert.equal(r.status, 423);
  const watch = (await call({ action: 'state', code })).body.view;
  assert.equal(watch.me, null);
  assert.equal(watch.phase, 'playing');
});

test('again yeni tur açar, lobby lobiye döner', async () => {
  const { call, clock, code, pids } = await lobby(2, ['nokta']);
  await call({ action: 'start', code, pid: pids[0] });
  await call({ action: 'submit', code, pid: pids[0], step: 0, score: 50 });
  await call({ action: 'submit', code, pid: pids[1], step: 0, score: 50 });
  clock.t += TRANSITION_MS;
  assert.equal((await call({ action: 'state', code, pid: pids[0] })).body.view.phase, 'results');
  const again = (await call({ action: 'again', code, pid: pids[0] })).body.view;
  assert.equal(again.phase, 'playing');
  assert.equal(again.round.no, 2);
  assert.deepEqual(again.round.mine, {});
  await call({ action: 'submit', code, pid: pids[0], step: 0, score: 50 });
  await call({ action: 'submit', code, pid: pids[1], step: 0, score: 50 });
  clock.t += TRANSITION_MS;
  await call({ action: 'state', code, pid: pids[0] });
  const back = (await call({ action: 'lobby', code, pid: pids[0] })).body.view;
  assert.equal(back.phase, 'lobby');
  assert.equal(back.round, null);
});

test('sahip 31 sn sessiz kalırsa sahiplik devredilir', async () => {
  const { call, clock, code, pids } = await lobby(2);
  clock.t += 31000;
  const v = (await call({ action: 'state', code, pid: pids[1] })).body.view;
  assert.equal(v.me.owner, true);
});

test('yeniden adlandırma ve ayrılma adı serbest bırakır', async () => {
  const { call, code, pids } = await lobby(2);
  assert.equal((await call({ action: 'rename', code, pid: pids[1], name: 'Yeni' })).status, 200);
  assert.equal((await call({ action: 'join', code, name: 'Oyuncu1' })).status, 200);
  await call({ action: 'leave', code, pid: pids[1] });
  assert.equal((await call({ action: 'join', code, name: 'yeni' })).status, 200);
});

test('aynı IP dakikada 5ten fazla lobi açamaz', async () => {
  const { call } = setup();
  for (let i = 0; i < 5; i++) assert.equal((await call({ action: 'create', name: 'a' })).status, 200);
  assert.equal((await call({ action: 'create', name: 'a' })).status, 429);
});

test('geçersiz eylem ve metod', async () => {
  const { call } = setup();
  assert.equal((await call({ action: 'uç' })).status, 400);
});
