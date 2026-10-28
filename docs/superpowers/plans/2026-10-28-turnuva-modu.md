# Turnuva Modu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2-10 arkadaşın paylaşım linkiyle lobiye girip, sahibin seçtiği oyunları aynı anda, her oyundan sonra birbirini bekleyerek oynadığı ve sonda sıralandığı turnuva modu.

**Architecture:** Tüm turnuva durumu tek bir Redis hash'inde (`t:<KOD>`) alan bazlı tutulur. Tek uç nokta `POST /api/turnuva` `action` alanıyla çalışır ve her yanıtta oyuncuya özel bir "görünüm" döner. Turun hangi adımda olduğu `shared/tournament.js` içindeki saf `resolveRound` fonksiyonuyla hesaplanır. Biten adımların bitiş anı ilk gören istekçe `HSETNX` ile kalıcılaştırılır. İstemci ~1,5 sn sorgular, saf `screenFor` fonksiyonu görünümden hangi ekranın açılacağını seçer, mevcut `intro`/`play` ekranları turnuva bağlamıyla yeniden kullanılır.

**Tech Stack:** Framework'süz JS + Vite 5, Vercel Functions (Web `Request`/`Response`), `@upstash/redis`, testler için `node --test` (yeni bağımlılık yok).

**Spec:** `docs/superpowers/specs/2026-10-28-turnuva-modu-design.md`

## Global Constraints

- Yeni npm bağımlılığı eklenmez. Testler `node:test` + `node:assert/strict`, `package.json`'a `"test": "node --test tests/"`.
- Arayüz metinleri yalnızca Türkçe. Kod yorumları mevcut dosyalardaki gibi kısa ve Türkçe.
- En fazla 10, başlatmak için en az 2 aktif oyuncu. Ad 1-16 karakter, lobi içinde büyük/küçük harf duyarsız benzersiz (`toLocaleLowerCase('tr')`).
- Lobi verisi son yazımdan 24 saat sonra silinir (`EXPIRE 86400`, her yazımda).
- Süreler: lobi/sonuçta 60 sn sinyalsiz → listeden düşer. Tur sırasında 20 sn → koptu. Sahip 30 sn → devir.
- Oyun sırasında ekranda süre gösterilmez. Süre yalnızca tanıtım ve bekleme ekranında görünür.
- Turnuva hiçbir şekilde günlük durumu (`sezgi-v1`, seri, skor tabloları) değiştirmez.
- Durum yanıtları `cache-control: private, no-store`.
- Gizli oyuncu anahtarı (`pid`) yanıtta yalnızca sahibine döner. Diğer oyuncular kısa açık kimlikle (`id`) görünür.

## Review Focus

- Aynı anda iki oyuncunun aynı adımı bitirmesi (eşzamanlı `submit`), ikisinin de puanı kaydedilmeli ve adım bir kez bitmeli. Task 2'de paralel `submit` testi.
- Kopan oyuncu turda geri dönüyor: geçmiş adımların bitiş anları değişmemeli (kalıcı `e` alanları), kaldığı adımdan devam etmeli. Task 1 ve Task 2 testleri.
- Sayfa yenilendiğinde "Hazırım"dan sonra yarıda kalan oyun 0 sayılmalı ve oyuncu aynı soruyu tekrar görmemeli. Task 3 `screenFor` testi.
- Ad girişinde HTML/özel karakter: ekranda kaçışlanmalı (`esc`), kontrol karakterleri reddedilmeli. Task 1 `normalizeName` testi, ekranlarda `esc`.
- Tur sürerken linki açan yeni kişi ve atılan oyuncu: katılma reddedilmeli, doğru mesaj görünmeli. Task 2 testleri, Task 3 `screenFor` testi.

---

### Task 1: Saf turnuva mantığı (`shared/tournament.js`) ve test altyapısı

**Files:**
- Create: `shared/tournament.js`
- Create: `tests/shared/tournament.test.js`
- Modify: `package.json` (scripts.test)

