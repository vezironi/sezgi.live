import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenFor } from '../../src/tournament/route.js';

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
