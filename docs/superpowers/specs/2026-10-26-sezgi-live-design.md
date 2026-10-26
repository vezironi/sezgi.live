# sezgi.live — Tasarım Belgesi

Tarih: 2026-10-26
Durum: Onaylandı (2026-10-26)

## 1. Amaç ve neden

sezgi.live, algıyı ölçen, tamamen **Türkçe**, **günlük** bir tarayıcı oyunu sitesi. Wordle mantığında çalışır: o gün herkes aynı bulmacaları oynar, sonucunu emoji içeren kısa bir metinle (WhatsApp, X vb.) paylaşır ve skor tablosunda başkalarıyla yarışır.

Esin kaynağı perceptle.com (nokta tahmini, açı, ritim, top yörüngesi, çizgi oranı). Telif riskini azaltmak için oyun **fikirleri** alınıyor (fikirler telifle korunmaz), ancak **isimler, metinler, görsel tasarım, puanlama/not sistemi ve kod tamamen bize ait**. Ayrıca onlarda olmayan 3 yeni oyun ekleniyor.

Başarı: Türk oyuncunun her gün geri gelip 3-4 dakika oynaması, skorunu paylaşması ve haftalık tabloda yükselmeye çalışması.

## 2. Hedefler / hedef olmayanlar / anti-hedefler

**Hedefler**
- 8 oyunluk havuzdan her gün 5 oyun; herkes için aynı oyunlar ve aynı sorular.
- Üyeliksiz kullanım; otomatik takma ad (`sl-9910` biçiminde).
- Günlük skor tablosu, haftalık genel skor tablosu, oyun bazlı günlük listeler.
- Tek tuşla paylaşım metni.
- Telefonda ve bilgisayarda iyi görünen, açık/koyu temalı "Oyun Kutusu" tasarımı.

**Hedef olmayanlar (kapsam dışı)**
- Üyelik / giriş / e-posta.
- Kullanıcının kendi seçtiği takma ad.
- Geçmiş günler arşivi, antrenman modu (demodaki "tek oyun dene" yalnızca demoya aitti).
- Reklam, uygulama mağazası sürümü, çoklu dil.

**Anti-hedefler (teknik olarak çalışsa bile başarısızlık sayılır)**
- Perceptle'ı andıran isim, metin, renk/tasarım veya "S/A/B/C" not sistemi.
- Türkçe karakterlerin (ş, ğ, İ, ı, ç, ö, ü) farklı fontla/bozuk görünmesi.
- Koyu modda göz yoran, tam doygun renk blokları.
- Oyunlarda gereksiz "Onayla" adımları (aşağıdaki oyun kurallarına bakın).
- Bilgisayarda küçük, telefon gibi dar görünen arayüz.

## 3. Kısıtlar

- Yayın: **Vercel**. Veritabanı: Vercel üzerinden eklenen bir veritabanı (bkz. §9).
- Dil: yalnızca Türkçe. Gün sınırı: **Europe/Istanbul** gece yarısı (yurt dışındaki oyuncular da aynı bulmacayı oynar).
- Görsel referans: onaylanmış etkileşimli demo `.superpowers/brainstorm/1636-1792980947/content/demo-v11.html`. Görünüm, akış ve oyun hissi bu dosyadaki gibi olmalı; kod kalitesi açısından **referans değil** (atılacak prototip), temiz yeniden yazılacak.

## 4. Günlük akış

- **Bulmaca numarası** `#N`: yayın tarihinden itibaren gün sayısı (yayın tarihi bir sabit olarak tutulur; builder belirler).
- **Oyun seçimi**: 8 oyundan 5'i, tarihten türetilen deterministik bir tohumla seçilir. Ek kural: **hiçbir oyun art arda 2 günden fazla dışarıda kalmaz** (algoritma builder'a ait; aynı kod istemci ve sunucuda çalışmalı).
- **Soru üretimi**: her oyunun sorusu `tarih + oyun kimliği` tohumuyla deterministik üretilir → herkes aynı nokta sayısını, aynı açıyı, aynı üçgeni görür. Bulmacalar veritabanında saklanmaz.
- **Günde bir oyun**: günlük set bir kez oynanır. Bitirince ana sayfa "Start" yerine bugünün sonucunu, paylaşım düğmesini ve sonraki bulmacaya geri sayımı gösterir. *(Benim kararım)*
- **Yarıda bırakma**: bitirilen oyunların puanı cihazda saklanır, kaldığı yerden devam edilir. Bir oyunda "Hazırım!"a basıldıktan sonra sayfa yenilenir/kapatılırsa o oyun **0 puan** sayılır ve sıradakine geçilir (soruyu görüp yeniden denemeyi engellemek için). *(Benim kararım)*
- **Gece yarısı yarım kalan set**: 5 oyunun hepsi İstanbul gece yarısından önce bitirilmezse o günün seti düşer, skor gönderilmez, o gün seriye ve haftalık toplama sayılmaz; ertesi gün yeni set başlar. *(Benim kararım)*
- **Seri** (🔥): art arda (seti bitirerek) oynanan gün sayısı, cihazda tutulur.

