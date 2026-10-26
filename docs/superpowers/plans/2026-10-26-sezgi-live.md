# sezgi.live Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8 oyunluk havuzdan her gün aynı 5 oyunu sunan, üyeliksiz, Türkçe, günlük algı oyunu sitesini ve günlük/haftalık/oyun bazlı skor tablolarını Vercel'de yayınlanabilir hâle getirmek.

**Architecture:** Framework'süz ES modül ön yüz (Vite) + Vercel Web-standardı fonksiyonlar (`/api/*`) + Upstash Redis. Tarih, tohumlu rastgelelik, günlük oyun seçimi ve gönderim doğrulaması `shared/` altında hem istemci hem sunucu tarafından kullanılır. Bulmacalar normalize uzayda (0-1) üretilir ve göreli birimlerle puanlanır (`src/logic/`); ekrana çizim `src/games/` renderer'larında yapılır.

**Tech Stack:** Node 20+ (yerelde 26), Vite 5, Vitest 2 (+ jsdom), `@upstash/redis`, Vercel Functions (Web `Request`/`Response` handler'ları).

**Spec:** `docs/superpowers/specs/2026-10-26-sezgi-live-design.md`
**Görsel referans:** `docs/reference/demo.html` (onaylı demo; CSS, ikonlar, metinler ve etkileşim buradan taşınır, kod yapısı taşınmaz).

## Global Constraints

- Tüm kullanıcı metinleri Türkçe. Perceptle isimleri, metinleri, S/A/B/C notları kullanılmaz.
- Gün sınırı **Europe/Istanbul** gece yarısı. Haftalar Pazartesi-Pazar (İstanbul).
- Fontlar: başlık/sayı **Baloo 2** (500;600;700;800), metin **Nunito** (500;700;800), Google Fonts. **Fredoka yasak.**
- Oyun renkleri (gc / gce): nokta `#ff5d73/#d63a52`, aci `#6c4cff/#4f31d9`, zaman `#16b3a3/#0d8a7d`, renk `#ff9f1c/#d67d00`, merkez `#3a86ff/#1d63d6`, yorunge `#5f9e3a/#447a24`, ritim `#e84393/#bf2873`, oran `#56637d/#3b465c`.
- Oyun adları: Nokta, Açı, Zaman, Renk, Merkez, Yörünge, Ritim, Oran.
- Günün puanı = 5 oyunun ortalaması, `Math.round`, 0-100. Rütbeler: ≥90 `🦅 Kartal Gözü`, ≥76 `🎯 Keskin`, ≥60 `💪 Sağlam`, ≥40 `🙂 İdare Eder`, altı `🌫️ Bulanık`. Kareler: ≥85 🟩, ≥65 🟨, ≥40 🟧, altı 🟥.
- Puan eğrisi: `round(100 · e^(−3·(hata/tolerans)²))`, 0-100'e kırpılır.
- Takma ad `sl-` + 4 hane (tükenirse 5+ hane), sunucu atar, benzersiz.
- Masaüstü eşiği `min-width: 820px`; oyun alanı iç koordinatı masaüstü 480×300, telefon 300×300.
- Açı, Renk ve Oran'da **onay düğmesi yok** (bırakınca kaydedilir); Merkez ve Yörünge tek dokunuş; Nokta ve Renk 3-2-1 sayımıyla başlar.
- `LAUNCH_DATE = '2026-10-26'` (bulmaca #1). Yayından önce değiştirilebilir.
- Kişisel veri tutulmaz; IP yalnızca hız sınırı anahtarında, 24 saat TTL.

## Review Focus

1. **Skor gönderimi ağ hatası / tekrar gönderim** — sonuç ekranı yine görünür, "Tekrar dene" çıkar; aynı gün ikinci gönderim puanı ikinci kez eklemez, mevcut sıraları döner. (Task 7 testi: `ikinci gönderim idempotent`.)
2. **Oyun sırasında sayfa yenileme / sonuç ekranında yenileme** — oynanan oyun 0 olur ve sıradakine geçilir; tamamlanmış gün yeniden oynatılmaz, sonuç gösterilir. (Task 9 testleri.)
3. **localStorage kullanılamıyor (gizli mod, kota, exception)** — oyun yine oynanır, durum bellekte tutulur. (Task 9 testi: `storage throw ederse`.)
4. **Gece yarısını geçen oyun** — 23:58'de başlayıp 00:01'de biten set düşer; 5 dakikalık tolerans dışında dünün tarihiyle gönderim reddedilir. (Task 6 ve Task 9 testleri.)
5. **Nokta'ya anlamsız giriş** (boş, 0, negatif, 99999, "abc") — boş/NaN kabul edilmez, diğerleri NaN üretmeden 0'a yakın puan alır. (Task 5 testi.)

---

## Dosya Yapısı

```
package.json  vite.config.js  vercel.json  index.html  .gitignore  README.md
public/favicon.svg  public/og.png
shared/
  rng.js          tohumlu RNG (mulberry32) + string hash
  date.js         İstanbul tarihi, #N, hafta başı, gece yarısı hesapları
  games.js        oyun kimlikleri + meta (ad, açıklama, renkler)
  rotation.js     günlük 5'li seçim
  validate.js     gönderim doğrulama (sunucu)
src/
  main.js         açılış + ekran yönlendirme
  state.js        yerel ilerleme, seri, kimlik, tema (storage enjekte edilebilir)
  api.js          istemci fetch sarmalayıcıları
  logic/scoring.js   eğri, günün puanı, rütbe, kare, paylaşım metni
  logic/puzzles/<id>.js  generate(date) + score(puzzle, answer) (8 dosya) + index.js
  games/<id>.js   renderer: mount(ctx) (8 dosya) + common.js (3-2-1, koordinat yardımcıları)
  ui/dom.js  ui/icons.js  ui/theme.js
  ui/screens/home.js intro.js play.js results.js board.js
  styles/base.css  styles/screens.css  styles/games.css
api/
  register.js  score.js  board.js  me.js
  _lib/redis.js  _lib/keys.js  _lib/handlers.js  _lib/fake-redis.js
tests/  (shared/, logic/, api/, state/ alt klasörleri)
docs/reference/demo.html
```

---

### Task 1: Proje iskeleti

**Files:**
- Create: `package.json`, `vite.config.js`, `vercel.json`, `index.html`, `.gitignore`, `src/main.js`, `tests/smoke.test.js`

**Interfaces:**
- Produces: `npm run dev` (Vite, port 5173), `npm test` (Vitest), `npm run build` → `dist/`.

- [ ] **Step 1:** `git init`, `.gitignore`: `node_modules/ dist/ .vercel/ .env* .superpowers/`.
- [ ] **Step 2:** `package.json`: `"type": "module"`, scripts `dev: vite`, `build: vite build`, `preview: vite preview`, `test: vitest run`. Dependencies: `@upstash/redis`; devDependencies: `vite@^5`, `vitest@^2`, `jsdom`. `npm install`.
- [ ] **Step 3:** `vercel.json`: `{ "framework": "vite", "buildCommand": "npm run build", "outputDirectory": "dist" }`. `index.html`: `lang="tr"`, viewport, Google Fonts linkleri (Global Constraints), `<div class="app" id="app"></div>`, `<script type="module" src="/src/main.js">`, `<head>` içinde temayı ilk boyamadan önce uygulayan satır içi script (demo satır 220-224 mantığı, anahtar `sezgi-tema`).
- [ ] **Step 4:** `tests/smoke.test.js`: `expect(1 + 1).toBe(2)`. Çalıştır: `npm test` → 1 passed. `npm run build` → hatasız.
- [ ] **Step 5:** Commit: `chore: proje iskeleti`.

---

### Task 2: Tohumlu RNG ve İstanbul tarih yardımcıları

**Files:**
- Create: `shared/rng.js`, `shared/date.js`
- Test: `tests/shared/rng.test.js`, `tests/shared/date.test.js`

**Interfaces:**
- Produces:
  - `hashString(s: string) → uint32` (FNV-1a)
  - `makeRng(seed: string|number) → { next(): number /*[0,1)*/, float(a,b): number, int(a,b): number /*kapsayıcı*/, pick(arr), shuffle(arr) /*kopya döner*/ }`
  - `LAUNCH_DATE = '2026-10-26'`
  - `istanbulDate(now: Date) → 'YYYY-MM-DD'`
  - `addDays(date: string, n: number) → string`
  - `puzzleNumber(date: string) → number` (LAUNCH_DATE = 1)
  - `weekStart(date: string) → string` (o haftanın Pazartesisi)
  - `secondsSinceIstanbulMidnight(now: Date) → number`
  - `msUntilIstanbulMidnight(now: Date) → number`
  - `formatCountdown(ms: number) → 'HH:MM:SS'`
  - `formatLongDate(date: string) → '26 Ekim Pazartesi'` (tr-TR)

- [ ] **Step 1: Failing testler**

```js
test('aynı tohum aynı dizi', () => { const a = makeRng('x'), b = makeRng('x'); expect([a.next(), a.next()]).toEqual([b.next(), b.next()]); });
test('int kapsayıcı ve aralıkta', () => { const r = makeRng(1); for (let i = 0; i < 2000; i++) { const v = r.int(3, 5); expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(5); } });
test('İstanbul günü UTC 21:00 sınırı', () => {
  expect(istanbulDate(new Date('2026-10-26T20:59:59Z'))).toBe('2026-10-26');
  expect(istanbulDate(new Date('2026-10-26T21:00:00Z'))).toBe('2026-10-27');
});
test('puzzleNumber', () => { expect(puzzleNumber('2026-10-26')).toBe(1); expect(puzzleNumber('2026-11-05')).toBe(11); });
test('weekStart Pazartesi', () => { expect(weekStart('2026-10-26')).toBe('2026-10-26'); expect(weekStart('2026-11-01')).toBe('2026-10-26'); expect(weekStart('2026-11-02')).toBe('2026-11-02'); });
test('addDays ay/yıl geçişi', () => { expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); expect(addDays('2026-03-01', -1)).toBe('2026-02-28'); });
test('gece yarısına kalan', () => { expect(msUntilIstanbulMidnight(new Date('2026-10-26T20:59:00Z'))).toBe(60000); expect(formatCountdown(3723000)).toBe('01:02:03'); });
```

- [ ] **Step 2:** `npm test` → FAIL (modül yok).
- [ ] **Step 3:** Uygula. İstanbul sabit UTC+3 (2016'dan beri DST yok): tarih hesapları `Date.UTC` + 3 saat ofsetiyle yapılır, `Intl` saat dilimine bağımlılık yok. Tarih stringleri üzerinde aritmetik `Date.UTC(y, m-1, d)` ile.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit: `feat: tohumlu rng ve İstanbul tarih yardımcıları`.

---

### Task 3: Oyun metası ve günlük seçim

**Files:**
- Create: `shared/games.js`, `shared/rotation.js`
- Test: `tests/shared/rotation.test.js`

**Interfaces:**
- Consumes: `makeRng`, `addDays`, `LAUNCH_DATE` (Task 2)
- Produces:
  - `GAME_IDS = ['nokta','aci','zaman','renk','merkez','yorunge','ritim','oran']`
  - `GAMES: Record<id, { id, ad, ds, gc, gce }>` (ad/ds metinleri demo satır 240-249; renkler Global Constraints)
  - `dailySet(date: string) → string[5]` (sıralı, görüntüleme sırası)
  - `dayScore(scores: number[]) → int` (`Math.round` ortalama; istemci ve sunucu ortak kullanır, testi Task 4'te)

- [ ] **Step 1: Failing testler**

```js
test('5 farklı geçerli oyun', () => { const s = dailySet('2026-10-26'); expect(s).toHaveLength(5); expect(new Set(s).size).toBe(5); s.forEach(id => expect(GAME_IDS).toContain(id)); });
test('deterministik', () => expect(dailySet('2026-12-01')).toEqual(dailySet('2026-12-01')));
test('hiçbir oyun art arda 2 günden fazla dışarıda kalmaz (400 gün)', () => {
  const absent = Object.fromEntries(GAME_IDS.map(id => [id, 0]));
  for (let i = 0; i < 400; i++) { const s = dailySet(addDays('2026-10-26', i));
    for (const id of GAME_IDS) { absent[id] = s.includes(id) ? 0 : absent[id] + 1; expect(absent[id]).toBeLessThanOrEqual(2); } }
});
test('LAUNCH öncesi tarih hata vermez', () => expect(dailySet('2026-01-01')).toHaveLength(5));
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Algoritma (spec §4 kuralı):

```
dailySet(date): d = max(date, LAUNCH_DATE) için LAUNCH'tan d'ye gün gün ilerle (memo cache):
  zorunlu = son 2 günün ikisinde de olmayan oyunlar (en fazla 3)
  rng = makeRng('set:' + gün)
  kalan = rng.shuffle(GAME_IDS − zorunlu) → ilk (5 − |zorunlu|)
  set = rng.shuffle(zorunlu ∪ kalan)
LAUNCH öncesi tarihler için set = LAUNCH gününün kuralıyla, geçmiş yok sayılarak (tohum o tarih).
```

- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit: `feat: günlük oyun seçimi`.

---

### Task 4: Puanlama ve paylaşım metni

**Files:**
- Create: `src/logic/scoring.js`
- Test: `tests/logic/scoring.test.js`

**Interfaces:**
- Consumes: `GAMES`, `puzzleNumber`
- Produces:
  - `curve(err: number, tol: number) → int 0-100` (NaN/∞ → 0)
  - `dayScore` — `shared/games.js`'ten yeniden export
  - `rankFor(dayScore) → string` (emoji + ad)
  - `squareFor(score) → string`
  - `shareText(date: string, set: string[], scores: Record<id,int>) → string`

- [ ] **Step 1: Failing testler**

```js
test('curve', () => { expect(curve(0, 10)).toBe(100); expect(curve(10, 10)).toBe(5); expect(curve(NaN, 10)).toBe(0); expect(curve(Infinity, 10)).toBe(0); });
test('dayScore ortalama yuvarlar', () => expect(dayScore([92, 78, 88, 61, 93])).toBe(82));
test('rütbe eşikleri', () => { expect(rankFor(90)).toBe('🦅 Kartal Gözü'); expect(rankFor(89)).toBe('🎯 Keskin'); expect(rankFor(76)).toBe('🎯 Keskin'); expect(rankFor(60)).toBe('💪 Sağlam'); expect(rankFor(40)).toBe('🙂 İdare Eder'); expect(rankFor(39)).toBe('🌫️ Bulanık'); });
test('kareler', () => { expect([85, 84, 65, 64, 40, 39].map(squareFor)).toEqual(['🟩','🟨','🟨','🟧','🟧','🟥']); });
test('paylaşım metni', () => {
  expect(shareText('2026-11-30', ['nokta','aci','zaman','renk','merkez'], { nokta: 92, aci: 78, zaman: 88, renk: 61, merkez: 93 }))
    .toBe('sezgi.live #36 · 82/100\n🎯 Keskin\n🟩 Nokta 92\n🟨 Açı 78\n🟩 Zaman 88\n🟧 Renk 61\n🟩 Merkez 93\nsezgi.live');
});
```

- [ ] **Step 2:** FAIL → **Step 3:** uygula → **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: puanlama ve paylaşım metni`.

---

### Task 5: Bulmaca üreticileri ve puanlayıcılar — Nokta, Açı, Zaman, Renk

**Files:**
- Create: `src/logic/puzzles/nokta.js`, `aci.js`, `zaman.js`, `renk.js`, `src/logic/puzzles/index.js`
- Test: `tests/logic/puzzles-a.test.js`

**Interfaces:**
- Consumes: `makeRng`, `curve`
- Produces: her modül `generate(date: string) → puzzle` ve `score(puzzle, answer) → int`; tohum `makeRng(date + ':' + id)`. `index.js`: `PUZZLES: Record<id, {generate, score}>` (Task 12'de diğer 4'ü eklenir).
  - **nokta** `{ count: int 45-85, dots: {x,y}[] }` (x,y ∈ [0.05,0.95], normalize mesafe ≥ 0.045; yerleşemezse eşik %10 gevşetilir) · answer `{ guess: number }` · hata `|guess−count|/count`, tol **0.35**
  - **aci** `{ target: int 15-345 }` · answer `{ angle: number }` · hata dairesel fark (°), tol **22**
  - **zaman** `{ target: number 4.0-9.9, 1 ondalık }` · answer `{ elapsed: number /*sn*/ }` · hata `|elapsed−target|`, tol **1.6**
  - **renk** `{ h: int 0-359, l: int 32-68, s: 78 }` · answer `{ h, l }` · `d = √((dh/60)² + ((l−L)/15)²)` (dh dairesel), puan `round(100·e^(−0.8·d²))`

- [ ] **Step 1: Failing testler**

```js
const D = '2026-11-03';
test.each(['nokta','aci','zaman','renk'])('%s deterministik', id => expect(PUZZLES[id].generate(D)).toEqual(PUZZLES[id].generate(D)));
test('nokta aralık ve sayı', () => { const p = PUZZLES.nokta.generate(D); expect(p.dots).toHaveLength(p.count); expect(p.count).toBeGreaterThanOrEqual(45); expect(p.count).toBeLessThanOrEqual(85); });
test('mükemmel cevap 100', () => {
  const g = id => PUZZLES[id].generate(D);
  expect(PUZZLES.nokta.score(g('nokta'), { guess: g('nokta').count })).toBe(100);
  expect(PUZZLES.aci.score(g('aci'), { angle: g('aci').target })).toBe(100);
  expect(PUZZLES.zaman.score(g('zaman'), { elapsed: g('zaman').target })).toBe(100);
  expect(PUZZLES.renk.score(g('renk'), { h: g('renk').h, l: g('renk').l })).toBe(100);
});
test('açı 359/1 sarması', () => expect(PUZZLES.aci.score({ target: 359 }, { angle: 1 })).toBe(PUZZLES.aci.score({ target: 10 }, { angle: 12 })));
test('nokta anlamsız giriş NaN üretmez', () => {
  const p = { count: 60, dots: [] };
  for (const guess of [0, -5, 99999, NaN]) { const s = PUZZLES.nokta.score(p, { guess }); expect(Number.isInteger(s)).toBe(true); expect(s).toBeGreaterThanOrEqual(0); }
  expect(PUZZLES.nokta.score(p, { guess: 0 })).toBe(0);
});
test('renk ton sarması', () => expect(PUZZLES.renk.score({ h: 355, l: 50, s: 78 }, { h: 5, l: 50 })).toBe(PUZZLES.renk.score({ h: 100, l: 50, s: 78 }, { h: 110, l: 50 })));
```

- [ ] **Step 2:** FAIL → **Step 3:** uygula → **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: nokta, açı, zaman, renk bulmacaları`.

---

### Task 6: Gönderim doğrulama ve sunucu altyapısı + kimlik API'si

**Files:**
- Create: `shared/validate.js`, `api/_lib/redis.js`, `api/_lib/keys.js`, `api/_lib/fake-redis.js`, `api/_lib/handlers.js` (yalnızca `makeRegister`), `api/register.js`
- Test: `tests/shared/validate.test.js`, `tests/api/register.test.js`

**Interfaces:**
- Consumes: `istanbulDate`, `addDays`, `secondsSinceIstanbulMidnight`, `dailySet`, `GAME_IDS`
- Produces:
  - `GRACE_SECONDS = 300`
  - `validateSubmission(body, now: Date) → { ok: true, date, scores, day: int } | { ok: false, error: string }` — body `{ token: string, date: string, scores: Record<id,int> }`. Kurallar: token 32-64 hex karakter; `date === istanbulDate(now)` **veya** (`date === addDays(today,-1)` ve `secondsSinceIstanbulMidnight(now) ≤ 300`); `Object.keys(scores)` kümesi `dailySet(date)` ile aynı; her puan 0-100 tamsayı. `day = dayScore(...)` (`shared/games.js`).
  - `getRedis() → Redis` — `new Redis({ url: env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL, token: env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN })`; env yoksa `createFakeRedis()` (yerel geliştirme).
  - `createFakeRedis()` — bellek içi, kullanılan `@upstash/redis` alt kümesi: `get, set(k,v,{nx,ex}), incr, expire, zadd(k,{nx}?, {score,member}), zincrby, zscore, zcount(k,min,max)` (min `'(' `öneki destekli, `'+inf'`), `zcard, zrange(k,start,stop,{rev:true, withScores:true})` (eşitlerde rev sırası Redis gibi member'a göre ters leksikografik), `pipeline()` → aynı metotlar + `exec()`.
  - `keys`: `id(token)`, `nick(nick)`, `sub(date, token)`, `day(date)`, `week(monday)`, `game(date, id)`, `rl(ip, date)`. TTL sabitleri: gün anahtarları 8 gün, hafta 15 gün, rl 1 gün.
  - `makeRegister({ redis, now }) → (req: Request) => Promise<Response>` — `POST /api/register` → `200 { token, nick }`. Token `crypto.randomUUID()` tirelersiz (32 hex). Nick: `sl-` + rastgele 4 hane, `set(nick:…, token, {nx:true})` ile dene; 10 başarısızlıktan sonra hane sayısını 1 artır. `set(id:token, nick)`. IP (`x-forwarded-for` ilk değer) başına günde 20 kayıt; aşılırsa `429 { error: 'Çok fazla deneme' }`.
  - `api/register.js`: `export const POST = makeRegister({ redis: getRedis(), now: () => new Date() })`.

- [ ] **Step 1: Failing testler**

```js
// validate
const now = new Date('2026-11-03T12:00:00Z'), date = '2026-11-03', set = dailySet(date);
const body = (o = {}) => ({ token: 'a'.repeat(32), date, scores: Object.fromEntries(set.map(id => [id, 80])), ...o });
test('geçerli', () => expect(validateSubmission(body(), now)).toMatchObject({ ok: true, day: 80 }));
test('yanlış oyun seti', () => expect(validateSubmission(body({ scores: { nokta: 1 } }), now).ok).toBe(false));
test('aralık dışı / ondalık puan', () => { const s = body().scores; s[set[0]] = 101; expect(validateSubmission(body({ scores: s }), now).ok).toBe(false); s[set[0]] = 50.5; expect(validateSubmission(body({ scores: s }), now).ok).toBe(false); });
test('gece yarısı toleransı', () => {
  const y = '2026-11-02', ys = Object.fromEntries(dailySet(y).map(id => [id, 50]));
  expect(validateSubmission(body({ date: y, scores: ys }), new Date('2026-11-02T21:04:00Z')).ok).toBe(true);
  expect(validateSubmission(body({ date: y, scores: ys }), new Date('2026-11-02T21:06:00Z')).ok).toBe(false);
});
test('gelecek tarih reddedilir', () => expect(validateSubmission(body({ date: '2026-11-04' }), now).ok).toBe(false));
// register
test('kayıt benzersiz sl- takma ad verir', async () => {
  const h = makeRegister({ redis: createFakeRedis(), now: () => now });
  const a = await (await h(new Request('http://x/api/register', { method: 'POST' }))).json();
  const b = await (await h(new Request('http://x/api/register', { method: 'POST' }))).json();
  expect(a.nick).toMatch(/^sl-\d{4,}$/); expect(a.token).toMatch(/^[0-9a-f]{32}$/); expect(a.nick).not.toBe(b.nick);
});
test('IP hız sınırı', async () => {
  const h = makeRegister({ redis: createFakeRedis(), now: () => now });
  const req = () => new Request('http://x/api/register', { method: 'POST', headers: { 'x-forwarded-for': '1.2.3.4' } });
  for (let i = 0; i < 20; i++) expect((await h(req())).status).toBe(200);
  expect((await h(req())).status).toBe(429);
});
```

- [ ] **Step 2:** FAIL → **Step 3:** uygula → **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: gönderim doğrulama ve kimlik API'si`.

---

### Task 7: Skor gönderme, tablo ve "benim sıram" API'leri + yerel API sunucusu

**Files:**
- Modify: `api/_lib/handlers.js` (ekle: `makeScore`, `makeBoard`, `makeMe`)
- Create: `api/score.js`, `api/board.js`, `api/me.js`
- Modify: `vite.config.js` (dev middleware)
- Test: `tests/api/score-board.test.js`

**Interfaces:**
- Consumes: Task 6'nın hepsi, `weekStart`, `secondsSinceIstanbulMidnight`
- Produces:
  - **Bileşik skor (eşitlik kuralı, spec §8):** `composite = puan · 1e6 + (999999 − saniye)`; gün/oyun tablolarında saniye = İstanbul gece yarısından beri; haftalıkta ilk gönderimde `zadd nx` ile `999999 − haftaBaşındanSaniye`, ardından her gün `zincrby(gün_puanı · 1e6)`. Puan = `floor(composite / 1e6)`. Sıra = `zcount(key, (puan+1)·1e6, '+inf') + 1`.
  - `makeScore({redis, now})` — `POST /api/score` body `{token,date,scores}`. 400 doğrulama hatası (`{error}`), 401 bilinmeyen token. `set(sub:date:token, 1, {nx:true, ex})` başarısızsa **yazma yapmadan** mevcut sıraları `200 { already: true, ...ranks }` döner. Başarılıysa tek pipeline: `zadd day`, 5× `zadd game`, `zadd nx week` + `zincrby week`, `expire`'lar. Yanıt `200 { already:false, nick, day:{score,rank,players}, week:{score,rank,players}, games:{[id]:{score,rank}} }`.
  - `makeBoard({redis, now})` — `GET /api/board?type=day|week|game&game=<id>&date=YYYY-MM-DD` (date yoksa bugün; week için `weekStart(date)`). İlk 100 (game için 20): `{ type, date, players, top: [{rank, nick, score}] }`; `rank` yarışma sırası (eşitler aynı, 1,1,3). Başlık `Cache-Control: public, s-maxage=45, stale-while-revalidate=60`. Geçersiz type/game → 400.
  - `makeMe({redis, now})` — `GET /api/me?date=…`, başlık `x-sezgi-token`. Aynı ranks şekli (oynamadığı tablo `null`). `Cache-Control: private, no-store`.
  - Vite dev: `configureServer` içinde `/api/register|score|board|me` isteklerini Node `req`'ten Web `Request`'e çevirip ilgili handler'a ver (tek paylaşılan `getRedis()` → env yoksa fake). Böylece `npm run dev` API ile birlikte çalışır.

- [ ] **Step 1: Failing testler**

```js
// yardımcı: register edilmiş N oyuncu, now = '2026-11-03T12:00:00Z', set = dailySet('2026-11-03')
test('gönderim sıraları döner', async () => { /* 80 ortalamalı gönderim */ expect(res).toMatchObject({ already: false, day: { score: 80, rank: 1, players: 1 } }); });
test('ikinci gönderim idempotent', async () => {
  const r1 = await submit(tokenA, 80), r2 = await submit(tokenA, 100);
  expect(r2.already).toBe(true); expect(r2.day.score).toBe(80);
  expect(r2.week.score).toBe(80); // haftalık iki kez eklenmedi
});
test('eşit puan aynı sıra, listede önce gönderen üstte', async () => {
  await submitAt(tokenA, 70, '…T10:00:00Z'); await submitAt(tokenB, 70, '…T11:00:00Z'); await submitAt(tokenC, 90, '…T11:30:00Z');
  const top = (await board('day')).top;
  expect(top.map(r => [r.nick, r.rank])).toEqual([[nickC, 1], [nickA, 2], [nickB, 2]]);
});
test('haftalık toplam günleri biriktirir', async () => { /* Pazartesi 60, Salı 70 (now ileri alınarak) */ expect((await board('week')).top[0].score).toBe(130); });
test('oyun tablosu ilk 20 ve oyun puanı', async () => { expect((await board('game', set[0])).top[0].score).toBe(/* gönderilen oyun puanı */); });
test('bilinmeyen token 401, geçersiz type 400', async () => { … });
test('board cache başlığı', async () => expect(resp.headers.get('cache-control')).toContain('s-maxage=45'));
test('me oynamadıysa null', async () => expect((await me(tokenD)).day).toBeNull());
```

- [ ] **Step 2:** FAIL → **Step 3:** uygula → **Step 4:** PASS.
- [ ] **Step 5:** `npm run dev` çalıştır, `curl -X POST localhost:5173/api/register` → `{"token":"…","nick":"sl-…"}`.
- [ ] **Step 6:** Commit: `feat: skor, tablo ve sıra API'leri`.

---

### Task 8: İstemci API sarmalayıcısı

**Files:**
- Create: `src/api.js`
- Test: `tests/state/api.test.js` (fetch mock'lu)

**Interfaces:**
- Produces: `register() → Promise<{token,nick}>`, `submitScore({token,date,scores}) → Promise<ranks>`, `getBoard(type, {game, date}) → Promise<board>`, `getMe(token, date) → Promise<ranks>`. Ağ/HTTP hatasında `ApiError { status, message }` fırlatır (status 0 = ağ). 8 sn zaman aşımı (`AbortController`).

- [ ] **Step 1:** Testler: başarılı JSON döner; 500 → `ApiError(status 500)`; fetch reject → `ApiError(status 0)`; `getMe` başlığa `x-sezgi-token` koyar.
- [ ] **Step 2-4:** FAIL → uygula → PASS.
- [ ] **Step 5:** Commit: `feat: istemci api`.

---

### Task 9: Yerel durum — ilerleme, terk kuralı, seri, kimlik, tema

**Files:**
- Create: `src/state.js`
- Test: `tests/state/state.test.js`

**Interfaces:**
- Consumes: `istanbulDate`, `addDays`, `dailySet`, `dayScore`
- Produces: `createState({ storage = safeLocalStorage(), now = () => new Date() })` →
  - `today() → { date, set, scores: Record<id,int>, inProgress: id|null, submitted: bool, ranks: object|null }` — açılışta: kayıtlı gün ≠ bugün ise yeni gün (eski gün düşer, spec §4); `inProgress` dolu ve puanı yoksa o oyun **0** yazılır, `inProgress = null` (terk kuralı).
  - `nextGame() → id | null` (setteki ilk puansız oyun)
  - `startGame(id)` (inProgress kaydeder) · `finishGame(id, score)` (puan yazar, inProgress temizler; set tamamlanırsa seriyi günceller)
  - `isComplete() → bool` · `markSubmitted(ranks)`
  - `streak() → int` — son tamamlanan gün bugün/dün ise sayı, değilse 0. Tamamlama: son = dün → +1; son = bugün → değişmez; diğer → 1.
  - `identity() → {token,nick}|null` · `setIdentity(obj)`
  - `theme() → 'light'|'dark'|null` · `setTheme(t)` (anahtar `sezgi-tema`, index.html'deki satır içi script ile aynı)
  - `safeLocalStorage()` — erişim/yazma exception'larında bellek içi Map'e düşer.
  - Tek depolama anahtarı `sezgi-v1` (JSON), tema `sezgi-tema`.

- [ ] **Step 1: Failing testler** (`now` ve bellek içi storage enjekte)

```js
test('yeni gün seti dailySet', () => expect(st.today().set).toEqual(dailySet('2026-11-03')));
test('terk edilen oyun 0 ve sıradakine geçilir', () => { st.startGame(set[0]); const st2 = createState({ storage, now }); expect(st2.today().scores[set[0]]).toBe(0); expect(st2.nextGame()).toBe(set[1]); });
test('tamamlanan gün yeniden oynatılmaz', () => { set.forEach(id => st.finishGame(id, 50)); expect(createState({ storage, now }).nextGame()).toBeNull(); });
test('gece yarısını geçen yarım set düşer', () => { st.finishGame(set[0], 90); const st2 = createState({ storage, now: () => new Date('2026-11-03T21:01:00Z') }); expect(st2.today().date).toBe('2026-11-04'); expect(Object.keys(st2.today().scores)).toHaveLength(0); });
test('seri', () => { /* 3 gün art arda tamamla → 3; bir gün atla → ertesi gün okunan 0, tamamlayınca 1 */ });
test('storage throw ederse çalışmaya devam eder', () => {
  const bad = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() {} };
  const s = createState({ storage: safeLocalStorage(bad), now }); s.finishGame(s.today().set[0], 70); expect(s.today().scores[s.today().set[0]]).toBe(70);
});
```

- [ ] **Step 2-4:** FAIL → uygula → PASS.
- [ ] **Step 5:** Commit: `feat: yerel durum ve seri`.

---

### Task 10: UI temeli — stiller, tema, ikonlar, ana sayfa

**Files:**
- Create: `src/styles/base.css`, `src/styles/screens.css`, `src/ui/dom.js`, `src/ui/icons.js`, `src/ui/theme.js`, `src/ui/screens/home.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `createState`, `GAMES`, `formatCountdown`, `msUntilIstanbulMidnight`, `puzzleNumber`, `formatLongDate`
- Produces:
  - `dom.js`: `esc(s) → string` (HTML escape; sunucudan gelen her metin, ör. takma adlar, bununla basılır), `$(id)`, `gvars(game) → '--gc:…;--gce:…'`
  - `main.js`: `import.meta.env.DEV` iken `window.__go = go` (oyunları tek tek manuel test etmek için; üretimde yok)
  - `icons.js`: `ICONS: Record<id, svgString>` (demo satır 230-239, 8 ikon)
  - `theme.js`: `themeButton() → string`, `bindThemeButton(state, onChange?)`
  - Ekran sözleşmesi: her ekran `render(app, ctx)` export eder; `ctx = { state, go(screenName, params) }`. `main.js` içinde `go` yönlendirici: `home | intro | play | results | board`. Ekran değişince eski ekranın `cleanup()` (zamanlayıcılar, `document.onkeydown`) çağrılır.
  - `home.render`: navbar (logo, 🔥 seri, 🏆 → `go('board')`, tema). Set tamamlanmadıysa: `#N · tarih`, "Bugünün 5 oyunu", 5 kart (oynananlarda puan rozeti), **Başla**/**Devam et** (→ `go('intro', {id: nextGame()})`), geri sayım. Tamamlandıysa: günün puanı + rütbe kartı, **Sonucu gör** (→ `go('results')`), geri sayım. Geri sayım 0'a gelince sayfa yeni günle yeniden çizilir.
- CSS: demo `<style>` bölümlerinden taşı — `:root` tema değişkenleri, Header, Home, Results, Intro, Skor tablosu, Masaüstü (satır 10-125, 160-219); "Demo: tek oyun" bölümü (143-150) **taşınmaz**. Yerleşim kuralı (navbar üstte, içerik kalan alanda dikey ortalı) demo satır 26-28.

- [ ] **Step 1:** Uygula.
- [ ] **Step 2: Doğrulama:** `npm run dev` → telefon genişliği (390px) ve masaüstü (1280px) DevTools'ta: navbar üstte, kartlar telefonda alt alta / masaüstünde 5 sütun, koyu/açık tema düğmesi çalışıyor ve yenilemede korunuyor, "Başla" metnindeki ş Baloo 2 ile (DevTools → Computed → Rendered Fonts: yalnızca "Baloo 2").
- [ ] **Step 3:** Commit: `feat: ana sayfa ve tema`.

---

### Task 11: Tanıtım + oyun ekranı + 4 renderer (Nokta, Açı, Zaman, Renk)

**Files:**
- Create: `src/ui/screens/intro.js`, `src/ui/screens/play.js`, `src/games/common.js`, `src/games/nokta.js`, `aci.js`, `zaman.js`, `renk.js`, `src/styles/games.css`

**Interfaces:**
- Consumes: `PUZZLES`, `state.startGame/finishGame/nextGame/isComplete`, `ICONS`, `GAMES`
- Produces:
  - `intro.render(app, ctx, {id})`: navbar (✕ → home, ilerleme çubuğu, tema), büyük ikon, `Oyun i / 5`, ad, lead, 3 adım, **Hazırım!** → `state.startGame(id)`, `go('play', {id})`. Metinler demo `INTRO` (satır 329-346) **birebir**; Renk adım 2 masaüstünde "fareyi sürükle" olarak.
  - `common.js`: `layout() → { wide: bool, W: 480|300, H: 300 }` (oyun başında bir kez, `matchMedia('(min-width: 820px)')`); `toPx(p, L) → {x: p.x·W, y: p.y·H}`; `fromEvent(e, el, L) → {x, y}` (iç koordinat); `count321(stageEl, cleanupBag) → Promise<void>` (3,2,1 her biri 750 ms, demo `.cnt` animasyonu).
  - **Renderer sözleşmesi:** `export function mount({ stage, puzzle, L, game, onAnswer, bag })` — `stage` `.stage` elemanı (play ekranı `aspect-ratio`'yu `L.wide ? 16/10 : 1` yapar); `onAnswer(answer, feedbackHtml)` bir kez çağrılır; renderer cevaptan sonra doğru cevabı alanda kendisi gösterir; zamanlayıcılar/dinleyiciler `bag`'e eklenir (`bag.add(fn)` temizleyici). Ayrıca `export const prompt = (puzzle, L) => html` (görev metni).
  - `play.render(app, ctx, {id})`: puzzle = `PUZZLES[id].generate(date)`; başlık + `prompt` + stage + `#fb`. `onAnswer` → `score = PUZZLES[id].score(puzzle, answer)` → `state.finishGame` → geri bildirim kartı (puan + feedbackHtml) + **Devam →** (sonraki oyun varsa intro, yoksa `go('results')`).
  - Renderer davranışları demo fonksiyonlarındaki gibi (`nokta`, `aci`, `zaman`, `renk`), şu farklarla: koordinatlar normalize puzzle'dan `toPx`; Açı'da merkez `(W/2, 150)`, yarıçap 115; Nokta'da cevap formu boş/NaN'ı reddeder; Renk seçici demo v11 `renk` + CSS "Renk seçici" bölümü (satır 127-142). Açı/Renk: `pointerup` → cevap (sürükleme olmadıysa yok sayılır).
  - Açı/Merkez/Oran/Yörünge geri bildirim metinleri demo'daki cümleler.

- [ ] **Step 1:** Uygula.
- [ ] **Step 2: Doğrulama:** `npm run dev`; günün setinde olmayan oyunlar için konsoldan `window.__go('intro', {id:'renk'})`. Her oyunu telefon (390px) ve masaüstü (1280px) genişliğinde oyna: 3-2-1, bırakınca kayıt, doğru cevabın gösterimi, puan kartı. Günün setindeki bir oyunun ortasında yenile → ana sayfada o oyun 0 puan, "Devam et" sıradakine gider.
- [ ] **Step 3:** Commit: `feat: tanıtım, oyun ekranı ve ilk 4 oyun`.

---

### Task 12: Bulmaca + renderer — Merkez, Yörünge, Ritim, Oran

**Files:**
- Create: `src/logic/puzzles/merkez.js`, `yorunge.js`, `ritim.js`, `oran.js`; `src/games/merkez.js`, `yorunge.js`, `ritim.js`, `oran.js`
- Modify: `src/logic/puzzles/index.js`
- Test: `tests/logic/puzzles-b.test.js`

**Interfaces:**
- Consumes: Task 5 ve 11 sözleşmeleri
- Produces (generate/score):
  - **merkez** `{ pts: [{x,y}×3] }` (x,y ∈ [0.08,0.92], normalize alan ≥ 0.13) · answer `{ x, y, aspect }` (normalize tık; aspect = W/H) · hata = ekran uzayında (x·aspect, y) mesafe / √(ekran uzayında üçgen alanı), tol **0.30**
  - **yorunge** normalize fizik: `x0 = 0.11`, `ground = 0.907`, `y0 ∈ [0.5, 0.78]`, `g = 1.4`, `vy ∈ [0.57, 0.83]`, `tL` = zemine iniş zamanı, `xL ∈ [0.5, 0.93]`, `vx = (xL − x0)/tL`, `hideAt = tL · [0.38, 0.52]` (birimler: x genişlik, y yükseklik, t sn; renderer 0.8× hızda oynatır) · answer `{ x }` · hata `|x − xL|`, tol **0.16**
  - **ritim** `{ bpm: int 80-128 }` · answer `{ offsets: number[8] /*ms, beklenen ızgaraya göre*/ }` · hata ortalama |offset|, tol **120**
  - **oran** `{ p, q, fromLeft: bool, x1, x2, y }` (kesir listesi demo `oran` FR; `len = x2−x1 ∈ [0.55, 0.87]`, `y ∈ [0.43, 0.57]`) · answer `{ x }` · hata `|x − hedef| / len`, tol **0.07**
- Renderer'lar demo `merkez`, `yorunge`, `ritim`, `oran` fonksiyonları gibi. Ritim: Web Audio ile 4 referans vuruş `actx.currentTime + 0.6`'dan planlanır; `tStart = performance.now() + 600`; serbest vuruşlar = `tStart + 3.5·I`'dan sonraki ilk 8 dokunuş; boşluk tuşu desteği; ekrandan çıkınca `AudioContext.close()` ve `document.onkeydown = null` (`bag`).

- [ ] **Step 1: Failing testler**

```js
test.each(['merkez','yorunge','ritim','oran'])('%s deterministik', id => expect(PUZZLES[id].generate(D)).toEqual(PUZZLES[id].generate(D)));
test('merkez ağırlık merkezi her oranda 100', () => { const p = PUZZLES.merkez.generate(D); const c = { x: (p.pts[0].x + p.pts[1].x + p.pts[2].x) / 3, y: (p.pts[0].y + p.pts[1].y + p.pts[2].y) / 3 };
  expect(PUZZLES.merkez.score(p, { ...c, aspect: 1 })).toBe(100); expect(PUZZLES.merkez.score(p, { ...c, aspect: 1.6 })).toBe(100); });
test('yörünge iniş noktası zeminde ve aralıkta', () => { const p = PUZZLES.yorunge.generate(D); const y = p.y0 - p.vy * p.tL + 0.5 * p.g * p.tL ** 2;
  expect(y).toBeCloseTo(p.ground, 6); expect(p.xL).toBeGreaterThanOrEqual(0.5); expect(p.xL).toBeLessThanOrEqual(0.93);
  expect(p.y0 - p.vy ** 2 / (2 * p.g)).toBeGreaterThan(0); /* tepe noktası alan içinde */ });
test('ritim mükemmel 100, 120ms ort. sapma 5', () => { expect(PUZZLES.ritim.score({ bpm: 100 }, { offsets: Array(8).fill(0) })).toBe(100); expect(PUZZLES.ritim.score({ bpm: 100 }, { offsets: Array(8).fill(-120) })).toBe(5); });
test('oran hedef', () => { const p = { p: 1, q: 4, fromLeft: false, x1: 0.1, x2: 0.9, y: 0.5 }; expect(PUZZLES.oran.score(p, { x: 0.7 })).toBe(100); });
```

- [ ] **Step 2:** FAIL → **Step 3:** uygula → **Step 4:** PASS.
- [ ] **Step 5: Doğrulama:** `window.__go('intro', {id})` ile 4 oyunu telefon ve masaüstünde oyna; Ritim'de sesin geldiğini, boşluk tuşunu ve ✕ ile çıkınca sesin/klavye dinleyicisinin kapandığını doğrula.
- [ ] **Step 6:** Commit: `feat: merkez, yörünge, ritim, oran`.

---

### Task 13: Sonuç ekranı, gönderim ve skor tablosu ekranı

**Files:**
- Create: `src/ui/screens/results.js`, `src/ui/screens/board.js`
- Modify: `src/main.js` (açılışta kimlik: `state.identity()` yoksa arka planda `register()`)

**Interfaces:**
- Consumes: `shareText`, `dayScore`, `rankFor`, `squareFor`, `register`, `submitScore`, `getBoard`, `getMe`, `ApiError`, state
- Produces:
  - `results.render`: demo `results()` görünümü — sayarak yükselen `/ 100 · günün puanı`, rütbe, 5 puan çubuğu, gönderim kartı, paylaşım metni (`<pre>`), **Paylaş** (`navigator.share` mobilde, değilse pano; "Kopyalandı ✓") + **🏆 Sıralama**, geri sayım. **"Baştan oyna" yok.**
  - Gönderim: `!submitted` ise kimlik yoksa önce `register()`, sonra `submitScore`; başarıda `markSubmitted(ranks)` ve kart: "✓ **sl-XXXX** olarak gönderildi" + Bugün sırası / Haftalık genel sırası / Hafta puanı (demo `submitCard` görünümü). Hata: "Skor gönderilemedi" + **Tekrar dene** düğmesi (sayfa yeniden açılınca da `submitted=false` ise otomatik yeniden dener). `submitted` ise kaydedilmiş `ranks` gösterilir.
  - `board.render(app, ctx, {tab = 'day'})`: navbar (← geri, "Skor Tablosu", takma ad rozeti, tema); sekmeler **Bugün** / **Haftalık genel**; günün 5 oyunu için oyun çipleri; alt başlık (Bugün: `#N · X oyuncu · günün puanı (en fazla 100)`; Hafta: `Haftalık genel · günlük puanların toplamı · Pazartesi sıfırlanır`; Oyun: `Bugün · <Ad> oyununda en iyiler`); liste (ilk 3 🥇🥈🥉, `rank` alanı); altta sabit "senin satırın" (`getMe`), oynamadıysa "Bugünü oynayınca sen de burada olacaksın". Yüklenirken iskelet satırlar, hata olursa "Tablo yüklenemedi" + Tekrar dene.

- [ ] **Step 1:** Uygula.
- [ ] **Step 2: Doğrulama** (`npm run dev`, fake Redis): günün 5 oyununu bitir → kart sıraları gösteriyor; sayfayı yenile → aynı sonuç, ikinci gönderim yok (Network sekmesinde `/api/score` yok); DevTools'ta "Offline" ile bitir → Tekrar dene görünüyor, Online'da başarılı. Tablo: üç sekme, oyun çipleri, senin satırın. İkinci bir tarayıcı profiliyle oyna → tabloda 2 oyuncu, eşit puanda aynı sıra.
- [ ] **Step 3:** Commit: `feat: sonuç ekranı ve skor tablosu`.

---

### Task 14: SEO, favicon, README ve son doğrulama

**Files:**
- Create: `public/favicon.svg` (demo logo işaretinden: 5 renkli conic halka), `public/og.png` (1200×630, logo + "Her gün 5 algı oyunu"), `README.md`
- Modify: `index.html`

**Interfaces:** —

- [ ] **Step 1:** `index.html`: `<title>sezgi.live — Günlük algı oyunu</title>`, `meta description` ("Her gün 5 kısa algı oyunu: nokta tahmini, açı, ritim, renk ve daha fazlası. Skorunu paylaş, haftalık tabloda yüksel."), OG/Twitter etiketleri, `theme-color`, favicon.
- [ ] **Step 2:** `README.md`: yerel çalıştırma (`npm i`, `npm run dev` — env yoksa bellek içi Redis), test, Vercel'e yayın adımları: GitHub'a gönder → Vercel'de projeyi içe aktar → Storage → Marketplace → **Upstash Redis** ekle (env değişkenleri `KV_REST_API_URL`/`KV_REST_API_TOKEN` otomatik gelir) → Deploy → `sezgi.live` alan adını bağla. `LAUNCH_DATE` notu.
- [ ] **Step 3: Son doğrulama:** `npm test` → tüm testler PASS; `npm run build` → hatasız; `npm run preview` + iki genişlikte tam bir gün oyna; Lighthouse (mobil) Performance ≥ 90, Accessibility ≥ 90.
- [ ] **Step 4:** Commit: `chore: seo, favicon ve yayın belgesi`.
