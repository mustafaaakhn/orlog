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
komutları gönderebilir. Maç sonunda Yeni oyun odayı koruyup boş tanrı
hazırlığını açar; iki oyuncunun üç yeni tanrı seçip onaylaması gerekir.
Her koltuğun bu lobide kullandığı tanrılar yalnız kendisine kilitlidir.
Sunucu bu listeleri yeniden bağlanmada korur ve yasak tanrılı hazır isteğini
reddeder. Üç tanrı kalmadığında kişisel havuz yenilenir; yeni oda temiz başlar.

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

## Hazırlığı geri alma

Tanrı hazırlığında tek oyuncu hazırken aynı düğme **Hazır değilim** olur.
Geri almak adını ve üç tanrını korur; düzenleme yeniden açılır. Tekrar
**Hazırım** ile yeni seçim sunucuya verilir. Diğer koltuk güncel durumu görür.
Bu akış aynı odadaki yeniden maç hazırlığında da geçerlidir.

İstek hedef durumu açıkça taşır; tekrarı durumu tersine çevirmez. İsim/tanrı
alanları ve düğme yanıt beklerken veya bağlantı yokken kilitlenir. Etiket
yalnız sunucunun oda yayını/snapshot'ından değişir. Her hazırlığın ayrı
kimliği vardır; eski oda/maç hazırlığından kalan istek yeni hazırlığa yazamaz.
İki hazır onayı önce kabul edilmişse yazı tura/maç aşamasına geçilir; geç
geri alma reddedilir ve istemci yetkili durumla uzlaştırılır. Geri alma önce
kabul edilirse diğer oyuncunun hazır olması tek başına maçı başlatmaz.