**Interfaces:**
- Produces (hepsi `shared/tournament.js`'den export):
  - Sabitler: `MAX_PLAYERS=10`, `MIN_PLAYERS=2`, `NAME_MAX=16`, `CODE_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789'`, `CODE_LEN=5`, `STEP_LIMIT_MS` (`{nokta:60000, aci:60000, zaman:75000, renk:60000, merkez:60000, yorunge:60000, ritim:75000, oran:60000}`), `SUBMIT_GRACE_MS=3000`, `TRANSITION_MS=2500`, `LOBBY_IDLE_MS=60000`, `GAME_IDLE_MS=20000`, `OWNER_IDLE_MS=30000`.
  - `normalizeName(raw: any) -> string | null`: trim, iç boşlukları teke indirir, 1..16 karakter, kontrol karakteri (`/[\u0000-\u001f\u007f]/`) varsa `null`.
  - `nameKey(name: string) -> string`: `name.toLocaleLowerCase('tr')`.
  - `isCode(s) -> boolean`: tam olarak `CODE_LEN` karakter, hepsi `CODE_ALPHABET`'ten.
  - `validGames(list) -> string[] | null`: `GAME_IDS`'ten tekrarsız, en az 1, sonuç `GAME_IDS` sırasında. Geçersizse `null`.
  - `puzzleSeed(code, round, id) -> string`: `` `turnuva:${code}:${round.no}:${round.seed}:${id}` ``.
  - `resolveRound(round, subs, seen, ends, now) -> { step, stepStart, cutoff, done, newEnds }`
    - `round = { no, seed, games: string[], players: string[] /* pid */, startedAt: ms }`
    - `subs = { [step]: { [pid]: { score, at } } }`, `seen = { [pid]: ms }`, `ends = { [step]: ms }` (kalıcı bitişler)
    - `step`: şu anki adım indeksi (geçiş sırasında bir sonraki adım). `done=true` ise `games.length`.
    - `stepStart`: o adımın başlangıcı (geçişteyse gelecekte). `cutoff = stepStart + STEP_LIMIT_MS[game]`.
    - `newEnds`: bu çağrıda hesaplanıp henüz `ends`'te olmayan bitişler (`{ [step]: ms }`), sunucu bunları `HSETNX` ile yazar.
    - `done`: son adımın bitişi + `TRANSITION_MS` ≤ `now`.
  - `standings(round, subs, names) -> [{ pid, name, scores: number[], total, rank }]`: `names = { [pid]: string }`. `total = dayScore(scores)` (`shared/games.js`). Yüksekten düşüğe. Eşitler aynı sıra (1,1,3). Eşitlikte `round.players` sırası korunur.
  - `pickOwner(players, seen, owner, now) -> pid | null`: `players = [{ pid, joinedAt }]`. Mevcut sahip listede ve `now - seen[owner] <= OWNER_IDLE_MS` ise onu döner. Değilse `now - seen <= LOBBY_IDLE_MS` olan en eski `joinedAt`'li oyuncuyu döner, yoksa `null`.

`resolveRound` algoritması (imza ve testlerin belirlemediği kısım):

```js
let start = round.startedAt;
for (let i = 0; i < round.games.length; i++) {
  const limitEnd = start + STEP_LIMIT_MS[round.games[i]] + SUBMIT_GRACE_MS;
  let end = ends[i];
  if (end === undefined) {
    // Her oyuncunun bu adımı bitirdiği an: gönderim anı; kopmuşsa (son sinyal + GAME_IDLE_MS); hâlâ oynuyorsa Infinity.
    const finish = round.players.map(p => subs[i]?.[p]?.at
      ?? ((now - (seen[p] ?? 0) > GAME_IDLE_MS) ? Math.max(start, (seen[p] ?? 0) + GAME_IDLE_MS) : Infinity));
    end = Math.min(limitEnd, Math.max(...finish));
    if (end > now) return { step: i, stepStart: start, cutoff: start + STEP_LIMIT_MS[round.games[i]], done: false, newEnds };
    newEnds[i] = end;
  }
  start = end + TRANSITION_MS;
}
// son adım bitti: start = son bitiş + TRANSITION_MS → done = start <= now (değilse step = games.length - 1 değil, geçiş: step = games.length, done=false)
```

Son adım bittikten sonra geçiş süresi dolmadıysa `{ step: games.length, stepStart: start, cutoff: start, done: false }` döner. İstemci bunu "Herkes bitirdi!" olarak gösterir.

- [ ] **Step 1: `package.json`'a `"test": "node --test tests/"` ekle, `tests/shared/tournament.test.js`'i yaz**

Testler (`node:test`'ten `test`, `node:assert/strict`'ten `assert`):
- `normalizeName`: `'  Ayşe  '` → `'Ayşe'`, `'a   b'` → `'a b'`, `''` → `null`, 17 karakter → `null`, `'a\u0007'` → `null`, `42` → `null`, `'<b>x</b>'` → `'<b>x</b>'` (kaçış ekranın işi).
- `nameKey('İLKER') === nameKey('ilker')`.
- `isCode('K7QXA')` true, `isCode('K7QX0')` false (0 yok), `isCode('k7qxa')` false.
- `validGames(['oran','nokta'])` → `['nokta','oran']`, `validGames([])` → `null`, `validGames(['nokta','nokta'])` → `null`, `validGames(['x'])` → `null`.
- `resolveRound`, `round = { no:1, seed:'s', games:['nokta','aci'], players:['a','b'], startedAt:0 }`, `seen = {a: now, b: now}`:
  - hiç gönderim yok, `now=1000` → `{ step:0, stepStart:0, cutoff:60000, done:false }`, `newEnds` boş.
  - ikisi de gönderdi (`a.at=5000`, `b.at=8000`), `now=9000` → adım 0 bitişi 8000, `step:1`, `stepStart:10500` (geçiş), `newEnds:{0:8000}`.
  - yalnız `a` gönderdi, `now=63001` → bitiş `63000` (60000+3000), `step:1`.
  - `b`'nin son sinyali 2000, `a.at=5000`, `now=23000` → `b` koptu (22000'de), adım 0 bitişi `22000`, `step:1`.
  - `ends={0:8000}` verilir ve `b` sonra geri döner (`seen.b=now`): adım 0 bitişi 8000 kalır (kalıcı bitiş korunur).
  - iki adım da bitti, son bitiş + 2500 ≤ now → `done:true`. Geçiş içindeyse `step:2, done:false`.
