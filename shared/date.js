// İstanbul (sabit UTC+3) takvim yardımcıları. Tarihler 'YYYY-MM-DD' stringleridir.

export const LAUNCH_DATE = '2026-10-26';

const OFFSET_MS = 3 * 3600 * 1000;
const DAY_MS = 86400 * 1000;
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const pad = n => String(n).padStart(2, '0');

function toUtcMs(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function istanbulDate(now) {
  return fromUtcMs(now.getTime() + OFFSET_MS);
}

export function addDays(date, n) {
  return fromUtcMs(toUtcMs(date) + n * DAY_MS);
}

export function daysBetween(from, to) {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function puzzleNumber(date) {
  return daysBetween(LAUNCH_DATE, date) + 1;
}

export function weekStart(date) {
  const dow = (new Date(toUtcMs(date)).getUTCDay() + 6) % 7; // Pazartesi = 0
  return addDays(date, -dow);
}

export function secondsSinceIstanbulMidnight(now) {
  return Math.floor(((now.getTime() + OFFSET_MS) % DAY_MS) / 1000);
}

export function msUntilIstanbulMidnight(now) {
  return DAY_MS - ((now.getTime() + OFFSET_MS) % DAY_MS);
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function formatLongDate(date) {
  const d = new Date(toUtcMs(date));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${WEEKDAYS[d.getUTCDay()]}`;
}
