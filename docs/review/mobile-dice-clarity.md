# Mobil roadmap — 2. adım: 3B zar netliği

31 Ekim 2026. Otomatik mobil çizim sınırı 1,25× → 1,75×; yüksek kalite
2× oldu. Düşük kalite 1× ve masaüstü değerleri korundu. Dinlenen mobil üst
yüzün dokusu 256px → 512px; semboller daha büyük, daha koyu ve daha kalın.
Altın çerçeve korunur, küçük köşe işareti sembolden ayrılır. Malzemenin
emisyonu aynı doku maskesini izler. Mipmap/doğrusal süzme korunur; mobil
anizotropi 8× isteği gerçek donanım sınırıyla kısılır. Yeni varlık yoktur.

## Görsel ve teknik karşılaştırma

Chromium 143.0.7499.4 / WebGL / 3× ekran yoğunluğu benzetimi. Core’un
ürettiği 12 merkez zarıyla 390×844 ve 844×390’da 1,25×, 1,75× ve 2×
karşılaştırıldı. Altı ekran görüntüsü ve beş sembolün normal/altın yüzlerini
birlikte gösteren doku levhası açılarak incelendi. 1,75× belirgin kenar ve
mürekkep ayrımı sağlar; 2× ek örnekleme sunar. Sembol çerçeveye/köşe
işaretine taşmıyor. Küçük yatay zarın ekran boyutunu DPR tek başına çözmez.

390×844 çizim tamponları sırasıyla 487×1055, 682×1477 ve 780×1688 oldu.
844×390’da boyutlar tersine döndü. Her koşulda donanım kenar yumuşatması
etkindi (bu GPU’da 4 örnek); mobil haritalar 512px, mipmap’li ve maskeliydi.
Isınmadan sonraki 60 tekrar çizimde `render` + `gl.finish()` ortancası
0,5–0,6 ms, p95 0,7–0,8 ms idi. Bu masaüstü ölçümü telefon FPS’i değildir.

Normal hareketli gerçek atış + üçlü seçim akışı da iki kalitede çalıştı.
Bu paylaşılan headless koşuda meşgul kareler arasındaki rAF ortancası
1,75× için 130,8 ms (p95 154,7), 2× için 196 ms (p95 267,4) oldu;
ikisinde de seçim olayı ve üç merkez hedefi doğru tamamlandı. Bu koşu
60 FPS kabulü sağlamaz ve telefon akıcılığına genellenemez. 2× yaklaşık
%31 daha çok piksel çizdiğinden, varsayılan 1,75×; 2× isteğe bağlı kaldı.

390×844, 844×390, 768×1024 ve 1440×900 üzerinde düşük/yüksek/otomatik
kalite değişimleri canlı renderer tamponunda doğrulandı; mobil/masaüstü
geçişi doğru sınırı kullandı. Çalışma zamanı istisnası yoktu.

Node 24.22.1 ile `npm run check`, `npm run test:ci` (45 dosya, 557 test)
ve `git diff --check` geçti. Kozmetik değişiklik için yapay test eklenmedi.
Kanıtlar Git dışında `output/mobile-steps/`: `clarity.mjs/json/log`, altı
`clarity-*.png`, `mobile-face-sheet.png`, `motion-quality.mjs/json/log`,
`motion-auto.png`, `motion-high.png` ve doğrulama günlükleri.

Fiziksel iPhone/Safari ve Android/Chrome netlik/akıcılık kabulü açık kalır;
bu rapor roadmap’in fiziksel cihaz kabulü olan 5. adımını tamamlamaz.

Diğer işin `main` üzerindeki tamamlanmış kartsız savaş değişiklikleriyle
birleşik durumda `npm run check` ve 556 test de geçti. 390×844 / 844×390
dokunmayla seçim–geri alma ve 768×1024 / 1440×900 klavye odağı yeniden
kontrol edildi; istisna yoktu (`combined-*.log`, güncel `step1-extra.json`).