- `standings`: puanlar a=[80,60] b=[70,70] c=[] → a ve b total 70, rank 1 ve 1, c total 0 rank 3. Sıra: a, b, c (`round.players` sırası).
- `pickOwner`: sahip aktif → aynı. Sahibin sinyali 31 sn önce → en eski aktif diğer oyuncu. Kimse aktif değil → `null`.

- [ ] **Step 2: `pnpm test` çalıştır, FAIL (modül yok) gör**

- [ ] **Step 3: `shared/tournament.js`'i yukarıdaki imzalarla yaz**

- [ ] **Step 4: `pnpm test`, hepsi PASS**

- [ ] **Step 5: Commit** `feat: turnuva için saf durum mantığı ve test betiği`

---

### Task 2: Sunucu: `POST /api/turnuva`

**Files:**
- Modify: `api/_lib/fake-redis.js` (hash komutları)
- Modify: `api/_lib/keys.js` (`tour`, `rlTour`, `rlTourMinute`)
- Create: `api/_lib/tournament.js`
- Modify: `api/_lib/handlers.js` (sonuna `export { makeTournament } from './tournament.js';`)
- Create: `api/turnuva.js` (`export const POST = makeTournament({ redis: getRedis(), now: () => new Date() });`)
- Modify: `vite.config.js` (`ROUTES['/api/turnuva'] = ['makeTournament', 'POST']`)
- Modify: `vercel.json` (`"rewrites": [{ "source": "/t/:code", "destination": "/index.html" }]`)
- Test: `tests/api/tournament.test.js`

**Interfaces:**
- Consumes: Task 1'in tüm export'ları. `json`, `clientIp` (`api/_lib/handlers.js`).
- fake-redis eklemeleri (Upstash imzalarıyla): `hset(key, obj) -> number`, `hsetnx(key, field, value) -> 0|1`, `hget(key, field) -> value|null`, `hgetall(key) -> object|null` (boşsa `null`), `hdel(key, ...fields) -> number`. `del` hash'i de silmeli. Pipeline bunları otomatik kapsar.
- Redis düzeni, tek hash `keys.tour(code) = 't:' + code`, alanlar:
  - `created` (ms), `owner` (pid), `games` (JSON dizi), `lastNo` (son tur numarası), `round` (JSON `{no, seed, games, players, startedAt}`; lobiye dönüşte `HDEL` edilir).
  - `p:<pid>` → JSON `{ id, name, joinedAt }` (`id` = 8 hex açık kimlik), `s:<pid>` → son sinyal ms, `n:<nameKey>` → pid, `b:<pid>` → `1` (atıldı).
  - `r:<no>:<step>:<pid>` → JSON `{ score, at }` (`HSETNX`), `e:<no>:<step>` → ms (`HSETNX`).
