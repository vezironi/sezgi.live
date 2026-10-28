import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeName, nameKey, isCode, validGames, puzzleSeed, resolveRound, standings, pickOwner,
  STEP_LIMIT_MS, SUBMIT_GRACE_MS, TRANSITION_MS, GAME_IDLE_MS,
} from '../../shared/tournament.js';

test('normalizeName boşlukları kırpar ve teke indirir', () => {
  assert.equal(normalizeName('  Ayşe  '), 'Ayşe');
  assert.equal(normalizeName('a   b'), 'a b');
  assert.equal(normalizeName('<b>x</b>'), '<b>x</b>');
});

test('normalizeName geçersiz adları reddeder', () => {
  assert.equal(normalizeName(''), null);
  assert.equal(normalizeName('   '), null);
  assert.equal(normalizeName('a'.repeat(17)), null);
  assert.equal(normalizeName('a\u0007'), null);
  assert.equal(normalizeName(42), null);
  assert.equal(normalizeName('a'.repeat(16)), 'a'.repeat(16));
});

test('nameKey Türkçe büyük/küçük harfi eşler', () => {
  assert.equal(nameKey('İLKER'), nameKey('ilker'));
});

test('isCode yalnızca karışmayan alfabeden 5 karakter kabul eder', () => {
  assert.equal(isCode('K7QXA'), true);
  assert.equal(isCode('K7QX0'), false);
  assert.equal(isCode('k7qxa'), false);
  assert.equal(isCode('K7QX'), false);
  assert.equal(isCode(null), false);
});

test('validGames havuz sırasına dizer, hatalıyı reddeder', () => {
  assert.deepEqual(validGames(['oran', 'nokta']), ['nokta', 'oran']);
  assert.equal(validGames([]), null);
  assert.equal(validGames(['nokta', 'nokta']), null);
  assert.equal(validGames(['x']), null);
  assert.equal(validGames('nokta'), null);
});

test('puzzleSeed tur ve oyunu içerir', () => {
  assert.equal(puzzleSeed('K7QXA', { no: 2, seed: 'ab' }, 'aci'), 'turnuva:K7QXA:2:ab:aci');
});

const round = { no: 1, seed: 's', games: ['nokta', 'aci'], players: ['a', 'b'], startedAt: 0 };
const L0 = STEP_LIMIT_MS.nokta;

test('resolveRound: kimse göndermediyse ilk adımdayız', () => {
  const now = 1000;
  const r = resolveRound(round, {}, { a: now, b: now }, {}, now);
  assert.deepEqual(r, { step: 0, stepStart: 0, cutoff: L0, done: false, newEnds: {} });
});

test('resolveRound: herkes gönderince adım biter, geçiş başlar', () => {
  const now = 9000;
  const subs = { 0: { a: { score: 50, at: 5000 }, b: { score: 70, at: 8000 } } };
  const r = resolveRound(round, subs, { a: now, b: now }, {}, now);
  assert.equal(r.step, 1);
  assert.equal(r.stepStart, 8000 + TRANSITION_MS);
  assert.equal(r.cutoff, 8000 + TRANSITION_MS + STEP_LIMIT_MS.aci);
  assert.deepEqual(r.newEnds, { 0: 8000 });
});

test('resolveRound: süre dolunca (pay dahil) adım biter', () => {
  const now = L0 + SUBMIT_GRACE_MS + 1;
  const subs = { 0: { a: { score: 50, at: 5000 } } };
  const r = resolveRound(round, subs, { a: now, b: now }, {}, now);
  assert.equal(r.step, 1);
  assert.deepEqual(r.newEnds, { 0: L0 + SUBMIT_GRACE_MS });
});

test('resolveRound: süre dolmadan bekleyen oyuncu varsa adım sürer', () => {
  const now = 30000;
  const subs = { 0: { a: { score: 50, at: 5000 } } };
  const r = resolveRound(round, subs, { a: now, b: now }, {}, now);
  assert.equal(r.step, 0);
});

test('resolveRound: kopan oyuncu beklenmez', () => {
  const now = 23000;
  const subs = { 0: { a: { score: 50, at: 5000 } } };
  const r = resolveRound(round, subs, { a: now, b: 2000 }, {}, now);
  assert.equal(r.step, 1);
  assert.deepEqual(r.newEnds, { 0: 2000 + GAME_IDLE_MS });
});

test('resolveRound: kalıcı bitiş, oyuncu geri dönse de değişmez', () => {
  const now = 30000;
  const subs = { 0: { a: { score: 50, at: 5000 } } };
  const r = resolveRound(round, subs, { a: now, b: now }, { 0: 8000 }, now);
  assert.equal(r.step, 1);
  assert.equal(r.stepStart, 8000 + TRANSITION_MS);
  assert.deepEqual(r.newEnds, {});
});

test('resolveRound: son adımdan sonra geçiş, sonra done', () => {
  const ends = { 0: 8000, 1: 20000 };
  const mid = resolveRound(round, {}, {}, ends, 20000 + TRANSITION_MS - 1);
  assert.equal(mid.step, 2);
  assert.equal(mid.done, false);
  const fin = resolveRound(round, {}, {}, ends, 20000 + TRANSITION_MS);
  assert.equal(fin.step, 2);
  assert.equal(fin.done, true);
});

test('standings eşitlere aynı sırayı verir, göndermeyen 0 alır', () => {
  const r = { ...round, players: ['a', 'b', 'c'] };
  const subs = {
    0: { a: { score: 80, at: 1 }, b: { score: 70, at: 1 } },
    1: { a: { score: 60, at: 1 }, b: { score: 70, at: 1 } },
  };
  const s = standings(r, subs, { a: 'Ali', b: 'Banu', c: 'Can' });
  assert.deepEqual(s.map(x => [x.pid, x.name, x.total, x.rank]), [['a', 'Ali', 70, 1], ['b', 'Banu', 70, 1], ['c', 'Can', 0, 3]]);
  assert.deepEqual(s[2].scores, [0, 0]);
});

test('pickOwner: aktif sahip kalır, pasifse en eski aktif oyuncu', () => {
  const now = 100000;
  const players = [{ pid: 'o', joinedAt: 1 }, { pid: 'x', joinedAt: 3 }, { pid: 'y', joinedAt: 2 }];
  assert.equal(pickOwner(players, { o: now, x: now, y: now }, 'o', now), 'o');
  assert.equal(pickOwner(players, { o: now - 121000, x: now, y: now }, 'o', now), 'y');
  assert.equal(pickOwner(players, { x: now }, 'gone', now), 'x');
  assert.equal(pickOwner(players, {}, 'o', now), null);
});

test('pickOwner: sahip paylaşım için 2 dakikaya kadar uzaklaşabilir', () => {
  const now = 1_000_000;
  const players = [{ pid: 'o', joinedAt: 1 }, { pid: 'x', joinedAt: 2 }];
  assert.equal(pickOwner(players, { o: now - 90000, x: now }, 'o', now), 'o');
  assert.equal(pickOwner(players, { o: now - 121000, x: now }, 'o', now), 'x');
});
