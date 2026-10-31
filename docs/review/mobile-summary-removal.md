# Aşama 6 — Rakip hazne özetini kaldırma

Tarih: 30 Ekim 2026. Kapsam yalnız ROADMAP Aşama 6'dır. İki saniyelik toplu
seçim, zamanlayıcı ve yeni onay/ağ yaşam döngüsü bu teslimde uygulanmadı.

## Uygulama

- `OpponentDiceSummary`, inceleme açılır alanı ve özel CSS kuralları kaldırıldı.
  Bileşen DOM'a kurulmadığı için gizli düğme veya ikinci dokunma hedefi kalmaz.
- `useTableInsets` artık özeti ölçmez veya gözlemlemez. Dikeyde kaynak/ağ
  bildirimi ile alt eylemler arasını, kısa yatayda kaynak sütununun sağını
  kullanır. Özete göre aşağı itilmiş ağ bildirimi eski kaynak yerleşimine döner.
- Mevcut yakın hazne/iki merkez sırası kamera hesabı korunur. Dikey varsayılan
  üst boşluk da özetsiz düzene uyarlandı. Masaüstü tam masa hesabı korunur;
  rakip hazne mobilde ayrıca kadraja sığdırılmaz.
- Mobil `SceneDiceControls` uzak hazne zarlarına hedef üretmez; iki merkez
  sırasının yüzleri, altın jeton işaretleri ve incelemesi aynı kimlikle kalır.
  Tablet/masaüstü iki haznenin mevcut inceleme hedeflerini korur.
- Yalnız özetin kullandığı `useVisibleDice` ve iki özet test dosyası kaldırıldı.
  Ortak olaylar, `presented`/`progress` yayınları, `collected`, kaynak sunumu,
  fizik/GSAP sahipliği, core ve bot kodu değiştirilmedi.
- Güç paneli hedeflerini kamera hedeflerinden bağımsız olarak mevcut
  `FavorPicker` ve core doğrulamasından almaya devam eder. Haznede kalan
  geçerli zarlar seçilebilir; kaldırılmış zarlar listelenmez.

## Otomatik doğrulama

Node **24.22.1**:

- `npm run check`: tip denetimi ve üretim derlemesi geçti.
- `npm run test:ci`: **35 dosya, 459 test başarılı**.
- `git diff --check`: geçti.

Mevcut hedef testleri iki mobil yön ve iki koltuk için uzak haznenin dışarıda,
merkez hedeflerinin tek ve incelenebilir olduğunu doğrular. Tablet/masaüstü
hazne hedefleri ayrıca kapsanır. Güç paneli testi haznede kalan Frigg/Loki
hedeflerini, kaldırılmış zarın dışlanmasını ve gönderilen kimlikleri doğrular.
Kamera testleri özetsiz üst boşlukla yakın hazneyi, dokuz zarlık merkez
sıralarını, çözümleme temas alanlarını ve masaüstüne dönüşü kontrol eder.
Test sayısının azalması yalnız özet testlerinin kaldırılmasından kaynaklanır.
Vite'ın mevcut uzantı ve büyük derleme parçası uyarıları devam eder.

## Tarayıcı kontrolü

macOS / Playwright Chromium **143.0.7499.4**, gerçek WebGL masa ve UI
komutları kullanıldı. Yerel iki oyuncuyla ilk atışlar ve merkez seçimleri
yapıldı; iki koltuk da yakına geldi. Boyutlar arasında aynı masa korundu.

| Görünüm | Kontrol / sonuç |
| --- | --- |
| 360×800, 390×844, 430×932 | Özet/inceleme DOM'u yok; üst kaynak satırının sonu 160px, kamera boşluğu 172px'te başlıyor. Boş özet şeridi yok; kendi hazne ve merkez hedefleri 44×44px, sayılar ve ana eylemler görünür |
| 844×390 | Kaynaklar solda, masa sağda; iki merkez sırası ve yakın hazne kullanılabilir. Rakip merkez zarı incelenir; uzak hazne düğmeleri yok |
| 568×320 | Mevcut dar alan yedeği çalışır; yedi hedef 44×44px olarak kaydırılabilir alanda korunur, eylemler erişilebilir |
| 768×1024, 1440×900 | Tam masa, iki haznenin 12 inceleme hedefi, mevcut eylem düzeni; mobil kaynak/panel tetikleyicileri gizli |
| 390×844 ve 844×390, normal hareket | Gerçek fizik kaydıyla atış, merkeze seçim, koltuk dönüşü, seçimi geri alma; merkezdeki rakip Ok yüzünün altın jeton işareti ve Jeton getirir incelemesi korundu |
| Güç paneli, 390×844 | Frigg'in 12 ve Loki'nin 6 hedefi listelendi; gereken hedefler seçilince Gücü onayla etkinleşti |

Bütün boyutlarda sayfa yatay taşması yok. Normal hareket akışındaki 7 durum
bildiriminde HUD can/jeton sayıları mevcut sunum durumuyla eşleşti; tarayıcı
çalışma zamanı hatası görülmedi. Azaltılmış hareket de kullanıldı. Bir tam
maç veya iki ağ istemcisi kabulü bu aşamada yeniden yapılmadı; mevcut ağ ve
bot senaryoları zorunlu test paketinde geçti.

## Kanıtlar ve sınırlar

Git dışındaki `output/mobile-summary-removal/`:

- `review.mjs`, `driver.mjs`, `review.json`: yedi boyutun ölçümleri ve panel kontrolü.
- `normal.mjs`, `normal.json`: normal hareket, jeton işareti, geri alma ve HUD karşılaştırması.
- `table-*.png`, `panel-frigg.png`, `panel-loki.png`, `normal-gold-*.png`.
- `check.log`, `tests.log`: zorunlu komutların çıktısı.

Bu kontroller ekran boyutu benzetimidir. Fiziksel iPhone/Safari,
Android/Chrome, gerçek dokunma, cihaz performansı ve gerçek güvenli alanlar
bu teslimde test edilmedi. Aşama 4–5'in fiziksel kabul maddeleri açık kalır.
Cihaz yönergesindeki rakip özeti ifadesi merkez zarı incelemesine uyarlandı;
Aşama 7–9 ve fiziksel cihaz maddeleri işaretlenmedi.
