import { Redis } from '@upstash/redis';
import { createFakeRedis } from './fake-redis.js';

let client = null;

// Vercel'in Upstash entegrasyonu KV_* adlarını, doğrudan Upstash UPSTASH_* adlarını kullanır.
export function getRedis(env = process.env) {
  if (client) return client;
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : createFakeRedis();
  return client;
}
