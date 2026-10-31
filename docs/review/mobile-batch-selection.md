# Aşama 7 — İki saniyelik toplu zar seçimi

Tarih: 30 Ekim 2026. Kapsam yalnız ROADMAP Aşama 7'dir. Aşama 6'nın
tamamlanmış sürümüyle birleşik kod doğrulandı; fiziksel cihaz kullanılmadı.

## Davranış

- Mobil kısa dokunma sabit zar kimliğinin taslağını değiştirir. Onay imi ve
  mevcut camgöbeği vurgu hemen görünür; aynı zara yeniden dokununca kalkar.
  Taslak sırasında yüzler, hedef kimlikleri ve hedef konumları değişmez.
- Her geçerli seçim veya seçimden vazgeçme tek zamanlayıcıyı yeniden
  2000 ms'ye kurar. Uzun basma, bilgi inceleme ve sürükleme yenilemez.
- Süre sonunda son seçim `SetDiceSelection` komutuyla atomik uygulanır.
  Tek revision ve tek `DiceSelectionChanged` olayı tek `arrange` çağrısını
  tetikler; beş zar aynı GSAP zaman çizgisinde birlikte taşınır.
- Merkezdeki kilitsiz seçimler aynı yolla birlikte geri alınır. Son taslak
  uygulanmış seçimle aynıysa komut/olay/animasyon olmaz. Önceki atışlarda
  kilitlenen zarlar seçilemez veya açılamaz.
- Süre atış, `ConfirmRoll`, kilitleme veya sıra geçişi üretmez. Zar yüzleri,
  kaynaklar ve rastgele sonuçlar UI tarafından üretilmez. Core zamanlayıcı,
  Vue, DOM veya animasyon bağımlılığı almaz; fizik sahipliği değişmez.
- Masaüstü ve bot mevcut tekli seçim komutunu kullanır. Sunucu yeni toplu
  komutu mevcut yetkili dispatch yolundan kabul eder; değişmeyen seçim
  boş sunum kilidi oluşturmaz.

## Otomatik doğrulama

Node **24.22.1**, Aşama 6 ile birleşik sürüm:

- `npm run check`: tip denetimi ve üretim derlemesi başarılı.
- `npm run test:ci`: **38 dosyada 479 test başarılı**.
- `git diff --check`: başarılı. Bağımlılık ve dış varlık eklenmedi.

Eklenen 20 davranış senaryosu:

- Sahte saatle 1999 ms'de komut yokluğu, 2000 ms'de tek komut; son seçim ve
  seçimden vazgeçmede süre yenileme; tek zamanlayıcı; çift dokunmada komutsuz
  dönüş; beş zarın toplu geri alınması; geçersiz kimliğin süreyi etkilememesi.
- Gerçek oturum + Vue kontrollerinde taslağın hemen işaretlenmesi, yüzlerin,
  hedef DOM düğümlerinin/konumlarının ve seçilebilirliğin korunması;
  uzun basma/sürüklemenin bekleyen süreyi uzatmaması.
- Core'da atomik doğrulama, yabancı/tekrarlı/geçersiz kimliklerin tüm grubu
  reddetmesi, kilitlerin korunması, aynı seçimin revision/olay üretmemesi,
  kaynakların/yüzlerin/atış sayısının/fazın korunması.
- Gerçek Three.js nesneleri ve GSAP ile beş zarın aynı anda hazne kenarını
  aşması, grupta tek zaman çizgisi ve toplu geri alma; seçilmeyen zar sabit.
- İki gerçek Socket.IO bağlantısında tek revision/olayın iki koltuğa
  yayınlanması, değişmeyen seçimde odanın boş animasyon beklememesi ve
  tek olayla geri alma. Mevcut bot, masaüstü, oyun ve ağ testleri de geçti.

Vite'ın mevcut uzantı ve büyük derleme parçası uyarıları sürer.

## Tarayıcı kontrolü

macOS / Playwright Chromium **143.0.7499.4**; gerçek WebGL sahnesi, yerel
maç ve UI komutları kullanıldı. `hasTouch`/`tap` dokunma benzetimidir.

| Görünüm / akış | Sonuç |
| --- | --- |
| 360×800, 390×844, 430×932, 844×390 | Beş zara arka arkaya kısa dokunma; her onay imi hemen görünür; altı yüzün konumları bekleme boyunca sabit, hedefler en az 44×44px ve kullanılabilir |
| Aynı dört mobil boyut | Tek revision/olayla beş zar merkeze gider; hiçbiri kilitlenmez, faz/sıra aynı kalır; beşi birlikte geri alınır |
| 390×844 | Aynı zara çift dokunma ve 2250 ms bekleme revision üretmez; 1250 ms arayla iki seçimde ilk pencerenin dolması grubu erkenden uygulamaz |
| Sonraki atış | Önceden onaylanmış zara dokunma bilgi açar; 2100 ms bekleme seçim veya revision üretmez |
| 1440×900 | Enter ile mevcut tekli seçim hemen uygulanır; mobil taslak beklemesi yoktur |
| 390×844, normal hareket | Gerçek fizik kaydıyla atıştan sonra beş zar tek grupta taşınır; azaltılmış hareketle aynı sonuç elde edilir |

Birleşik sürümün ekran görüntüleri incelendi: hazne özeti yoktur; bekleyen
seçimler haznede işaretli, uygulanmış seçimler merkezde işaretlidir. Yüzler,
altın jeton işareti, kaynaklar ve ana eylemler okunur. Sayfa çalışma zamanı
hatası alınmadı. Kesin 1999/2000 ms sınırı otomatik sahte saat testindedir;
gerçek zamanlı tarayıcı ölçümü bu sınırın yerine geçirilmez.

Git dışındaki yerel kanıtlar `output/batch-selection-stage7/` altındadır:
`browser.cjs`, `browser.log`, `check.log`, `test.log`, dört boyut için
`pending-*.png` / `selected-*.png`, `desktop.png`, `normal-pending.png`,
`normal-selected.png`.

## Açık kapsam

**Süre dolmadan Seçimi onayla'ya basıldığında bekleyen taslağın onaya
aktarılması Aşama 8'dir.** Bu sürümde mevcut onay uygulanmış seçimi kullanır;
bekleyen taslak henüz erken onaya eklenmez. Ek onay penceresi eklenmedi.

Taslak durum/kullanılabilirlik değişimi ve kaldırılmada temizlenir; fakat ağ
reddi/eski revision uzlaşması, süreyle eşzamanlı onay ve bütün kesintilerin
birleşik kabulü bu teslimin tamamlandı iddiasına dahil değildir. Bunlar
Aşama 8'de, tam maç/iki çevrim içi UI koltuğu kabulü Aşama 9'da kalır.
Fiziksel iPhone/Safari ve Android/Chrome test edilmedi; önceki fiziksel
cihaz kabul maddeleri açık bırakıldı.
