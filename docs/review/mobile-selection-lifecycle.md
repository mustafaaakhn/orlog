# Aşama 8 — Onay, çevrim içi oyun ve kesintiler

Tarih: 31 Ekim 2026. Aşama 7'nin tamamlanmış sürümü temel alındı. Kapsam
Aşama 8'dir; Aşama 9'un birleşik tam maç ve fiziksel cihaz kabulüne geçilmedi.

## Uygulama

- Erken **Seçimi onayla** son taslağı hemen tek `SetDiceSelection` ile uygular.
  Kabul cevabı ve seçim sunumu tamamlandıktan sonra bir `ConfirmRoll` gönderir.
  Süre dolarken onay aynı işleme katılır; hızlı tekrarlar ikinci komut üretmez.
  Taslak değişmemişse gereksiz seçim olayı oluşturulmaz. Yeni pencere yoktur.
- Onay düğmesi kendi toplu seçim işlemi sürerken kullanılabilir. Zar seçimi
  mevcut sunum kilidini izler. Onay kuyruğa alınınca tekrar kullanılamaz.
- `rollSession.dispatchAsync`, ağda yalnız kuyruklamayı değil gerçek ACK
  sonucunu verir. Onay hem bu kabulü hem beklenen revision/seçim durumunu
  hem de iki koltuğun sunumunun bitmesini bekler. ACK ve sunumun geliş
  sırası sonucu değiştirmez.
- Sunucunun mevcut maç/koltuk/faz/revision kontrolleri korunur. Red cevabında
  istemci `room:resume` ile yetkili snapshot alır; sırayı eski taslakla
  ilerletmez. Belirsiz/kayıp ACK'de komut tekrar gönderilmez.
- Kopma eski yanıt neslini geçersiz kılar. Tarayıcının `offline` olayı,
  Socket.IO kalp atışı zaman aşımını beklemeden bağlantıyı kapatır; `online`
  olayı aynı koltuğu güncel snapshot ile geri alır. Çevrim dışıyken seçim
  komutu biriktirilmez.
- Güç paneli açılışı, yardım/ayar/çıkış, sekme/odak kaybı, mobil düzenden
  çıkış, sahne kaybı ve bağlantı kesilmesi taslağı/bekleyen onayı temizler.
  İşlem kimliği ve tur/maç/faz/oyuncu/atış/zar bağlamı geç callback'leri
  engeller. Yetkili olarak zaten kabul edilmiş seçim geri alınmaz.
- Mobil içindeki yön değişimi aynı zamanlayıcıyı ve kalan süreyi korur.
  Uzun basma, inceleme ve kaydırma bu süreyi yenilemez. Zar at uygun fazda
  tek eylemdir; süre yalnız seçimi uygular. Üçüncü atışın otomatik saklama
  ve ilerleme davranışı mevcut oturumda kalır.

Core kuralları, olay şeması, bot, fizik kaydı ve animasyon sahipliği
Aşama 8'de değiştirilmedi. Yeni paket veya dış varlık eklenmedi.

## Otomatik doğrulama

Node **24.22.1**:

- `npm run check`: tip denetimi ve üretim derlemesi geçti.
- `npm run test:ci`: **40 dosya, 502 test başarılı**.
- `git diff --check`: geçti.

Yeni senaryolar erken/tekrar onayı, 1999/2000 ms sınırında iki sıralamayı,
ACK ve sunumun iki geliş sırasını, ret/kayıp ACK uzlaşmasını, eski yanıtın
yeni kilidi açamamasını, kesinti ve değişmiş/olmayan zar bağlamını kapsar.
Gerçek iki Socket.IO koltuğunda sahte koltuk, yanlış faz/eski revision,
yinelenen seçim/onay ve sunumu aşmaya çalışan onay reddedilir; tek seçim
ve tek saklama olayı oluşur. Üçüncü atış, değişmeyen seçim ve klavye
navigasyonunun süreyi yenilememesi de doğrulandı. Mevcut yeniden maç/oyun/
bot/sunum testleri geçti. Vite'ın mevcut uzantı ve büyük parça uyarıları sürer.

## Tarayıcı doğrulaması

macOS Playwright / Chromium **143.0.7499.4** ile gerçek WebGL masa ve UI
komutları kullanıldı. Kesin süre sınırları sahte saat testlerindedir;
gerçek zamanlı tarayıcı ölçümleri bu sınır testlerinin yerine geçmez.

