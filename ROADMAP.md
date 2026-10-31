# Mobil oynanabilirlik yol haritası

İlk plan: 30 Ekim 2026 · Son güncelleme: 31 Ekim 2026

Amaç, telefonda zarları, kaynakları ve tanrı güçlerini rahatça okuyup
seçebilmek. Masaüstünün mevcut görünümü ve oyun kuralları korunur.
Bu dosya planı gösterir; geliştirmelerin tamamlandığı anlamına gelmez.

## Güncel hedef — Bot seçimi, düzenli zar sıraları, savaş ve lobi

31 Ekim 2026 yayın sonrası kullanıcı testi ve incelemesiyle yeni çalışma
**Aşama 10–15** olarak belirlendi. Bu güncelleme yalnız plandır; aşağıdaki
yeni aşamalar uygulanmadı ve geliştirmeye başlama yetkisi vermez.

| Sıra | Aşama | Hedef | Bağımlılık |
| --- | --- | --- | --- |
| 1 | 10 | Botun zar seçimlerini tek grupta taşı | Mevcut Aşama 7–9 uygulaması |
| 2 | 11 | Mobil yüzleri oyunculara ait sabit sıralara yerleştir | 10 |
| 3 | 12 | Savaşta okunur yüzleri ve olay odaklı kadrajı koru | 11 |
| 4 | 13 | Saldırı, blok ve hasar hareketlerini belirginleştir | 12 |
| 5 | 14 | Lobide hazır durumunu geri al ve tanrıları değiştir | Mevcut oda/hazırlık akışı; teslim sırası 13 sonrası |
| 6 | 15 | Bütün değişiklikleri birlikte ve fiziksel cihazlarda doğrula | 10–14 |

**Kesin karar:** Tanrı güçlerinin öncelikleri, savaş öncesi/sonrası ödeme ve
etki sıraları korunur. Bütün güçler savaş sonuna taşınmaz. Örneğin 5 mevcut
jeton + 1 çerçeve kazanımı + 2 çalma, başka kayıp yoksa savaş sonrası güce
8 jeton sağlayabilir; savaş öncesi güç bu gelecek geliri kullanamaz. Bu plan
güç kataloğunu, mevcut jeton yetmese de seviye seçilebilmesini veya kural
sonuçlarını değiştirmez.

Önceki Aşama 1–9'un teslim ve doğrulama kayıtları korunur. Aşama 7–9'da
toplu seçim insanın mobil etkileşimine uygulanmış, botun tekli seçimi açıkça
korunmuştu; Aşama 10 bu kapsamı genişletir. Önceki tarayıcı kontrolleri,
aşağıdaki yayın sonrası sorunların çözüldüğü veya fiziksel cihaz kabulünün
tamamlandığı anlamına gelmez. Aşama 4–5 ve 9'un açık cihaz maddeleri açık kalır.

### Yayın sonrası doğrulanan bulgular — 31 Ekim 2026

- **Bot:** `src/ai/computer.ts` seçim değişikliğinde yalnız bir zar için
  `SetDieSelection` döndürüyor; `computerDriver` her komutun sunumunu ve yeni
  düşünme süresini bekliyor. Kontrollü senaryoda atış → üç ayrı tekli seçim
  → onay izlendi. İnsan için eklenen 2000 ms toplu taslak bota uygulanmıyor.
- **Yüz yerleşimi:** Kullanıcının `IMG_1965.png`–`IMG_1971.png` görüntüleri
  ve canlı sitenin 430px mobil görünümünde düzensiz kümelenme görüldü.
  `layoutDieTargets` ortak ızgaradaki en yakın boş hücreyi seçiyor; oyuncu
  gruplarını ve iki ayrı merkez sırasını korumuyor. Çakışmama tek başına
  okunur veya kararlı bir dizilim sağlamıyor.
- **Savaş görünürlüğü:** `SceneDiceControls` sunum kilidinde yüzleri
  gizliyor; çözümleme kadrajı genişleyince küçük 3B zarlar kalıyor.
  `combatPresenter` saldırıda çoğunlukla küçük ok/balta efektini uçuruyor;
  zarın kendisi saldırı hareketi yapmıyor, katkıları bitince kenara toplanıyor.
  Canlı sitede seçimden çözümlemeye geçişte yüzlerin kaybolması doğrulandı.
- **Lobi:** Canlı sunucuda iki test istemcisiyle biri hazır, diğeri hazır
  değilken ilk oyuncunun tanrı değiştirmesi denendi; sunucu
  “Tanrı seçimi şu an değiştirilemez.” yanıtını verdi. `room:ready` hazır
  koltuğu yeniden kabul etmiyor; protokolde hazırlığı geri alma işlemi yok.

Kullanıcının iPhone ekran görüntüleri cihaz geri bildirimidir. Bu incelemede
fiziksel iPhone/Safari veya Android/Chrome testi yapılmış sayılmaz.

## Önceki hedef — Hazne özetini kaldırma ve toplu zar seçimi

30 Ekim 2026 kullanıcı geri bildirimiyle sıradaki çalışma **Aşama 6–9** olarak
belirlendi. Aşama 1–5 önceki uygulamanın ve doğrulamanın kaydıdır; tamamlanan
işaretleri korunur. Önceki fiziksel cihaz kabulünün açık maddeleri açık kalır.

- Mobilde **Rakibin haznesi** başlıklı 2B özet kaldırılacak. Görsel odak kendi
  haznen ve iki tarafın ortaya koyduğu zarlar olacak; can/jeton göstergeleri
  ile tanrı gücü paneli korunacak. Rakip hazneyi kadraja sığdırmak gerekmeyecek.
- Okunaklı zar yüzleri korunacak. Her kısa dokunma seçimi anında işaretleyecek;
  kullanıcı başka zarları seçerken yüzler kaybolmayacak veya yer değiştirmeyecek.
- **Son geçerli seçim değişikliğinden 2 saniye (2000 ms) sonra** bekleyen
  değişiklikler birlikte uygulanacak ve zarlar topluca taşınacak. Her seçim
  veya seçimden vazgeçme süreyi yeniden başlatacak. Uzun basma, inceleme ve
  kaydırma bu süreyi başlatmayacak veya yenilemeyecek.
- Merkeze alınan zarlar saklamak için seçilen zarlardır; yeniden atılacak
  zarlar haznede kalır. Sürenin dolması zar atmaz, seçimi kilitlemez ve sıra
  geçirmez. Mevcut **Seçimi onayla** ve **Zar at** eylemleri korunur; ek bir
  onay penceresi eklenmez.

Bu hedef, önceki planın rakip hazne özetini zorunlu tutan maddelerinin ve her
dokunuşta anında taşıma davranışının yerini alır. Aşama 6 ile özet kaldırıldı;
Aşama 7 ile iki saniyelik toplu seçim ve tek taşıma, Aşama 8 ile erken onay,
ağ kabulü ve kesinti yaşam döngüsü uygulandı. Aşama 9'un yazılım/tarayıcı
doğrulaması tamamlandı; fiziksel cihaz kabulü açık. `DESIGN.md` ve
`ARCHITECTURE.md` güncel uygulamayı anlatır; ilgili aşama uygulanırken
yeniden güncellenir.

## İlerleme biçimi

- Her istekte yalnızca belirtilen aşama uygulanır. Sonraki aşamaya otomatik
  geçilmez. Yeni uygulama sırası **Aşama 10** ile başlar; Aşama 4–5 ve 9'un
  fiziksel iPhone/Android kabulü ayrıca açıktır. Bu cihaz maddeleri yeni
  yazılım aşamalarına başlamayı engellemez; benzetimle kapatılamaz.
