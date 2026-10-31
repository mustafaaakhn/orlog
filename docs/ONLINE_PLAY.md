# Çevrim içi oyun

## Çalıştırma

```sh
npm ci
npm run dev
```

İki ayrı sekmede veya aynı ağda iki cihazda oynanabilir. İkinci cihaz için
`npm run dev -- --host 0.0.0.0` ve terminaldeki Network adresi kullanılır.
İnternet üzerinden oyun için erişilebilir Node.js/WebSocket hosting gerekir.

Üretimde `npm run build` ardından `npm start` çalıştırılır. Varsayılan port
3000; `HOST` / `PORT` ile değiştirilebilir. `GET /health` yanıtı `ok` olur.
`npm run preview` oda sunucusunu çalıştırmaz.

## Oyuncu akışı

1. İki oyuncu Arkadaşınla seçeneğini açar.
2. Kurucu Oda kur ile dört rakamlı kodu paylaşır; diğeri Odaya katıl ile girer.
3. Kurucu iki kişi bağlıyken oyunu başlatır.
4. Her oyuncu kendi adını ve üç tanrısını seçer; ortak yazı turadan sonra oynar.

Kurallar ve zar sonuçları sunucudadır. Her oyuncu yalnız kendi koltuğuna ait
komutları gönderebilir. Maç sonunda Yeni oyun odayı koruyup son tanrılar seçili
olarak hazırlığı açar; iki oyuncunun onayı gerekir.

## Mobil seçim ve onay

Son seçim değişikliğinden 2000 ms sonra seçim tek toplu komutla sunucuya
gider. Seçimi onayla daha erken basılırsa süre beklenmez. Mevcut onay komutu,
seçim sunucuda kabul edildikten ve iki masanın sunumu tamamlandıktan sonra
bir kez gönderilir. Sadece sürenin dolması zar atmaz veya sıra geçirmez.

Sunucu koltuk, faz, maç kimliği ve revision denetimini korur. Eski/reddedilen
istekte istemci yetkili durumu yeniden alır; önceki taslakla onay göndermez.
Tekrar mesajı ikinci taşıma/onay oluşturmaz. Rakibin seçimi kendi yerel
taslağından değiştirilmez.

Cihaz çevrim dışı olduğunda bekleyen taslak iptal edilir ve Socket.IO
bağlantısı kapatılır; çevrim içi dönüşte aynı koltuk güncel snapshot ile
açılır. Kaybolmuş kabul cevabı komutun tekrar gönderilmesine yol açmaz.

## Bağlantı ve sınırlar

- Kısa kopmada koltuk iki dakika korunur; yenilemede aynı sekme geri dönebilir.
- Paylaşılan oda kodu dolu koltuğu ele geçirmeye yetmez; özel oturum paylaşılmaz.
- Odadan ayrılmak veya ana menüye dönmek iki oyuncu için odayı kapatır.
- 30 dakika komut gelmeyen odalar temizlenir; tek süreçte en fazla 500 oda vardır.
- Odalar bellektedir; sunucu yeniden başlatıldığında kaybolur.
- Çoklu sunucu, hesap, kalıcı maç geçmişi ve genel eşleştirme bulunmaz.
- Gizli sekme veya açık yardımcı pencere diğer oyuncuyu sunum onayıyla bekletmez;
  insan oyuncunun kendi hamlesini vermesi gerekir.
