# Mobil oynanabilirlik yol haritası

Tarih: 30 Ekim 2026

Amaç, telefonda zarları, kaynakları ve tanrı güçlerini rahatça okuyup
seçebilmek. Masaüstünün mevcut görünümü ve oyun kuralları korunur.
Bu dosya planı gösterir; geliştirmelerin tamamlandığı anlamına gelmez.

## İlerleme biçimi

- Her istekte yalnızca belirtilen aşama uygulanır. Sonraki aşamaya otomatik
  geçilmez. Örnek: **“ROADMAP.md içindeki Aşama 1'i uygula.”**
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

## Başlangıç bulguları

Canlı sitede 390×844 ve 360×800 dikey, 844×390 yatay ekran boyutlarıyla
hazırlık, zar atma/saklama ve tanrı gücü menüsü incelendi:

- Kamera masanın dış kenarlarını da sığdırdığı için oyun parçaları çok küçük.
- Can ve jeton sayıları görsel arayüzde okunaklı sayısal göstergelerle sunulmuyor.
- Zar sembolleri ve jeton kazandıran altın çerçeve küçük ölçekte zor seçiliyor.
- 44×44 piksellik zar hedefleri yakın duran zarların üzerinde örtüşüyor.
- Masadaki üç tanrı levhası telefonda okunmuyor. Güç menüsünde görünür kapatma
  düğmesi yok; “Escape ile kapat” yönlendirmesi telefona uygun değil.

Bu inceleme fiziksel iPhone/Android testi veya tam maç doğrulaması değildir.

## Ortak sınırlar

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

- [ ] Mobilde açık bir “Tanrı gücü” düğmesinden alttan açılan seçim paneli
  sun; üç tanrıyı okunaklı bir listede, seviyeleri ve etkileriyle göster.
- [ ] Mevcut jetonu ve seviye bedellerini göster. Oyunun mevcut ödeme,
  öncelik ve hedef seçimi kurallarını koru; ileri aşamadaki jeton kazanımını
  yok sayan yeni bir seçim engeli ekleme.
- [ ] “Kapat” düğmesi, dış alana dokunma ve Escape ile kapatmayı sağla;
  odağı açan düğmeye döndür. Panel açıkken arkadaki zarlar seçilmesin.
- [ ] Tanrıyı incelemek ve paneli kapatmak oyun komutu üretmesin; kapatmak
  pas geçme sayılmasın. Güç seçimi ve güç kullanmadan devam etme yalnız
  ilgili açık eylemle işlensin.
- [ ] Rakibin tanrılarını ve kendi güçlerini sıra dışında salt okunur
  incelemeyi koru; kendi güç kullanma eylemini sıra/faz kilitlerine bağla.
- [ ] Hedef isteyen güçler dahil panel kaydırma, aç/kapat ve seçim akışını
  doğrula; masaüstü davranışını kontrol et, zorunlu komutları çalıştır,
  belgeleri güncelle ve commit et.

**Kabul:** Telefonda küçük 3B levhalara isabet ettirmeden güç seçilebilir.
Panelde her seçenek okunur ve klavye olmadan panelden çıkılabilir.

## Aşama 3 — Oyuncuya yakın mobil sahne

Bağımlılık: Aşama 1–2. HUD ve güç paneli, kadraj dışındaki parçaların
işlevlerini erişilebilir tutar.

- [ ] Mobil kamerayı oyuncunun kasesi ve iki tarafın merkez zar sıralarına
  odakla. Rakibin kasesini ve dış masa kenarlarını sığdırma zorunluluğunu kaldır.
- [ ] Rakibin kadraj dışındaki, henüz saklanmamış görünür zarlarını güncel
  yüzleri ve jeton işaretleriyle kompakt bir 2B özette sun. Bilgiyi yalnız
  sunumda görünür olduğu anda göster; gelecek zar yüzlerini erkenden gösterme.
- [ ] İki koltukta da doğru yönü koru: bot, aynı cihazda iki kişi ve çevrim içi
  oyunda oyuncunun kendi kasesi yakında olsun. Sıra/koltuk dönüşünü doğrula.
- [ ] Atış, merkezde saklama, savaş, jeton aktarımı ve tanrı etkilerinde
  okunması gereken hedeflerin kadraj/HUD altında kaybolmadığını kontrol et.
  Efekt ve seçim hedefleri yeni kamera izdüşümüyle eşleşsin.
- [ ] Dikey/yatay geçişi, az hareket seçeneğini ve masaüstü kadrajını
  tarayıcıda doğrula; kamera davranışı için anlamlı testleri güncelle,
  zorunlu komutları çalıştır, belgeleri güncelle ve commit et.