- Aşamalar sırayla ilerler. Her biri ayrı kısa ömürlü branch, doğrulama ve
  commit ile teslim edilir; doğrulanan iş yerel `main` branch'ine birleştirilir.
- Yalnız gerçekten uygulanıp doğrulanan maddeler aynı işin commit'inde `[x]`
  yapılır. Eksik doğrulama, engel ve kalan iş ilgili aşamanın altına yazılır.
- Her teslimde yapılanlar, doğrulama sonucu, aktif branch, son commit ve
  çalışma ağacının durumu bildirilir. Aşamaya devam etmek için sohbet geçmişi
  yerine bu dosya ve güncel proje belgeleri esas alınır.
- Kod/config değişikliğinde `npm run check` ve `npm run test:ci` zorunludur.
  Kozmetik değişiklikler için yapay test eklenmez; davranış değişiklikleri
  anlamlı senaryolarla doğrulanır.
- Arayüz ve 3B değişiklikleri tarayıcıda görüntülenir. Ekran boyutu benzetimi,
  gerçek dokunma ve fiziksel cihaz performansı doğrulaması sayılmaz.

## İlk çalışmanın başlangıç bulguları — Aşama 1–5

Canlı sitede 390×844 ve 360×800 dikey, 844×390 yatay ekran boyutlarıyla
hazırlık, zar atma/saklama ve tanrı gücü menüsü incelendi:

- Kamera masanın dış kenarlarını da sığdırdığı için oyun parçaları çok küçük.
- Can ve jeton sayıları görsel arayüzde okunaklı sayısal göstergelerle sunulmuyor.
- Zar sembolleri ve jeton kazandıran altın çerçeve küçük ölçekte zor seçiliyor.
- 44×44 piksellik zar hedefleri yakın duran zarların üzerinde örtüşüyor.
- Masadaki üç tanrı levhası telefonda okunmuyor. Güç menüsünde görünür kapatma
  düğmesi yok; “Escape ile kapat” yönlendirmesi telefona uygun değil.

Bu inceleme fiziksel iPhone/Android testi veya tam maç doğrulaması değildir.

## İlk çalışmanın ortak sınırları — Aşama 1–5

- Değişiklikler mobil maç deneyimine yöneliktir. Karşılama, maç öncesi
  20 tanrı kataloğu ve masaüstü tasarımı yeniden tasarlanmaz.
- Mobil düzen, ekranın kullanılabilir genişlik/yüksekliğine göre belirlenir;
  yalnız telefon modeline veya tarayıcı kimliğine bağlanmaz. Kısa yatay
  ekranlar da kapsanır. Kesin eşikler uygulamada görsel olarak doğrulanır.
- Yeni HUD, zar özeti ve güç paneli mevcut yetkili durumdan ve aynı sunum
  olaylarından beslenir. Can/jeton sayısı ilgili temas veya aktarım sınırında
  değişir; animasyondan önce son sonucu göstermez.
- `src/core` saf TypeScript kalır. Görsel katman zar sonucu, hasar veya jeton
  üretmez; fizik ile GSAP aynı konumu eşzamanlı yönetmez.
- Rakip kasesi kadraj dışına alınsa da oyuncunun görme hakkı olan zar bilgisi
  kaybolmaz. Rakibin gizli güç niyeti gibi bilgiler açığa çıkarılmaz.
- Tasarımın güncel davranışı değiştikçe `DESIGN.md`, yeni mimari karar varsa
  `ARCHITECTURE.md` aynı aşamada güncellenir. Yeni dış varlık gerekirse
  kaynak/lisans `docs/ASSETS.md` içine kaydedilir.

## Aşama 1 — Mobil can ve jeton göstergeleri

Bağımlılık: Yok. Kamera ve tanrı seçimi bu aşamada değiştirilmez.

- [x] Üstte rakibin, altta oyuncunun adını, canını ve jetonunu ikon + sayı
  olarak göster. Tur/sıra ve ana eylem için yeterli alan bırak.
- [x] Göstergeleri mevcut sunum zamanlamasına bağla; kazanım, çalma, ödeme,
  hasar ve iyileştirmede sayıların doğru anda güncellendiğini doğrula.
- [x] Uzun oyuncu adları, sıfır/yüksek jeton miktarı ve güvenli ekran
  kenarlarında taşma veya kontrol örtüşmesi olmadığını doğrula.
- [x] Dikey/kısa yatay mobil ve masaüstü görünümünü kontrol et; zorunlu
  komutları çalıştır, ilgili belgeleri güncelle ve aşamayı commit et.

**Kabul:** Oyuncu iki tarafın canını ve jetonunu fiziksel parçaları saymadan
okuyabilir. Göstergeler animasyonla tutarlıdır ve masaüstü düzeni korunur.

## Aşama 2 — Mobil tanrı gücü paneli

Bağımlılık: Aşama 1. Maç içindeki üç kuşanılmış tanrıyı kapsar.

- [x] Mobilde açık bir “Tanrı gücü” düğmesinden alttan açılan seçim paneli
  sun; üç tanrıyı okunaklı bir listede, seviyeleri ve etkileriyle göster.
- [x] Mevcut jetonu ve seviye bedellerini göster. Oyunun mevcut ödeme,
  öncelik ve hedef seçimi kurallarını koru; ileri aşamadaki jeton kazanımını
  yok sayan yeni bir seçim engeli ekleme.
- [x] “Kapat” düğmesi, dış alana dokunma ve Escape ile kapatmayı sağla;
  odağı açan düğmeye döndür. Panel açıkken arkadaki zarlar seçilmesin.
- [x] Tanrıyı incelemek ve paneli kapatmak oyun komutu üretmesin; kapatmak
  pas geçme sayılmasın. Güç seçimi ve güç kullanmadan devam etme yalnız
  ilgili açık eylemle işlensin.
- [x] Rakibin tanrılarını ve kendi güçlerini sıra dışında salt okunur
  incelemeyi koru; kendi güç kullanma eylemini sıra/faz kilitlerine bağla.
- [x] Hedef isteyen güçler dahil panel kaydırma, aç/kapat ve seçim akışını
  doğrula; masaüstü davranışını kontrol et, zorunlu komutları çalıştır,
  belgeleri güncelle ve commit et.

**Kabul:** Telefonda küçük 3B levhalara isabet ettirmeden güç seçilebilir.
Panelde her seçenek okunur ve klavye olmadan panelden çıkılabilir.

## Aşama 3 — Oyuncuya yakın mobil sahne

Bağımlılık: Aşama 1–2. HUD ve güç paneli, kadraj dışındaki parçaların
işlevlerini erişilebilir tutar.

- [x] Mobil kamerayı oyuncunun kasesi ve iki tarafın merkez zar sıralarına
  odakla. Rakibin kasesini ve dış masa kenarlarını sığdırma zorunluluğunu kaldır.
- [x] Rakibin kadraj dışındaki, henüz saklanmamış görünür zarlarını güncel
  yüzleri ve jeton işaretleriyle kompakt bir 2B özette sun. Bilgiyi yalnız
  sunumda görünür olduğu anda göster; gelecek zar yüzlerini erkenden gösterme.
- [x] İki koltukta da doğru yönü koru: bot, aynı cihazda iki kişi ve çevrim içi
  oyunda oyuncunun kendi kasesi yakında olsun. Sıra/koltuk dönüşünü doğrula.
- [x] Atış, merkezde saklama, savaş, jeton aktarımı ve tanrı etkilerinde
  okunması gereken hedeflerin kadraj/HUD altında kaybolmadığını kontrol et.
  Efekt ve seçim hedefleri yeni kamera izdüşümüyle eşleşsin.