- Okurken her değer `val(v)` ile çözülür: string ise `JSON.parse` dener, olmazsa string bırakır (Upstash otomatik JSON çözer, fake çözmez).
- Produces: `makeTournament({ redis, now }) -> (req: Request) => Promise<Response>`. İstek gövdesi `{ action, code?, pid?, name?, games?, target?, step?, score? }`. Başarılı yanıt `{ pid?, view }`, hata `{ error }` + durum kodu.
- `view` biçimi (Task 3 ve sonrası buna dayanır):

```js
{
  code, now,                       // sunucu saati (ms)
  phase: 'lobby' | 'playing' | 'results',
  kicked: boolean,
  me: { id, name, owner: boolean } | null,
  games: string[],                 // lobideki seçim
  players: [{ id, name, owner }],  // lobi/sonuç: aktif oyuncular, joinedAt sırasıyla
  round: null | {
    no, seed, games,
    step, stepStart, cutoff,       // resolveRound çıktısı
    roster: [{ id, name, status: 'done' | 'playing' | 'gone' }], // şu anki adım için
    mine: { [step]: score },       // benim gönderdiğim puanlar
    results: null | [{ id, name, scores, total, rank }],          // yalnızca phase === 'results'
  },
}
```

Eylemler ve kurallar (hata metinleri Türkçe, aşağıdaki gibi):
- `create {name}`: IP sınırı dakikada 5 / günde 60 (`429 'Çok fazla deneme'`). `CODE_LEN` kodu `HSETNX t:<kod> created` ile çakışmasız üretir. Oyuncuyu ekler, sahip yapar. `games` = `GAME_IDS`'ten rastgele 5 (`validGames` sırasıyla). → `{ pid, view }`.
- `join {code, name, pid?}`: lobi yok → `404 'Lobi bulunamadı'`. `pid` atılmış → `403 'Lobiden çıkarıldın'`. `pid` zaten oyuncuysa yalnızca sinyal + görünüm. Faz `playing` → `423 'Turnuva sürüyor'`. Aktif oyuncu sayısı ≥ 10 → `409 'Lobi dolu'`. Ad geçersiz → `400 'Geçersiz ad'`. `n:<nameKey>` alınmış ve sahibi aktifse → `409 'Bu ad alınmış'`. Sahibi pasifse adı devralır (eski oyuncunun `p:`, `s:` alanlarını siler). → `{ pid, view }` (yeni pid: 32 hex).
- `state {code, pid}`: `s:<pid>`'i yazar (oyuncuysa), `HGETALL`, `resolveRound`, `newEnds`'i `HSETNX`, sahibi `pickOwner` ile düzeltir (değiştiyse `HSET owner`). → `{ view }`. pid oyuncu değilse `me:null`, atılmışsa `kicked:true`.
- `ping {code, pid}`: yalnızca `HSET s:<pid>` + `EXPIRE`. → `{ ok: true }`.
- `rename {code, pid, name}`: faz `lobby`/`results`. Ad kuralları `join` ile aynı. Eski `n:` silinir.
- `games {code, pid, games}`: sahip (`403 'Yalnızca lobi sahibi'`), faz `lobby` (`409 'Şu an değiştirilemez'`), `validGames` (`400 'Geçersiz oyun seçimi'`).
- `kick {code, pid, target}`: sahip, faz `playing` değil, `target` açık `id`, kendini atamaz. `p:`, `s:`, `n:` silinir, `b:<pid>` yazılır.
- `start {code, pid}`: sahip, faz `lobby`, aktif oyuncu ≥ 2 (`409 'En az 2 oyuncu gerekli'`). `round = { no: önceki no + 1 (yoksa 1), seed: 8 hex, games, players: aktif pid'ler joinedAt sırasıyla, startedAt: now }`. Önceki turun `r:`/`e:` alanları silinir.
- `again {code, pid}`: sahip, faz `results`. `start` ile aynı, aynı `games`.
- `lobby {code, pid}`: sahip, faz `results`. `round` alanı silinir (no sayacı `lastNo` alanında tutulur).
- `submit {code, pid, step, score}`: faz `playing`, pid turda (`403`), `step === resolveRound().step` ve `now >= stepStart` ve `now <= cutoff + SUBMIT_GRACE_MS` (`409 'Süre doldu'`), `score` 0-100 tamsayı (`400`). `HSETNX r:<no>:<step>:<pid>`. Zaten varsa `409 'Zaten gönderildi'`. → `{ view }`.
- `leave {code, pid}`: `p:`, `s:`, `n:` silinir. Sahipse `pickOwner` ile yeni sahip yazılır. Tur sırasında ayrılan turda kalır (roster değişmez, "gone" olur).
- Her yazımda `EXPIRE t:<kod> 86400`. Tanımsız `action` → `400 'Geçersiz istek'`. Metod POST değil → `405`.
- Faz hesabı: `round` yok → `lobby`. `round` var ve `resolveRound().done` → `results`. Değilse `playing`.

