import { makeRegister } from './_lib/handlers.js';
import { getRedis } from './_lib/redis.js';

export const POST = makeRegister({ redis: getRedis(), now: () => new Date() });