- [x] Dikey/yatay geçişi, az hareket seçeneğini ve masaüstü kadrajını
  tarayıcıda doğrula; kamera davranışı için anlamlı testleri güncelle,
  zorunlu komutları çalıştır, belgeleri güncelle ve commit et.

**Kabul:** Kendi kasendeki ve merkezdeki zarlar belirgin biçimde daha büyük
görünür. Rakibin görünür zar bilgisi korunur; kamera değişikliği oyun sonucunu
ve sunum sırasını değiştirmez.

## Aşama 4 — Zar sembolleri, jeton işareti ve dokunma

Bağımlılık: Aşama 3. Ölçüler yeni kamera kadrajına göre değerlendirilir.

- [x] Mobilde beş zar sembolünü ilk bakışta ayırt edilebilir hale getir;
  kontrast, yüz açısı ve boyutu birlikte değerlendir.
- [x] Jeton kazandıran yüzde belirgin çerçeveye ek bir jeton işareti kullan.
  Seçili/saklanan zar vurgusuyla jeton kazanımı birbirine karışmasın.
- [x] Zarların ekrandaki aralığını ve dokunma hedeflerini birlikte düzenle;
  en az 44×44 piksel hedefi korurken komşu zarı yanlış seçme riskini azalt.
- [x] Kaseden seçme, merkezden geri alma ve kilitli/rakip zarını inceleme
  davranışlarını doğrula. Sembol ve “Jeton getirir” açıklaması mobilde
  erişilebilir kalsın; yalnız hover'a bağlı olmasın.
- [ ] Dokunma ve uzun basma davranışını uygun cihazda ayrıca doğrula;
  yalnız fare/klavye ile yapılan kontrolü dokunma testi diye işaretleme.
- [x] Ekstra zar/zar kaldırma etkilerinde taşma ve hedef eşleşmesini,
  masaüstü ve klavyeyi kontrol et; anlamlı davranış testlerini ve zorunlu
  komutları çalıştır, belgeleri güncelle ve commit et.

**Açık doğrulama:** Bu oturumda fiziksel dokunmatik cihaza erişim yoktu. Chromium'un CDP dokunma
benzetimiyle kısa dokunma, 400ms uzun basma ve liste kaydırma kontrol edildi;
bu, fiziksel iPhone/Android doğrulaması sayılmaz. Cihaz adımları
[Aşama 4 incelemesinde](docs/review/mobile-dice.md) kayıtlıdır.

**Kabul:** Balta, ok, miğfer, kalkan ve el ayırt edilir; jeton kazandıran yüz
ayrıca anlaşılır. Oyuncu istediği zarı güvenilir biçimde seçip geri alabilir.

## Aşama 5 — Birlikte doğrulama ve mobil kabul

Bağımlılık: Aşama 1–4. Bu aşama yeni özellik ekleme aşaması değildir;
bulunan kapsam içi hatalar düzeltilir.

- [x] 360×800, 390×844, 430×932 ve 844×390 ekranlarda tüm mobil akışı;
  tablet ve masaüstünde mevcut davranışın korunduğunu kontrol et.
- [x] Botla tam maç, yerel iki oyuncuda sıra değişimi ve çevrim içi oyunda
  iki koltuğu doğrula. Güç seçimi, savaş, sonuç ve yeniden maç akışlarını kapsa.
- [ ] Fiziksel iPhone/Safari ve Android/Chrome üzerinde dokunma, panel
  kaydırma, yön değiştirme ve tarayıcı çubuklarının açılıp kapanmasını doğrula.
  Donanım yoksa bu madde açık kalır; kullanıcı testi için kısa yönerge verilir.
- [x] Sekmeden çıkıp dönme, az hareket, kalite seçenekleri, uzun adlar ve
  yüksek jeton sayısında HUD/sahne tutarlılığını kontrol et. Fiziksel cihazda
  akıcılık veya ısınma sorunu gözlenirse bulguyu kaydet ve nedenini araştır.
- [x] Son değişikliklerden sonra zorunlu komutları çalıştır; cihaz/tarayıcı,
  test edilen akışlar, ekran görüntüsü konumları ve açık sorunları aşağıya
  kaydet. Yalnız doğrulanmış maddeleri kapatıp commit et.

**Kabul:** Yeni mobil düzen temel maç akışında kullanılabilir; doğrulanan ve
doğrulanamayan cihaz/etkileşimler açıkça kayıtlıdır. Fiziksel cihaz kontrolü
eksikken tüm mobil kabulün tamamlandığı söylenmez.

**Durum:** Tarayıcı doğrulaması tamamlandı; fiziksel cihaz kabulü bekleniyor.
Aşama 4'ün fiziksel dokunma maddesi ve bu aşamanın iPhone/Android maddesi
açık kalır. [Cihaz test yönergesi ve kayıt tablosu](docs/MOBILE_DEVICE_CHECKLIST.md)
hazırdır; tarayıcı benzetimi bu kayıtların yerine geçmez.

## Aşama 6 — Rakip hazne özetini kaldır ve oyun alanını aç

Bağımlılık: Mevcut Aşama 1–5 uygulaması. Toplu seçim bu aşamada eklenmez.

- [x] Mobil dikey ve kısa yatay görünümde **Rakibin haznesi** başlığını,
  özet zarlarını ve bunlara ait inceleme açılır alanını kaldır. Aynı zarlar
  için görünmez veya yinelenen dokunma hedefleri bırakma.
- [x] Özetin kapladığı boşluğu ve kamera inset ölçümünü temizle. Kadrajı
  kendi haznen ve iki merkez sırası için kullan; rakibin haznesini ayrıca
  sığdırma. Can/jeton, tur/sıra ve ana eylemler okunaklı kalsın.
- [x] Rakibin merkezdeki zar yüzlerini, jeton işaretlerini ve incelemesini
  koru. Hedef isteyen tanrı güçlerinin mevcut geçerli hedeflerini panelden
  seçme yolu kaybolmasın; oyun kuralları ve botun karar bilgisi değişmesin.
- [x] Artık kullanılmayan özet kodunu ve yalnız ona ait testleri gözden geçir;
  başka sunum işlevlerinin kullandığı olay verisini kaldırma.
- [x] Dikey/kısa yatay mobil, tablet ve masaüstünü tarayıcıda kontrol et;
  zorunlu komutları çalıştır, ilgili belgeleri güncelle ve commit et.

**Kabul:** Mobilde rakip hazne özeti görünmez ve boş şerit bırakmaz. Kendi
haznen, merkez zarları, kaynaklar ve güç hedefleri kullanılabilir kalır.

**Aşama 6 tamamlandı — 30 Ekim 2026.** Rakip hazne özeti, inceleme alanı,
özel stilleri ve yalnız özete ait sunum görünümü/testleri kaldırıldı. Kamera
ölçümü kaynaklar ile eylemlerden kalan alanı kullanır. Merkez zarlarının
incelemesi, jeton işaretleri ve paneldeki geçerli güç hedefleri korunur.

- Node 24.22.1 ile `npm run check` ve `npm run test:ci` geçti: **35 dosyada
  459 test**. İki koltuk/dikey/kısa yatay hedef filtresi, tablet/masaüstü
  hazne hedefleri ve panelde haznedeki/kaldırılan güç hedefleri doğrulandı.
- Chromium 143: 360×800, 390×844, 430×932, 844×390, 568×320, 768×1024,
  1440×900; özet/boş şerit yokluğu, 44px merkez hedefleri, inceleme, kaynaklar
  ve eylemler kontrol edildi. Normal harekette atış, koltuk dönüşü,
  seçim/geri alma ve merkezdeki rakip zarının altın jeton işareti de denendi.
