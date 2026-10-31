# Aşama 9 — Birleşik mobil doğrulama

Tarih: 31 Ekim 2026. **Yazılım ve tarayıcı kontrolleri tamamlandı;
fiziksel iPhone/Safari ve Android/Chrome kabulü açık.** Aşama 6–8'in
birleşik sürümü doğrulandı. Yeni oyun özelliği eklenmedi.

## Bulgu ve düzeltme

Bir zar seçildikten yaklaşık 1350 ms sonra başka zara uzun basılıp,
2000 ms sınırındaki toplu taşıma ve giriş kilidi bittikten sonra parmak
bırakıldığında, yerleşimde komşuya kayan tıklama yeni seçim oluşturuyordu.
Hem Chromium CDP dokunmasında hem Vitest senaryosunda hata üretildi.

`SceneDiceControls`, kilit/koltuk kullanılabilirliği değişiminde hareketi
tamamen unutmak yerine tüketilmiş olarak korur. Bırakma tıklaması başka
bir hedefe aktarılırsa da seçim üretmez; yeni pointerdown normal bir yeni
hareket başlatır. Core, zamanlayıcı, olay şeması, fizik ve GSAP sahipliği
değişmedi. Test, eski kodda yanlış komşu seçimini gösterdi; düzeltme sonrası
geçti. Normal ve azaltılmış harekette gerçek tarayıcı giriş hattında da
bırakma sonrası taslak boş, yalnız ilk zar seçili kaldı.

## Otomatik kontroller

Node **24.22.1** ile son kod üzerinde:

- `npm run check`: tip denetimi ve üretim derlemesi geçti.
- `npm run test:ci`: **40 dosya, 503 test başarılı**.
- `git diff --check`: geçti.

Yeni test; uzun basmanın toplu sunum kilidi/açılması boyunca sürmesini,
bırakmanın komşuya aktarılmasını ve sonraki yeni dokunmanın çalışmasını
kapsar. Diğer oyun, sunum, bot, ağ ve kesinti testleri de geçti. Mevcut
Vite uzantı ve büyük derleme parçası uyarıları devam eder.

## Mobil boyutlar ve seçim

macOS / Playwright Chromium **143.0.7499.4**, gerçek WebGL masa kullanıldı.

360×800, 390×844, 430×932 ve 844×390 boyutlarının her birinde:

- Rakip hazne özeti, özel inceleme alanı veya özet düğmesi DOM'da yoktu.
- Beş zar arka arkaya seçildi; onay imleri hemen göründü. Altı hedefin
  koordinatları/boyutları aynı kaldı; hepsi 44×44px ve kullanılabilir kaldı.
- Son değişiklikten sonraki bekleme tek toplu seçim/revision/olay oluşturdu.
  Zarlar merkezde seçili kaldı; henüz kilitlenmedi ve sıra/faz değişmedi.
- Beş zar birlikte geri alındı; ardından tekrar seçilip süre dolmadan
  onaylandı. Son beşi kilitlendi, yalnız bir onayla diğer koltuğa geçildi.
- Yüzler, altın jeton işaretleri, kaynaklar ve ana eylemler görünür kaldı;
  yatay sayfa taşması görülmedi. Ekran görüntüleri açılarak incelendi.

Tam 1999/2000 ms sınırı otomatik sahte saat testlerindedir. Tarayıcıdaki
bekleme ölçümü ilk/son dokunuş, sunum ve örnekleme süresini de içerir;
kesin süre testi olarak sunulmaz.

## Tam maçlar ve yeniden maç

Başlangıç canı/jetonu veya maç sonucu değiştirilmedi. Bot ve ağ maçlarında
doğal rastgelelik; yerel maçlarda tekrar üretilebilir seed 42 kullanıldı.
Normal hareket maçlarında hızlı sunum ayarı açıktı. Zar ve eylem komutları
UI üzerinden gönderildi; güç seçimi, savaş, sonuç ve yeniden maç kapsandı.

| Mod / görünüm | Hareket / giriş | Tamamlanan akış |
| --- | --- | --- |
| Bot, 360×800 | Azaltılmış / fare | 5 tur, bot galibiyeti, sonuç inceleme ve yeniden maç |
| Bot, 390×844 | Normal / fare | 5 tur, bot galibiyeti, sonuç inceleme ve yeniden maç |
| Yerel, 430×932 | Azaltılmış / fare | 4 tur, iki koltuk, güç/savaş, sonuç ve iki hazır onayıyla yeniden maç |
| Yerel, 844×390 | Normal / fare | 4 tur, iki koltuk, güç/savaş, sonuç ve yeniden maç |
| Ağ, kurucu 844×390 / misafir 390×844 | Azaltılmış / iki gerçek Socket.IO istemcisi | 4 tur, aynı sonuç, oda/koltuk korunarak iki hazır onayıyla yeni maç |
| Ağ, kurucu 844×390 / misafir 390×844 | Normal / iki gerçek Socket.IO istemcisi | 4 tur, aynı sonuç, aynı odada yeni maç |
| Yerel, 390×844, düzeltme sonrası | Normal / zar seçimleri CDP dokunması | 4 tur; kısa dokunma, erken toplu onay, koltuk değişimi, sonuç ve yeniden maç |