### 4.1 Telefon ve masaüstünde aynı bulmaca *(Benim kararım)*

Tüm oyuncular tek tabloda yarıştığı için bulmaca cihazdan bağımsız olmalı:
- Sorular **normalize uzayda** (x ve y 0-1 arası) üretilir; ekrana oyun alanının oranına göre (telefonda 1:1, masaüstünde 16:10) yerleştirilir. Noktalar/daireler daire olarak çizilir (şekil gerilmez, yalnızca konumlar ölçeklenir); Açı oyununda çember alanın kısa kenarına sığdırılır.
- Hatalar **göreli birimlerle** ölçülür, böylece oran farkı puanı etkilemez: Nokta (göreli sayı farkı), Açı (derece), Oran (çizgi boyuna göre), Yörünge (yatay hata / alan genişliği), Merkez (ekrandaki mesafe / üçgenin ekrandaki boyutu, örn. √alan). Ağırlık merkezi ve parabol, eksen ölçeklemesinde korunduğu için doğru cevap her yerleşimde geçerlidir. Toleranslar bu göreli birimlere göre yeniden kalibre edilir (demodaki değerlerle aynı zorluk hedeflenir).
- Yerleşim oyun başlarken sabitlenir; oyun sırasında pencere boyutu değişirse oyun alanı yeniden ölçeklenir ama yerleşim türü (kare / 16:10) değişmez.

## 5. Ekranlar ve UX

Tasarım "Oyun Kutusu": her oyunun kendi rengi, yuvarlak köşeli kartlar, basınca hafifçe çöken (alt gölgeli) düğmeler, oyunlara özel SVG ikonlar (emoji değil).

- **Ana sayfa**: üstte navbar (logo, 🔥 seri, 🏆 skor tablosu düğmesi, 🌙/☀️ tema düğmesi). Altında "#N · tarih", "Bugünün 5 oyunu" başlığı, 5 oyun kartı, **Başla** düğmesi, "Yeni bulmaca HH:MM:SS sonra" geri sayımı.
- **Oyun tanıtım ekranı** (her oyundan önce): büyük renkli ikon, "Oyun 2 / 5", oyun adı, tek cümle açıklama, 3 numaralı adım, oyun renginde **Hazırım!** düğmesi. Metinler demodaki `INTRO` nesnesinde.
- **Oyun ekranı**: üstte çıkış (✕), 5 parçalı ilerleme çubuğu, tema düğmesi; başlık, görev metni (hedef değer vurgulu), oyun alanı. Cevap sonrası geri bildirim kartı (puan + doğru cevap açıklaması), oyun alanında doğru cevap yeşil gösterilir, **Devam →** düğmesi.
- **Sonuç ekranı**: günün puanı (sayarak yükselen animasyon) `/100`, rütbe, oyun başına puan çubukları, gönderim kartı (takma ad, bugünkü sıra, haftalık genel sıra, hafta puanı), paylaşım metni, **Paylaş** ve **🏆 Sıralama** düğmeleri, geri sayım.
- **Skor tablosu ekranı**: geri (←), başlık, takma ad rozeti, tema. Sekmeler: **Bugün** / **Haftalık genel**; altında günün 5 oyunu için oyun sekmeleri. Liste (ilk 3 için 🥇🥈🥉), altta sabit "senin satırın" kartı (sıra, takma ad "(sen)", puan); oynamadıysa "Bugünü oynayınca sen de burada olacaksın".
- **Yerleşim**: navbar sayfanın en üstünde; içeriğin geri kalanı kalan alanda dikey ortalı. Telefonda tek sütun (en fazla ~440px).
- **Masaüstü (≥820px)**: içerik genişliği ~800px; ana sayfada 5 oyun yan yana dikey kartlar; oyun alanı 16:10 (iç koordinat 480×300; telefonda 300×300 kare). Oyunlar bu genişliğe göre çizilir (gerdirme yok). Düğmeler/giriş kutusu ~440px ortalı. Yazılar bir kademe büyük.
- **Tema**: varsayılan cihaz ayarı (`prefers-color-scheme`), navbar düğmesiyle değiştirilir ve hatırlanır. Koyu modda oyun kartları tam doygun renk yerine koyu zemin + oyun rengiyle karışık arka plan + renkli çerçeve.
- **Fontlar**: başlık/sayılar **Baloo 2**, metin **Nunito** (ikisi de Türkçe glifleri içeriyor, doğrulandı). **Fredoka kullanılmaz** (ş, ğ, İ glifleri yok).

