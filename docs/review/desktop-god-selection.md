# Masaüstü tanrı kataloğu yerleşimi

Tarih: 1 Kasım 2026.

Kullanıcının ekran görüntüsündeki büyük üst başlık, yatay özellik şeridi ve
kartın tamamına gerilen portreler katalog için az dikey alan bırakıyordu.

## Uygulama

- Masaüstü hazırlık başlığı, gezinme ve araç şeridi küçültüldü.
- Özellikler sağda, oyuncu adı ve kuşanılmış tanrıların altında gösteriliyor.
- Kartlar kare tam portre, ad ve güç özeti için ayrı alanlar kullanıyor.
- Geniş görünüm beş, orta görünüm dört, dar dizüstü üç sütun kullanıyor.
  Kartlar arasındaki boşluk ve kısa ekran portre boyutu birlikte ayarlanıyor.
- Katalog ve sağ panel bağımsız kayıyor; alt eylem görünür kalıyor.
- Mevcut seçim, sınır, hazır olma ve mobil bilgi kartı davranışı korunuyor.

## Kontroller

- `npm run check`: tip denetimi ve üretim derlemesi başarılı.
- `npm run test:ci`: 49 dosyada 580 test başarılı. Kozmetik değişiklik için
  yeni yapay test eklenmedi.
- Chrome: 1920px geniş görünümde beş sütun ve iki tam sıra; 1440×900'de
  dört sütun; 1280×720'de dört ve 1024×768'de üç sütunda iki tam sıra.
- Türkçe ve İngilizce metinler, üç tanrı seçili durum ve üç güç seviyesi
  kontrol edildi. Başlık, katalog ve alt eylem birbirini örtmüyor.
- Kataloğun sonuna kaydırıldığında son dört tanrı erişilebilir; sağ panel
  ve alt eylem sabit yerlerinde kalıyor. Seçim sınırı korunuyor.
- 390×844 mobilde iki sütun ve alttan bilgi kartı kontrol edildi; seçim
  sınırındaki salt inceleme çalışıyor. Masaüstüne dönüş bilgi kartını kapatıyor.

Yerel görsel kayıt `output/desktop-god-selection/desktop.png` altında;
Git'e dahil değildir.
