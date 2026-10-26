# sezgi.live

Her gün herkesin aynı 5 algı oyununu oynadığı, üyeliksiz, Türkçe günlük oyun sitesi.
8 oyunluk havuz: Nokta, Açı, Zaman, Renk, Merkez, Yörünge, Ritim, Oran.

- Tasarım belgesi: `docs/superpowers/specs/2026-10-26-sezgi-live-design.md`
- Uygulama planı: `docs/superpowers/plans/2026-10-26-sezgi-live.md`
- Görsel referans (onaylı demo): `docs/reference/demo.html`

## Yerelde çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # birim testleri
npm run build    # dist/ üretir
```

`npm run dev`, `/api/*` uçlarını da çalıştırır. Redis ortam değişkenleri yoksa bellek içi bir
Redis kullanılır (sunucu yeniden başlayınca skorlar sıfırlanır). Geliştirme sırasında herhangi bir
oyunu tek başına açmak için tarayıcı konsolunda: `__go('intro', { id: 'ritim' })`.

## Vercel'e yayın

1. Projeyi GitHub'a gönder.
2. Vercel → **Add New → Project** → depoyu içe aktar. Framework otomatik "Vite" algılanır
   (`vercel.json` hazır).
3. Proje → **Storage → Marketplace → Upstash (Redis)** → bölge olarak **Frankfurt (eu-central-1)** seç, oluştur ve projeye bağla.
   (Fonksiyonlar `vercel.json` ile `fra1` bölgesine sabitlendi; ikisi aynı bölgede olunca istekler hızlı olur.)
   `KV_REST_API_URL` ve `KV_REST_API_TOKEN` ortam değişkenleri otomatik eklenir
   (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` adları da desteklenir).
4. **Deploy**. Redis bağlı değilse API bilerek hata verir (skorlar sessizce kaybolmasın diye).
5. **Settings → Domains** → `sezgi.live` alan adını bağla.

## Önemli notlar

- **Yayın tarihi:** `shared/date.js` içindeki `LAUNCH_DATE` 1 numaralı bulmacanın günüdür
  (şu an `2026-10-26`). Yayından önce gerçek açılış gününe ayarla; günlük oyun seçimi de bu
  tarihten itibaren hesaplanır, yayından sonra değiştirme.
- **Gün sınırı** İstanbul saatiyle gece yarısıdır; haftalık tablo Pazartesi sıfırlanır.
- **API:** `POST /api/register`, `POST /api/score`, `GET /api/board?type=day|week|game`,
  `GET /api/me` (başlık `x-sezgi-token`). Tablo yanıtları CDN'de 45 sn önbelleğe alınır.
- Kişisel veri tutulmaz; IP yalnızca kayıt hız sınırı için 24 saatlik bir anahtarda kullanılır.
