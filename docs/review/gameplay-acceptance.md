# Aşama 15 — Birleşik oyun kabulü

31 Ekim 2026. **İstenen 13–15 kapsamının yazılım/tarayıcı kontrolü tamamlandı;
Aşama 11–12 bağımlılıkları ve fiziksel cihaz kabulü açık.** Kullanıcı eksik
bağımlılıkların kaydedilmesini, bu işte yalnız 13–15'in uygulanmasını seçti.
Çalışma sırasında ayrı `da2c608` commit'iyle gelen Aşama 10 korundu; botun
toplu seçimi de güncel birleşik sürümde kontrol edildi.

## Bulgu ve düzeltme

Canlı saldırı izdüşümünü yayınlamak için sunum kilidi kaldırılınca sıradan
masaüstü seçim sunumu da hedef listesini boşaltıyordu. Ayrıca dekoratif yüz
etiketi masaüstü düğmesini değiştirebiliyordu. ArrowRight → Enter ile zar
seçiminden sonra odak `body` üzerine düşüyordu; tarayıcı kontrolü hatayı buldu.

Saldırı dışındaki sunum mevcut hedef düğümlerini korur. Canlı salt okunur
izdüşümü yalnız aktif saldırı kullanır; son saldırı karesi bir kez temizlenir.
Yalnız mobil aktif savaş yüzü `span` olur. Masaüstü düğme kimliği kilit boyunca
korunur. Regresyon testi ve 768×1024 / 1440×900 gerçek WebGL tarayıcı
kontrolünde aynı zarın odağı korundu; iki görünümde tur 2 açıldı.

## Otomatik kontroller

Node **24.22.1**:

- `npm run check`: tip denetimi ve üretim derlemesi geçti.
- `npm run test:ci`: **43 dosya, 529 test başarılı**.
- `git diff --check`: geçti.

Core kuralları değiştirilmedi. Ek kabul senaryosu **5 mevcut jeton + 1 altın
çerçeve + 2 çalma** durumunu gerçek resolver ile kurar. 8 bedelli Freyr
seviye 3 savaş öncesinde başarısızdır; 8 bedelli Thor seviye 2 savaş sonrasında
ödenir ve çalışır. Her iki olay kaydı normal/azaltılmış sunumda aynı temas
sırası ve son kaynaklarla biter. Savaş öncesi güce gelecek gelir eklenmedi.

Mevcut Vite uzantı ve büyük derleme parçası uyarıları sürer. Yeni bağımlılık,
dış varlık veya lisans gerektiren kaynak eklenmedi.

## Mobil, masaüstü ve tam maçlar

macOS üzerinde Playwright Chromium **143.0.7499.4**, gerçek WebGL kullanıldı.
Bunlar fiziksel telefon veya gerçek parmak testi değildir.

| Kontrol | Sonuç |
| --- | --- |
| 360×800, 390×844, 430×932, 844×390, 568×320 | Hızlı beşli seçim, sabit 44px hedefler, tek toplu taşıma/geri alma ve erken onay geçti. Rakip hazne özeti yok; yatay sayfa taşması yok |
| 18 zar, aynı beş boyut + 568×280 | Core Freyja olaylarından iki dokuzlu ara durum üretildi. Bütün 18 kimlik ve 44px hedef korundu; 568×280'de grup listesi CDP sürüklemesiyle kaydı |
| Kaldırılan zar | Gerçek Loki olayı sonrası kaldırılan kimlik için hedef yok; kalan 14 hedef korundu |
| 390×844 → 844×390 → 390×844 | Taslak/kalan süre korundu; yaklaşık 2000 ms'de tek seçim komutu, faz/sıra değişmedi |
| CDP uzun basma | Normal/azaltılmış harekette basma toplu taşıma boyunca tutulup bırakıldı; komşu zar seçilmedi, yeni taslak oluşmadı |
| Kontrollü saldırı, beş mobil boyut × iki hareket modu | 10 sunum geçti. Normalde ardışık koordinatlar değişti; dekoratif yüz kimlikleri, kaynaklar ve olay kaydı korundu. Düşük/otomatik/yüksek kalite ve hız değişiminde aynı nihai duruma ulaşıldı; aktif yüz kalmadı |
| Tablet 768×1024 / masaüstü 1440×900 | Ok/Enter tekli seçim, aynı zar odağı, mevcut kamera/güç menüsü ve tur 2 geçti |

18 zarın çakışmaması **sahipliğe göre düzenli sıraların kabulü değildir**.
Ekran görüntüleri açılarak incelendi: ortak hücre düzeninde iki tarafın yüzleri
hâlâ kümelenebilir. Aşama 11–12 uygulanmadığından düzen ve savaş boyunca
kalıcı yüz/olay kadrajı kabulü açık bırakıldı. Kullanıcının özgün
IMG_1965–1971 dosyaları bu çalışma bağlamında yoktu; birebir fotoğraf
karşılaştırması yapılmış sayılmadı.