## 6. Oyunlar

Her oyun 0-100 puan verir. Puan eğrisi (demodaki): `puan = round(100 · e^(−3·(hata/tolerans)²))`. Toleranslar başlangıç değeridir, builder ayarlayabilir. Koordinatlar oyun alanının iç koordinatlarında (yükseklik her zaman 300).

| # | Ad | Renk | Mekanik | Hata / tolerans |
|---|---|---|---|---|
| 1 | **Nokta** | #ff5d73 | Hazırım → ekranda büyük **3-2-1** → 45-85 nokta 2 sn görünür → sayı yazılır (Enter veya → düğmesi). | |tahmin−gerçek|/gerçek; 0,35 |
| 2 | **Açı** | #6c4cff | Kesikli çizgi 0°; hedef 15-345°. Tutamak saat yönü tersine sürüklenir, **bırakınca otomatik kaydedilir** (onay yok). | dairesel derece farkı; 22° |
| 3 | **Zaman** | #16b3a3 | Hedef 4,0-9,9 sn. Büyük yuvarlak düğme: Başlat → Dur!. Sayaç gösterilmez. | |fark| sn; 1,6 |
| 4 | **Renk** | #ff9f1c | 3-2-1 → renk (S=%78, ton 0-359, açıklık %32-68) 2 sn alanı kaplar → 2B seçici (yatay ton, dikey açıklık %85→%15), **bırakınca kaydedilir**. Seçici CSS gradyanı ile çizilir (beyaz/siyah katmanı HSL ile birebir eşleşir). Telefonda seçici tüm alanı kaplar + sağ üstte küçük önizleme; masaüstünde solda kare seçici, sağda büyük "Seninki" paneli. | d = √((tonFarkı/60)² + (açıklıkFarkı/15)²); puan = 100·e^(−0,8·d²) |
| 5 | **Merkez** | #3a86ff | Rastgele üçgen (alanı yeterince büyük); ağırlık merkezine **tek dokunuş**. | mesafe; 38 birim |
| 6 | **Yörünge** | #5f9e3a | Kayalıktan atış; dokununca top uçar, yolun %38-52'sinde kaybolur; düşeceği yere zeminde dokunulur. Sonra gerçek yol + düşüş noktası gösterilir. | yatay mesafe; 48 birim |
| 7 | **Ritim** | #e84393 | 80-128 BPM. Başlat → 4 referans vuruş (ses + görsel nabız), eşlik edilir → ses kesilir → 8 vuruş daha (dokunma veya boşluk tuşu). 8 nokta göstergesi dolar. | serbest vuruşların beklenen ızgaradan ort. mutlak sapması (ms); 120 |
| 8 | **Oran** | #56637d | Rastgele uzunluk/konumda çizgi; bir ucu "başlangıç". Görev: "başlangıçtan p/q uzaklıktaki noktayı işaretle" (kesir listesi demoda). İşaretçi sürüklenir, **bırakınca kaydedilir**. | |fark|/çizgi boyu; 0,07 |

Ritim: ses kaydırmasını önlemek için zamanlama Web Audio saatine bağlanmalı; mobil gecikme builder'ın test etmesi gereken bir risk.

## 7. Puanlama, rütbe, paylaşım

