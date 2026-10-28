// Sunucu görünümünden hangi turnuva ekranının açık olması gerektiğini seçer (saf fonksiyon).
// local: { started: {no, step} | null, playing: bu adımın oyun ekranında cevap bekleniyor mu }

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
  const started = local.started && local.started.no === r.no && local.started.step === step;
  if (started) return local.playing ? { name: 'play', params: { id: r.games[step], tournament: true } } : { name: 'twait', params: { step, abandon: true } };
  return { name: 'intro', params: { id: r.games[step], tournament: true } };
}
