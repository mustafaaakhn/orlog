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

## Adım 5: istenen zarı geçici inceleme

Merkezde uzun basma yalnız basılan kimliğin büyük yüzünü, etki değerini ve
bilgisini açar. Salt okunur merkeze kısa dokunma ve odak otomatik bilgi
açmaz; F1 veya salt okunur hedefte Enter/Space açık klavye isteğidir.
Kapat/Escape ve dışarı dokunma geçici bilgiyi temizler. Eski dokunma
kimliği sonradan klavye seçimine taşınmaz. Kısa yatayda bilgi içeride
kaydırılır, 44px Kapat bilgi yüzeyinin üstünde sabit kalır.

`npm run check`, `npm run test:ci` (45 dosya, 558 test) ve
`git diff --check` geçti. Testler tek bilgi penceresini, seçim üretmeyen
uzun basmayı, kilit/iptali, salt okunur kısa dokunmayı, açık F1/Escape
isteğini ve tüketilen dokunmadan sonra klavye kimliğini kapsar.

Chromium WebGL/CDP dokunma ile 390×844, 844×390 ve 568×320'de beşli
seçim → uzun basma → Kapat → beşli geri alma → erken onay geçti. Beklerken
revision değişmedi; tek toplu olay sonrası beş zar merkezdeydi. Saydam
merkez hedefleri 44×44px, simge/değer/onay kartı olmadan görünüyordu.
İnceleme revision/seçimi değiştirmedi. Geri alma altı hazne kartını geri
getirdi. Erken onayda revision 5 ve beş kilitli zar oluştu. HUD durumu
sunumla eşleşti. Kısa ekranda Kapat sınırları ve içerik kaydırması ayrıca
kontrol edildi. İlk kısa yatay otomasyonunda `.tap()` komşunun geniş hedefi
nedeniyle eylem yapılabilirlik kontrolünde durdu; gerçek ekran koordinatına
dokunularak yeniden koşuldu. Uygulamanın pointerdown yakınlık çözümü doğru
kimliği seçti. Birleştirme sırasında geçici HMR hata katmanıyla başlatılan
ilk koşu da son kodun doğrulaması olarak kullanılmadı.

768×1024 ve 1440×900'de klavye tekli seçim, aynı zar odağı, tanrı menüsü,
savaş ve tur 2 akışı geçti. Altışar/dokuzar merkezli 10 kontrollü sahne
son görünümde yeniden açıldı; kendi hazne dışında yüz kartı ve merkez
başlığı yoktu. Ekranlar açılarak incelendi. Kanıtlar `interaction.mjs/json`,
`inspect-*.png`, `returned-*.png`, `desktop.mjs/json`, `desktop-*.png`,
`framing.mjs/json` ve `step5-*.log` içindedir. Son başarılı koşularda çalışma
zamanı istisnası yoktu.

## Kabul sınırı

Kullanıcı fiziksel cihaz testlerini kendisi yapacağını belirtti.
iPhone/Safari ve Android/Chrome netlik/akıcılık kabulü açık kalır.
IMG_1972–IMG_1975 dosyalarının yeri bilinmediği için özgün fotoğraflarla
karşılaştırma yapılmış sayılmaz; kontrollü sahneler bu karşılaştırmanın
yerini tutmaz. Yeni dış varlık veya bağımlılık eklenmedi.
