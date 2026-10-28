import { GAMES } from '../../../shared/games.js';
import { ICONS, UI, icon } from '../icons.js';
import { $, gvars } from '../dom.js';
import { gameBar, bindGameBar } from '../gamebar.js';
import { layout } from '../../games/common.js';
import { clock } from './twait.js';

const INTRO = {
  nokta:  { lead: 'Ekranda bir anlığına noktalar belirecek. Saymaya vaktin olmayacak, göz kararı tahmin et!',
            steps: ['3-2-1 sayımından sonra noktalar <b>2 saniye</b> görünür', 'Kaç nokta gördüğünü yaz', 'Gerçek sayıya ne kadar yakınsan o kadar puan'] },
  aci:    { lead: 'Sana bir açı söyleyeceğiz. Çizgiyi çevirip o açıyı gözünle kurmaya çalış.',
            steps: ['Kesikli çizgi başlangıç noktası, yani <b>0°</b>', 'Tutamağı saat yönünün tersine sürükle', '<b>Bıraktığın an</b> cevabın kaydedilir, tek hamle!'] },
  zaman:  { lead: 'İç saatin ne kadar doğru çalışıyor? Saat yok, sayaç yok, sadece sen varsın.',
            steps: ['Sana bir süre verilir, örneğin <b>6,4 saniye</b>', 'Başlat\'a bas ve içinden say', 'O süre geçti dediğin an <b>Dur!</b>\'a bas'] },
  renk:   { lead: 'Bir rengi sadece 2 saniye aklında tutabilir misin?',
            steps: ['3-2-1 sayımından sonra renk <b>2 saniye</b> ekranı kaplar', 'Sonra renk kutusunda parmağını gezdir', '<b>Bıraktığın an</b> cevabın kaydedilir'] },
  merkez: { lead: 'Ekrana bir üçgen gelecek. Onu kartondan kesilmiş gibi düşün.',
            steps: ['Üçgenin <b>denge noktasını</b> bul', 'Parmağının ucunda dengede duracağı yere dokun', 'Tek dokunuş, geri alma yok'] },
  yorunge: { lead: 'Bir top fırlatılacak ama yolun yarısında görünmez olacak. Yerçekimini gözünle hesapla!',
            steps: ['Dokununca top kayalıktan fırlatılır', 'Havada bir noktada <b>kaybolur</b>', 'Yere düşeceği yere dokun, ne kadar yakınsa o kadar puan'] },
  ritim:  { lead: 'Kafanda bir metronom var mı? Tempoyu sesi duymadan korumaya çalış.',
            steps: [`${icon(UI.sound, { size: 18, cls: 'inl' })} <b>Sesini aç</b>, 4 vuruş duyacaksın, onlara eşlik et`, 'Ses kesilince aynı tempoyla <b>8 kez</b> daha dokun', 'Vuruşlara ne kadar denk gelirsen o kadar puan'] },
  oran:   { lead: 'Cetvel yok, sadece gözün var. Bir çizgide istenen kesri bulabilir misin?',
            steps: ['Çizginin bir ucu <b>başlangıç</b> olarak işaretli', 'Başlangıçtan istenen kesir kadar uzaktaki noktayı bul', 'İşaretçiyi sürükle, <b>bıraktığın an</b> cevabın kaydedilir'] },
};

export function render(app, ctx, params) {
  const { id } = params;
  const { state, go } = ctx;
  const practice = !!params.practice;
  const tour = params.tournament ? ctx.tournament : null;
  const g = GAMES[id], t = practice ? ctx.practice : tour ?? state.today(), text = INTRO[id];
  const steps = id === 'renk' && layout().wide ? text.steps.map(s => s.replace('parmağını gezdir', 'fareyi sürükle')) : text.steps;
  const pos = t.set.indexOf(id);
  const label = pos >= 0 ? `Oyun ${pos + 1} / ${t.set.length}` : 'Deneme';

  app.setAttribute('style', gvars(g));
  app.innerHTML = `${gameBar(t, id)}
    <div class="intro">
      <div class="gicon big">${ICONS[id]}</div>
      <div class="no">${practice ? `Antrenman · ${label}` : tour ? `Turnuva · ${label}` : label}</div>
      <h2>${g.ad}</h2>
      <p class="lead">${text.lead}</p>
    </div>
    <ol class="steps">${steps.map(s => `<li><span>${s}</span></li>`).join('')}</ol>
    ${tour ? `<div class="ft">Kalan süre <b id="tl">${clock(tour.msLeft())}</b></div>` : ''}
    <button class="btn go" id="ready">Hazırım!</button>`;

  if (tour) {
    bindGameBar(state, () => { if (confirm('Turnuvadan ayrılmak istiyor musun?')) tour.leave(); });
    $('ready').onclick = () => tour.startGame();
    const timer = setInterval(() => { $('tl').textContent = clock(tour.msLeft()); }, 1000);
    ctx.bag.add(() => clearInterval(timer));
    return;
  }
  bindGameBar(state, () => go('home'));
  $('ready').onclick = () => {
    if (!practice) state.startGame(id);
    go('play', { id, practice });
  };
}