- Ayrıntılar ve yerel kanıtlar: [Aşama 6 doğrulaması](docs/review/mobile-summary-removal.md).
  Fiziksel cihaz kabulü Aşama 4–5'te açık kalır. Toplu seçim ve zamanlayıcı
  eklenmedi; sonraki istek Aşama 7'dir.

## Aşama 7 — İki saniyelik toplu seçim ve tek taşıma

Bağımlılık: Aşama 6. Önce seçim, süre ve toplu sunum birlikte çalışır hale gelir.

- [x] Mobil kısa dokunmada zar kimliğine bağlı geçici seçimi anında onay imi
  ve mevcut seçim vurgusuyla göster. Aynı zara tekrar dokunma bu seçimi geri
  alsın; 44×44px hedefler seçim boyunca yerinde ve kullanılabilir kalsın.
- [x] Son geçerli seçim değişikliğinden itibaren **2000 ms** bekle. Yeni
  değişiklikte önceki süreyi iptal edip yeniden başlat; ilk dokunuştan itibaren
  sabit bir pencere veya her zar için ayrı zamanlayıcı kullanma.
- [x] Süre bitince bekleyen seçimlerin son halini tek bir toplu işlemle
  yetkili kurallara uygula; aynı olay grubundan tek toplu taşıma üret.
  Zar başına komut/animasyon zinciriyle seçim kilidini tekrarlama.
- [x] Geçici seçim işaretini henüz uygulanmış oyun durumundan ayır. UI zar
  yüzü, sonuç, can veya jeton üretmesin; kurallar ile görsel sunum aynı olay
  kaydından beslensin. `src/core` içine zamanlayıcı veya UI bağımlılığı ekleme.
- [x] Son taslak uygulanmış seçimle aynıysa gereksiz komut/taşıma üretme.
  Merkeze taşındıktan sonra henüz kilitlenmemiş zarları aynı toplu seçim
  mantığıyla geri alabil; önceki atışlarda kilitlenen zarları açma.
- [x] Anlamlı zamanlayıcı ve olay senaryolarıyla 1999/2000 ms sınırını,
  son dokunuşta süre yenilemeyi, beş zarın tek grupta taşınmasını, aynı zara
  çift dokunmayı ve toplu geri almayı doğrula. Bot ve masaüstünün mevcut
  davranışını koru; zorunlu komutları çalıştır, belgeleri güncelle ve commit et.

**Kabul:** Kullanıcı beş zarı arka arkaya seçerken her zarın animasyonunu
beklemez. Son seçim değişikliğinden 2 saniye sonra zarlar birlikte hareket
eder; yalnız bu beklemenin bitmesi oyun sırasını ilerletmez.

**Aşama 7 tamamlandı — 30 Ekim 2026.** Son dokunuşa göre yenilenen tek
2000 ms zamanlayıcı, anlık taslak vurgusu, atomik seçim olayı ve eşzamanlı
taşıma/geri alma uygulandı. Aşama 6'nın tamamlanmış `main` sürümüyle birleştirildi.

- Node 24.22.1 ile `npm run check` ve `npm run test:ci`: **38 dosya,
  479 test başarılı**. 1999/2000 ms sınırı, son değişiklikte süre yenileme,
  çift dokunmada komutsuz geri dönüş, beş zarın tek olay/zaman çizgisinde
  taşınması, toplu geri alma ve önceki kilitler doğrulandı.
- Chromium 143: 360×800, 390×844, 430×932, 844×390; taslak sırasında sabit
  44px hedefler, anlık onay imi, tek revision/olay, toplu geri alma ve aynı
  faz/sıra kontrol edildi. Normal fizik kaydı, azaltılmış hareket ve
  1440×900 masaüstü klavye/tekli seçim de kontrol edildi.
- Ayrıntılar: [Aşama 7 doğrulaması](docs/review/mobile-batch-selection.md).
  Süre dolmadan onaya taslağın aktarılması, ağ reddiyle uzlaşma ve birleşik
  kesinti kabulü Aşama 8'de açıktır. Fiziksel cihaz kabulü kapatılmadı.

## Aşama 8 — Onay, çevrim içi oyun ve kesintiler

Bağımlılık: Aşama 7. Taslak ile yetkili durumun yaşam döngüsü tamamlanır.

- [x] İki saniye dolmadan **Seçimi onayla** basılırsa bekleyen son seçimi
  süreyi beklemeden uygula ve mevcut onay akışını yalnız bir kez yürüt.
  Sıra önceki taslakla ilerlemesin; ek onay penceresi açma.
- [x] **Zar at** mevcut uygun fazda tek dokunuşla çalışsın. Seçim süresinin
  dolması atış, `ConfirmRoll` veya sıra/faz değişimi başlatmasın; üçüncü
  atışın mevcut otomatik saklama ve ilerleme kurallarını değiştirme.
- [x] Çevrim içi oyunda toplu seçimi sunucuda koltuk, faz ve revision ile
  doğrula. Kabul edilmeden sonraki onayı gönderme; reddedilen veya eski
  istekte taslağı güncel yetkili durumla uzlaştır. Tekrar mesajı çift taşıma
  ya da çift onay üretmesin; rakibin seçimlerini yerel taslak değiştirmesin.
- [x] Koltuk/faz/maç değişimi, çıkış, yeniden maç, bağlantı kopması veya
  WebGL toparlanmasında eski taslak ve callback'leri temizle. Yeni oyuna,
  başka oyuncuya veya artık olmayan zara gecikmiş seçim uygulama.
- [x] Tanrı/yardım/ayar penceresi açıldığında, sekme gizlendiğinde veya mobil
  düzenden çıkıldığında taslağı iptal edip uygulanmış seçime dön; zamanlayıcı
  kapalı görünümde komut göndermesin. Yalnız mobil içinde yön değişiminde
  taslağı ve kalan süreyi koru; yinelenen zamanlayıcı oluşturma.
- [x] Hızlı tekrar onayı, süre dolmasıyla aynı anda onay, uzun basma,
  kaydırma, klavye, kesinti ve iki gerçek ağ istemcisi senaryolarını doğrula;
  zorunlu komutları çalıştır, belgeleri güncelle ve commit et.

**Kabul:** Onay bekleyen seçimi kaybetmez veya iki kez işlemez. Eski
zamanlayıcı yeni koltukta/maçta çalışmaz; çevrim içi sonuç sunucuyla tutarlıdır.

**Aşama 8 tamamlandı — 31 Ekim 2026.** Erken onay son taslağı uygular;
seçim kabulü ve sunumu tamamlanınca onay bir kez gönderilir. Red/kayıp ACK
ve kesintilerde eski taslak/callback yeni tur, koltuk veya maça taşınmaz.

- Node 24.22.1: `npm run check` ve `npm run test:ci` geçti; **40 dosyada
  502 test**. Süreyle yarışan onay, ACK/sunum sırası, sunucu koltuk/faz/
  revision kontrolü, tekrar mesajları, üçüncü atış, klavye ve kesintiler kapsandı.
- Chromium 143: 390×844, 844×390, 568×320 ve mobil düzenden çıkış için
  1440×900. Normal/azaltılmış hareket, erken/tekrar onayı, CDP uzun basma/
  sürükleme/kaydırma, panel iptali, yön değişimi, WebGL toparlanması ve
  çıkış/yeni maç doğrulandı. İki gerçek Socket.IO istemcisiyle erken/süre
  sonrası onay, eski revision reddi ve offline/online dönüşü geçti.
