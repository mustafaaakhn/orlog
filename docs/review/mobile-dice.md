# Mobil zar yüzleri ve dokunma doğrulaması

Tarih: 30 Ekim 2026. Kapsam: ROADMAP Aşama 4; Aşama 1–3 ile birleşik sürüm.
Fiziksel dokunmatik cihaz kullanılmadı; ilgili kabul maddesi açık bırakıldı.

## Uygulanan davranış

Mobilde simgeyi açık kemik zeminde gösteren 44×44px yüz hedefleri vardır.
Hedefler HUD dışındaki alanda 4px aralıkla yerleşir; gerçek 3B konumdan kayan
yüzü ince çizgi bağlar. Jetonlu yüzde altın çerçeve ve ayrı altın jeton işareti;
seçili/kilitli yüzde camgöbeği çizgi ve onay imi bulunur. Normal atış kaydı
korunur; dinlenmiş mobil üst yüzün kontrastı ve jeton işareti de güçlendirildi.
Güçlerle artan etki değeri yüz hedefinde ayrıca ×N olarak korunur.

Kısa dokunma hedefin kimliğini seçer; aynı kimlik merkezden geri alınabilir.
400ms uzun basma inceleme açar ve sonraki tıklama seçim üretmez. Sürükleme,
iptal ve sunum kilidi yanlış seçim üretmez. Kısa dokunma sonrası odak dönüşü
yeni seçimleri örten bir bilgi penceresi açmaz. Rakip/kilitli zar incelemesi
salt okunurdur. Kadraj dışı rakip haznesinin özetindeki 44px düğmeler simge,
etki ve Jeton getirir bilgisini gösterir; atılmamış/atılıyor yüzler açılamaz.
Aynı rakip hazne zarı mobilde iki ayrı seçim hedefi olarak tekrarlanmaz.

Çok kısa ekran veya çok satırlı hata bütün yüzlere alan bırakmazsa aynı 44px
hedefler kaydırılabilir listede korunur. Bu yerleşim ekran koordinatıdır;
core sonucu, fizik kaydı veya GSAP nesne konumu yeniden hesaplanmaz.

## Otomatik doğrulama

Node 24.22.1 ile `npm run check` ve `npm run test:ci` geçti; 37 dosyada
460 test başarılı. Davranış
senaryoları; 18 hedefin ayrıklığı, HUD sınırları, kaldırılan kimlikler, kısa
alan yedeği, doğru zar kimliğiyle seçim/geri alma, salt okunur inceleme,
uzun basma, sürükleme/iptal, normal pointerleave, sunum kilidi, odak dönüşü,
klavye ve rakip özetinin gizli/henüz sunulmamış yüzleri açmamasını kapsar.

## Tarayıcı kanıtları

macOS Chromium 143.0.7499.4 / Playwright. Fare ve klavyeye ek olarak CDP
`Input.dispatchTouchEvent`, `hasTouch` ve `tap` ile dokunma **benzetimi** yapıldı.
Bu sonuçlar fiziksel Safari/Chrome veya dokunmatik donanım ölçümü değildir.

- Gerçek yerel maçta altı zarın her biri dokunarak seçildi ve geri alındı;
  her adımda core'daki seçili kimlik denetlendi. Uzun basma revision'ı
  değiştirmeden bilgiyi açtı. İkinci koltuğa geçildi; kilitli zar ve rakip
  özeti incelendi, inceleme revision'ı değiştirmedi.
- 360×800, 390×844, 430×932 ve 844×390: görünen yüz hedefleri en az 44px,
  birbirinden ayrık ve ekran sınırları içinde. Rakip haznesi yalnız özette
  hedefleniyor. Ekran görüntülerinde beş simge ve iki ayrı durum işareti incelendi.
- Kontrollü sunum snapshot'ında iki dokuz-zar sırası: 390×844 ve 844×390'da
  18 hedef ayrık. 568×320'de uzun hata metniyle alan daraltıldı; yedek listede
  18 hedef korundu ve CDP dokunma hareketiyle gerçekten kaydırıldı.
- Aynı kontrollü snapshot'ta iki taraftan ikişer zar kaldırıldı; kalan 14
  kimlik korundu, kaldırılanlar hedeflenmedi. Bu snapshot kontrolü gerçek
  Freyja/Loki güç çözümlemesi veya tam maç testi olarak sunulmaz.
- 1440×900: mobil yüz hedefleri gizli; mevcut 3B hedefler ve ok tuşlarıyla
  klavye odağı korundu. Ayrı bir normal hareketli fizik atışından sonra doğru
  zar dokunarak seçildi; Space ile geri alınıp Enter ile yeniden seçildi.
  Tarayıcı çalışma zamanı hatası alınmadı.

Git dışındaki yerel çıktılar `output/mobile-dice-stage4/` altında:
`check.log`, `test.log`, `browser.log`, `browser.cjs`, `first-roll.png`,
`long-press.png`, `opponent-inspection.png`, `seat-2.png`, `dice-*.png`,
`extra-*.png`, `desktop.png`, `normal-roll-selected.png`.

## Açık fiziksel kontrol ve kısa yönerge

Bir iPhone/Safari ve Android/Chrome üzerinde aşağıdakiler ayrıca yapılmalı.
Aynı ağdaki telefon için `npm run dev -- --host 0.0.0.0` çalıştırıp terminaldeki
Network adresini aç.

1. Yerel maç açıp altı zarı sırayla seç ve merkezden geri al. Komşu zarın
   seçilmediğini, simgeyi ve jeton işaretini rahat okuyabildiğini kontrol et.
2. Kendi zarına en az yarım saniye bas; yalnız bilgi açılmalı. Parmağı kaldır,
   Kapat'a dokun; zar seçilmemeli. Sonraki kısa dokunma seçim yapmalı.
3. Seçim alanında parmağı sürükle ve hareketi iptal et; zar seçilmemeli.
   Kilitli zar ve rakip özetine dokun; bilgi açılmalı, oyun ilerlememeli.
4. Yatay çevir; dar alanda listeyi parmakla kaydır. Kapat, HUD ve ana eylemin
   tarayıcı çubukları/güvenli kenarların altında kalmadığını kontrol et.
5. Cihaz, işletim sistemi/tarayıcı sürümü ve bulguyu kaydet. Bu kayıt gelmeden
   ROADMAP'taki fiziksel dokunma maddesini kapatma.

Aşama 5'in tam maç, iki cihazla ağ, gerçek güvenli alan ve performans kabulü
bu işte yapılmadı; sonraki aşamaya otomatik geçilmedi.
