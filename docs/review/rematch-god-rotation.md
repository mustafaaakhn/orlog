# Yeniden maçta kişisel tanrı havuzu

Tarih: 1 Kasım 2026.

## Davranış

- Aynı oturum/lobide kullanılan tanrılar her oyuncu için ayrı birikir.
- Yeni maç insanlara boş seçim açar; kendi kullanılmış tanrıları seçilemez.
  Rakibin seçimleri ortak bir yasak listesi oluşturmaz.
- Bot kendi uygun havuzundan üç farklı tanrı seçer.
- Kullanılmamış tanrı sayısı üçün altına inince kişisel havuz yenilenir.
  20 tanrıyla altı üçlü maçtan sonra yedinci maç temiz havuzla başlar.
- İptal, hazır geri alma ve reconnect geçmişi silmez. Ana menüden yeni
  oturum veya yeni çevrim içi oda temiz havuz açar.

## Doğrulama

- `npm run check`: tip denetimi ve üretim derlemesi geçti.
- `npm run test:ci`: 52 dosyada 591 test geçti.
- Saf kural testleri: kişisel dışlama, rakibin tanrıları, tekrarsız bot
  seçimi, kullanım birikimi ve altıncı maçtan sonra havuz yenileme.
- Yerel oturum testleri: eski maçların kilitleri, reddedilen yeni maçta
  eski durumun korunması, hazırlığın idempotent olması, restart ve altı maç.
- Vue testleri: insanın boş seçimi, botun uygun havuzu, koltuk değişimi,
  karşılıklı tanrı değişimi, mobil incelemenin seçim üretmemesi.
- Gerçek Socket.IO testleri: kişisel yasaklı hazır isteğinin reddi, farklı
  oyuncuların birbirinin tanrılarını alması, birden çok maçın geçmişi,
  sahte istemci kısıtlama alanının etkisizliği, reconnect ve yeni oda sıfırlama.
  Eski maç/paket/sunum onaylarının reddi de korunuyor.

## Tarayıcı

Geliştirme önizlemesi gerçek core/rollSession ile bitirilen maçın
`prepareRematch` çıktısını mevcut MatchSetup bileşenine verdi. Masaüstünde
iki koltuğun kilitleri değişti; oyuncular birbirinin üç tanrısını seçip yeni
maça başladı. Bot modunda botun eski üçlüsü dışından üç farklı tanrı ile
`rollSession.start` kabul edildi.

390×844 mobilde Kullanıldı işareti ve soluk portreler kontrol edildi.
Kilitli tanrı dokunmayla incelendi, seçim sayısı değişmedi; Kapat erişilebilir
kaldı. Havuz/sunucu kuralları bu görsel önizlemeye bırakılmadı; yukarıdaki
oturum ve ağ testleri yetkili doğrulamayı ayrıca çalıştırdı.

Yerel önizleme ve görüntüler `output/god-rotation/` altında, Git dışındadır.