- [ ] **Step 1: `tests/api/tournament.test.js`'i yaz**

Yardımcı: `const call = (h, body, ip='1.1.1.1') => h(new Request('http://x/api/turnuva', { method:'POST', headers:{'x-forwarded-for':ip}, body: JSON.stringify(body) })).then(async r => ({ status: r.status, body: await r.json() }))`. Saat: `let t = 1_000_000; const now = () => new Date(t);`.

Testler:
- `create` → 200, `view.phase === 'lobby'`, `view.me.owner === true`, `view.games.length === 5`, `isCode(view.code)`, `pid` 32 hex.
- `join` aynı ad (büyük/küçük harf farklı) → 409 `'Bu ad alınmış'`. Farklı ad → 200, `view.players.length === 2`, view'da hiçbir yerde diğer oyuncunun pid'i geçmez (`JSON.stringify(view).includes(otherPid) === false`).
- 10 oyuncu dolu → 11. `join` 409 `'Lobi dolu'`.
- sahip olmayan `start` → 403. Tek oyuncuyla `start` → 409.
- `kick` → atılan `state` → `view.kicked === true`, `join` → 403.
- tam tur: 2 oyuncu, `games:['nokta','aci']`, `start`. İkisi adım 0'a `submit` (paralel, `Promise.all`) → ikisi de 200. `t += 3000` → `state.view.round.step === 1`. Tekrar `submit` aynı adım → 409. Adım 1 için biri gönderir, `t += 60000+3000+1` → `phase:'results'`, `results[0].total` beklenen değer, göndermeyenin adım puanı 0.
- kopan oyuncu: 2 oyunculu turda `b` hiç sinyal göndermez, `t += GAME_IDLE_MS + 1`, `a` gönderir → `step === 1` (grup beklemez). Sonra `b` `state` çağırır → adım 0 bitişi değişmez (`view.round.stepStart` aynı).
- geç gönderim: `t` = `cutoff + SUBMIT_GRACE_MS + 1` → 409 `'Süre doldu'`.
- tur sürerken yeni `join` → 423.
- `again` → `round.no === 2`, `mine` boş. `lobby` → `phase:'lobby'`.
- sahip devri: sahip 31 sn sinyalsiz, diğeri `state` → `view.me.owner === true`.
- `create` 6. kez aynı IP'den aynı dakikada → 429.

- [ ] **Step 2: `pnpm test`, yeni testler FAIL**

- [ ] **Step 3: fake-redis hash komutlarını, `keys.js` anahtarlarını, `api/_lib/tournament.js`'i, `handlers.js` re-export'unu, `api/turnuva.js`'i, `vite.config.js` rotasını ve `vercel.json` rewrite'ını ekle**

Durum okuması tek pipeline: `hset s:<pid>` + `hgetall` + `expire` (3 komut). `newEnds` ve sahip düzeltmesi yalnızca gerektiğinde ek komut.

- [ ] **Step 4: `pnpm test`, hepsi PASS. `pnpm build` başarılı.**

- [ ] **Step 5: Commit** `feat: turnuva API'si (lobi, katılma, atma, başlatma, puan gönderme)`

---

### Task 3: İstemci çekirdeği: API sarmalayıcı, yerel kayıt, ekran seçimi

**Files:**
- Modify: `src/api.js` (`export function tournament(action, body)` → `call('/api/turnuva', POST JSON {action, ...body})`)
- Create: `src/tournament/store.js`
- Create: `src/tournament/route.js`
- Test: `tests/tournament/route.test.js`, `tests/tournament/store.test.js`

