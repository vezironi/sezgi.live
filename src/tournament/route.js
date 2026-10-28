// Sunucu görünümünden hangi turnuva ekranının açık olması gerektiğini seçer (saf fonksiyon).
// local: { started: {no, step} | null, playing: bu adımın oyun ekranında cevap bekleniyor mu,
//          pending: gönderilemeyen puan {no, step, score} | null }

export function screenFor(view, local) {
  if (view.kicked) return { name: 'tmsg', params: { kind: 'kicked' } };
  if (!view.me) return view.phase === 'playing' ? { name: 'tmsg', params: { kind: 'running' } } : { name: 'tjoin', params: {} };
  if (view.phase === 'lobby') return { name: 'tlobby', params: {} };
  if (view.phase === 'results') return { name: 'tresults', params: {} };

  const r = view.round;
  if (!r.roster.some(p => p.id === view.me.id)) return { name: 'tmsg', params: { kind: 'running' } };
  const { step } = r;
  if (step >= r.games.length || view.now < r.stepStart) return { name: 'twait', params: { step } };
  if (step in r.mine) return { name: 'twait', params: { step } };
  if (local.pending && local.pending.no === r.no && local.pending.step === step) return { name: 'twait', params: { step } };
  const started = local.started && local.started.no === r.no && local.started.step === step;
  if (started) return local.playing ? { name: 'play', params: { id: r.games[step], tournament: true } } : { name: 'twait', params: { step, abandon: true } };
  return { name: 'intro', params: { id: r.games[step], tournament: true } };
}

// Daha önce hesaplanmış (sunucu saati geride kalan) bir yanıt, sonradan gelse de uygulanmaz.
export const isStale = (lastNow, view) => lastNow !== null && view.now < lastNow;

const POLL_MS = 1500;
const SLOW_MS = 5000;
const IDLE_MS = 60000;
const IDLE_AFTER_MS = 10 * 60000;

// Sonraki sorguya kadar beklenecek süre; null = sorgulama durur (atıldın, ya da gizli sekmede lobi/sonuç).
// Lobi ve sonuç ekranı uzun süre değişmezse seyrekleşir: açık unutulan sekmeler Redis kotasını tüketmesin.
export function pollDelay(view, { playing, hidden, idleMs }) {
  if (view.kicked) return null;
  if (!view.me) return SLOW_MS;
  if (view.phase === 'playing') return playing || hidden ? SLOW_MS : POLL_MS;
  if (hidden) return null;
  return idleMs > IDLE_AFTER_MS ? IDLE_MS : POLL_MS;
}