- Google Chrome 156'da gerçek sekme geçişi taslağı iptal etti; gizliyken
  komut gönderilmedi, dönüşte aynı canvas ve revision korundu.
- Ayrıntı ve kanıtlar: [Aşama 8 doğrulaması](docs/review/mobile-selection-lifecycle.md).
  Fiziksel cihaz maddeleri ve Aşama 9'un birleşik tam maç kabulü açık kalır.

## Aşama 9 — Birleşik mobil doğrulama ve cihaz kabulü

Bağımlılık: Aşama 6–8. Yeni özellik eklenmez; kapsam içi sorunlar düzeltilir.

- [x] 360×800, 390×844, 430×932 ve 844×390 boyutlarında hazne özetinin
  yokluğunu, yüzlerin okunurluğunu, beş zarı hızlı seçmeyi, iki saniyelik
  beklemeyi, geri almayı ve beklerken onaylamayı tarayıcıda doğrula.
- [x] Normal/azaltılmış harekette botla maç, yerel iki oyuncuda koltuk
  değişimi ve iki çevrim içi koltukta atış–seçim–onay–güç–sonuç–yeniden
  maç akışını kontrol et. Ekstra/kaldırılan zarlar, dar alan kaydırması,
  yön değişimi ve sekmeden dönme de kapsansın.
- [x] Tablet ve masaüstünde mevcut tekli seçim, klavye/odak ve kamera
  davranışının korunduğunu doğrula; kaynakların olay zamanlaması değişmesin.
- [ ] Fiziksel iPhone/Safari ve Android/Chrome üzerinde hızlı çoklu dokunma,
  uzun basma, kaydırma ve yön değişimini test et. Donanım yoksa madde açık
  kalsın; önceki Aşama 4–5 fiziksel kabul maddelerini benzetimle kapatma.
  [Cihaz yönergesini](docs/MOBILE_DEVICE_CHECKLIST.md) yeni akışa göre güncelle.
- [x] `npm run check` ve `npm run test:ci` çalıştır; kullanılan cihaz/tarayıcı,
  ekran boyutu, kanıt konumları ve açık sorunları kaydet. Gerçekten doğrulanan
  maddeleri işaretle, güncel belgelerle birlikte commit et.

**Kabul:** Rakip hazne özeti olmadan merkez zarları okunur; çoklu seçim
her dokunuşta kesilmez. 2 saniye yalnız toplu taşıma içindir; atış ve sıra
ilerletme açık kullanıcı eylemine ve mevcut oyun kurallarına bağlıdır.

**Aşama 9 — Yazılım/tarayıcı doğrulaması tamamlandı, fiziksel kabul açık —
31 Ekim 2026.** Yeni özellik eklenmedi. Uzun basma sürerken toplu taşımanın
kilidi açılırsa bırakmanın komşuyu seçmesi sorunu düzeltildi. İptal edilmiş
hareket, bırakma tıklaması tüketilene kadar korunur; yeni dokunma çalışır.

- Node 24.22.1 ile `npm run check` ve `npm run test:ci` geçti: **40 dosya,
  503 test**. Yeni regresyon testi düzeltmeden önce hatayı gösterdi,
  sonrasında geçti. CDP sınır senaryosu normal/azaltılmış harekette de geçti.
- Chromium 143: dört mobil boyutta hızlı beşli seçim, sabit 44px yüzler,
  tek toplu taşıma/geri alma ve erken onay; bot, yerel ve iki gerçek ağ
  istemcisinde normal/azaltılmış tam maç–sonuç–yeniden maç doğrulandı.
  Düzeltmeden sonra CDP zar dokunmasıyla bir tam yerel maç da tamamlandı.
- Aynı seed ile azaltılmış/normal/CDP yerel maçların 140 olaylık kayıtları
  eşleşti. Tablet/masaüstünde klavye, tekli seçim, odak ve tur 2; gerçek core
  olaylarından ek/kaldırılan zar ara durumları ve 18 hedefin dar alanda
  kaydırılması kontrol edildi. HUD karşılaştırmalarında uyuşmazlık yoktu.
- Mobil yön değişiminde taslak/kalan süre korundu. Google Chrome 156'da
  gerçek sekme geçişi/dönüş kontrol edildi. Kanıtlar ve sınırlar:
  [Aşama 9 doğrulaması](docs/review/mobile-batch-acceptance.md).
- Fiziksel iPhone/Safari ve Android/Chrome testi yapılmadı. Cihaz maddesi
  ve Aşama 4–5'in fiziksel maddeleri açık kaldı; [güncel yönerge ve kayıt
  tablosu](docs/MOBILE_DEVICE_CHECKLIST.md) iki cihazın sonucunu bekler.

## Aşama 10 — Botun seçimini tek grupta uygula

Bağımlılık: Mevcut Aşama 7–9 uygulaması. İnsan seçimi ve yüz yerleşimi bu
aşamada yeniden tasarlanmaz. Botun toplu seçimi mobil ve geniş ekranda aynıdır.

- [x] Botun aynı atışta saklamak veya geri almak istediği bütün kilitsiz
  zarların son seçimini tek kararda üret; mevcut `SetDiceSelection` komutunu
  ve `DiceSelectionChanged` olayını kullan. Zar başına komut döndürme.
- [x] Mevcut zorluk profillerinin değerlendirmesini, görünür bilgi sınırını,
  rastgele kaynağı ve önceki atışların kilitli zarlarını koru. Toplu seçim
  yeni atış veya daha güçlü bir bot profili oluşturmasın.
- [x] Mevcut kısa düşünme süresinden sonra tek toplu taşıma oynat; bota
  insanın 2000 ms taslak zamanlayıcısını veya zar başına bekleme ekleme.
  Seçim değişmiyorsa boş taşıma oluşturmadan mevcut onay yoluna geç.
- [x] `ConfirmRoll` yalnız seçim kabulü ve toplu sunum bitince bir kez
  gönderilsin. Sekme/odak kaybı, sahne kaybı, çıkış ve yeniden maç eski bot
  kararını yeni bağlama taşımasın; üçüncü atışın otomatik akışı korunsun.
- [x] Çoklu seçim/geri alma, değişmeyen seçim, kilitli zar ve kesintileri
  anlamlı AI/sürücü/sunum testleriyle doğrula. Aynı atış durumunda eski
  değerlendirmeyle seçilen nihai zar kümesini karşılaştır; tek seçim
  revision/olayı, tek ortak taşıma ve sunum sonrası tek onayı denetle.
- [x] Normal/azaltılmış harekette mobil ve masaüstü bot sırasını tarayıcıda
  izle. Zorunlu komutları çalıştır; `ARCHITECTURE.md`, `DESIGN.md` ve ilgili
  doğrulama kaydını güncelle, doğrulanan maddeleri aynı commit'te işaretle.

**Kabul:** Bot üç zar saklayacaksa üç ayrı gizlenme–taşıma–yeniden görünme
döngüsü oluşmaz; üçü birlikte gider. İnsan mobil seçiminin 2000 ms davranışı
ve masaüstündeki insanın tekli seçimi korunur.

## Aşama 11 — Mobil yüzleri oyunculara ait kararlı sıralara yerleştir

Bağımlılık: Aşama 10. Savaş hareketleri Aşama 12–13'te ele alınır.

- [ ] Ortak en yakın boş hücre yerleşimini, oyuncu ve zar kimliğine bağlı
  slotlarla değiştir. Merkezde rakibin grubu üstte, oyuncunun grubu altta
  olsun; bir oyuncunun ikonu diğerinin sırasındaki boşluğu doldurmasın.