**Kabul:** Kendi kasendeki ve merkezdeki zarlar belirgin biçimde daha büyük
görünür. Rakibin görünür zar bilgisi korunur; kamera değişikliği oyun sonucunu
ve sunum sırasını değiştirmez.

## Aşama 4 — Zar sembolleri, jeton işareti ve dokunma

Bağımlılık: Aşama 3. Ölçüler yeni kamera kadrajına göre değerlendirilir.

- [ ] Mobilde beş zar sembolünü ilk bakışta ayırt edilebilir hale getir;
  kontrast, yüz açısı ve boyutu birlikte değerlendir.
- [ ] Jeton kazandıran yüzde belirgin çerçeveye ek bir jeton işareti kullan.
  Seçili/saklanan zar vurgusuyla jeton kazanımı birbirine karışmasın.
- [ ] Zarların ekrandaki aralığını ve dokunma hedeflerini birlikte düzenle;
  en az 44×44 piksel hedefi korurken komşu zarı yanlış seçme riskini azalt.
- [ ] Kaseden seçme, merkezden geri alma ve kilitli/rakip zarını inceleme
  davranışlarını doğrula. Sembol ve “Jeton getirir” açıklaması mobilde
  erişilebilir kalsın; yalnız hover'a bağlı olmasın.
- [ ] Dokunma ve uzun basma davranışını uygun cihazda ayrıca doğrula;
  yalnız fare/klavye ile yapılan kontrolü dokunma testi diye işaretleme.
- [ ] Ekstra zar/zar kaldırma etkilerinde taşma ve hedef eşleşmesini,
  masaüstü ve klavyeyi kontrol et; anlamlı davranış testlerini ve zorunlu
  komutları çalıştır, belgeleri güncelle ve commit et.

**Kabul:** Balta, ok, miğfer, kalkan ve el ayırt edilir; jeton kazandıran yüz
ayrıca anlaşılır. Oyuncu istediği zarı güvenilir biçimde seçip geri alabilir.

## Aşama 5 — Birlikte doğrulama ve mobil kabul

Bağımlılık: Aşama 1–4. Bu aşama yeni özellik ekleme aşaması değildir;
bulunan kapsam içi hatalar düzeltilir.

- [ ] 360×800, 390×844, 430×932 ve 844×390 ekranlarda tüm mobil akışı;
  tablet ve masaüstünde mevcut davranışın korunduğunu kontrol et.
- [ ] Botla tam maç, yerel iki oyuncuda sıra değişimi ve çevrim içi oyunda
  iki koltuğu doğrula. Güç seçimi, savaş, sonuç ve yeniden maç akışlarını kapsa.
- [ ] Fiziksel iPhone/Safari ve Android/Chrome üzerinde dokunma, panel
  kaydırma, yön değiştirme ve tarayıcı çubuklarının açılıp kapanmasını doğrula.
  Donanım yoksa bu madde açık kalır; kullanıcı testi için kısa yönerge verilir.
- [ ] Sekmeden çıkıp dönme, az hareket, kalite seçenekleri, uzun adlar ve
  yüksek jeton sayısında HUD/sahne tutarlılığını kontrol et. Fiziksel cihazda
  akıcılık veya ısınma sorunu gözlenirse bulguyu kaydet ve nedenini araştır.
- [ ] Son değişikliklerden sonra zorunlu komutları çalıştır; cihaz/tarayıcı,
  test edilen akışlar, ekran görüntüsü konumları ve açık sorunları aşağıya
  kaydet. Yalnız doğrulanmış maddeleri kapatıp commit et.

**Kabul:** Yeni mobil düzen temel maç akışında kullanılabilir; doğrulanan ve
doğrulanamayan cihaz/etkileşimler açıkça kayıtlıdır. Fiziksel cihaz kontrolü
eksikken tüm mobil kabulün tamamlandığı söylenmez.

## Doğrulama ve devam notları

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
- Sıradaki iş **Aşama 2**; ayrıca istenmeden başlanmaz. Mevcut örtüşen zar
  hedefleri Aşama 4 kapsamında kalır.

## Bu planın dışında

Yeni oyun kuralı, yeni tanrı, masaüstü yeniden tasarımı, maç öncesi tanrı
kataloğu yenilemesi ve bağımsız bir performans projesi bu plana dahil değildir.
GitHub yayın kopyasına aktarım, push ve canlıya alma ayrıca istendiğinde
yapılır; bu yol haritası yayın yetkisi vermez. Mevcut Git geçmişi korunur.
