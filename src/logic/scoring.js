import { GAMES, dayScore } from '../../shared/games.js';
import { puzzleNumber } from '../../shared/date.js';

export { dayScore };

// Hata büyüdükçe yumuşak düşen puan eğrisi: hata 0 → 100, hata = tolerans → 5.
export function curve(err, tol) {
  const v = Math.round(100 * Math.exp(-3 * (err / tol) ** 2));
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
}

const RANKS = [
  [90, '🦅 Kartal Gözü'],
  [76, '🎯 Keskin'],
  [60, '💪 Sağlam'],
  [40, '🙂 İdare Eder'],
  [0, '🌫️ Bulanık'],
];

export function rankFor(score) {
  return RANKS.find(([min]) => score >= min)[1];
}

export function squareFor(score) {
  return score >= 85 ? '🟩' : score >= 65 ? '🟨' : score >= 40 ? '🟧' : '🟥';
}

export function shareText(date, set, scores) {
  const day = dayScore(set.map(id => scores[id]));
  return [
    `sezgi.live #${puzzleNumber(date)} · ${day}/100`,
    rankFor(day),
    ...set.map(id => `${squareFor(scores[id])} ${GAMES[id].ad} ${scores[id]}`),
    'sezgi.live',
  ].join('\n');
}
