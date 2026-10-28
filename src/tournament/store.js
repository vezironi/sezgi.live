// Turnuva için cihazda tutulanlar: lobi başına gizli oyuncu anahtarı, son kullanılan ad, başlatılan oyun.
import { safeLocalStorage } from '../state.js';

const KEY = 'sezgi-turnuva';

export function createTourStore(storage = safeLocalStorage()) {
  let data;
  try { data = JSON.parse(storage.getItem(KEY)) ?? {}; } catch { data = {}; }
  if (typeof data !== 'object' || Array.isArray(data)) data = {};
  data.pids ??= {};
  data.started ??= {};
  data.pending ??= {};
  const save = () => storage.setItem(KEY, JSON.stringify(data));

  return {
    pid: code => data.pids[code] ?? null,
    setPid(code, pid) { data.pids[code] = pid; save(); },
    forget(code) { delete data.pids[code]; delete data.started[code]; delete data.pending[code]; save(); },
    lastName: () => (typeof data.name === 'string' ? data.name : ''),
    setLastName(name) { data.name = name; save(); },
    started: code => data.started[code] ?? null,
    setStarted(code, s) { data.started[code] = s; save(); },
    clearStarted(code) { delete data.started[code]; save(); },
    // Gönderilemeyen puan: bağlantı dönünce yeniden gönderilir, bu sürede aynı soruya dönülmez.
    pending: code => data.pending[code] ?? null,
    setPending(code, p) { data.pending[code] = p; save(); },
    clearPending(code) { delete data.pending[code]; save(); },
  };
}