**Interfaces:**
- Consumes: Task 2 `view` biçimi. `safeLocalStorage` (`src/state.js`).
- Produces:
  - `createTourStore(storage = safeLocalStorage())` → `{ pid(code), setPid(code, pid), forget(code), lastName(), setLastName(n), started(code), setStarted(code, { no, step }), clearStarted(code) }`. Tek localStorage anahtarı `sezgi-turnuva`: `{ pids: {[code]: pid}, name, started: {[code]: {no, step}} }`.
  - `screenFor(view, local) -> { name, params }`. `local = { started: {no, step} | null, playing: boolean /* şu an play ekranında cevap bekleniyor */ }`. Kurallar, sırayla:
    1. `view.kicked` → `{ name:'tmsg', params:{ kind:'kicked' } }`
    2. `!view.me` → faz `playing` ise `{ name:'tmsg', params:{ kind:'running' } }`, değilse `{ name:'tjoin', params:{} }`
    3. faz `lobby` → `tlobby`. Faz `results` → `tresults`.
    4. faz `playing`, ben roster'da değilim → `tmsg running`.
    5. `round.step >= round.games.length` veya `view.now < round.stepStart` → `{ name:'twait', params:{ step: round.step } }` (geçiş).
    6. `round.mine[step]` var → `twait`.
    7. `local.started` bu `{no, step}` ise: `local.playing` → `{ name:'play', params:{ id, tournament:true } }`, değilse `{ name:'twait', params:{ step, abandon:true } }` (yenileme: oturum 0 gönderecek).
    8. aksi → `{ name:'intro', params:{ id: round.games[step], tournament:true } }`.

