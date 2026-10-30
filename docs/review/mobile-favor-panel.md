# Mobil güç paneli doğrulaması

Tarih: 30 Ekim 2026. Kapsam: ROADMAP Aşama 2; kamera ve zar okunurluğu
Aşama 3–4 kapsamındadır. Fiziksel telefon kullanılmadı.

## Otomatik doğrulama

- Node 24.22.1: `npm run check` ve `npm run test:ci` geçti; 33 dosyada
  439 test başarılı. Doğrulama, Aşama 1 HUD'unu içeren birleşik sürümde yapıldı.
- Sekiz yeni DOM/Vitest senaryosu: açma/inceleme/kapatma ve odak dönüşü;
  sıfır jetonla yüksek seviye onayı; Frigg'in iki taraftan hedef seçmesi;
  Loki'nin yalnız rakip hedefleri; Odin can fedası ve Freyr çoğunluk girdisi;
  tek tanrı taslağı; sıra/sunum kilidi; kaynak değişiminde açık panel ve güncel
  sunum jetonu; Escape/dış alanın komutsuz kapanması ve yalnız açık eylemle pas.
- `happy-dom` yalnız test bağımlılığıdır. Native modalın arka planı etkisiz
  bırakması ve gerçek odak davranışı ayrıca Chromium'da kontrol edildi.

## Tarayıcı doğrulaması

macOS Chromium 143, Playwright ile fare/klavye ve viewport benzetimi.
Yerel iki kişilik gerçek 3B masa açıldı, iki tarafın üçer normal atışından
sonra güç fazına geçildi. Azaltılmış hareket ve hızlı sunum kullanıldı.

- 360×800, 390×844, 844×390: panel ekran sınırlarında; yatay taşma yok.
  Liste kendi içinde kayıyor; başlık/Kapat ve uygun sırada pas eylemi sabit.
  Panel kapalıyken Tanrı gücü düğmesi ve kaynak HUD'u örtüşmüyor.
- Üç tanrının bütün bedel/etkileri ve mevcut jeton görülebiliyor. Rakip ve
  sıra dışındaki kendi tanrıları salt okunur; inceleme ve kapatma revision'ı
  değiştirmiyor. Normal zar seçimi sırasında panel açılıp alttaki zar
  koordinatına tıklandı; revision ve seçim değişmedi.
- Frigg'in yüksek seviyesinde iki taraftan dört hedef işaretlendi; eksik
  hedefte onay kilitli, tam hedefte açık. Escape taslağı kapatıyor, odağı açan
  düğmeye döndürüyor. Kapat ve dış alana basıp bırakma da aynı yolu kullanıyor.
- Frigg 3. seviye sıfır jetonla onaylandı; tek `FavorChosen` üretildi.
  İkinci yerel koltuk açıldı, rakip salt okunur incelendi; açık pas eylemiyle
  çözümleme başladı. Ödeme sırasında core `FavorFailed(reason: tokens)` üretti;
  tur 2 otomatik açıldı. Seçim/bütçe ve sunum sırası korundu.
- 1440×900: mobil düğme gizli; fiziksel levhadan mevcut masaüstü menüsü açılıp
  Escape ile kapanıyor. Yeni mobil panel masaüstü yerleşimini değiştirmiyor.

Ekran görüntüleri yerel `output/mobile-favor-stage2/` altında: `portrait-inspection.png`,
`portrait-targets.png`, `panel-360x800.png`, `panel-390x844.png`,
`panel-844x390.png`, `hud-360x800.png`, `hud-390x844.png`, `hud-844x390.png`,
`desktop.png`, `desktop-favor-menu.png`, `round-2.png`.
Bu çıktı dizini Git dışındadır.

## Açık sınırlar

Gerçek iPhone/Safari, Android/Chrome, fiziksel dokunma, güvenli alan/tarayıcı
çubuğu davranışı ve donanım performansı bu incelemede doğrulanmadı. Bunlar
Aşama 5'te açık kalır. Bu teslim tam mobil kabul veya çevrim içi tam maç
kabulü değildir; mevcut komut/ağ testleri korunmuştur.
