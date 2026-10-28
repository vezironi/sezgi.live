# Turnuva modu: Tasarım Belgesi

Tarih: 2026-10-28
Durum: Taslak (onay bekliyor)
İlgili: `docs/superpowers/specs/2026-10-26-sezgi-live-design.md` (ana site tasarımı)
Görsel taslak: `.superpowers/brainstorm/1012-1793207383/content/turnuva-akis-v2.html` (lobi, oyunlar arası bekleme, sıralama)

## 1. Amaç ve neden

sezgi.live şu an tek başına oynanan bir günlük oyun. Turnuva modu, **2-10 kişilik bir arkadaş grubunun, herkes kendi evinden, aynı anda yarışmasını** sağlar. Bir kişi lobi açar ve linki gruba atar. Herkes linkle lobiye girer ve adını yazar. Lobi sahibi oyunları seçip başlatır. Herkes aynı oyunları kendi ekranında oynar. Her oyundan sonra grup birbirini bekler ve sonunda puan sıralaması çıkar. İstenirse aynı lobide hemen bir tur daha oynanır.

Başarı ölçüsü: bir arkadaş grubunun bir akşam linki paylaşıp kurulumla uğraşmadan birkaç tur üst üste oynaması.

## 2. Hedefler / hedef olmayanlar / anti-hedefler

**Hedefler (kullanıcının istekleri)**
- Benzersiz bir paylaşım linkiyle lobiye katılma.
- Lobide herkes kendi adını belirler.
- Lobi sahibi oyuncuları lobiden atabilir.
- Oyunu yalnızca lobi sahibi başlatır.
- Lobi sahibi **oyun sayısını ve hangi oyunların** oynanacağını seçer.
- Bulmacalar her turnuvada **rastgele** üretilir (günlük bulmacadan bağımsız).
- Herkes aynı anda kendi ekranında oynar. **Bir sonraki oyuna geçmek için herkesin o oyunu bitirmesi beklenir.**
- Bir oyuncu süre dolana kadar bitiremezse (bağlantısı kopar, telefonu bırakır vb.) **o oyundan 0 puan** alır ve turnuva devam eder.
- Sonda herkesin puanına göre **sıralama** gösterilir.
- Sıralamadan sonra **aynı lobide yeni tur** başlatılabilir.

**Hedef olmayanlar**
- Turnuva puanları günlük/haftalık skor tablosuna, seriye (🔥) veya günün puanına **sayılmaz**. Günlük durumu (`sezgi-v1`) hiçbir şekilde değiştirmez.
- Herkese açık lobi listesi, eşleştirme, sohbet, sesli iletişim.
- Turlar arası birikimli puan / sezon tablosu (her tur kendi sıralamasıyla biter).
- Üyelik veya giriş.
- Ciddi hile koruması. Arkadaş grubu için yapılıyor, puanlar günlük moddaki gibi istemciden gelir.

**Anti-hedefler (teknik olarak çalışsa bile başarısızlık sayılır)**
- Bir oyuncu koptu diye grubun süresiz beklemesi.
- Oyuncuların farklı bulmacalar görmesi. Karşılaştırma adil olmalı, aynı turda **herkes aynı soruyu** görür *(benim kararım, "rastgele" isteğini adil yarışla birleştirmek için)*.
- Zaman oyununda ekranda geri sayım görünmesi. Oyunun kendisi iç saati ölçtüğü için oyun sırasında süre gösterilmez (bkz. §6).
- Ekranlar arası geçişte görünen gecikme, takılma veya "ne oluyor?" hissi. Oyuncu her an neyi beklediğini görmeli.
- Ana sitenin görsel dilinden ("Oyun Kutusu" tasarımı, Baloo 2 / Nunito, açık/koyu tema) kopuk görünen ekranlar.

## 3. Kısıtlar

- Mevcut altyapı korunur: framework'süz JS + Vite ön yüz, Vercel Functions (`/api/*`), Upstash Redis, yeni bağımlılık eklenmez *(benim kararım)*.
- Vercel fonksiyonları kalıcı bağlantı (WebSocket) tutmaz. Anlık güncellemeler **kısa aralıklı sorgulamayla (polling)** yapılır *(benim kararım)*. Upstash ücretsiz katmanı **ayda 500 bin komut** ile sınırlı ve günlük oyunla paylaşılıyor (bkz. §8).
- Yerel geliştirme mevcut `vite.config.js` `localApi` yaklaşımıyla ve `fake-redis` ile çalışmaya devam etmeli. Yeni rotalar oraya eklenir, `fake-redis`'e gereken komutlar eklenir.
- Tamamen Türkçe arayüz.

