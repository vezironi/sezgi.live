import { Redis } from '@upstash/redis';
import { createFakeRedis } from './fake-redis.js';

let client = null;

// Vercel'in Upstash entegrasyonu KV_* adlarını, doğrudan Upstash UPSTASH_* adlarını kullanır.
// Vercel'de bilgi yoksa bellek içi veritabanına düşmek yerine hata verilir (skorlar sessizce kaybolmasın).
export function createRedis(env) {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (url && token) return new Redis({ url, token });
  if (env.VERCEL) throw new Error('Redis bağlantı bilgisi yok: Upstash Redis veritabanını projeye bağla (KV_REST_API_URL / KV_REST_API_TOKEN).');
  return createFakeRedis();
}

export function getRedis(env = process.env) {
  client ??= createRedis(env);
  return client;
}
