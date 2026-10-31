# Sade mobil masa — roadmap 3–5

31 Ekim 2026. Bu kayıt güncel ROADMAP.md içindeki 3–5. adımları izler;
eski numaralı aşama raporlarının kapanışı anlamına gelmez.

## Adım 3: yakın kadraj

Dokuzlu merkez hattı ile yakın hazne ayrı zarflarla ölçülür; haznenin iki
yanındaki boşluk artık dokuzlu hat kadar geniş varsayılmaz. Dikey kamera
üst yüzleri daha tepeden gösterir. Kısa yatay açı, uzun haznenin yüksekliğini
azaltır. Rakip hazne için kadraj payı eklenmez. Zar/fizik boyutu değişmedi.

390×844 referans HUD boşluğunda merkezdeki 0,88 birim zar genişliği
22,85px → 26,74px; 844×390'da 14,44px → 15,50px oldu. Bunlar sabit
referans boşluğun ölçümleridir; gerçek HUD boyutuna göre sonuç değişir.

Node 24.22.1 ile `npm run check` ve `npm run test:ci` geçti (45 dosya,
555 test). Kamera testleri iki koltukta dokuzlu hatların köşelerini ve
kaynak/hedef temaslarını HUD dışında doğrular. Chromium WebGL'de core'un
ürettiği altışar/dokuzar zar snapshot'ları 360×800, 390×844, 430×932,
844×390 ve 568×320'de açıldı: 10 sahnede izdüşümler HUD boşluğundaydı.
Ekran görüntüleri açılarak incelendi; iki merkez hattı ayrık kaldı.
Kanıtlar Git dışındaki `output/mobile-cleanup/framing.mjs`, `framing.json`,
`six-*.png`, `nine-*.png`, `step3-check.log`, `step3-tests.log` içindedir.

## Adım 4: kartsız savaş

Merkez yüz kartları, merkez başlıkları ve aktif saldırı/savunmayı izleyen
büyük yüzler kaldırıldı. Kendi haznesindeki kartlar alt bölgedeki kimlik
yuvalarında kalır; merkezde yalnız saydam 44px hedef vardır. Sunum
kilidinde merkez hedefi de kaldırılır. 3B `activity-marker` kaynak ve
savunmayı işaretler; mevcut saldırı hareketi ve gerçek can taşı tepkisi
korunur. Combat/core kaynak hesabına veya zaman çizgisine müdahale yok.

`npm run check` ve `npm run test:ci` geçti (45 dosya, 554 test).
Bileşen testleri merkezde simge/değer/onay kartı üretilmediğini, kilitte
hedef kalmadığını, hazne yuvası/taslak davranışını ve masaüstü odağını
korumayı doğrular. Eski sabit merkez kartı testleri yeni davranışa uyarlandı.

Chromium WebGL'de 390×844 / 844×390, iki koltuk ve normal/azaltılmış
hareketle core çözümlemesi oynatıldı. 19 olaylık kayıtta blok, çok değerli
hasar, reaktif iyileşme, kazanım/ödeme/çalma incelendi. Her savaş örneğinde
kart/hedef sayısı sıfır; aktif 3B halkalar yalnız olayın kimliklerindeydi.
Normal harekette saldırganın gerçek konumu değişti. HUD her yayında sunum
durumuyla eşleşti. Normal/azaltılmış kayıtlar ve nihai oyuncu durumları
birebir aynıydı. Duraklatma/devam ve son toplama eski vurgu bırakmadı.
`combat.mjs/json`, `active-*.png`, `finished-*.png`, `step4-*.log`
Git dışındaki aynı kanıt klasöründedir. Aktif savaş ekranları açılarak
incelendi; çalışma zamanı istisnası yoktu.

## Kabul sınırı

Kullanıcı fiziksel cihaz testlerini kendisi yapacağını belirtti.
iPhone/Safari ve Android/Chrome netlik/akıcılık kabulü açık kalır.
IMG_1972–IMG_1975 dosyalarının yeri bilinmediği için özgün fotoğraflarla
karşılaştırma yapılmış sayılmaz; kontrollü sahneler bu karşılaştırmanın
yerini tutmaz. Yeni dış varlık veya bağımlılık eklenmedi.