- [ ] **Step 1: Testleri yaz.** `screenFor` her kural için bir test. Özellikle (7): `started={no:1,step:0}`, `playing:false` → `twait` + `abandon:true`. Ve `started` eski turdan (`no:0`) → kural 8 (`intro`). `store`: `setPid`/`pid` gidiş-dönüş, `forget` siler, bozuk JSON'da boş başlar (`createTourStore(safeLocalStorage({getItem:()=> '{', setItem(){}, removeItem(){}}))`).
- [ ] **Step 2: `pnpm test`, FAIL**
- [ ] **Step 3: Uygula**
- [ ] **Step 4: `pnpm test`, PASS**
- [ ] **Step 5: Commit** `feat: turnuva istemci çekirdeği (api, yerel kayıt, ekran seçimi)`

---

### Task 4: Oturum denetleyicisi, giriş/lobi ekranları, yönlendirme

**Files:**
- Create: `src/tournament/session.js`
- Create: `src/ui/screens/tjoin.js`, `src/ui/screens/tlobby.js`, `src/ui/screens/tmsg.js`
- Create: `src/styles/tournament.css`
- Modify: `src/main.js` (ekranlar, `titleFor`, `/t/<KOD>` açılışı, `popstate`, `ctx.openTournament`, css importu)
- Modify: `src/ui/screens/home.js` (iki durumda da `<button class="btn alt" id="tour">… Arkadaşlarla turnuva</button>`)
- Modify: `src/ui/icons.js` (`UI.users = Users`, `UI.copy = Copy`, `UI.crown = Crown`, `UI.logout = LogOut`)

**Interfaces:**
- Consumes: Task 3 (`tournament`, `createTourStore`, `screenFor`).
- Produces: `createSession(ctx, code) -> session`. `ctx.tournament` buna atanır:
  - `session.view` (son görünüm), `session.code`, `session.serverNow() -> ms` (yerel saat + son yanıttaki fark).
  - `session.act(action, body={}) -> Promise<view>`: pid/code ekler, yanıt görünümünü uygular, hata olursa `ApiError` fırlatır.
  - `session.onView(fn)`: ekranın güncelleyicisi. Ekran değişince `go` öncesi bag temizliğiyle kaldırılır (`ctx.bag.add(() => session.offView(fn))`).
  - `session.join(name)`, `session.leave()` (ayrılır, `store.forget`, `history.replaceState(null,'','/')`, `go('home')`).
  - `session.setPlaying(bool)`: true iken tam sorgu yerine 5 sn'de bir `ping`.
  - Döngü: `setTimeout` zinciri. Normalde 1500 ms, `document.hidden` iken 5000 ms, `visibilitychange`'de hemen sorgu. Her görünümde `screenFor` → hedef `{name, params}`. Anahtar (`name + JSON(params) + round.no`) değiştiyse `ctx.go(name, params)`, değişmediyse `onView` dinleyicileri çağrılır. 404 → `tmsg { kind:'missing' }` ve döngü durur.
  - `createSession` açılışta: `store.pid(code)` varsa `state` ile başlar, yoksa doğrudan `tjoin`.
- `ctx.openTournament(code)`: `history.pushState(null, '', '/t/' + code)`, eski oturumu durdurur, yeni oturum.
- Açılış: `location.pathname` `/^\/t\/([A-Za-z0-9]{5})\/?$/` ise kod büyük harfe çevrilip `ctx.openTournament` (pushState yerine replaceState), değilse `go('home')`.

Ekranlar (görsel: `.superpowers/brainstorm/1012-1793207383/content/turnuva-akis-v2.html`, mevcut `.btn`, `.btn.alt`, `.iconbtn`, `--surface`/`--line` tokenları, açık/koyu tema):
- `tjoin`: `params.create` ise başlık "Turnuva kur", değilse "Turnuvaya katıl · <KOD>". Ad kutusu (`maxlength=16`, `store.lastName()` dolu), düğme "Turnuva kur" / "Katıl". Hata metni kutunun altında. Geri: ana sayfa. `create` → `tournament('create', {name})` → `store.setPid`, `ctx.openTournament(code)`.
- `tlobby`: üst çubuk (← ayrıl, "Turnuva lobisi", tema). Link kartı `sezgi.live/t/<KOD>` + "Kopyala" (mobilde `navigator.share`). "Oyuncular · n/10" listesi: ad (`esc`), "(sen)", sahipte 👑 rozeti `SAHİP`, sahipte diğerlerinin yanında "At". Kendi satırında "Adını değiştir" (satır içi düzenleme → `rename`). "Oyunlar · k seçili": 8 çip (oyun rengi). Sahipte tıklanabilir (`games`), diğerlerinde salt okunur. Sahipte "Turnuvayı başlat" (aktif oyuncu < 2 ise devre dışı + "En az 2 oyuncu gerekli"). Diğerlerinde "Lobi sahibinin başlatması bekleniyor". `onView` ile liste ve çipler yeniden çizilir, ad düzenleme kutusu odaktayken dokunulmaz.
- `tmsg`: `kicked` → "Lobiden çıkarıldın" + "Yeni adla katıl" (pid unutulur → `tjoin`) + Ana sayfa. `running` → "Turnuva sürüyor, bu tur bitince katılabilirsin" (sorgu sürer). `missing` → "Bu lobi bulunamadı" + Ana sayfa.
- `titleFor`: `tjoin` "Turnuva", `tlobby` "Turnuva lobisi", `twait` "Turnuva", `tresults` "Turnuva sonucu", `tmsg` "Turnuva". `intro`/`play` `tournament` ise "<Oyun> · Turnuva".

- [ ] **Step 1: Kodla (DOM ağırlıklı, birim testi yok, mantık Task 1-3'te test edildi)**
- [ ] **Step 2: `pnpm test` PASS, `pnpm build` başarılı**
- [ ] **Step 3: Elle doğrula (dev sunucusu):** ana sayfada düğme görünür. Turnuva kur → `/t/KOD` lobisi. İkinci tarayıcı profili / gizli pencere linkle katılır, ikisi de listeyi ≤2 sn içinde görür. Ad çakışması uyarısı. Sahip oyun seçer, diğer pencerede ≤2 sn yansır. At → atılan "Lobiden çıkarıldın" görür. Koyu temada okunaklı. 360px genişlikte yatay kaydırma yok.
- [ ] **Step 4: Commit** `feat: turnuva lobisi, katılma ve oturum denetleyicisi`

---

### Task 5: Oyun akışı: tanıtım/oyun entegrasyonu, bekleme, süre dolması, sonuç

**Files:**
- Modify: `src/ui/screens/intro.js`, `src/ui/screens/play.js` (`tournament` parametresi)
- Modify: `src/tournament/session.js` (oyun oturumu yardımcıları)
- Create: `src/ui/screens/twait.js`, `src/ui/screens/tresults.js`
- Modify: `src/styles/tournament.css`

**Interfaces:**
- Consumes: Task 4 `session`.
- Produces, `session` üzerinde oyun bağlamı (`intro`/`play`'in kullandığı arayüz, `ctx.practice` ile aynı biçim):
  - `session.set` (turun oyunları), `session.scores` (`{ [gameId]: score }`, `round.mine`'dan), `session.seed(id) -> puzzleSeed(code, round, id)`.
  - `session.startGame()`: `store.setStarted(code, {no, step})`, `setPlaying(true)`.
  - `session.finish(id, score) -> Promise`: `submit`. Başarı ya da 409'da `clearStarted`, `setPlaying(false)`. Ağ hatasında 3 kez yeniden dener.
  - `session.cutoff()`: şu anki adımın `cutoff`'u (sunucu saatiyle). `session.msLeft() = cutoff - serverNow()`.
- `intro` (`tournament`): ilerleme çubuğu `gameBar(session, id)`. Etiket "Turnuva · Oyun i / n". Düğmenin üstünde kalan süre "0:42" (her saniye güncellenir). "Hazırım!" → `session.startGame()` → `go('play', {id, tournament:true})`. ✕ → onay "Turnuvadan ayrılmak istiyor musun?" → `session.leave()`.
- `play` (`tournament`): bulmaca `PUZZLES[id].generate(session.seed(id))`. `later(bag, timeUp, session.msLeft())`. `timeUp`: `answered` değilse `answered = true`, `fb` kartı "Süre doldu · bu oyundan 0 puan", `session.finish(id, 0)` (sunucu zaten 0 sayar, 409 yok sayılır), "Devam" → `twait`. Cevapta: puan kartı + "Devam" → `session.finish(id, score)` sonrası `go('twait', {step})`. Puan kartı gösterilirken gönderim arka planda başlar. ✕ → "Çıkarsan bu oyun 0 puan sayılır" onayı → `finish(id, 0)` → `twait`. Ekranda süre gösterilmez.
- Yenileme: `screenFor` `twait {abandon:true}` döndürürse `twait` render'ında `session.finish(currentGame, 0)` çağrılır.
- Sıradaki adım başlarken kullanıcı hâlâ puan kartındaysa denetleyici `intro`'ya geçirir (`screenFor` zaten `intro` döner, `play` anahtarından farklı).
- `twait`: `round.mine[step]` varsa büyük puan `NN/100` (oyun rengiyle) + "Diğerleri bekleniyor…". Roster listesi: `✓ bitti` / `oynuyor…` / `bağlantı koptu`. İlerleme çubuğu (biten/aktif). Alt satır "En geç 0:42 sonra sıradaki oyun: <Ad> (i/n)". Geçişteyse (`now < stepStart`) başlık "Herkes bitirdi!" ve sıradaki oyun adı. Son adımdan sonra "Sonuçlar geliyor…". Başkalarının puanı gösterilmez. `onView` ile güncellenir.
- `tresults`: başlık "Turnuva sonucu · Tur N". Sıralama satırları (🥇🥈🥉, sonra sayı), ad (`esc`), toplam. Kendi satırım vurgulu. Altta oyun oyun tablo: sütun başlıkları oyun ikonları (oyun rengi kutucuk), satırlar oyuncular, hücreler puan. 360px'te sığar (ad sütunu kırpılır `text-overflow: ellipsis`). Sahipte "Yeni tur başlat" (`again`) + "Lobiye dön" (`lobby`). Diğerlerinde "Lobi sahibinin yeni turu başlatması bekleniyor". Herkeste "Lobiden çık". `onView` ile sahiplik değişirse düğmeler güncellenir.

- [ ] **Step 1: Kodla**
- [ ] **Step 2: `pnpm test` PASS, `pnpm build` başarılı**
- [ ] **Step 3: Elle uçtan uca (3 pencere: normal, gizli, ikinci profil ya da `?` ile ayrı localStorage kökeni `127.0.0.1` vs `localhost`):** 2 oyunla başlat. İlk bitiren bekleme ekranında diğerlerini "oynuyor…" görür. Herkes bitince ~2,5 sn "Herkes bitirdi!" sonra hepsi aynı anda ikinci tanıtıma geçer. Üçüncü pencere oyun ortasında kapatılır → ~20 sn sonra "bağlantı koptu", grup devam eder. Oyun sırasında yenileme → o oyun 0, bekleme ekranı. Bir oyuncuyu tanıtımda bekletip süreyi doldur → 0 ve otomatik sonraki oyun. Sonuç: sıralama ve tablo doğru (elle hesapla), eşitlikte aynı sıra. "Yeni tur başlat" → yeni sorular (aynı oyun farklı soru). "Lobiye dön" → oyun seçimi değişebilir. Ritim oyununda ses/zamanlama günlük moddaki gibi.
- [ ] **Step 4: Commit** `feat: turnuva oyun akışı, bekleme ve sonuç ekranları`