- [ ] Normal altı zarı her oyuncunun kendi düzenli sırasında tut. Üçe kadar
  ek zar için o oyuncuya ait ikinci sıra ayır; dar/kısa yatay alanda düzenli
  sarma veya grup içi kaydırma kullan. Etkileşimli yüzler en az 44×44px
  kalsın; sığdırmak için üst üste bindirme veya küçültme yapma.
- [ ] Aynı grup içindeki zarların slotlarını seçim/geri alma ve başka zarın
  kaldırılması sırasında koru. Hazne–merkez geçişini açıkça göster; kalan
  ikonlar boşluk kapatmak için rastgele yeniden dizilmesin. İptal edilen
  dokunmanın bırakılması yer değiştirmiş komşu zarın seçimine dönüşmesin.
- [ ] Yüz, jeton işareti, etki değeri ve seçili/kilitli bilgisi aynı sunum
  durumundan gelsin. 2B yüz ile gerçek 3B zarın bağı konum ve gerektiğinde
  kısa bağlantı çizgisiyle anlaşılır kalsın; ikinci bir zar sonucu üretme.
- [ ] Rakibin hazne özetini geri getirme. Kendi hazne hedeflerini, merkezde
  iki tarafın incelemesini, uzun basmayı, klavyeyi ve güç panelinin geçerli
  hedeflerini koru. Botta/ağda kişisel koltuk, yerelde aktif koltuk yönünü izle.
- [ ] 0–6 ve ek zarlarla 9'ar hedef, kaldırılan/kullanılan zarlar, iki
  koltuk, yön değişimi, HUD ve kısa yatay alan için slot/grup/kimlik
  davranışlarını test et. Fotoğraflardaki 12 zarlık kümeyi tarayıcıda yeniden
  kur; 18 zar ve masaüstü gerileme kontrollerini de yap.
- [ ] Zorunlu komutları çalıştır, tasarım/mimari ve görsel kanıt kaydını
  güncelle; doğrulanan kapsamı commit et. Yalnız çakışmama testiyle görsel
  sıraların okunur olduğunu kabul etme.

**Kabul:** İki tarafın zarları tek bir basamaklı kümeye karışmaz. Hangi yüzün
kime ve hangi 3B zara ait olduğu anlaşılır; bir ikon ayrılınca diğerleri
yer değiştirmez. Mevcut hızlı çoklu seçim kullanılabilir kalır.

## Aşama 12 — Savaşta yüz okunurluğunu ve olay kadrajını koru

Bağımlılık: Aşama 11. Önce okunurluk sürekliliği sağlanır; saldıran zarın
hareketi Aşama 13'tedir.

- [ ] Etkileşim kilidi ile yüzün görünürlüğünü ayır. Çözümleme sırasında
  seçim kapalı kalsın; görünen bütün yüzler yalnız `disabled` olduğu için
  kaybolmasın. Dekoratif yüzler tıklama/odak hedefi oluşturmasın.
- [ ] Sunum grubu sürerken de yüzün konumunu güncel 3B parça/kamera
  izdüşümünden okuyabil. `publishTargets` içindeki sunum kilidi nedeniyle
  eski koordinatlarda donma oluşmasın; bu salt okunur görsel takip seçim
  kilidini açmasın veya bekleyen grubun nihai yüz/sonucunu erkenden göstermesin.
- [ ] O anki olayın kaynak ve hedef zarlarını mevcut olay kimliklerinden
  vurgula. Diğer yüzlerin vurgusunu azalt; sıradaki zarları veya nihai can/
  jeton değerlerini erkenden gösterme. Kaldırılan/kullanılan zarın yüzünü
  mevcut olay ve toplama sınırında temizle.
- [ ] Kameranın tek yazım yolunu koruyarak kadrajı olayın kaynak, hedef ve
  hareket alanına göre ayarla. Her çözümlemede bütün masayı uzaktan
  göstermek yerine okunur aktif parçaları ve temas noktasını birlikte kapsa.
  Can/jeton/tanrı etkilerinde hedef HUD altında veya ekran dışında kalmasın.
- [ ] Olay geçişlerinde yüzleri ve kadrajı kararlı tut; yüz katmanı 3B
  parçanın üstünü anlamsız biçimde kapatmasın. Azaltılmış harekette uzun
  kamera hareketi olmadan kaynak, hedef ve sonuç anlaşılır kalsın.
- [ ] Saldırı/blok, doğrudan hasar, kazanım/çalma/ödeme, tanrı etkisi ve
  toplamada iki koltuğun kadrajını ve olay–yüz bağını doğrula. Sekme dönüşü,
  WebGL toparlanması ve yeniden maç eski vurgu veya hayalet yüz bırakmasın.
- [ ] Dikey/kısa yatay mobilde seçim → güç → savaş → sonraki tur geçişlerini
  normal/azaltılmış harekette tarayıcıda izle; tablet/masaüstünü kontrol et.
  Zorunlu komutlar, güncel belgeler ve görsel kanıtla aşamayı commit et.

**Kabul:** Savaşa girildiğinde okunur yüzlerden bir anda küçük, anlaşılması
güç zarlara geçilmez. Aktif kaynak ve hedef görülebilir; etkileşim kilidi ve
oyun olaylarının sırası korunur.

## Aşama 13 — Saldırı, blok ve hasarı görünür zar hareketiyle anlat

Bağımlılık: Aşama 12. Kadraj ve yüz sürekliliğinin üstüne hareket eklenir.

- [x] Her saldırıyı mevcut `AttackBlocked` veya `DamageDealt` olayındaki
  kaynak/hedef kimliklerinden sun. Saldıran 3B zar ve ona bağlı okunur yüz,
  blokta savunma zarına; doğrudan hasarda ilgili can taşı temasına belirgin
  hareket etsin. Küçük bir efekt uçuşu tek başına saldırı anlatımı olmasın.
- [x] Hazırlık → hareket → temas/tepki → geri dönüş veya toplama adımlarını
  aynı olayın zaman çizgisinde kur. Saldıran ve savunan yüzün kimliği hareket
  boyunca korunsun; aktif zar hareket ederken diğer slotlar yeniden akmasın.
- [x] Blokta savunma tepkisini, hasarda etkilenen can taşını açıkça göster.
  Çok değerli veya birden çok katkılı zarın son katkısı bitmeden zarı toplama;
  geçici hareketin dönüş konumu ile nihai toplama konumunu ayır.
- [x] Fizik kaydı, mevcut düzenleme animasyonu ve savaş hareketi aynı
  nesnenin konumunu eşzamanlı yazmasın. Sahiplik geçişi, iptal ve toparlanma
  sınırlarını açık kur; eski callback yeni sahneye veya maça yazmasın.
- [x] Hasar/iyileşme ve jeton değişimini mevcut `progress`/temas olayında
  uygula. Animasyon yeni saldırı eşleştirmesi, hasar hesabı veya çalma sonucu
  üretmesin. Güç önceliği, ölüm kontrolü ve olay sırası aynen korunsun.
- [x] Azaltılmış harekette yolculuk yerine kısa, anlaşılır kaynak/hedef ve
  temas bildirimi kullan. Hız/kalite seçenekleri, duraklama, sekmeden dönüş
  ve WebGL toparlanması aynı nihai sunum durumuna ulaşsın.
- [x] Aynı olay kayıtlarını normal ve azaltılmış harekette karşılaştır;
  çoklu blok/hasar, çok değerli zar, ölümde kesilme ve son katkıda toplama
  senaryolarını test et. Mobilde gerçek hareketi tarayıcıda izle; zorunlu
  komutları çalıştır, belgeleri/kanıtları güncelle ve commit et.

