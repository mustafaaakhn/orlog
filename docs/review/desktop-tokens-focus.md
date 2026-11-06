# Masaüstü jeton incelemesi ve çevrim içi dönüş

Tarih: 6 Kasım 2026.

## Sekme / uygulama dönüşü

Odak ile güncel snapshot aynı Vue güncellemesinde geldiğinde eski zar
konumları korunabiliyordu. Ayrıca son arka plan paketinin microtask'ı henüz
çalışmadan odak gelirse paket görünür animasyon kuyruğunda kalıyordu.

- Oturum, arka plandan çıkmadan son paketi tamamlayıp sunum onayını gönderir.
- Sahne odak değişimini bütün prop'lar güncellendikten sonra okur; bekleyen
  sunum yokken mevcut zarları ve kaynakları birlikte eşitler.
- Regresyon testleri önce iki hatayı üretti, düzeltmeden sonra geçti.
- Chrome'da iki gerçek Socket.IO oyuncusuyla atış sırasında blur/focus,
  ardından seçim onayı kontrol edildi; iki koltukta bekleme kilidi açıldı.
- Odak ve son ağ paketi aynı işte verilerek dönüş ayrıca zorlandı: yeni zarın
  görünürlüğü/yüzü doğruydu, pending temizdi ve aynı canvas korunuyordu.

Bu kontrol yerel WhatsApp uygulamasını açmaz; Chrome'da uygulama geçişinin
blur/focus olayları ve eşzamanlı ağ/odak güncellemesi kontrollü üretilmiştir.

## Jeton incelemesi

- Masaüstünde her rezerv gerçek 3B sınırlarına bağlı, en az 44px hedefe sahiptir.
  Hover/klavye odağı ilgili yığını vurgular; isim, simge ve tam sayı gösterilir.
- Tooltip üzerine geçiş bilgiyi kapatmaz. Ayrılma ve Escape kapatır.
- Chrome'da 1024×768, 1440×900 ve 1920×1080, iki koltuk/rezerv, 0/12/43/123/300 jeton,
  klavye odağı ve İngilizce/Türkçe/Fransızca/Almanca metinler kontrol edildi.
- Yığın büyüdüğünde hedef sınırları yenilenir; hover grup konumuna yazmaz.
  390×844 ve 844×390 mobilde yeni masa hedefleri yoktur; mevcut kaynak satırları
  korunur. Geri genişletildiğinde masa hedefleri tekrar oluşur.
- Bileşen testi, bekleyen nihai jeton miktarının erken gösterilmediğini ve
  mevcut sunum temaslarıyla 12 → 11 → 0 değişimini doğrular.
- Tarayıcı kontrollerinde yakalanan uygulama hatası yoktur. Yerel görüntüler
  `output/desktop-resume/` altındadır ve Git'e dahil edilmez.

Oyun kuralları ve olayların hasar/jeton hesabı değişmedi. Yeni dış varlık
veya bağımlılık eklenmedi. `npm run check` geçti; `npm run test:ci` sonucunda
53 dosyada 596 test geçti.
