// API handler fabrikaları: redis ve saat enjekte edilir (test edilebilirlik için).
import { keys, TTL } from './keys.js';
import { istanbulDate } from '../../shared/date.js';

const REGISTER_LIMIT = 20;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'yerel';
}

function newToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

async function claimNick(redis, token) {
  for (let attempt = 0; ; attempt++) {
    const digits = 4 + Math.floor(attempt / 10);
    const lo = 10 ** (digits - 1);
    const nick = 'sl-' + (lo + Math.floor(Math.random() * 9 * lo));
    if (await redis.set(keys.nick(nick), token, { nx: true })) return nick;
  }
}

export function makeRegister({ redis, now }) {
  return async req => {
    if (req.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405);
    const rl = keys.rl(clientIp(req), istanbulDate(now()));
    const count = await redis.incr(rl);
    if (count === 1) await redis.expire(rl, TTL.rl);
    if (count > REGISTER_LIMIT) return json({ error: 'Çok fazla deneme' }, 429);

    const token = newToken();
    const nick = await claimNick(redis, token);
    await redis.set(keys.id(token), nick);
    return json({ token, nick });
  };
}
