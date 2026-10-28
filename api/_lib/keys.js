// Redis anahtarları ve yaşam süreleri.
const DAY = 86400;

export const TTL = { day: 8 * DAY, week: 15 * DAY, rl: DAY, tour: DAY };

export const keys = {
  id: token => `id:${token}`,
  nick: nick => `nick:${nick}`,
  sub: (date, token) => `sub:${date}:${token}`,
  day: date => `lb:day:${date}`,
  week: monday => `lb:week:${monday}`,
  game: (date, id) => `lb:game:${date}:${id}`,
  rl: (ip, date) => `rl:reg:${ip}:${date}`,
  rlMinute: (ip, minute) => `rl:regm:${ip}:${minute}`,
  tour: code => `t:${code}`,
  rlTour: (ip, date) => `rl:tour:${ip}:${date}`,
  rlTourMinute: (ip, minute) => `rl:tourm:${ip}:${minute}`,
};
