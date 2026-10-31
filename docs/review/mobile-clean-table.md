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

## Kabul sınırı

Kullanıcı fiziksel cihaz testlerini kendisi yapacağını belirtti.
iPhone/Safari ve Android/Chrome netlik/akıcılık kabulü açık kalır.
IMG_1972–IMG_1975 dosyalarının yeri bilinmediği için özgün fotoğraflarla
karşılaştırma yapılmış sayılmaz; kontrollü sahneler bu karşılaştırmanın
yerini tutmaz. Yeni dış varlık veya bağımlılık eklenmedi.
