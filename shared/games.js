// Oyun havuzu: kimlik, ad, kısa açıklama ve renk çifti (gc: ana, gce: alt gölge).

export const GAME_IDS = ['nokta', 'aci', 'zaman', 'renk', 'merkez', 'yorunge', 'ritim', 'oran'];

export const GAMES = {
  nokta:   { id: 'nokta',   ad: 'Nokta',   ds: 'Kaç nokta gördün?',         gc: '#ff5d73', gce: '#d63a52' },
  aci:     { id: 'aci',     ad: 'Açı',     ds: 'Açıyı tek hamlede tuttur',  gc: '#6c4cff', gce: '#4f31d9' },
  zaman:   { id: 'zaman',   ad: 'Zaman',   ds: 'İç saatin ne kadar doğru?', gc: '#16b3a3', gce: '#0d8a7d' },
  renk:    { id: 'renk',    ad: 'Renk',    ds: 'Rengi aklında tut',         gc: '#ff9f1c', gce: '#d67d00' },
  merkez:  { id: 'merkez',  ad: 'Merkez',  ds: 'Tam ortayı bul',            gc: '#3a86ff', gce: '#1d63d6' },
  yorunge: { id: 'yorunge', ad: 'Yörünge', ds: 'Top nereye düşecek?',       gc: '#5f9e3a', gce: '#447a24' },
  ritim:   { id: 'ritim',   ad: 'Ritim',   ds: 'Tempoyu bozmadan devam et', gc: '#e84393', gce: '#bf2873' },
  oran:    { id: 'oran',    ad: 'Oran',    ds: 'Çizgide kesri bul',         gc: '#56637d', gce: '#3b465c' },
};

// Günün puanı: oyun puanlarının yuvarlanmış ortalaması (0-100). İstemci ve sunucu aynı formülü kullanır.
export function dayScore(scores) {
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