| Mod / boyut | Hareket | Tamamlanan akış |
| --- | --- | --- |
| Bot 360×800 | Azaltılmış | 5 tur, sonuç ve yeniden maç |
| Bot 390×844 | Normal | 6 tur, sonuç ve yeniden maç |
| Yerel 430×932 | Azaltılmış | 4 tur, iki koltuk, sonuç ve iki hazırla yeniden maç |
| Yerel 844×390 | Normal | 4 tur, iki koltuk, sonuç ve iki hazırla yeniden maç |
| Ağ kurucu 844×390 / misafir 390×844 | Azaltılmış | 6 tur, hazır geri alma, ortak sonuç ve aynı odada yeniden hazırlık/geri alma/tanrı değişimi/yeni maç |
| Aynı ağ boyutları | Normal | 4 tur, aynı uçtan uca akış |

Bot ve ağ maçları doğal rastgelelik, yerel maçlar seed 42 kullandı.
Normal maçlarda hızlı sunum ayarı açıktı; Aşama 13'te normal hızda hareket
ayrıca izlendi. Başlangıç canı veya maç sonucu kısaltılmadı. Güç seçimi
UI üzerinden yapıldı. Yerel iki maçın **140 olaylık kayıtları birebir aynı**;
son canlar 0/4, jetonlar 4/6 idi. Bütün maçlarda HUD ile sunum durumu
karşılaştırıldı, uyuşmazlık yoktu. Ağ koltuklarının son durumları eşleşti.
Yeni maçlar 15 can / 0 jetonla, önceki ilk başlayanın karşısıyla açıldı;
son tanrılar, oda ve koltuklar korundu. Bot kayıtlarında eski tekli seçim
olayı yok; değişen seçimler toplu `DiceSelectionChanged` olaylarıdır.

## Kesintiler ve kabul sınırları

- Chrome **156.0.8078.74**, ayrı geçici profil ve odak benzetimi kapalı:
  gerçek sekme geçişinde `document.hidden=true`; taslak iptal oldu,
  gizliyken komut gönderilmedi. Dönüşte aynı canvas ve revision korundu.
- Gerçek core olaylarının saldırısı sırasında `WEBGL_lose_context` ile
  bağlam kaybı üretildi. Sahneyi yeniden yükle sonrası yeni canvas açıldı;
  kaynaklar olay kaydının nihai değerleriyle aynıydı, eski aktif saldırı yüzü
  kalmadı. Bu kontrollü WebGL kaybıdır; fiziksel GPU arızası testi değildir.
- Hazır kurucuda tarayıcının offline/online olayları gerçek Socket.IO
  kopma/resume yolunu çalıştırdı. Beklerken geri alma düğmesi kilitliydi;
  dönüşte aynı hazır koltuk geri alınabildi ve misafir güncel durumu gördü.
- İlk uzun basma otomasyonunda yük altında 2000 ms sınırı aşılınca bilgi
  penceresini ara anda görme kontrolü başarısız oldu. Basma daha erken
  başlatılıp yine taşıma boyunca tutuldu; normal/azaltılmış kontroller geçti.
  Kesin sınır senaryoları sahte saat kullanan davranış testlerindedir.

Fiziksel **iPhone/Safari ve Android/Chrome test edilmedi**. Parmakla hızlı
çoklu seçim, cihaz akıcılığı/ısınması, gerçek tarayıcı çubukları ve güvenli
kenarlar için [güncel cihaz yönergesi](../MOBILE_DEVICE_CHECKLIST.md)
uygulanmalıdır. Aşama 15'in fiziksel maddesi ile Aşama 4–5/9'un açık cihaz
maddeleri kapatılmadı. Bütün mobil kabulün tamamlandığı iddia edilmez.

## Kanıtlar

Git dışındaki `output/stage15/`:

- `matrix.mjs/json`, `matches.mjs/json`, `*-match.json`, `motion-compare.json`;
  `pending-*`, `selected-*`, `returned-*`, `*-result.png`, `*-rematch.png`.
- `online.mjs`, `online-reduce.json`, `online-normal.json` ve ağ ekranları.
- `desktop.mjs/json`, `edges.mjs/json`, `eighteen-*`, `removed.png`.
- `orientation.mjs/json`, `touch-boundary.mjs/json`, ilgili ekranlar.
- `recovery.mjs/json`, `before-context-loss.png`, `context-recovered.png`,
  `lobby-reconnected.png`; `visibility.mjs/json`, `visibility-return.png`.
- `motion-matrix.mjs/json`, `motion-*.png`: gerçek core çözümlemesinin aynı
  olaylarını iki hareket modunda beş boyutta oynatan kontrollü sunum kaydı.
- `check.log`, `tests.log` ve akışların `.log` dosyaları.

Aşama 13'ün hareket örnekleri `output/stage13/`, lobi ekranları
`output/stage14/` altındadır. Ara kayıtlar/revizyonlar nihai kabul yerine
geçmez; yukarıdaki final test sonuçları esas alınır.
