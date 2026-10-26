import { makeMe } from './_lib/handlers.js';
import { getRedis } from './_lib/redis.js';

export const GET = makeMe({ redis: getRedis(), now: () => new Date() });
