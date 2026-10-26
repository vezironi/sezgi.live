import { makeBoard } from './_lib/handlers.js';
import { getRedis } from './_lib/redis.js';

export const GET = makeBoard({ redis: getRedis(), now: () => new Date() });