Maç akışları dokunma düzeltmesinden sonra yeniden doğrulandı. İki uzun
basma sınır senaryosu ve CDP zar dokunmasıyla tam yerel maç ayrıca oynatıldı.
Bot/yerel yeniden maçlarında yeni masanın hazır olması ve ilk atışın
çalışması da kontrol edildi; yalnız yeni oyun kimliğinin oluşmasıyla yetinilmedi.

Yeni maçlarda canlar 15, jetonlar 0; adlar ve tanrılar korundu. Başlangıç
oyuncusu, önceki maçın **ilk başlayanının** karşısı oldu. Ağ maçlarında
kod ve kişisel koltuk korundu. Sonuç sunum bitince açıldı; Masayı incele,
Sonucu göster ve Yeni oyun çalıştı.

Aynı seed ve kararlarla azaltılmış, normal ve CDP dokunmalı yerel maçların
**140 olaylık kayıtları birebir eşleşti**. İlk iki maçta son canlar 0/4,
jetonlar 4/6 idi; CDP maçı da aynı sonuca ulaştı. Bütün tam maçlarda HUD
can/jeton sayıları her durum yayını sonrasında mevcut sunum durumuyla
karşılaştırıldı; uyuşmazlık yoktu. Ağ koltuklarının son faz, can, jeton,
tur ve kazananı eşleşti. Karşılaştırma, fiziksel telefonda performans veya
piksel düzeyinde her animasyon karesinin ölçümü değildir.

## Ek senaryolar

| Kontrol | Sonuç |
| --- | --- |
| Tablet 768×1024 / masaüstü 1440×900 | Normal hareketle bir tur ve tur 2. ArrowRight/Enter tekli seçimi beklemeden uyguladı; mobil taslak oluşmadı, odak aynı zar kimliğine döndü. Tam masa ve eski tanrı menüsü korundu |
| Ekstra zarlar | Core'da iki kaynak biriktirme turundan sonra iki Freyja seviye 3 etkisi üretildi. Sunum olaylarının savaş öncesi ara durumu snapshot olarak gösterildi: iki tarafta dokuzar, toplam 18 yüz |
| Kaldırılan zar | Aynı yöntemle Freyja + Loki gerçek core olaylarından ara durum üretildi; kaldırılan kimlik için hedef yoktu, kalan 14 hedef korundu |
| 18 hedefin yerleşimi | 360×800, 390×844, 430×932, 844×390 ve 568×320: 44px yüzler ayrık. 568×280: aynı 18 kimlik kaydırılabilir listede; CDP sürüklemesi listeyi gerçekten kaydırdı |
| Mobil yön geçişi | Normal harekette 390×844 → 844×390 → 390×844; iki seçim ve kalan süre korundu, yalnız bir seçim komutu, aynı oyuncu/faz |
| Sekmeden dönme | Google Chrome **156.0.8078.74**, ayrı geçici profil, odak benzetimi kapalı. Gerçek sekme geçişinde `document.hidden=true`, taslak boşaldı; 2300 ms gizliyken komut yok. Dönüşte aynı canvas ve revision |

Ekstra/kaldırılan zar kontrolü tam UI maçının yerine geçirilmez: core'un
ürettiği olayların mevcut `applyResourceEvent` sunum yoluyla oluşturulmuş
savaş öncesi ara görünümüdür. Yüz, can, jeton veya kaldırma sonucu UI'da
üretilmedi; kayıt yalnız bu uç yerleşim ve inceleme kontrolü için kullanıldı.

Kontrol edilen sayfalarda yakalanan çalışma zamanı istisnası yoktu.

## Kanıt konumları

Git dışındaki `output/mobile-batch-acceptance/` içinde:

- `matrix.mjs`, `matches.mjs`, `online.mjs`, `desktop.mjs`, `edges.mjs`,
  `touch-boundary.mjs`, `touch-match.mjs`, `orientation.mjs`, `visibility.mjs`, `driver.mjs`.
- `matrix.json`, `matches.json`, `online-reduce.json`, `online-normal.json`,
  `desktop.json`, `edges.json`, `touch-boundary.json`, `touch-match.json`,
  `motion-compare.json`, `orientation.json`, `visibility.json`.
- `pending-*`, `selected-*`, `returned-*`; bot/yerel/ağ için `*-result.png`,
  `*-rematch.png`; `desktop-*`, `eighteen-*`, `removed.png`, `touch-boundary-*`,
  `orientation-return.png`, `visibility-return.png`.
- `check.log`, `tests.log`.

## Açık fiziksel kabul

Bu oturumda fiziksel iPhone/Safari ve Android/Chrome testi yapılmadı.
CDP dokunması, gerçek parmak/çoklu dokunma, tarayıcı çubukları, çentik/güvenli
alanlar veya cihaz akıcılığı/ısınması kabulü sayılmaz. Her iki cihazın
sonuçları [cihaz yönergesi ve kayıt tablosuna](../MOBILE_DEVICE_CHECKLIST.md)
girilmelidir. Yönerge yeni iki saniyelik seçim, erken/tekrarlı onay ve
uzun basma sınır senaryosunu kapsayacak şekilde güncellendi.

Aşama 9'un fiziksel cihaz maddesi ile Aşama 4–5'in açık fiziksel maddeleri
`[ ]` kalır. Yazılım/tarayıcı kısmı tamamlandı; bütün fiziksel mobil kabulün
bittiği söylenmez. Fiziksel sorun bulunursa aynı cihazda düzeltme sonrası
tekrar doğrulama gerekir.
