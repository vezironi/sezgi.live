// Antrenman: gün tamamlandıktan sonra günün oyunlarını yeni sorularla tekrar oynamak.
// Yalnızca bellekte tutulur; sıralamaya, seriye ve günün puanına etki etmez.

export function createPractice(set, seedBase = Date.now()) {
  const order = set.slice();
  const scores = {};
  return {
    set: order,
    scores,
    seed: id => `antrenman:${seedBase}:${id}`,
    nextGame: () => order.find(id => !(id in scores)) ?? null,
    finish(id, score) { if (order.includes(id) && !(id in scores)) scores[id] = score; },
    isComplete: () => order.every(id => id in scores),
  };
}