**Kabul:** Oyuncu hangi zarın neye saldırdığını, engellenip engellenmediğini
ve canın hangi temasta düştüğünü takip edebilir. Hareket ve yüz aynı zara
aittir; kural sonucu önceki olay kaydıyla aynıdır.

**Aşama 13 — Uygulandı; Aşama 12 bağımlılığı açık — 31 Ekim 2026.**
Kaynak zar hareketi, savunma tepkisi, gerçek can taşı teması, geri dönüş,
son katkıda toplama ve mobil aktif yüz takibi eklendi. Kullanıcının kapsam
kararıyla Aşama 10–12 uygulanmadı. Bu yüzden genel sabit sıralar, bütün savaş
olaylarında yüz sürekliliği ve olay odaklı yakın kadraj tamamlanmış sayılmaz.
Doğrulama ve sınırlar: [Aşama 13 kaydı](docs/review/combat-dice-motion.md).

## Aşama 14 — Lobide hazırlığı geri al ve tanrıları yeniden düzenle

Bağımlılık: Mevcut oda/hazırlık akışı. Zar/savaş aşamalarından teknik olarak
bağımsızdır; uygulama teslim sırası Aşama 13 sonrasıdır. Mobil ve masaüstünü
ve aynı odada yeniden maç hazırlığını kapsar.

- [ ] Diğer oyuncu henüz hazır değilken **Hazırım** eylemi hazır durumunu
  versin; aynı kontrol **Hazır değilim** olarak etkin kalsın ve hazırlığı geri
  alabilsin. Geri alınca kendi adını/tanrılarını düzenleme kilidi açılsın;
  seçimler silinmesin ve karşı taraf güncel hazır durumunu görsün.
- [ ] Hazırlığı kaldırma işlemini ağ protokolü, istemci ve oda sunucusunda
  birlikte tanımla. Sunucu yalnız isteyen koltuğun durumunu, uygun `gods`
  aşamasında değiştirsin; arayüz kabul edilmemiş hazır durumunu kesinleşmiş
  olarak göstermesin.
- [ ] İki tarafın hazır olmasının kabulü ile hazırlığın geri alınması
  yarışını sunucuda sırala. Geri alma önce kabul edilirse sonraki aşamaya
  geçme; iki hazır kabul edilip yazı tura/maç aşamasına geçildiyse gecikmiş
  geri almayı reddet ve istemciyi güncel durumla uzlaştır.
- [ ] Bekleyen istekte tekrar tıklamayı sınırla; red/kayıp ACK, kopma/dönüş
  ve eski oda/maç mesajları yanlış hazır etiketi veya tanrı kilidi bırakmasın.
  Tekrar istek hazır durumunu istemeden tersine çevirmesin; hedef hazır
  durumu açıkça belirtilsin. Rakibin seçimine müdahale yolu açılmasın.
- [ ] İki gerçek ağ istemcisinde kurucu ve misafir için hazır → hazır değil
  → tanrı değiştir → tekrar hazır akışını; eşzamanlı hazır/geri alma,
  geçersiz koltuk/faz, kopma/dönüş ve yeniden maçı doğrula. Yerel iki kişi
  ve bot hazırlığının mevcut başlama akışını bozma.
- [ ] Sunucu/istemci ve UI davranışı için anlamlı testler ekle; iki tarayıcı
  koltuğunda mobil/masaüstü düğme, kilit ve karşı taraf bilgisini kontrol et.
  Zorunlu komutları çalıştır; `docs/ONLINE_PLAY.md`, mimari/tasarım ve
  doğrulama kaydını güncelle, aşamayı commit et.

**Kabul:** Tek başına hazır vermiş oyuncu odadan çıkmadan hazırlığını geri
alıp tanrılarını değiştirebilir. Her iki istemci sunucuyla aynı hazır
durumundadır; başlamış maç eski bir istekle hazırlığa dönmez.

## Aşama 15 — Yayın sonrası sorunlar için birleşik ve fiziksel kabul

Bağımlılık: Aşama 10–14. Yeni özellik eklenmez; bu aşamalardaki kapsam içi
hatalar düzeltilir. Önceki açık cihaz kabulüyle birlikte kayıt tutulur.

- [ ] 360×800, 390×844, 430×932, 844×390 ve dar alan için 568×320'de botun
  toplu seçimini, insanın 2000 ms seçimini, 12/18 zar yerleşimini ve olay
  boyunca yüz/kadraj/hareket sürekliliğini doğrula. Aynı durumları kullanıcının
  yayın sonrası görüntülerindeki düzensiz kümelerle karşılaştır.
- [ ] Botla tam maç, yerel iki koltukta sıra değişimi ve iki gerçek çevrim
  içi koltukta hazırlığı geri alma → tanrı değiştirme → maç → sonuç → yeniden
  maç akışını normal/azaltılmış harekette tamamla. Tablet/masaüstünde mevcut
  insan tekli seçimi, klavye, odak ve kamera davranışını ayrıca kontrol et.
- [ ] Savaş öncesi/sonrası güçlerin aynı olay sırasını ve ödeme anını
  koruduğunu doğrula. 5 + 1 kazanım + 2 çalma örneğinde 8 bedelli savaş
  öncesi gücün başarısızlığını ve savaş sonrası gücün, başka kayıp yoksa,
  çalışmasını kontrol et; bu farkı hata olarak kapatma.
- [ ] Uzun basma/iptal, hızlı tekrar onayı, yön değişimi, sekmeden çıkıp
  dönme, bağlantı kaybı ve WebGL toparlanmasında yüz kimliklerini, sunum
  kilitlerini, kaynak temaslarını ve lobi durumunu birlikte denetle.
- [ ] Fiziksel iPhone/Safari ve Android/Chrome üzerinde hızlı seçim, botun
  tek taşıması, 12/18 yüzün okunurluğu, savaş hareketleri, lobi hazır geri
  alma, yön değişimi ve tarayıcı çubuklarını test et. Cihaz akıcılığı/ısınması
  gözlemlerini kaydet; donanım yoksa bu maddeyi açık bırak.
- [ ] Son değişikliklerden sonra `npm run check` ve `npm run test:ci`
  çalıştır. Tarayıcı/cihaz, test akışları, ekran görüntüsü ve hareket kanıtı
  konumlarını, açık sorunları `docs/review/` altında kaydet;
  `docs/MOBILE_DEVICE_CHECKLIST.md` yönergesini yeni akışlarla güncelle.
  Önceki Aşama 4–5/9 cihaz maddelerini yalnız karşılıkları gerçekten
  doğrulandıysa aynı commit'te işaretle; kalanı açıkça belirt.

**Kabul:** Dört kullanıcı sorunu birlikte giderilmiş ve sonuçlar olay
kayıtlarıyla tutarlıdır. Statik ekran görüntüsü hareket kabulünün; tarayıcı
benzetimi fiziksel cihaz kabulünün yerine geçmez. Donanım doğrulaması eksikse
yalnız yazılım/tarayıcı kapsamının tamamlandığı bildirilir.

## Doğrulama ve devam notları — Önceki Aşama 1–5

**Aşama 1 tamamlandı — 30 Ekim 2026.** Mobil kaynak göstergeleri mevcut sunum
durumunu izler. Kamera, güç seçimi ve oyun kuralları değiştirilmedi.

- Node 24.21.0 ile `npm run check` geçti; `npm run test:ci`: 32 dosya, 431 test
  başarılı. Dört yeni test iki koltuğu, sıfır/yüksek jetonu, temas öncesi/sonrası
  kaynakları ve eski/tekrar callback'lerin reddini kapsar.
