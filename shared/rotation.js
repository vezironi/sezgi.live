// Günün 5 oyunu: tarihten deterministik seçilir; hiçbir oyun art arda 2 günden fazla dışarıda kalmaz.
import { GAME_IDS } from './games.js';
import { makeRng } from './rng.js';
import { LAUNCH_DATE, addDays } from './date.js';

const SET_SIZE = 5;
const MAX_ABSENT = 2;
const cache = new Map();

function pickFor(date, mustInclude) {
  const rng = makeRng('set:' + date);
  const rest = rng.shuffle(GAME_IDS.filter(id => !mustInclude.includes(id)));
  return rng.shuffle([...mustInclude, ...rest.slice(0, SET_SIZE - mustInclude.length)]);
}

export function dailySet(date) {
  if (date < LAUNCH_DATE) return pickFor(date, []);
  if (!cache.has(date)) {
    // En son hesaplanan günden ileri yürü (ilk çağrıda LAUNCH_DATE'ten).
    let day = LAUNCH_DATE;
    let absent = Object.fromEntries(GAME_IDS.map(id => [id, 0]));
    for (const [d, entry] of cache) {
      if (d < date) { day = addDays(d, 1); absent = entry.absent; }
    }
    for (; day <= date; day = addDays(day, 1)) {
      const forced = GAME_IDS.filter(id => absent[id] >= MAX_ABSENT);
      const set = pickFor(day, forced);
      absent = Object.fromEntries(GAME_IDS.map(id => [id, set.includes(id) ? 0 : absent[id] + 1]));
      cache.set(day, { set, absent });
    }
  }
  return cache.get(date).set.slice();
}
