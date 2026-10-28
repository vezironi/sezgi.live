// Bellek içi Redis: testler ve env değişkeni olmayan yerel geliştirme için.
// Yalnızca kullanılan @upstash/redis alt kümesini taklit eder.

function parseBound(v, isMin) {
  if (v === '-inf') return [-Infinity, false];
  if (v === '+inf') return [Infinity, false];
  if (typeof v === 'string' && v.startsWith('(')) return [Number(v.slice(1)), true];
  return [Number(v), false];
}

export function createFakeRedis() {
  const strings = new Map();
  const zsets = new Map();
  const hashes = new Map();
  const zset = key => { if (!zsets.has(key)) zsets.set(key, new Map()); return zsets.get(key); };
  const hash = key => { if (!hashes.has(key)) hashes.set(key, new Map()); return hashes.get(key); };

  const api = {
    async get(key) { return strings.has(key) ? strings.get(key) : null; },
    async set(key, value, opts = {}) {
      if (opts.nx && strings.has(key)) return null;
      strings.set(key, value);
      return 'OK';
    },
    async del(key) { const had = strings.delete(key) || zsets.delete(key) || hashes.delete(key); return had ? 1 : 0; },
    async incr(key) { const v = Number(strings.get(key) ?? 0) + 1; strings.set(key, v); return v; },
    async expire() { return 1; },
    async zadd(key, ...args) {
      const opts = args[0] && !('score' in args[0]) ? args.shift() : {};
      const z = zset(key);
      let added = 0;
      for (const { score, member } of args) {
        if (opts.nx && z.has(member)) continue;
        if (!z.has(member)) added++;
        z.set(member, Number(score));
      }
      return added;
    },
    async zincrby(key, inc, member) { const z = zset(key); const v = (z.get(member) ?? 0) + Number(inc); z.set(member, v); return v; },
    async zscore(key, member) { const z = zsets.get(key); return z && z.has(member) ? z.get(member) : null; },
    async zcard(key) { return zsets.get(key)?.size ?? 0; },
    async zcount(key, min, max) {
      const [lo, loEx] = parseBound(min, true), [hi, hiEx] = parseBound(max, false);
      let n = 0;
      for (const s of zsets.get(key)?.values() ?? []) {
        if ((loEx ? s > lo : s >= lo) && (hiEx ? s < hi : s <= hi)) n++;
      }
      return n;
    },
    async zrange(key, start, stop, opts = {}) {
      const entries = [...(zsets.get(key) ?? new Map())].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      if (opts.rev) entries.reverse();
      const end = stop < 0 ? entries.length + stop : stop;
      const slice = entries.slice(start, end + 1);
      return opts.withScores ? slice.flatMap(([m, s]) => [m, s]) : slice.map(([m]) => m);
    },
    async hset(key, obj) {
      const h = hash(key);
      let added = 0;
      for (const [f, v] of Object.entries(obj)) { if (!h.has(f)) added++; h.set(f, v); }
      return added;
    },
    async hsetnx(key, field, value) { const h = hash(key); if (h.has(field)) return 0; h.set(field, value); return 1; },
    async hget(key, field) { const h = hashes.get(key); return h && h.has(field) ? h.get(field) : null; },
    async hgetall(key) { const h = hashes.get(key); return h && h.size ? Object.fromEntries(h) : null; },
    async hdel(key, ...fields) { const h = hashes.get(key); let n = 0; for (const f of fields) if (h?.delete(f)) n++; return n; },
    pipeline() {
      const queue = [];
      const p = {};
      for (const name of Object.keys(api)) {
        if (name === 'pipeline' || name === 'multi') continue;
        p[name] = (...args) => { queue.push([name, args]); return p; };
      }
      p.exec = async () => { const out = []; for (const [name, args] of queue) out.push(await api[name](...args)); return out; };
      return p;
    },
    // Bellek içinde işlem zaten tek seferde uygulanır; MULTI ile PIPELINE aynı davranır.
    multi() { return api.pipeline(); },
  };
  return api;
}
