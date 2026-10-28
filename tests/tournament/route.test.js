import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenFor, isStale, pollDelay } from '../../src/tournament/route.js';

const me = { id: 'm1', name: 'Ben', owner: false };
const base = { code: 'K7QXA', now: 10000, kicked: false, me, games: ['nokta', 'aci'], players: [], round: null };
const round = (over = {}) => ({
  no: 1, seed: 's', games: ['nokta', 'aci'], step: 0, stepStart: 5000, cutoff: 65000,
  roster: [{ id: 'm1', name: 'Ben', status: 'playing' }], mine: {}, results: null, ...over,
});
const playing = over => ({ ...base, phase: 'playing', round: round(over) });
const idle = { started: null, playing: false };

test('atılan oyuncu kicked mesajı görür', () => {
  assert.deepEqual(screenFor({ ...base, phase: 'lobby', kicked: true, me: null }, idle), { name: 'tmsg', params: { kind: 'kicked' } });
});

test('oyuncu değilsen: tur sürüyorsa bekleme mesajı, değilse katılma formu', () => {
  assert.deepEqual(screenFor({ ...playing(), me: null }, idle), { name: 'tmsg', params: { kind: 'running' } });
  assert.deepEqual(screenFor({ ...base, phase: 'lobby', me: null }, idle), { name: 'tjoin', params: {} });
  assert.deepEqual(screenFor({ ...base, phase: 'results', me: null, round: round() }, idle), { name: 'tjoin', params: {} });
});

test('lobi ve sonuç fazları', () => {
  assert.equal(screenFor({ ...base, phase: 'lobby' }, idle).name, 'tlobby');
  assert.equal(screenFor({ ...base, phase: 'results', round: round() }, idle).name, 'tresults');
});

test('roster dışındaysan tur bitene kadar beklersin', () => {
  assert.deepEqual(screenFor(playing({ roster: [{ id: 'x', name: 'X', status: 'playing' }] }), idle), { name: 'tmsg', params: { kind: 'running' } });
});

test('geçişte ve son adımdan sonra bekleme ekranı', () => {
  assert.deepEqual(screenFor(playing({ step: 1, stepStart: 12000 }), idle), { name: 'twait', params: { step: 1 } });
  assert.deepEqual(screenFor(playing({ step: 2, stepStart: 9000 }), idle), { name: 'twait', params: { step: 2 } });
});

test('gönderdiysen bekleme ekranı', () => {
  assert.deepEqual(screenFor(playing({ mine: { 0: 70 } }), idle), { name: 'twait', params: { step: 0 } });
});

test('başlatılmış oyun: oynuyorsan oyun ekranı, yenilediysen terk edilmiş bekleme', () => {
  const started = { no: 1, step: 0 };
  assert.deepEqual(screenFor(playing(), { started, playing: true }), { name: 'play', params: { id: 'nokta', tournament: true } });
  assert.deepEqual(screenFor(playing(), { started, playing: false }), { name: 'twait', params: { step: 0, abandon: true } });
});

test('eski turdan kalan başlatma kaydı yok sayılır, tanıtım açılır', () => {
  assert.deepEqual(screenFor(playing(), { started: { no: 0, step: 0 }, playing: false }), { name: 'intro', params: { id: 'nokta', tournament: true } });
  assert.deepEqual(screenFor(playing(), idle), { name: 'intro', params: { id: 'nokta', tournament: true } });
});

test('bekleyen (gönderilemeyen) puan varken aynı soruya dönülmez', () => {
  const pending = { no: 1, step: 0, score: 80 };
  assert.deepEqual(screenFor(playing(), { started: null, playing: false, pending }), { name: 'twait', params: { step: 0 } });
  // Eski adımın bekleyen puanı yeni adımı etkilemez.
  assert.deepEqual(screenFor(playing({ step: 1 }), { started: null, playing: false, pending }).name, 'intro');
});

test('isStale: daha eski sunucu zamanlı görünüm uygulanmaz', () => {
  assert.equal(isStale(null, { now: 5 }), false);
  assert.equal(isStale(5000, { now: 4000 }), true);
  assert.equal(isStale(5000, { now: 5000 }), false);
  assert.equal(isStale(5000, { now: 6000 }), false);
});

test('pollDelay: atılınca durur, gizli lobide durur, uzun süre değişmeyen lobide seyrekleşir', () => {
  const lobby = { ...base, phase: 'lobby' };
  const o = { playing: false, hidden: false, idleMs: 0 };
  assert.equal(pollDelay({ ...lobby, kicked: true }, o), null);
  assert.equal(pollDelay(lobby, o), 1500);
  assert.equal(pollDelay(lobby, { ...o, hidden: true }), null);
  assert.equal(pollDelay({ ...base, phase: 'results', round: round() }, { ...o, hidden: true }), null);
  assert.equal(pollDelay(lobby, { ...o, idleMs: 10 * 60000 + 1 }), 60000);
  assert.equal(pollDelay(playing(), { ...o, playing: true }), 5000);
  assert.equal(pollDelay(playing(), { ...o, hidden: true }), 5000);
  assert.equal(pollDelay(playing(), o), 1500);
  assert.equal(pollDelay({ ...playing(), me: null }, o), 5000);
});
