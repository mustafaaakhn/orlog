# Aşama 12 — Savaş yüzleri ve olay kadrajı

31 Ekim 2026. Aşama 11'in sabit sıraları ve mevcut Aşama 13 saldırı hareketi
üzerinde uygulandı. Core, güç öncelikleri, ödeme/ölüm sırası, fizik sonucu ve
kaynak temas sınırları değiştirilmedi. Yeni dış varlık veya bağımlılık yok.

## Değişiklik

Mobil yüz görünürlüğü etkileşim kilidinden ayrıldı. Kilitte mevcut yüzler
odaklanamayan, tıklama üretmeyen dekoratif span olur. Güncel olayın zarları
vurgulanır; diğerleri soluk olarak sabit yuvalarında kalır. Mevcut saldırı
rolleri güncel 3B izdüşümünü takip eder; kısa yatayda hareketli yüz kaydırma
kabının dışında görünür. Atış/yeniden atış kimlikleri kendi yayın sınırına
kadar gizlenir; bekleyen grubun son yüz/değer/kaynak bilgisi kullanılmaz.
Kaldırılan yüz gerçek görünürlükte, kullanılmış yüz toplama bitince temizlenir.

Kamera tek frameCamera yolunda yazılır. Güncel olayın gerçek kaynak/hedef,
can taşı, jeton ve tanrı noktaları hareket payıyla HUD boşluğuna sığdırılır.
Toplama kendi kaynak/kenar alanını kapsar. Yeniden atışta henüz görünmeyen
bonus zarlar için hazne kayıt alanı ve merkez varış yuvaları da kapsanır.
Normal harekette kısa geçiş, azaltılmış harekette anlık kadraj kullanılır.
Masaüstü tam masa görünümü ve seçim düğmesi/klavye odağı korunur.

## Otomatik doğrulama

Node 24.22.1, son kod üzerinde:

- npm run check: tip denetimi ve üretim derlemesi başarılı.
- npm run test:ci: **45 dosyada 550 test başarılı**.
- git diff --check: başarılı.

Yeni testler, 360×800 / 390×844 / 430×932 / 844×390 / 568×320'de iki
koltuğun kaynak/hedef/temas izdüşümlerini; blok, çok değerli zar hasarı,
ölümle kırpılmış tanrı hasarı, kazanım/çalma/ödeme, iyileşme/feda,
jeton etkileri, değer değişimi, kaldırma, yeniden atış ve toplamayı kapsar.
Henüz görünmeyen ek zarın atış/varış alanı ayrıca doğrulanır. Salt okunur
izdüşüm, gizlenen/bitmiş kimlikler ve mobil dekoratif yüzlerin seçim
üretmemesi test edildi. Mevcut kesinti, sunum sırası ve kaynak testleri geçti.
Vite import uzantısı ve büyük parça uyarıları devam eder.

## Tarayıcı ve hareket

Playwright Chromium 143.0.7499.4, gerçek WebGL masa:

- 390×844, 844×390, 768×1024 ve 1440×900'de normal/azaltılmış hareketle
  seçim → güç → savaş → tur 2 tamamlandı. Mobil aktif yüzler span ve
  aria-hidden; odak hedefi yok. Masaüstü ayrıca klavye tekli seçim, aynı
  DOM/odak kimliği ve tanrı menüsüyle doğrulandı.
- Core'un ürettiği kontrollü çözümleme iki koltukta oynatıldı. Blok,
  çok değerli zar, doğrudan hasar, kazanım/çalma/ödeme ve reaktif iyileşme
  boyunca dekoratif yüz kimlikleri, olay vurgusu, hareket ve toplama sınırı
  örneklendi. Sunum duraklatılıp devam ettirildi; son durum değişmedi.
- Ayrı kontrollü kayıtlar Thor hasarı/Iðunn iyileşmesini ve seed 91 ile
  Freyja ek zar/Loki kaldırmasını kapsadı. Bu sahneler normal hazırlık
  akışından üretilmiş tam maç yerine geçmez; gerçek core olayları mevcut
  oturum/sunum kuyruğuna verilmiştir. Görsel katmanda sonuç üretilmedi.
- Normal/azaltılmış karşılaştırmada iki koltuğun **19'ar olaylık** kayıtları,
  tanrı etkilerinin **15 olaylık** ve ek zar/kaldırmanın **13 olaylık**
  kayıtları birebir eşleşti. Nihai oyuncu durumları aynıydı. HUD sayıları
  mevcut sunum durumuyla eşleşti. Son toplamada yüz/vurgu sayısı sıfırdı.
- 390×844'te normal bot maçı 5 turda, 430×932'de azaltılmış yerel maç
  4 turda tamamlandı. Sonuç, masayı inceleme ve yeniden maçtan sonra ilk
  atış çalıştı; can 15/jeton 0 başlangıcı, ad/tanrı ve ilk koltuk davranışı
  korundu. Yeniden maç ekranları eski savaş vurgusu taşımadı.
- WebGL kaybında yeni canvas güncel oyuncu durumunu gösterdi; hayalet
  hareket/vurgu yoktu. Google Chrome **156.0.8078.74** ile odak benzetimi
  kapalı gerçek sekme geçişinde document.hidden=true görüldü. Bekleyen
  insan taslağı temizlendi. Savaş arka planda yetkili sonuca ulaştı;
  dönüşte aynı canvas, doğru kaynaklar ve sıfır eski yüz/vurgu vardı.

Kontrollü sahnelerde ekran görüntüleri ve videodan ardışık kareler açılarak
incelendi. Statik görüntünün tek başına hareket kanıtı olduğu varsayılmadı;
video kaydı ve kimliğe bağlı konum örnekleri de saklandı. İlk hızlı
azaltılmış hareket örneklemesinde kısa blok penceresi kaçırıldığı için
kontrollü akış normal hızda ve daha sık örneklenerek tekrar doğrulandı.
İlk Chrome devam senaryosu sekme odağı nedeniyle aktif savaş penceresini
kaçırdı; ayrı tekrar koşusunda odağı açıkça geri getirerek geçti.

## Kanıtlar ve sınırlar

Git dışındaki `output/stage12/`:

- browser.mjs/json: sekiz görünüm/hareket akışı; combat-*.png.
- events.mjs/json, gods.mjs/json, recast.mjs/json, comparison.json:
  kontrollü olay/kimlik/hareket ve nihai durum karşılaştırmaları.
- active-*.png, god-*.png, recast-*.png, finished-*.png,
  motion-frames.png, video/*.webm: görsel ve hareket kayıtları.
- desktop.mjs/json, recovery.mjs/json, visibility.mjs/json:
  klavye, WebGL ve gerçek sekme geçişi.
- matches.mjs/json, *-match.json, *-result.png, *-rematch.png:
  bot/yerel tam maçlar ve yeniden maç.
- check.log, tests.log: son zorunlu komutlar.

Başarılı son tarayıcı akışlarında çalışma zamanı istisnası yoktu.
Fiziksel iPhone/Safari ve Android/Chrome testi yapılmadı. Özgün kullanıcı
fotoğrafları bu oturumda mevcut değildi; 12 yüz senaryosu core snapshot'ıyla
kuruldu, fotoğraflarla birebir piksel karşılaştırması yapılmış sayılmaz.
Aşama 15'in birleşik/fiziksel kabulü ve önceki açık cihaz maddeleri bu
Aşama 11–12 teslimiyle otomatik kapatılmaz.
