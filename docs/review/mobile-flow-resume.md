# Mobil etkileşim ve sekmeye dönüş doğrulaması

Tarih: 1 Kasım 2026. Kullanıcının beş geri bildirimi birlikte ele alındı.

## Değişiklikler

- Mobil masa tanrılarının seçim/önizleme hedefleri kaldırıldı. Maç içindeki
  Tanrı gücü paneli korunuyor; masaüstü levhaları çalışmaya devam ediyor.
- Tres tuvalinin inline `touch-action: none` değeri `pinch-zoom` ile geçersiz
  kılındı. Zar hedefleri de pinch hareketine izin veriyor; kaydırılabilir zar
  listeleri `pan-y pinch-zoom` kullanıyor. Mobil girişlerde en az 16px metin var.
- Sıra rozeti insan eylemi hazırken açık renge geçiyor, Sıra sende diyor;
  rakip sırası oyuncu adıyla belirtiliyor. Ana düğme de vurgulanıyor.
- Katalog kartları genişledi ve araları açıldı. Mobil iki sütun kullanıyor;
  seçilen tanrının üç seviyesi alttan açılan, kapatılabilir kartta gösteriliyor.
- Boşta sekmeye dönüş artık yeniden çizim istiyor. İptal edilen sunumun
  promise'i güncel board senkronizasyonunu bekletemiyor. Eski sahiplik ve
  callback korumaları korunuyor; normal savaş kamera geçişi değişmiyor.

## Otomatik kontroller

- `npm run check`: tip denetimi ve üretim derlemesi.
- `npm run test:ci`: tüm mevcut testler ve beş yeni regresyon senaryosu.
- İki sahne testi: değişmeyen boş masada dönüşte yeniden çizim; eski animasyon
  promise'i hiç bitmese bile son snapshot ile aynı board'un eşitlenmesi.
- Üç katalog testi: açma/kapatmanın seçim ve hazır komutundan ayrılması;
  üç tanrı sınırında inceleme ve masaüstüne geçiş; kilitli istekte salt inceleme.

## Tarayıcı kontrolü

Yerel üretim sunucusu Chrome'da kontrol edildi:

- 1920px geniş masada ferah katalog, levha hedefleri ve sıra rozeti.
- 390×844 mobilde seçim, kapanınca kaynağa odak dönüşü, üç tanrı, yazı tura,
  masa, zar atışı ve seçim/onay akışı.
- Mobil DOM'da masa tanrısı hedefi sayısı sıfır; canvas hesaplanan
  `touch-action` değeri `pinch-zoom`.
- 844×390 yatay masada kaynaklar, sıra rozeti ve ana eylem birbirini örtmüyor.
  Yatay katalog bilgi kartında Kapat ve üç seviye erişilebilir.
- 360×640 ekranda alttan bilgi kartı; boyut değişimi açık kartı koruyor,
  masaüstüne geçiş kartı kapatıyor ve masaüstü açıklamasını gösteriyor.
- Oyun/atış akışında ve boşta başka sekmeye geçilip geri dönüldü. Mevcut
  masa yeni atış beklemeden çizildi; yükleme/yeniden kurma paneli oluşmadı.

Yerel görüntüler `output/mobile-flow-resume/` altında; Git'e dahil değildir.
Gerçek iPhone/Safari ve Android/Chrome pinch hareketi bu bilgisayarda
fiziksel olarak denenmedi. Tarayıcı boyutu benzetimi cihaz kabulü sayılmadı.
Gerçek WebGL context kaybı mevcut ayrı hata/toparlanma akışındadır; bu
kontrol normal odak ve sekme dönüşünü kapsar.