| Senaryo | Sonuç |
| --- | --- |
| 390×844, erken ve üç hızlı onay | Beş zar tek seçim komutuyla uygulandı; ardından bir onay gönderildi ve beşi kilitlendi |
| 390×844, normal hareket / normal sunum hızı | Gerçek fizik atışı sonrası erken onay; seçim taşıması boyunca onay bekledi. Seçim ve onay gönderimi arasında yaklaşık 589 ms vardı |
| Güç, ayar, yardım paneli | Bekleyen taslak hemen temizlendi; 2100 ms sonra seçim komutu yoktu |
| 390×844 → 1440×900 | Mobil taslak iptal edildi; eski süre komut göndermedi |
| 390×844 → 844×390 | 1000 ms sonra yön değişiminde taslak korundu; ilk seçimden ölçülen 2000 ms'de yalnız bir toplu seçim, aynı sıra/faz |
| WebGL context kaybı / yeniden kurma | Taslak temizlendi; yeniden yükleme sonrasında gecikmiş seçim yoktu |
| CDP uzun basma, sürükleme, kısa dokunma, Enter | Uzun basma yalnız bilgi, sürükleme komutsuz; sonraki dokunma ve Enter son seçimi bir kez onayladı |
| 568×320 dar zar listesi | CDP kaydırmasıyla `scrollTop` 0 → 7, içerik 92px / görünür alan 85px; kaydırma taslak oluşturmadı |
| Çıkış → yeni yerel maç | Yeni maç revision 0 ve taslak boş kaldı; eski seçim süresi yeni maça işlemedi |
| İki gerçek ağ istemcisi, 844×390 kurucu / 390×844 misafir | Erken tekrar onayı tek seçim + tek onay oluşturdu. Seçim ACK'si onaydan önce geldi; iki istemcinin revision, faz, yüz ve kilitleri eşleşti |
| İkinci ağ koltuğu, süre dolarken onay | Sürenin başlattığı işleme onay eklendi; bir seçim + bir onay |
| Eski revision ile gerçek sunucu reddi | Yetkili snapshot alındı, revision aynı kaldı, taslak temizlendi; `ConfirmRoll` gönderilmedi |
| Gerçek tarayıcı ağını offline/online yapma | Bağlantı kesildi ve taslak temizlendi; 2300 ms boyunca seçim gönderilmedi. Aynı oda/koltuk güncel revision ile geri geldi |

Ağ akışında iki HUD'un sayıları mevcut sunum durumuyla karşılaştırıldı;
uyuşmazlık yoktu. Kontrol edilen sayfalarda çalışma zamanı hatası görülmedi.
Ekran görüntüleri açılarak incelendi; merkez yüzleri/jeton işaretleri,
kaynaklar ve eylemler kullanılabilir kaldı.

Google Chrome **156.0.8078.74**, ayrı geçici profilde ve odak benzetimi kapalı
bağlantıyla ayrıca denendi. Gerçek başka sekmeye geçişte `document.hidden`
true oldu, taslak temizlendi ve 2300 ms boyunca komut gönderilmedi. Dönüşte
aynı canvas, aynı revision ve boş taslak korundu.

## Kanıtlar ve kalan kabul

Git dışındaki `output/mobile-selection-lifecycle/` içinde:

- `driver.mjs`, `local.mjs`, `online.mjs`, `visibility.mjs`, `extra.mjs`.
- `local.json`, `online.json`, `visibility.json`, `extra.json`.
- `early-*.png`, `cancel-*.png`, `orientation.png`, `webgl-return.png`,
  `online-*.png`, `visibility-return.png`, `normal-*.png`, `overflow-scrolled.png`.
- `check.log`, `tests.log`.

CDP dokunması ve ekran boyutu benzetimi fiziksel iPhone/Safari veya
Android/Chrome testi değildir. Fiziksel dokunma, gerçek tarayıcı çubukları,
cihaz performansı ve Aşama 9'un bot/yerel/ağ tam maç–sonuç–yeniden maç
kabulü bu teslimde yeniden yapılmadı. Aşama 4–5'in fiziksel maddeleri ve
Aşama 9 maddeleri açık bırakıldı. Cihaz yönergesinin seçim/onay adımı güncel
akışa uyarlandı; fiziksel sonuç kaydı doldurulmadı.
