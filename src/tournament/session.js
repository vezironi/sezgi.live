// Turnuva oturumu: sunucuyu sorgular, görünümü tutar, screenFor ile doğru ekrana geçer.
// intro/play ekranları için antrenman oturumuyla aynı biçimde (set, scores, seed) oyun bağlamı sunar.
import { tournament } from '../api.js';
import { puzzleSeed, SUBMIT_GRACE_MS } from '../../shared/tournament.js';
import { createTourStore } from './store.js';
import { screenFor, isStale, pollDelay } from './route.js';

const OFFLINE_AFTER = 3;

export function createSession(ctx, code) {
  const store = createTourStore();
  let pid = store.pid(code);
  let view = null, offset = 0, key = null, lastNow = null;
  let timer = null, wake = null, stopped = false, failures = 0;
  let playing = false, hold = false, submitting = null;
  let changedAt = Date.now(), lastShape = '';
  const listeners = new Set();

  const serverNow = () => Date.now() + offset;
  const setOffline = on => { document.body.toggleAttribute('data-offline', on); };

  function route() {
    if (!view || stopped) return;
    const target = screenFor(view, { started: store.started(code), playing, pending: store.pending(code) });
    // Puan kartı gösterilirken bekleme ekranına zorla geçilmez; sıradaki oyun başlarsa geçilir.
    const held = hold && target.name === 'twait';
    const k = held ? key : `${target.name}:${JSON.stringify(target.params)}:${view.round?.no ?? ''}`;
    if (k !== key) {
      key = k;
      hold = false; // tutma yalnızca puan kartının durduğu oyun ekranı için geçerli
      ctx.go(target.name, target.params);
    } else listeners.forEach(fn => fn(view));
  }

  function apply(v) {
    // Sorgu ile eylem yanıtları farklı sırayla gelebilir: sunucuda daha önce hesaplanmış görünüm ekranı geri sarmasın.
    if (isStale(lastNow, v)) return;
    lastNow = v.now;
    view = v;
    offset = v.now - Date.now();
    const shape = JSON.stringify({ ...v, now: 0 });
    if (shape !== lastShape) { lastShape = shape; changedAt = Date.now(); }
    clearTimeout(wake);
    // Geçiş bitince herkes aynı anda sonraki ekrana geçsin: bir sonraki sorguyu beklemeden yerelde yeniden seç.
    const r = v.round;
    if (r && v.phase === 'playing' && v.now < r.stepStart) {
      wake = setTimeout(() => { view = { ...view, now: serverNow() }; route(); }, r.stepStart - v.now + 30);
    }
    route();
  }

  async function act(action, body = {}) {
    const res = await tournament(action, { code, pid, ...body });
    if (res.pid && res.pid !== pid) { pid = res.pid; store.setPid(code, pid); }
    if (res.view) apply(res.view);
    return res;
  }

  function schedule(ms) {
    clearTimeout(timer);
    if (stopped) return;
    const delay = ms ?? (view ? pollDelay(view, { playing, hidden: document.hidden, idleMs: Date.now() - changedAt }) : 0);
    if (delay !== null) timer = setTimeout(tick, delay);
  }

  // Bağlantı yüzünden gönderilemeyen puan her sorguda yeniden denenir; sunucu reddederse (süre doldu vb.) bırakılır.
  async function flushPending() {
    const p = store.pending(code);
    if (!p || submitting) return;
    if (p.no !== round()?.no) { store.clearPending(code); return; }
    try {
      await act('submit', { step: p.step, score: p.score });
      store.clearPending(code);
    } catch (e) {
      if (e.status !== 0) store.clearPending(code);
      throw e;
    }
  }

  async function tick() {
    if (stopped) return;
    try {
      if (playing && pid) await tournament('ping', { code, pid });
      else { await flushPending(); await act('state'); }
      failures = 0;
      setOffline(false);
    } catch (e) {
      if (e.status === 404 && !playing) {
        stop();
        key = 'tmsg:missing';
        ctx.go('tmsg', { kind: 'missing' });
        return;
      }
      if (++failures >= OFFLINE_AFTER) setOffline(true);
    }
    schedule();
  }

  const onVisible = () => { if (!document.hidden) { changedAt = Date.now(); schedule(0); } };
  document.addEventListener('visibilitychange', onVisible);

  function stop() {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(wake);
    document.removeEventListener('visibilitychange', onVisible);
    setOffline(false);
  }

  const round = () => view?.round ?? null;

  const session = {
    code,
    get view() { return view; },
    get pid() { return pid; },
    serverNow,
    act,
    stop,
    begin(initial) { if (initial) apply(initial); schedule(initial ? undefined : 0); },
    onView(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    lastName: () => store.lastName(),

    async join(name) {
      await act('join', { name });
      store.setLastName(name.trim());
    },
    // Atılan oyuncu yeni adla tekrar katılabilir: eski anahtar unutulur.
    rejoin() {
      store.forget(code);
      pid = null;
      key = 'tjoin:{}:';
      ctx.go('tjoin', {});
      schedule(0);
    },
    async leave() {
      stop();
      if (pid) tournament('leave', { code, pid }).catch(() => {});
      store.forget(code);
      ctx.closeTournament();
    },

    // Oyun bağlamı (intro/play/gameBar)
    get set() { return round()?.games ?? []; },
    get scores() {
      const r = round();
      if (!r) return {};
      return Object.fromEntries(Object.entries(r.mine).map(([step, sc]) => [r.games[step], sc]));
    },
    seed: id => puzzleSeed(code, round(), id),
    msLeft: () => (round() ? round().cutoff - serverNow() : 0),
    deadlineLeft: () => (round() ? round().cutoff + SUBMIT_GRACE_MS - serverNow() : 0),
    startGame() {
      const r = round();
      store.setStarted(code, { no: r.no, step: r.step });
      playing = true;
      schedule();
      route();
    },
    // Puan kartı açıkken bekleme ekranına geçişi tutar; release ile bırakılır.
    hold() { hold = true; },
    release() { hold = false; route(); },
    // Puan önce "bekleyen" olarak kaydedilir: ağ koparsa sonraki sorgularda yeniden gönderilir ve
    // oyuncu aynı soruya dönmez. Aynı anda ikinci bir gönderim başlatılmaz (0 gerçek puanı ezmesin).
    finish(score) {
      if (submitting) return submitting;
      const r = round();
      const s = store.started(code) ?? { no: r.no, step: r.step };
      store.setPending(code, { no: s.no, step: s.step, score });
      store.clearStarted(code);
      playing = false;
      submitting = (async () => {
        for (let attempt = 0; ; attempt++) {
          try {
            await act('submit', { step: s.step, score });
            store.clearPending(code);
            return true;
          } catch (e) {
            // Süre doldu / zaten gönderildi: sunucunun kararı geçerli. Ekran eski görünümle aynı soruya
            // dönmesin diye yeniden seçim taze görünümü bekler.
            if (e.status !== 0) { store.clearPending(code); return false; }
            if (attempt >= 2) return false; // bekleyen kalır, sorgu döngüsü yeniden dener
            await new Promise(res => setTimeout(res, 800));
          }
        }
      })().then(ok => { submitting = null; if (ok) route(); schedule(ok ? undefined : 0); });
      return submitting;
    },
  };
  return session;
}