- **Günün puanı** = 5 oyun puanının ortalaması, yuvarlanmış, **en fazla 100**.
- **Rütbeler**: ≥90 🦅 Kartal Gözü · ≥76 🎯 Keskin · ≥60 💪 Sağlam · ≥40 🙂 İdare Eder · altı 🌫️ Bulanık.
- **Oyun başına kare**: ≥85 🟩 · ≥65 🟨 · ≥40 🟧 · altı 🟥.
- **Paylaşım metni**:
  ```
  sezgi.live #42 · 82/100
  🎯 Keskin
  🟩 Nokta 92
  🟨 Açı 78
  🟩 Zaman 88
  🟧 Renk 61
  🟩 Merkez 93
  sezgi.live
  ```
  Mobilde `navigator.share`, değilse panoya kopyalama.

## 8. Skor tabloları ve kimlik

- **Kimlik**: ilk ziyarette cihaz, sunucudan rastgele bir gizli **token** ve benzersiz bir takma ad alır (`sl-` + 4 hane; 4 hane tükenirse 5 haneye geçilir). İkisi `localStorage`'da saklanır. Tarayıcı verisi silinirse yeni kimlik oluşur (kabul edilen sınırlama).
- **Günlük tablo**: o günün puanı; ilk 100 + oyuncunun kendi sırası + toplam oyuncu sayısı.
- **Haftalık genel tablo**: Pazartesi-Pazar (İstanbul saati) günlük puanların **toplamı** (en fazla 700); Pazartesi sıfırlanır; ilk 100 + kendi sıran.
- **Oyun bazlı günlük listeler**: günün 5 oyununun her biri için ilk 20 + kendi sıran.
- Sonuç ekranında skor otomatik gönderilir (takma ad sorulmaz).
- **Eşit puanlar** *(Benim kararım)*: sıra = senden kesin yüksek puanlı oyuncu sayısı + 1 (eşitler aynı sırayı paylaşır: 1, 1, 3). Listede eşitler arasında önce gönderen üstte görünür.

## 9. Teknik yapı (benim kararlarım)

- **Ön yüz**: framework'süz HTML/CSS/JavaScript, Vite ile paketlenir; statik olarak Vercel'de.
- **Arka uç**: Vercel Functions (`/api/*`).
- **Veritabanı**: Vercel Marketplace üzerinden **Upstash Redis** (sıralama için sıralı kümeler uygun). Veri modeli builder'a ait.
- **Maliyet** *(Benim kararım)*: başlangıçta ücretsiz katmanda kalmak hedef. Bu yüzden baştan tasarlanır: ilk-100 listeleri ve oyuncu sayıları Vercel CDN'de kısa süre (≈30-60 sn) önbelleğe alınır; "kendi sıran" ayrı ve hafif bir istekle alınır; skor gönderimi tüm Redis yazımlarını tek pipeline'da yapar. Trafik ücretsiz kotayı aşarsa ücretli katmana geçilir; kod değişikliği gerekmez.
- **Ortak kod**: tarih/tohum, günlük oyun seçimi ve doğrulama mantığı istemci ile sunucu arasında paylaşılır.
- **API (taslak)**: kimlik oluşturma; skor gönderme (token, tarih, oyun kimlikleri + puanlar → sıralar döner); tablo okuma (gün / hafta / oyun, + kendi sıran).
- **Hile önlemleri**: token başına günde tek gönderim; tarih = İstanbul'da bugün (gece yarısından sonra birkaç dakikalık tolerans builder'a ait); oyun seti = sunucunun hesapladığı günlük set; puanlar 0-100 tamsayı; kimlik oluşturmaya IP başına hız sınırı. Üyelik olmadığından tam koruma mümkün değil; bilinen sınırlama.
- **Gizlilik**: kişisel veri tutulmaz; IP yalnızca hız sınırı için kısa süreli kullanılır.

## 10. Builder'a bırakılanlar

- Dosya/klasör yapısı, Redis veri modeli ve anahtarlar, API rota adları ve biçimleri.
- Oyun seçim algoritması (§4'teki kural sağlandığı sürece) ve tohumlu rastgele sayı üreteci.
- Tolerans ince ayarları, animasyon süreleri, küçük görsel detaylar (demodaki görünüme sadık kalarak).
- Temel SEO (Türkçe başlık/açıklama, OG görseli), favicon.
- Test kapsamı (en azından: günlük seçim, soru üretimi, puanlama, API doğrulaması için birim testleri).
- Yayın tarihi sabiti ve `#N` hesabı.
