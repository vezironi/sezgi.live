// Turnuva API'si: tek uç nokta, `action` alanıyla. Tüm lobi tek bir Redis hash'inde (t:<KOD>) alan bazlı tutulur
// ki eşzamanlı yazımlar birbirini ezmesin. Turun adımı saf resolveRound ile hesaplanır, biten adımlar HSETNX ile sabitlenir.
import { keys, TTL } from './keys.js';
import { json, clientIp } from './handlers.js';
import { istanbulDate } from '../../shared/date.js';
import { GAME_IDS } from '../../shared/games.js';
import {
  MAX_PLAYERS, MIN_PLAYERS, CODE_ALPHABET, CODE_LEN, SUBMIT_GRACE_MS, LOBBY_IDLE_MS, GAME_IDLE_MS,
  normalizeName, nameKey, isCode, validGames, resolveRound, standings, pickOwner,
} from '../../shared/tournament.js';

const CREATE_PER_MINUTE = 5;
const CREATE_PER_DAY = 60;
const NO_STORE = { 'cache-control': 'private, no-store' };

class Fail extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new Fail(status, message); };

const hex = bytes => [...crypto.getRandomValues(new Uint8Array(bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
const newCode = () => [...crypto.getRandomValues(new Uint8Array(CODE_LEN))].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

// Her değer JSON olarak yazılır: Upstash okurken JSON'u kendisi çözer, bellek içi sahte Redis çözmez.
const enc = v => JSON.stringify(v);
const val = v => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return v; } };

function parse(hash) {
  const L = { owner: null, games: [], lastNo: 0, round: null, players: {}, seen: {}, names: {}, banned: {}, rawSubs: [], rawEnds: [] };
  for (const [f, raw] of Object.entries(hash)) {
    const v = val(raw);
    if (f === 'owner' || f === 'games' || f === 'lastNo' || f === 'round') L[f] = v;
    else if (f.startsWith('p:')) L.players[f.slice(2)] = v;
    else if (f.startsWith('s:')) L.seen[f.slice(2)] = Number(v);
    else if (f.startsWith('n:')) L.names[f.slice(2)] = v;
    else if (f.startsWith('b:')) L.banned[f.slice(2)] = true;
    else if (f.startsWith('r:')) L.rawSubs.push([f.slice(2).split(':'), v]);
    else if (f.startsWith('e:')) L.rawEnds.push([f.slice(2).split(':'), Number(v)]);
  }
  L.subs = {};
  L.ends = {};
  if (L.round) {
    const no = String(L.round.no);
    for (const [[n, step, pid], v] of L.rawSubs) if (n === no) (L.subs[step] ??= {})[pid] = v;
    for (const [[n, step], v] of L.rawEnds) if (n === no) L.ends[step] = v;
  }
  return L;
}

const playerList = L => Object.entries(L.players).map(([pid, p]) => ({ pid, ...p })).sort((a, b) => a.joinedAt - b.joinedAt);
const activePlayers = (L, now) => playerList(L).filter(p => L.seen[p.pid] !== undefined && now - L.seen[p.pid] <= LOBBY_IDLE_MS);

function phaseOf(L, now) {
  if (!L.round) return { phase: 'lobby', R: null };
  const R = resolveRound(L.round, L.subs, L.seen, L.ends, now);
  return { phase: R.done ? 'results' : 'playing', R };
}

function buildView(code, L, pid, now) {
  const { phase, R } = phaseOf(L, now);
  const me = L.players[pid];
  const view = {
    code, now, phase,
    kicked: !!L.banned[pid],
    me: me ? { id: me.id, name: me.name, owner: L.owner === pid } : null,
    games: L.games,
    players: activePlayers(L, now).map(p => ({ id: p.id, name: p.name, owner: L.owner === p.pid })),
    round: null,
  };
  if (L.round) {
    const r = L.round;
    const names = r.names;
    const status = p => (L.subs[R.step]?.[p] ? 'done' : now - (L.seen[p] ?? 0) > GAME_IDLE_MS ? 'gone' : 'playing');
    const mine = {};
    for (const [step, bySub] of Object.entries(L.subs)) if (bySub[pid]) mine[step] = bySub[pid].score;
    view.round = {
      no: r.no, seed: r.seed, games: r.games,
      step: R.step, stepStart: R.stepStart, cutoff: R.cutoff,
      roster: r.players.map(p => ({ id: r.ids[p], name: names[p], status: status(p) })),
      mine,
      results: phase === 'results'
        ? standings(r, L.subs, names).map(({ pid: p, name, scores, total, rank }) => ({ id: r.ids[p], name, scores, total, rank }))
        : null,
    };
  }
  return view;
}

async function rateLimit(redis, ip, t) {
  const minuteKey = keys.rlTourMinute(ip, Math.floor(t / 60000));
  const dayKey = keys.rlTour(ip, istanbulDate(new Date(t)));
  const [perMinute, perDay] = await Promise.all([redis.incr(minuteKey), redis.incr(dayKey)]);
  if (perMinute === 1) await redis.expire(minuteKey, 60);
  if (perDay === 1) await redis.expire(dayKey, TTL.rl);
  if (perMinute > CREATE_PER_MINUTE || perDay > CREATE_PER_DAY) fail(429, 'Çok fazla deneme');
}

function randomGames() {
  const pool = GAME_IDS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return validGames(pool.slice(0, 5));
}

// Ad kontrolü: geçerli mi, başkası (aktif biri) kullanıyor mu. Pasif sahibinin adı devralınır.
function claimable(L, name, pid, now) {
  const clean = normalizeName(name);
  if (!clean) fail(400, 'Geçersiz ad');
  const key = nameKey(clean);
  const holder = L.names[key];
  if (holder && holder !== pid && L.players[holder] && now - (L.seen[holder] ?? 0) <= LOBBY_IDLE_MS) fail(409, 'Bu ad alınmış');
  return { clean, key, holder: holder && holder !== pid ? holder : null };
}

export function makeTournament({ redis, now: clock }) {
  const load = async code => {
    const hash = await redis.hgetall(keys.tour(code));
    if (!hash) fail(404, 'Lobi bulunamadı');
    return parse(hash);
  };
  const touch = key => redis.expire(key, TTL.tour);

  // Biten adımları ve sahip değişikliğini kalıcılaştırır; başkası önce yazdıysa onun değeri geçerli olur.
  async function settle(code, L, now) {
    const key = keys.tour(code);
    if (L.round) {
      const { newEnds } = resolveRound(L.round, L.subs, L.seen, L.ends, now);
      for (const [step, end] of Object.entries(newEnds)) {
        const field = `e:${L.round.no}:${step}`;
        if (await redis.hsetnx(key, field, enc(end))) L.ends[step] = end;
        else L.ends[step] = Number(val(await redis.hget(key, field)));
      }
    }
    const owner = pickOwner(playerList(L), L.seen, L.owner, now);
    if (owner && owner !== L.owner) {
      await redis.hset(key, { owner: enc(owner) });
      L.owner = owner;
    }
  }

  const requireOwner = (L, pid) => { if (!pid || L.owner !== pid) fail(403, 'Yalnızca lobi sahibi'); };

  async function startRound(code, L, now) {
    const players = activePlayers(L, now);
    if (players.length < MIN_PLAYERS) fail(409, 'En az 2 oyuncu gerekli');
    const no = (L.lastNo ?? 0) + 1;
    const round = {
      no, seed: hex(4), games: L.games, startedAt: now,
      players: players.map(p => p.pid),
      names: Object.fromEntries(players.map(p => [p.pid, p.name])),
      ids: Object.fromEntries(players.map(p => [p.pid, p.id])),
    };
    const key = keys.tour(code);
    const stale = [...L.rawSubs.map(([parts]) => 'r:' + parts.join(':')), ...L.rawEnds.map(([parts]) => 'e:' + parts.join(':'))];
    if (stale.length) await redis.hdel(key, ...stale);
    await redis.hset(key, { round: enc(round), lastNo: enc(no) });
    L.round = round; L.lastNo = no; L.subs = {}; L.ends = {}; L.rawSubs = []; L.rawEnds = [];
  }

  const actions = {
    async create(body, ip, now) {
      const clean = normalizeName(body.name);
      if (!clean) fail(400, 'Geçersiz ad');
      await rateLimit(redis, ip, now);
      let code;
      do code = newCode(); while (!(await redis.hsetnx(keys.tour(code), 'created', enc(now))));
      const pid = hex(16);
      const games = randomGames();
      await redis.hset(keys.tour(code), {
        owner: enc(pid), games: enc(games), lastNo: enc(0),
        ['p:' + pid]: enc({ id: hex(4), name: clean, joinedAt: now }),
        ['s:' + pid]: enc(now), ['n:' + nameKey(clean)]: enc(pid),
      });
      await touch(keys.tour(code));
      return { code, pid };
    },

    async join(body, ip, now, L, code) {
      const { pid } = body;
      if (pid && L.banned[pid]) fail(403, 'Lobiden çıkarıldın');
      if (pid && L.players[pid]) return { pid };
      if (phaseOf(L, now).phase === 'playing') fail(423, 'Turnuva sürüyor');
      if (activePlayers(L, now).length >= MAX_PLAYERS) fail(409, 'Lobi dolu');
      const { clean, key, holder } = claimable(L, body.name, null, now);
      const fresh = hex(16);
      const key2 = keys.tour(code);
      if (holder) await redis.hdel(key2, 'p:' + holder, 's:' + holder);
      if (!holder && !(await redis.hsetnx(key2, 'n:' + key, enc(fresh)))) fail(409, 'Bu ad alınmış');
      await redis.hset(key2, {
        ['p:' + fresh]: enc({ id: hex(4), name: clean, joinedAt: now }), ['s:' + fresh]: enc(now), ['n:' + key]: enc(fresh),
      });
      return { pid: fresh };
    },

    async state() { return {}; },

    async rename(body, ip, now, L, code) {
      const p = L.players[body.pid];
      if (!p) fail(403, 'Lobide değilsin');
      if (phaseOf(L, now).phase === 'playing') fail(409, 'Şu an değiştirilemez');
      const { clean, key, holder } = claimable(L, body.name, body.pid, now);
      const k = keys.tour(code);
      if (holder) await redis.hdel(k, 'p:' + holder, 's:' + holder);
      const old = nameKey(p.name);
      if (old !== key) await redis.hdel(k, 'n:' + old);
      await redis.hset(k, { ['p:' + body.pid]: enc({ ...p, name: clean }), ['n:' + key]: enc(body.pid) });
      return {};
    },

    async games(body, ip, now, L, code) {
      requireOwner(L, body.pid);
      if (phaseOf(L, now).phase !== 'lobby') fail(409, 'Şu an değiştirilemez');
      const games = validGames(body.games);
      if (!games) fail(400, 'Geçersiz oyun seçimi');
      await redis.hset(keys.tour(code), { games: enc(games) });
      return {};
    },

    async kick(body, ip, now, L, code) {
      requireOwner(L, body.pid);
      if (phaseOf(L, now).phase === 'playing') fail(409, 'Şu an atılamaz');
      const target = Object.keys(L.players).find(pid => L.players[pid].id === body.target);
      if (!target || target === body.pid) fail(400, 'Geçersiz oyuncu');
      const k = keys.tour(code);
      await redis.hdel(k, 'p:' + target, 's:' + target, 'n:' + nameKey(L.players[target].name));
      await redis.hset(k, { ['b:' + target]: enc(1) });
      return {};
    },

    async start(body, ip, now, L, code) {
      requireOwner(L, body.pid);
      if (phaseOf(L, now).phase !== 'lobby') fail(409, 'Tur zaten başladı');
      await startRound(code, L, now);
      return {};
    },

    async again(body, ip, now, L, code) {
      requireOwner(L, body.pid);
      if (phaseOf(L, now).phase !== 'results') fail(409, 'Tur bitmedi');
      await startRound(code, L, now);
      return {};
    },

    async lobby(body, ip, now, L, code) {
      requireOwner(L, body.pid);
      if (phaseOf(L, now).phase !== 'results') fail(409, 'Tur bitmedi');
      await redis.hdel(keys.tour(code), 'round');
      L.round = null;
      return {};
    },

    async submit(body, ip, now, L, code) {
      const { pid, step, score } = body;
      const { phase, R } = phaseOf(L, now);
      if (phase !== 'playing') fail(409, 'Süre doldu');
      if (!L.round.players.includes(pid)) fail(403, 'Bu turda değilsin');
      if (!Number.isInteger(score) || score < 0 || score > 100) fail(400, 'Geçersiz puan');
      if (step !== R.step || now < R.stepStart || now > R.cutoff + SUBMIT_GRACE_MS) fail(409, 'Süre doldu');
      const sub = { score, at: now };
      if (!(await redis.hsetnx(keys.tour(code), `r:${L.round.no}:${step}:${pid}`, enc(sub)))) fail(409, 'Zaten gönderildi');
      (L.subs[step] ??= {})[pid] = sub;
      return {};
    },

    async leave(body, ip, now, L, code) {
      const p = L.players[body.pid];
      if (!p) return {};
      await redis.hdel(keys.tour(code), 'p:' + body.pid, 's:' + body.pid, 'n:' + nameKey(p.name));
      delete L.players[body.pid];
      delete L.seen[body.pid];
      return {};
    },
  };

  return async req => {
    if (req.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405, NO_STORE);
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Geçersiz istek' }, 400, NO_STORE); }
    if (!body || typeof body !== 'object') return json({ error: 'Geçersiz istek' }, 400, NO_STORE);
    const now = clock().getTime();
    const ip = clientIp(req);
    try {
      const { action } = body;
      if (action === 'ping') {
        if (!isCode(body.code) || typeof body.pid !== 'string') fail(400, 'Geçersiz istek');
        const k = keys.tour(body.code);
        // Lobi yoksa ya da oyuncu değilse sinyal yazılmaz (boş hash yaratılmasın).
        if (!(await redis.hget(k, 'p:' + body.pid))) fail(404, 'Lobi bulunamadı');
        await redis.hset(k, { ['s:' + body.pid]: enc(now) });
        await touch(k);
        return json({ ok: true }, 200, NO_STORE);
      }
      if (!Object.hasOwn(actions, action)) fail(400, 'Geçersiz istek');

      let code = body.code, pid = typeof body.pid === 'string' ? body.pid : null;
      if (action === 'create') ({ code, pid } = await actions.create(body, ip, now));
      else if (!isCode(code)) fail(404, 'Lobi bulunamadı');

      const k = keys.tour(code);
      const L = await load(code);
      if (pid && L.players[pid]) {
        await redis.hset(k, { ['s:' + pid]: enc(now) });
        L.seen[pid] = now;
      }
      await settle(code, L, now);

      let out = {};
      if (action !== 'create') {
        out = await actions[action]({ ...body, pid }, ip, now, L, code);
        if (out.pid) pid = out.pid;
      }
      const fresh = action === 'create' || action === 'state' ? L : await load(code);
      if (fresh !== L) await settle(code, fresh, now);
      await touch(k);
      const view = buildView(code, fresh, pid, now);
      return json(action === 'create' || action === 'join' ? { pid, view } : { view }, 200, NO_STORE);
    } catch (e) {
      if (e instanceof Fail) return json({ error: e.message }, e.status, NO_STORE);
      throw e;
    }
  };
}
