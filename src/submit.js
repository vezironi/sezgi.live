// Kimlik alma ve tamamlanan günün skorunu gönderme. Eşzamanlı çağrılar tek isteğe birleşir.
import { register, submitScore } from './api.js';

let identityReq = null;
let submitReq = null;

export function ensureIdentity(state) {
  const id = state.identity();
  if (id) return Promise.resolve(id);
  identityReq ??= register()
    .then(fresh => { state.setIdentity(fresh); return fresh; })
    .finally(() => { identityReq = null; });
  return identityReq;
}

export function submitDay(state) {
  if (submitReq) return submitReq;
  const day = state.today();
  submitReq = (async () => {
    const id = await ensureIdentity(state);
    try {
      const ranks = await submitScore({ token: id.token, date: day.date, scores: day.scores });
      // Gece yarısı geçtiyse yeni günün kaydını işaretleme.
      if (state.today().date === day.date) state.markSubmitted(ranks);
      return ranks;
    } catch (e) {
      if (e.status === 401) state.setIdentity(null); // sunucu kimliği tanımıyor: sonraki denemede yeni kimlik
      throw e;
    }
  })().finally(() => { submitReq = null; });
  return submitReq;
}
