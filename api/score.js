import { makeScore } from './_lib/handlers.js';
import { getRedis } from './_lib/redis.js';

export const POST = makeScore({ redis: getRedis(), now: () => new Date() });