- Chromium 143'te 320×568, 360×800, 390×844, 430×932, 568×320, 667×375,
  844×390, 768×1024 ve 1440×900 görüntülendi. Uzun adlar, 0/999 jeton,
  güvenli alan benzetimi, güç fazı/hata metni ve yerel ikinci koltuk kontrol
  edildi. Normal ve azaltılmış harekette gerçek olay kuyruğunun 21'er durum
  güncellemesinde DOM sayıları sunum durumuyla eşleşti.
- Ayrıntı ve ekran görüntüsü konumları: [Aşama 1 doğrulaması](docs/review/mobile-hud.md).
  Tarayıcı boyutu/güvenli alan benzetimi fiziksel cihaz testi değildir.
  iPhone/Safari, Android/Chrome ve gerçek dokunma kabulü Aşama 5'te açık kalır.
- Mevcut örtüşen zar hedefleri Aşama 4 kapsamında kalır.

**Aşama 2 tamamlandı — 30 Ekim 2026.** Mobil güç paneli, mevcut üç tanrı,
seviye/bedel/etki, hedef seçimi ve salt okunur iki taraf incelemesini sunar.
Kapatma ve inceleme komut üretmez; mevcut ödeme/öncelik kuralları korunur.

- Node 24.22.1 ile `npm run check` geçti; `npm run test:ci`: 33 dosya,
  439 test başarılı. Aşama 1 HUD'u ile birleşik sürüm doğrulandı.
- Chromium 143: 360×800, 390×844, 844×390 ve 1440×900 üzerinde gerçek
  3B masa, panel kaydırma, kapatma, odak dönüşü, hedef seçimi ve masaüstü
  menüsü kontrol edildi. Ayrıntılar: [Aşama 2 doğrulaması](docs/review/mobile-favor-panel.md).
- Tarayıcı boyutu benzetimi fiziksel dokunma testi değildir; iPhone/Safari
  ve Android/Chrome kabulü Aşama 5'te açık kalır.

**Aşama 3 tamamlandı — 30 Ekim 2026.** Mobil kadraj yakın hazne ve merkez
sıralarına odaklanır; rakip haznedeki görünür zarlar sunum zamanlamasını
koruyan 2B özette gösterilir. Aşama 1–2 ile birleşik sürüm doğrulandı.

- Node 24.21.0 ile `npm run check` ve `npm run test:ci` geçti: 34 dosyada
  443 test. Kamera testleri iki koltuğun yakın haznesini, dokuz zarlık sıraları,
  çözümleme temas alanlarını ve masaüstü kadrajını; yeni özet testleri yüz
  yayınlama zamanını, jeton/değer işaretlerini ve eski callback'leri kapsar.
- Chromium 143: 360×800, 390×844, 430×932, 568×320, 667×375, 844×390,
  768×1024, 1440×900; yön geçişleri, normal/azaltılmış hareket, yerel koltuk
  dönüşü, bot ve iki gerçek ağ koltuğu kontrol edildi. Ölçülen mobil
  görünümlerde yakın haznedeki zar genişliği önceki kameraya göre yaklaşık
  1,46–1,53 kat arttı. Dokuz zar ve güvenli alan benzetimleri de doğrulandı.
- Kanıtlar ve sınırlar: [Aşama 3 doğrulaması](docs/review/mobile-camera.md).
  Fiziksel iPhone/Safari ve Android/Chrome, gerçek dokunma ve cihaz
  performansı Aşama 5'te açıktır.
- Zar geometrisi, fizik sonucu ve oyun kuralları Aşama 3'te değiştirilmedi.

**Aşama 4 — Yazılım uygulandı, fiziksel dokunma kontrolü açık — 30 Ekim 2026.**
Mobil yüz hedefleri ve dinlenmiş üst yüzler daha okunur; jeton ayrı işaretle,
seçili/kilitli durum camgöbeği onay imiyle gösterilir. 44px hedefler HUD'dan
kalan alanda ayrılır; sığmazsa kaydırılır. Rakip özeti dokunarak incelenir.

- Node 24.22.1: `npm run check` ve `npm run test:ci` geçti; 37 dosyada
  460 test başarılı. Ayrıntılar [Aşama 4 doğrulamasında](docs/review/mobile-dice.md).
- Chromium 143 / CDP dokunma benzetimi: 360×800, 390×844, 430×932,
  844×390, 568×320; 1440×900 masaüstü; kısa dokunma/geri alma, uzun basma,
  rakip/kilitli inceleme, 18 zar, kaldırılan hedef ve dar alan kaydırması.
  Normal fizik kaydıyla atış/seçim ve azaltılmış hareket ayrıca kontrol edildi.
- Fiziksel cihaz maddesi `[ ]` kalır. Bu kontrol ve Aşama 5 ortak kabulü
  tamamlanmadan bütün mobil kabulün bittiği söylenmez. Aşama 5'e otomatik
  başlanmadı.

**Aşama 5 — Tarayıcı doğrulaması tamamlandı, fiziksel kabul açık — 30 Ekim 2026.**

- Aşama 1–4'ün birleşik sürümünde `npm run check` ve `npm run test:ci`
  geçti: Node 24.21.0, 37 dosyada 460 test. Kozmetik araç düğmesi düzeltmesi
  için yapay test eklenmedi.
- Chromium 143: 390×844'te botla 5 turluk tam maç; 360×800'de azaltılmış
  hareketle ve 430×932'de normal hareketle 4'er turluk yerel maç; 844×390
  kurucu / 390×844 misafir ile 5 turluk gerçek Socket.IO maçı tamamlandı.
  Güç kararı, savaş, sonuç ve aynı oyuncu/odada yeniden maç doğrulandı.
- 768×1024 tablet ve 1440×900 masaüstünde bir tur, mevcut tanrı menüsü ve
  sonraki tur kontrol edildi. Uzun adlar, 0/999 jeton, kalite varyantları ve
  CDP ile üretilen kısa dokunma/uzun basma/panel kaydırma da geçti.
- Google Chrome 156'da odak benzetimi kapalı gerçek sekme geçişinde sayfa
  gizlendi, arka plan ilerlemesi tamamlandı; dönüşte aynı WebGL canvas'ı
  güncel kaldı. 360px ve altında maç başlığının 40px'e düşen araç düğmeleri
  44px'e düzeltildi; 320px ve 360px sınırları kontrol edildi.
- Ayrıntı, kanıt konumları ve açık kabul: [Aşama 5 raporu](docs/review/mobile-acceptance.md).
  Fiziksel iPhone/Safari ve Android/Chrome, gerçek tarayıcı çubukları, cihaz
  akıcılığı/ısınması test edilmedi. Bu nedenle tüm mobil kabul tamamlanmış
  sayılmaz; [fiziksel cihaz yönergesi](docs/MOBILE_DEVICE_CHECKLIST.md) ile
  iki cihazın sonuçları beklenir.

## Bu planın dışında

Yeni oyun kuralı, tanrı önceliklerini veya ödeme sırasını kaldırma/değiştirme,
yeni tanrı, masaüstü yeniden tasarımı, maç öncesi tanrı kataloğu yenilemesi ve
bağımsız bir performans projesi bu plana dahil değildir. Aşama 14 yalnız
mevcut tanrı hazırlığındaki hazır durumunu geri alma akışını genişletir.
GitHub yayın kopyasına aktarım, push ve canlıya alma ayrıca istendiğinde
yapılır; bu yol haritası yayın yetkisi vermez. Mevcut Git geçmişi korunur.