## 4. Akış

### 4.1 Lobi oluşturma
- Ana sayfaya bir **"Arkadaşlarla turnuva"** düğmesi eklenir (oyun kartlarının altında, gün tamamlanmış hâlde de görünür) *(benim kararım)*.
- Düğme: oyuncudan adını ister → sunucuda lobi oluşturulur → oluşturan kişi **lobi sahibi** olur → lobi ekranına geçilir.
- Lobi kodu: karışmayan harf/rakamlardan oluşan kısa bir kod (örn. `K7QX`, 0/O, 1/I/L hariç; uzunluk builder'a ait, en az 4). Link: `https://sezgi.live/t/<KOD>`. Vercel'de `/t/*` isteği `index.html`'e yönlendirilir. İstemci açılışta yolu okuyup turnuva ekranına gider.
- Lobi oluşturmaya IP başına hız sınırı (mevcut `register` sınırına benzer).

### 4.2 Katılma ve isim
- Linki açan kişi adını yazıp "Katıl"a basar. Ad 1-16 karakter, baştaki/sondaki boşluk kırpılır, lobi içinde **büyük/küçük harf duyarsız benzersiz**. Çakışırsa "Bu ad alınmış" uyarısı çıkar *(benim kararım)*. Son kullanılan ad cihazda hatırlanır ve öneri olarak doldurulur.
- Her oyuncu lobiye özel rastgele bir **gizli oyuncu anahtarı** alır. Bu anahtar `localStorage`'da lobi koduyla saklanır. Sayfa yenilenince oyuncu aynı kimlikle geri gelir. Günlük moddaki `sl-XXXX` kimliğinden bağımsızdır.
- Oyuncu lobi aşamasında adını değiştirebilir.
- Lobi en fazla **10** oyuncu alır. Doluysa "Lobi dolu" gösterilir.
- Turnuva **oynanırken** linki açan yeni kişi: "Turnuva sürüyor, bu tur bitince katılabilirsin" mesajı görür. Bekleme ekranı sorgulamaya devam eder ve tur bitip lobi/sonuç aşamasına geçilince katılma formu açılır *(benim kararım)*.
- Geçersiz veya süresi dolmuş kod: "Bu lobi bulunamadı" + ana sayfaya dön düğmesi.

### 4.3 Lobi ekranı (taslaktaki 1. ekran)
- Kopyalanabilir link (paylaşım için `navigator.share` varsa onu da kullan), oyuncu listesi (ad, sahip rozeti, "(sen)" işareti), oyuncu sayısı `n/10`.
- **Lobi sahibinde:**
  - Her oyuncunun yanında **At** düğmesi var.
  - Oyun seçimi: 8 oyunun çipleri, en az 1 oyun seçilmeli. Varsayılan seçim rastgele 5 oyundur *(benim kararım)*. Oyunlar havuz sırasıyla (`GAME_IDS`) oynanır *(benim kararım)*.
  - **Turnuvayı başlat** düğmesi en az 2 oyuncu varken aktif olur *(benim kararım)*.
- **Diğer oyuncularda:** seçili oyunları salt okunur görür, "Lobi sahibinin başlatması bekleniyor" mesajını görür.
- **Atılan oyuncu:** "Lobiden çıkarıldın" ekranını görür. Anahtarı bu lobi için geçersiz olur. Aynı linkle yeni bir adla tekrar katılabilir. Bu, arkadaş grubu için kabul edilen bir sınırlamadır *(benim kararım)*.
- Atma yalnızca **lobi ve sonuç aşamasında** yapılabilir, oyun sırasında yapılamaz *(benim kararım: oyun ortasında "herkes bitirdi mi" hesabını basit tutar; kopan oyuncu zaten süre dolunca 0 alır)*.
- Oyuncu "Lobiden çık" diyebilir.
- Bağlantısı kopan oyuncular ve sahip devri için §4.6'ya bakın.

### 4.4 Oyun akışı
- Sahip başlatınca tur başlar. Turun oyuncu listesi o anda dondurulur. Sunucu turun **tohumunu** üretir ve her oyunun bulmacası `turnuva:<kod>:<tur no>:<tohum>:<oyun>` gibi bir tohumla `PUZZLES[id].generate(seed)` üzerinden üretilir. Herkes aynı soruyu görür, her turda sorular yenidir.
- Her oyun bir **adım**dır. Adım başladığında herkes aynı anda mevcut **tanıtım ekranını** ("Oyun 2 / 4") görür, "Hazırım!"a basar ve oynar. Mevcut `intro` ve `play` ekranları turnuva bağlamıyla yeniden kullanılır (günlük ilerleme çubuğu yerine turnuvanın oyun listesi kullanılır).
- Cevap verince puan geri bildirim kartı gösterilir, puan sunucuya gönderilir ve "Devam" düğmesi **bekleme ekranına** götürür.
- **Bekleme ekranı** (taslaktaki 2. ekran) şunları gösterir:
  - oyuncunun bu oyundaki puanı
  - herkesin durumu (✓ bitti / oynuyor…)
  - kalan süre
  - sıradaki oyunun adı
  Diğerlerinin puanları bu aşamada görünmez, sürpriz sona saklanır *(benim kararım)*.
- **Adım geçişi:** turdaki tüm oyuncular puanını gönderdiğinde **veya** adımın süresi dolduğunda adım biter. Kısa bir "Herkes bitirdi!" anının (~2 sn) ardından herkes aynı anda sonraki oyunun tanıtımına geçer.
- **Süre:** her adımın bir üst sınırı vardır (tanıtımı okuma + oynama). Oyuna göre ayarlanır. Ritim ve Zaman daha uzun sürer. Başlangıç değeri olarak oyun başına ~60-90 sn önerilir, kesin değerler builder'a aittir *(benim kararım)*. Süre dolduğunda puan göndermemiş oyuncu o oyundan **0** alır. Ağ gecikmesi için sunucu birkaç saniyelik pay bırakır. Bundan sonra gelen gönderim reddedilir ve 0 kalır.
- **Oyuncu oynarken süre dolarsa** *(benim kararım)*: istemci adımın bitiş anını bilir ve ekranda göstermeden kendi zamanlayıcısını tutar. Süre dolduğunda oyun kesilir. "Süre doldu, bu oyundan 0 puan" kartı gösterilir ve oyuncu herkesle birlikte sıradaki oyuna geçer. Oyuncu puanını görüp sonra 0'a düşmez. Bu zamanlayıcı yalnızca bir `setTimeout`'tur ve Ritim/Zaman zamanlamasına dokunmaz.
- **Yenileme / sekmeyi kapatma:** günlük moddaki kural geçerlidir. Oyuncu "Hazırım!"a bastıktan sonra sayfayı yenilerse o oyun 0 sayılır ve oyuncu bekleme ekranına düşer. Henüz "Hazırım!"a basmadıysa tanıtıma geri döner. Oyun ortasında ✕ ile çıkış: onay sorulur. Onaylanırsa o oyun 0 sayılır ve oyuncu lobiden ayrılmış olmaz, bekleme ekranına gider.
- Turun ortasında tamamen kopan oyuncu kalan her oyundan 0 alır ve sıralamada yer alır. Grup onu beklemez (bkz. §4.6).

### 4.5 Sıralama (taslaktaki 3. ekran)
- Turnuva puanı = oyuncunun oyun puanlarının yuvarlanmış ortalaması. Mevcut `dayScore` kullanılır, 0-100 arasıdır.
- Sıralama yüksekten düşüğe yapılır. Eşit puanlılar aynı sırayı paylaşır (1, 1, 3), sitedeki genel kuralla aynıdır. İlk üçte 🥇🥈🥉 kullanılır. Kendi satırın vurgulanır.
- Altta oyun oyun puan tablosu bulunur (satırlar oyuncular, sütunlar oyunlar). Dar ekranda yatay kaydırmasız sığmalı, gerekirse oyun ikonları sütun başlığı olur.
- **Lobi sahibinde:**
  - **Yeni tur başlat:** aynı oyunlar, aynı oyuncular, yeni sorular; hemen başlar.
  - **Lobiye dön:** oyun seçimi değiştirilebilir, oyuncu atılabilir, bekleyen yeniler katılabilir.
- **Diğer oyuncularda:** "Lobi sahibinin yeni turu başlatması bekleniyor" mesajı ve **Lobiden çık** düğmesi.
- Sıralama ekranı bir sonraki tur başlayana kadar görünür kalır.
- **Yeni turun oyuncuları** o anda lobide aktif olan herkestir. Sonuç ekranı sırasında katılanlar dahil olur, kopmuş olanlar dahil olmaz.

### 4.6 Kopan oyuncular ve sahip devri *(benim kararlarım, tüm aşamalarda geçerli)*
- Her istemci turnuva ekranlarındayken, **oyun sırasında da**, sunucuya düzenli "buradayım" sinyali gönderir: normal sorgulamada her sorguda, oyun ekranında ~5 sn'de bir hafif bir istekle. Bu ağ isteği oyunların zamanlamasını etkilemez.
- **Lobi ve sonuç aşaması:** ~60 sn sinyal göndermeyen oyuncu listeden düşer. Tekrar gelirse aynı anahtarla otomatik geri katılır.
- **Tur sırasında:** ~20 sn sinyal göndermeyen oyuncu "koptu" sayılır. Bitirilmemiş adımları 0 olur ve grup onu beklemeden ilerler: "herkes bitirdi" hesabında kopan oyuncular yok sayılır. Kopan oyuncu turun içinde geri gelirse o anki adımdan devam eder. Kaçırdığı adımlar 0 kalır.
- **Sahip devri:** sahip lobiden çıkarsa ya da ~30 sn sinyal göndermezse sahiplik en eski katılan aktif oyuncuya geçer. Bu kural lobide, tur sırasında ve sonuç ekranında geçerlidir. Böylece kimse "sahip bekleniyor" ekranında takılı kalmaz. Eski sahip geri gelirse normal oyuncu olarak döner.
- Adım hesaplama fonksiyonu (§6) bu yüzden gönderimlerle birlikte son görülme zamanlarını da girdi olarak alır.

## 5. Ekran ve yönlendirme
- Yeni ekranlar: turnuva girişi / ad formu, lobi, bekleme, sıralama, hata/durum ekranları. Bunlar mevcut `src/ui/screens/` düzenine ve `go(name, params)` yönlendirmesine uyar.
- Ekranlar turnuva içindeyken adres çubuğunda `/t/<KOD>` kalır. Ana sayfaya dönünce `/` olur (`history.replaceState`).
- Sekme başlıkları mevcut `titleFor` düzenine göre ayarlanır ("Turnuva lobisi | sezgi.live" gibi).
- Görsel dil mevcut sitedir: kartlar, alt gölgeli düğmeler, oyun renkleri, açık/koyu tema, telefonda tek sütun, masaüstünde mevcut genişlik kuralları.

## 6. Senkronizasyon ve zaman *(benim kararlarım)*
- İstemci turnuva ekranlarındayken sunucuyu **~1,5 sn** aralıkla sorgular. Yanıt turun tam durumunu ve sunucu saatini (`now`) taşır.
- **Oyun ekranında** (oyuncu aktif oynarken) tam durum sorgusu yerine yalnızca ~5 sn'de bir "buradayım" sinyali gönderilir (§4.6). Oyun sırasında ekranda süre gösterilmez. Süre yalnızca tanıtım ve bekleme ekranlarında görünür.
- Saatler arası fark: istemci, yanıttaki sunucu saatiyle kendi saati arasındaki farkı hesaplayıp geri sayımları buna göre gösterir. Son söz her zaman sunucunundur.
- Sekme arka plandayken sorgulama yavaşlatılabilir. Geri gelince hemen bir sorgu yapılır.
- **Durum ilerletme önerisi:** zamanlayıcı/cron kullanılmaz. Turun hangi adımda olduğu; tur başlangıç zamanı, adım süreleri ve gönderim zaman damgalarından **saf bir fonksiyonla hesaplanır**. Adım i şu iki andan önce geleninde biter: (a) kopmamış tüm oyuncuların i için gönderim yaptığı an, (b) adım i'nin başlangıcı + süre sınırı. Adım i+1 o anda (+ kısa geçiş) başlar. Böylece eşzamanlı istekler arasında yarış durumu oluşmaz, her istek aynı sonucu hesaplar. Bu fonksiyon `shared/` altında olur, istemci ve sunucu aynı kodu kullanır. Builder daha iyi bir yöntem bulursa değiştirebilir, ancak "eşzamanlı iki gönderim durumu bozmamalı" şartı geçerlidir.

## 7. Sunucu (taslak, ayrıntılar builder'a ait)
- Uç noktalar, örneğin:
  - lobi oluştur
  - katıl / ad değiştir
  - durum (sorgulama)
  - sahip işlemleri: oyun seçimi, at, başlat, yeni tur, lobiye dön
  - puan gönder
  - ayrıl
  Mevcut `api/<ad>.js` + `api/_lib/handlers.js` fabrika düzeni, `redis`/`now` enjeksiyonu ve `json()` yardımcıları kullanılır.
- Sahip işlemleri, istekteki oyuncu anahtarının o anki sahip olduğunu doğrular.
- Puan gönderimi şunları doğrular: oyuncu turda mı, adım şu an açık mı (süre dolmamış), bu adım için daha önce gönderim yapılmamış mı (tek yazım, örn. `HSETNX`), puan 0-100 tamsayı mı.
- Redis veri modeli builder'a aittir. Eşzamanlı yazımlar birbirini ezmemelidir: tek bir JSON belgesini oku-değiştir-yaz yerine alan bazlı yazımlar (hash alanları, `NX`) kullanılır.
- Lobi verisi son etkinlikten **24 saat** sonra kendiliğinden silinir (TTL her yazımda yenilenir).
- Durum yanıtları önbelleğe alınmaz (`no-store`).

## 8. Maliyet
Upstash ücretsiz katmanı **ayda 500 bin komut** verir ve günlük oyunla paylaşılır. Fazlası kullandıkça ödemeli plana geçince 100 bin komut başına 0,20 $ tutar. Ana tasarımdaki karar burada da geçerli: ücretsiz katmanda kalmak hedeflenir, aşılırsa kod değiştirmeden ücretli plana geçilir *(benim kararım)*.

Kaba hesap: 10 oyuncu, ortalama 2-3 sn'de bir istek (bekleme ekranında sık, oyun sırasında seyrek), istek başına ~3 komut ≈ saatte 40-50 bin komut. Ücretsiz kota ayda yaklaşık **10 saatlik 10 kişilik turnuva** taşır. Ücretli planda böyle bir saat yaklaşık 0,10 $ tutar. Bu yüzden:
- Durum sorgusu ve sinyal, sinyal yazımı dahil, en fazla birkaç Redis komutu kullanmalı ve tek pipeline'da yapılmalıdır.
- Sorgulama oyun sırasında ve arka plandaki sekmede seyrekleşir. Sorgu aralığı 1,5-2 sn arasında tutulur.
- Builder, tipik bir akşamın (örn. 10 kişi, 3 tur) toplam komut sayısını gerçek istek sayımına göre plana yazar. Upstash panelinde aylık harcama sınırı açılması önerilir.

## 9. Test
- Projede birim test altyapısı yok. Bağımlılık eklemeden **Node'un yerleşik test çalıştırıcısı** (`node --test`) ile `pnpm test` betiği eklenir *(benim kararım)*.
- En azından şunlar test edilir: adım hesaplama fonksiyonu (herkes bitirdi / süre doldu / kopan oyuncu / geç gönderim), sıralama ve eşitlik kuralı, ad doğrulama ve benzersizlik, sahip devri, handler'ların yetki ve doğrulama kontrolleri (`fake-redis` ile).
- Elle uçtan uca kontrol: en az 3 ayrı tarayıcı penceresiyle lobi aç, katıl, at, başlat, bir oyuncuyu yarıda bırak ve süre dolunca 0 aldığını, sıralamayı ve yeni turu doğrula.

## 10. Builder'a bırakılanlar
- Dosya yapısı, rota adları, istek/yanıt biçimleri, Redis anahtarları.
- Lobi kodu uzunluğu ve alfabesi, adım süre sınırlarının kesin değerleri, sorgulama aralıkları, geçiş animasyonları.
- Bekleme ve sıralama ekranlarının görsel ayrıntıları (taslağa ve mevcut tasarım diline sadık kalarak).
- Ana sayfadaki turnuva düğmesinin kesin yeri ve görünümü.
