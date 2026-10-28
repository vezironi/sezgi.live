import { makeTournament } from './_lib/handlers.js';
import { getRedis } from './_lib/redis.js';

export const POST = makeTournament({ redis: getRedis(), now: () => new Date() });
