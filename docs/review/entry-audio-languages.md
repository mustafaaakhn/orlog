# Ses, giriş düzeni ve dört dil

31 Ekim 2026. İstenen dört düzeltme üç yerel iş commit'iyle uygulanır:
ses akışı, bağlantı/mobil hizalama, dil altyapısı. Oyun kuralı, zar sonucu
ve ağ protokolü değişmez. Yeni dış varlık veya paket eklenmedi.

## Ses

Su/ortam döngüsü katalogdan çıkarıldı. FFmpeg sessizlik ölçümü mevcut
müziklerin sonunda 5,23 ve 4,94 saniye sessizlik gösterdi. Bu kuyruklar
Opus paketleri yeniden kodlanmadan kırpıldı. İki parçanın kaynak ve lisans
kaydı ASSETS.md'de korundu.

HTML5 `play()` cevabı beklerken başka seslerin yükleme callback'leri yeni
müzik sesi oluşturabiliyordu. Bekleyen oynatma isteği ve ses kimliği tutulur;
duraklatma/izin sonrası aynı kimlikle sürer. Gecikmiş temaslar tekrar çalmaz.
Ses testleri buna ek olarak sıralı iki parça, eski bitiş olayı, arka sekme,
ses seviyesi, susturma ve yükleme hatası yollarını kapsar.

Chromium'da gerçek Howler nesneleri okundu: ilk parça için tek aktif ses,
ikinci parça için sıfır; ortam kaydı yüklenmedi. Tekrarlı dokunma ek müzik
oluşturmadı. `entry.mjs/json` ilk ses/bağlantı/yerleşim kanıtıdır.

## Bağlantılar ve hizalama

Hakkında paneli yalnız GitHub ve İletişim etiketlerini gösterir; iki bağlantı
`target=_blank`, `rel=noopener noreferrer` taşır. Mail hedefi
`mailto:contact@orlog.games` olur. Gerçek mail uygulamasının açılış biçimini
tarayıcı ve kullanıcının mail işleyicisi belirler.

Ortak span stili simge kutusunu sola yaslıyordu. Mobil simge çerçevesinin
hem iç hem dış hizalaması düzeltildi; kısa yatayda kartlar açıkça iki
sütunlu grid kullanır. 350px ve daha kısa yatayda açıklamalar gizlenir.
360×800, 390×844, 768×1024, 768×390, 844×390, 568×320, 1440×900
kontrollerinde simge/çerçeve merkezleri eşleşti ve sayfa yatay taşmadı.
Ekran görüntüleri açılarak incelendi. Masaüstü kemerli görünüm korunur.

## Diller

Dil listesi English / Türkçe / Français / Deutsch; ilk ziyaret İngilizce,
geçerli saklı tercih sonraki ziyaretin dilidir. Tarayıcı dili seçim yapmaz.
Arayüz, güç adları/açıklamaları, erişilebilir zar bilgisi, ağ/olay metinleri
ve rehber aynı reaktif seçimi izler. Kullanıcı adı, oda kodu ve oyun durumu
çevrilmez. Kısa dil menüsü kaydırılabilir kalır.

Doğrulama ve ekran kanıtları Git dışındaki `output/site-polish/`
klasöründedir. Fiziksel telefon kabulü veya dış yayına alma yapılmadı.

## Son doğrulama

Node 24.22.1: `npm run check`, `npm run test:ci` (46 dosya, 568 test) ve
`git diff --check` başarılıdır. Yeni dil testleri ilk İngilizce varsayımını,
tercih saklama/kapalı depolamayı, belge dilini, aynı DOM'da canlı çeviriyi,
parametrelerin korunmasını, bütün sabit UI anahtarlarını ve 20 gücün üçer
seviye açıklamasını kapsar. Mevcut Türkçe etkileşim testleri açıkça Türkçe
seçilerek çalışır; üretim varsayımı test ortamına göre değiştirilmez.

Chromium'da dört dil × 390×844 / 844×390 / 568×320 / 1440×900 olmak
üzere 16 akış geçti. Menü adları kendi dillerindeydi, yalnız bir dil seçiliydi;
seçim ve belge `lang` değeri yenilemede korundu. Hakkında/ayarlar, rakip,
arkadaş katılım doğrulaması ve tanrı hazırlığı bütün boyutlarda incelendi.
Her dilde dikeyde normal hazırlık → yazı tura → maç → zar atma → ikili
toplu seçim → güç inceleme akışı da geçti. Maçta dil değiştirmek oyun
durumunu veya oyuncu adlarını değiştirmedi. Görünen metin ve erişilebilir
ad taramasında kaynak Türkçe UI mesajı kalmadı; kullanıcı adları veri olarak
bu taramadan ayrı tutuldu. Fransızca tanrı hazırlığı, Almanca güç paneli
ve çok kısa yatay kart ekranları açılarak incelendi.

Son görsel kontrolde uzun Almanca başlığın kart kenarını aşması görüldü;
yalnız 350px altı yatay tipografi/boşluk sıkıştırıldı. Dört dilde kısa
yatay akış yeniden geçti; iki kart da kullanılabilir alanın içindeydi.
`languages.mjs/json`, `languages-short.json`, `mode-*.png`, `gods-*.png`,
`match-*.png` bu kontrollerin kayıtlarıdır. Başarılı koşularda çalışma
zamanı istisnası yoktu. İlk otomasyonun masaüstünde mobil Oyna etiketini
beklemesi ve adları çevrilmemiş UI sanması test sürücüsünde düzeltildi.

`playback.mjs/json` gerçek HTML5 oynatıcıda iki kaydın sona yakın konumuna
ilerleyip 1 → 2 → 1 geçişini doğrular. Birinci kayıt 160, ikinci 143 saniyenin
altındadır; ortam yüklenmez. Ses seviyesini sıfırlayıp geri açmak aynı ses
kimliğini ve konumu korur; tek aktif müzik vardır. Dinleme/akıcılık için
fiziksel cihaz sonucu iddia edilmez.
