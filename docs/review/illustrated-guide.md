# İki sayfalı, örnekli oyun rehberi

31 Ekim 2026. Mevcut “Masaya ilk kez mi oturuyorsun?” penceresi genişletildi.
Oyun kuralları, komutlar, sunum ve ses zamanlamaları değişmedi.

## İçerik ve kullanım

İlk sayfa amaç/başlangıç, üç atış, seçim–onay farkı, altın çerçeve,
güç seçimi/ödeme, savaş sırası ve yeni turu anlatır. Çerçeveli miğfer ve
Thor seviye 1 ayrıca görselleştirilir. Mobil 2 saniye, uzun basma/F1 ve
klavye açıklamaları isteğe bağlı ayrıntıdır.

İkinci sayfa kendi zarların → rakibin savunması/jetonları şemalarını içerir:
2 balta/1 miğfer, 2 ok/1 kalkan, balta/kalkan yanlış eşleşmesi, 2 el/3 jeton.
× işareti engelleneni belirtir; sonuç hem sayıyla hem cümleyle anlatılır.
Şemalar dekoratiftir; ekran okuyucu açıklamayı iki kez duymaz.

İçerik kayarken başlık/Kapat, sayfa düğmeleri ve alt gezinme yerinde kalır.
Sayfa değişimi içeriği başa alır ve başlığa odaklanır. Kapat, Escape ve
Anladım mevcut modalı kapatır; yeniden açıldığında ilk sayfa gelir.
Türkçe, İngilizce, Fransızca ve Almanca için 42 mesaj eklendi.

## Doğrulama

Node 24.22.1 ile `npm run check`, `npm run test:ci` (47 dosya, 575 test)
ve `git diff --check` başarılıdır. Yeni senaryolar sayfa/odak/scroll/kapatma,
aktif sayfada dil değişimi, dört temel eşleşme ve çerçeveli miğferi kapsar.
Sabit öğretici sayılar mevcut core çözümlemesiyle karşılaştırılır; temel
örneklerde çerçevesiz yüzler seçilerek ek jeton etkisi ayrılır. UI içinde
ikinci bir saldırı/jeton hesaplayıcı yoktur.

Chromium'da dört dil × 320×720 / 390×844 / 768×1024 / 1440×900 /
844×390 / 568×320 ile 24 senaryo geçti. İki sayfa, alt/üst gezinme,
son içeriğe kaydırma, odak, Kapat/Escape/Anladım, yeniden açma ve ardından
ses ayarlarının normal modal görünümü kontrol edildi. Düğmeler en az
44px; yatay taşma yoktu. Başlık/Kapat ve alt gezinme ekran içindeydi.

Her dilde 390×844 gerçek WebGL maçında ilk atış yapılıp bekleyen bir
seçim varken rehber açıldı. İki sayfa gezildi, 2 saniyelik süre aşıldı;
mevcut kesinti yolu taslağı iptal etti ve rehber oyun durumunu değiştirmedi.
Kapatma sonrası aynı faz, revision, zar yüzleri, can ve jetonlar korundu.
Son metin düzeltmesinden sonra dört dilde dikey akış tekrar geçti.

Dikey Türkçe örnekler, geniş Türkçe tur akışı ve kısa yatay Almanca
sayfası açılarak görsel olarak incelendi. Başarılı koşularda çalışma
zamanı istisnası yoktu. Yeni dış varlık veya bağımlılık eklenmedi.

Kanıtlar Git dışında `output/game-guide/`: `browser.mjs`, `browser.json`,
`browser-smoke.json`, `flow-*.png`, `examples-*.png`, `bottom-*.png`,
`in-match-*.png`, `check.log`, `tests.log`. Fiziksel telefon testi veya
yayın yapılmış sayılmaz.
