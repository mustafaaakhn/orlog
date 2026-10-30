# Oyun kuralları

Doğrulama: 28 Ekim 2026. Hedef Valhalla sürümüdür.
Aşama 5: atış/seçim, hedefli güç seçimi, savaş, 20 güç, ölüm ve sonraki tur uygulanmıştır.
7F için son UI/akış kararları [son bölümde](#7f-için-netleştirilen-güç-ve-akış-sunumu)
plan olarak ayrılır; yeni kod uygulanmış veya mevcut güç kuralları değiştirilmiş sayılmaz.

## Kaynak ve güven düzeyi

- **S1 — Lisanslı kitapçık:** [İngilizce kitapçık, sayfa 3–4](https://content.cmpl.org/bg/Orlog.pdf). Fazlar, işlem grupları, ilk oyuncu, eşit güç önceliği ve ödeme zamanı için kullanıldı. Metin çıkarıldı, sayfa 3 görsel olarak da incelendi.
- **S2 — Video oyunu rehberi:** [GameFAQs Orlog Challenges](https://gamefaqs.gamespot.com/ps5/289140-assassins-creed-valhalla/faqs/78736/orlog-challenges). Oyun içi kuralların aktarımı ve ilk üç gücün sayısal öncelikleri/bedelleri.
- **S3 — Zar incelemesi:** [Altı farklı çerçeve çifti](https://www.reddit.com/r/ACValhalla/comments/kq4qyv/), [yüz dağılımı ve her zarda iki çerçeve](https://vulkk.com/2020/12/01/assassins-creed-valhalla-orlog-guide-and-strategies/). Çift tablosu topluluk incelemesine dayanır; resmî bir 3B eksen şeması değildir.
- **S4 — Oynanış:** [03:06 — ok/kalkan](https://www.youtube.com/watch?v=nuJrVQC1bKI&t=186s), [03:09 — balta/miğfer](https://www.youtube.com/watch?v=nuJrVQC1bKI&t=189s). Görsel çözümlemede menzilli grubun yakın dövüşten önce geldiği karşılaştırıldı.
- **S5 — Kullanıcı doğrulaması:** Bu sohbet, 28 Ekim 2026: **“Can en fazla 15 olur.”** Kitapçıkta açık bulunmayan üst sınır için kullanıcı kararı esas alınır.
- **S6 — Ölüm anı:** [Valhalla oynanış açıklaması](https://onemoregame.ph/2020/11/assassins-creed-valhalla-newbie-guide-to-orlog/). İlk sıfır can maç sonudur; sonra gerçekleşecek iyileştirme oyuncuyu geri getirmez.

- **S7 — Lisanslı tanrı güçleri kılavuzu:** [PureArts / Ubisoft Almanca güç tabloları, sayfa 1–2](https://gamers-hq.de/media/pdf/9d/53/af/Orlog_GodsFavors_DE-v1-3r.pdf). Her iki sayfanın görsellerinden 20 gücün bedelleri, etkileri ve öncelikleri karşılaştırıldı. Frigg kendi ve/veya rakibinin zarlarını yeniden atabilir. Kılavuz kitapçığın ayrı ekidir.
- **S8 — Topluluk karşılaştırması:** [İngilizce güç dökümü](https://www.reddit.com/r/AssassinsCreedValhala/comments/mvkmkd/). Sayısal katalog S7 ile karşılaştırıldı; bu dökümde Skuld seviye 2 bedelindeki `3` yazım hatası yerine S7’deki `6` kullanılır.

Kaynaklarda açık olmayan geometri veya sıralama ayrıntıları aşağıda yorum/uyarlama kararı olarak ayrıca belirtilir.

## Başlangıç ve can

İki oyuncunun her biri 15 can, 0 tanrı jetonu ve altı zarla başlar. En fazla üç farklı tanrı gücü taşınır.
İlk oyuncu yazı turayla belirlenir; sonraki turlarda ilk oyuncu değişir. (S1, S2)
Can 0–15 aralığındadır. İyileştirme 15'te kesilir; jetonlar negatif olamaz. (S5 ve kaynaklardaki kaynak harcama anlamı)

Her hasar veya can feda etme işleminin ardından ölüm kontrol edilir. İlk kez 0 cana ulaşan oyuncu kaybeder;
sonraki saldırılar ve güçler çalışmaz. Normal sıralı akışta iki taraf birden hasar almaz ve beraberlik oluşmaz.
Hasarı tur sonuna kadar biriktirip iki tarafa birden uygulamak bu profile uygun değildir. (S1, S6)
Bu kontrol noktaları gerçek çözümleme senaryolarıyla test edilir.

## Altı sabit zar

Her zarda iki ayrı balta yüzü ve birer ok, miğfer, kalkan, el vardır. İki balta yüzü de çerçevesizdir.
Diğer dört yüzden iki tanesi altın çerçevelidir; çerçeve her atışta yeniden rastgele seçilmez. (S3)

| Tanım kimliği | Altın çerçeveli yüzler |
| --- | --- |
| `die-1` | Ok, kalkan |
| `die-2` | Ok, miğfer |
| `die-3` | Ok, el |
| `die-4` | Miğfer, kalkan |
| `die-5` | Miğfer, el |
| `die-6` | Kalkan, el |

Her iki oyuncu aynı altı tanımı kullanır. Parça kimlikleri ayrıdır: `player-1/die-1`, `player-2/die-1` gibi.
Mantıksal yüz kimlikleri `axe-1`, `axe-2`, `arrow`, `helmet`, `shield`, `hand` olarak sabittir.
Her yüz eşit 1/6 olasılığa sahiptir; balta toplam 2/6, çerçeve toplam 2/6 olasılıkla gelir.

Bu tablo **mantıksal yüz/çerçeve dağılımını** tanımlar. Orijinal küpte hangi yüzün hangi yüze karşı olduğu
kanıtlanmadı. Oyun çekirdeği fizik ekseni kullanmaz. Aşama 2 prototipi özgün ve açıkça belgelenmiş
bir eksen eşlemesi kullanır ([mimari karar](../ARCHITECTURE.md#sahne-ve-sunum));
bu eşleme özgün oyuna ilişkin yeni bir kanıt değildir. Fizik/sonuç yönlendirmesi Aşama 3’te kayıt tabanlı küp simetrisiyle doğrulanmıştır; orijinal küp eksenlerinin belirsizliği sürer.
Mantıksal dizi sırasından `+X`, `-X` gibi özgün oyun eksenleri türetilmez.

## Atış ve seçim fazı

1. Aktif oyuncu saklamadığı zarları atar; bir atış hakkı kullanılır.
2. İlk iki atışta istediği sayıda zarı geçici olarak seçebilir veya seçimini kaldırabilir.
3. Onaylandığında seçilen zarlar saklanmış/kilitli olur; bu tur tekrar atılmaz veya serbest bırakılamaz.
4. Sıra diğer tamamlamamış oyuncuya geçer.
5. Üçüncü atışta kalan tüm zarlar otomatik saklanır. Sunum tamamlanınca uygulama sonucu otomatik onaylar; dördüncü atış yoktur.
6. İki oyuncunun da zarları tamamlandığında güç seçimi başlar. (S1, S2)

**Motor akışı tercihi:** Bütün zarlarını erken saklayan oyuncu kalan atış sıralarından çıkarılır.
Rakip kalan atışlarını ardışık tamamlayabilir. Boş atış yapılmaz, kullanılmamış haklar yapay olarak üçe yükseltilmez.
İki oyuncu da ilk atışta bütün zarlarını saklarsa doğrudan güç seçimine geçilir.
Bu, kuraldaki “en fazla üç atış” sınırının boş turlar üretmeyen uygulamasıdır; özgün oyunun ara ekranının birebir kopyası iddia edilmez.

## Güç seçimi ve ödeme

İlk oyuncu başlayarak her oyuncu bir güç/seviye seçer veya pas geçer. Seviye 1, 2 veya 3 olmalıdır.
Aynı oyuncu seçimini onayladıktan sonra bu fazda yeniden seçemez. İki seçim bitince `resolution` fazına girilir.
Bir oyuncu yalnızca kuşandığı güçleri seçebilir. (S1, S2)

Seçim bir **niyet** kaydıdır: o anda jeton harcanmaz ve hiçbir etki uygulanmaz.
Bedel, güç gerçekten çağrılırken kontrol edilir ve ödenir. Yeterli jeton yoksa etki verilmez. (S1, S2)
Motor seçim anında bütçe nedeniyle reddetmez. 7F.05 görsel kaynak sayacını kaldırdı;
gerçek miktarlar core ve ekran okuyucu özetinde kalır. Seviye bedeli mevcut panelde
gösterilir; yeni tanrı menüsü ve gerçek kullanım anındaki yetersizlik bildirimi 7F.07–08
kapsamında açık kalır.
Bu nedenle çözümleme sonrası güce o tur kazanılan/çalınan jetonlar yetişebilir; çalınan jetonlar yüzünden güç de boşa çıkabilir.
Kesin bütçe, kaldırılan zarlar ve rakibin etkileri dahil edilerek yalnızca çağırma anında bilinir.

## Kesinleştirilen çözümleme profili

1. Çözümleme öncesi güçleri düşük sayısal öncelikten yükseğe çalıştır. Eşit öncelikte turun ilk oyuncusu önce davranır.
2. Kalan altın çerçeveli yüzlerden jeton ver.
3. Menzilli saldırıları ok/kalkan eşleşmesiyle çöz: önce turun ilk oyuncusu, sonra diğeri.
4. Yakın dövüş saldırılarını balta/miğfer eşleşmesiyle aynı oyuncu sırasıyla çöz.
5. El zarlarıyla jeton çalmayı önce ilk oyuncu, sonra diğeri için çöz. Rakipte bulunandan fazla jeton alınamaz.
6. Çözümleme sonrası güçleri sayısal öncelikle, eşitlikte ilk oyuncudan başlayarak çalıştır.
7. Maç bitmediyse tur verilerini temizle, ilk oyuncuyu değiştir ve yeni tur başlat.

Güçlerin öncesi/sonrası pencereleri, jeton → saldırı → çalma grupları ve eşit güç önceliği S1/S2'den gelir.
Okların baltalardan önce ele alınması S4 gözlemine dayanır.
**Yorum kararı:** Kitapçık el zarlarının iki taraf arasındaki sırasını ayrıca açmadığından aynı ilk oyuncu sırası çalmaya da uygulanır.
İkinci oyuncu birinci oyuncunun yeni aldığı jetonları geri çalabilir; işlemler eşzamanlı/netleştirilmiş sayılmaz.
Motor bu profili `ResolveRound` ile uygular; bütün işlemler sıralı, kararlı kimlikli olay üretir.

| Zar yüzü | Temel etki |
| --- | --- |
| Balta | Miğferle engellenmezse 1 yakın dövüş hasarı |
| Miğfer | 1 yakın dövüş hasarını engeller |
| Ok | Kalkanla engellenmezse 1 menzilli hasar |
| Kalkan | 1 menzilli hasarı engeller |
| El | Rakipten 1 tanrı jetonu çalar |

Çerçeve, yüzün temel etkisine ek jeton verir; bağımsız altın jeton yüzü değildir. (S1)

## İlk üç gücün doğrulanmış kataloğu

| Güç | Öncelik | Zamanlama | Seviye 1/2/3 bedeli | Seviye 1/2/3 etkisi |
| --- | --- | --- | --- | --- |
| Thor's Strike | 6 | Çözümleme sonrası | 4 / 8 / 12 | 2 / 5 / 8 doğrudan hasar |
| Iðunn's Rejuvenation | 7 | Çözümleme sonrası | 4 / 7 / 10 | 2 / 4 / 6 can iyileştirme |
| Víðarr's Might | 4 | Çözümleme öncesi | 2 / 4 / 6 | Rakibin 2 / 4 / 6 miğferini kaldırma |

Öncelik ve sayısal değerler S2 ile, Thor ayrıca S1'deki kart görseliyle karşılaştırıldı.
Düşük sayısal öncelik önce çalışır. Thor 6, Iðunn 7 olduğundan Thor öldürürse sonraki iyileştirme gerçekleşmez.
Katalog `src/core/favors/catalog.ts` içinde salt veridir; `src/core/resolution.ts` ödeme ve etkileri yürütür.
Bu ilk üçlü proje başlangıç setidir; fiziksel oyunun “beginner” setiyle aynı olduğu iddia edilmez.

## Doğrulama takibi

- [x] Altı zarın mantıksal yüz/çerçeve çiftleri kaydedildi ve test edildi.
- [x] Atış üst sınırı, seçim onayı ve erken tamamlanmış zar davranışı netleştirildi.
- [x] İlk üç gücün sayısal öncelikleri, zamanlamaları ve eşitlik sırası belgelendi.
- [x] Seçim niyeti ile çağırma anındaki ödeme birbirinden ayrıldı.
- [x] Çalma sırası için kullanılan yorum açıkça kaydedildi.
- [x] İlk sıfır canın maç sonu olması ve ardından iyileştirme olmaması kaydedildi.
- [x] Azami 15 can kullanıcı tarafından doğrulandı.
- [ ] Özgün küplerin karşılıklı yüzleri ve fizik eksenleri görsel aşamada incelenecek.
- [x] Kalan 17 gücün tam kataloğu Aşama 5’te S7 ile doğrulandı; belirsiz etkileşimler aşağıda açık karar olarak kaydedildi.


## Aşama 4 uygulama kararları

- Víðarr'ın kaldırdığı miğferler o turun savunma ve altın çerçeve hesabından çıkar. Zarın özgün yüzü
  kayıt için korunur; `removed` işareti sonraki turda sıfırlanır.
- Savaş her bloke edilen saldırı için eşleşen iki zarın kimliğini; her doğrudan vuruş için bir hasar
  olayı üretir. Can sıfırda kesilir; olayın `amount` alanı gerçekten düşen canı gösterir.
- Çözümleme tamamlanınca sonuç ekranda kalır; **Sonraki tur** yeni atışları başlatır. Bu ara onay
  kural sırasını değiştirmez. Yeni turda can/jeton korunur, diğer tur verileri temizlenir.
- Kullanıcı yeniden başlatınca hazırlık ve yeni yazı turaya dönülür; eski maç kaynakları aktarılmaz.


## Kalan 17 gücün doğrulanmış kataloğu

Değerler S7 kılavuzundandır. Bütün etkiler yalnızca çağrıldığı tur için geçerlidir.
Odin savaş sonrasında; diğer 16 güç altın çerçeve kazanımından önce ödenip etkinleştirilir.
Heimdall, Hel, Mímir, Vár ve Ullr ödeme sonrasında ilgili olayda tetiklenir.

| Güç | Öncelik | Bedel 1/2/3 | Etki 1/2/3 |
| --- | --- | --- | --- |
| Baldr's Invulnerability | 4 | 3 / 6 / 9 | Her miğfer/kalkan zarına +1 / +2 / +3 savunma |
| Bragi's Verve | 4 | 4 / 8 / 12 | Her el zarı için 2 / 3 / 4 ek jeton |
| Brunhild's Fury | 4 | 6 / 10 / 18 | Toplam baltayı 1.5 / 2 / 3 ile çarp, toplamı yukarı yuvarla |
| Freyja's Plenty | 2 | 2 / 4 / 6 | 1 / 2 / 3 ek zar at |
| Freyr's Gift | 4 | 4 / 6 / 8 | En çok gelen simgenin toplamına +2 / +3 / +4 |
| Frigg's Sight | 2 | 2 / 3 / 4 | Kendi ve/veya rakibinin 2 / 3 / 4 seçili zarını yeniden at |
| Heimdall's Watch | 4 | 4 / 7 / 10 | Gerçekten engellenen saldırı başına 1 / 2 / 3 can |
| Hel's Grip | 4 | 6 / 12 / 18 | Verilen gerçek balta hasarı başına 1 / 2 / 3 can |
| Loki's Trick | 2 | 3 / 6 / 9 | Rakibin seçilen 1 / 2 / 3 zarını bu tur kaldır |
| Mímir's Wisdom | 4 | 3 / 5 / 7 | Alınan gerçek hasar başına 1 / 2 / 3 jeton |
| Odin's Sacrifice | 7 | 6 / 8 / 10 | Savaş sonrasında feda edilen can başına 3 / 4 / 5 jeton |
| Skaði's Hunt | 4 | 6 / 10 / 14 | Her ok zarına +1 / +2 / +3 ok |
| Skuld's Claim | 3 | 4 / 6 / 8 | Her ok zarı başına rakibin 2 / 3 / 4 jetonunu yok et |
| Thrymr's Theft | 1 | 3 / 6 / 9 | Rakibin gücünü 1 / 2 / 3 seviye düşür |
| Tyr's Pledge | 3 | 4 / 6 / 8 | Feda edilen can başına rakibin 2 / 3 / 4 jetonunu yok et |
| Ullr's Aim | 4 | 2 / 3 / 4 | İlk 2 / 3 / 6 ok kalkanları aşar |
| Vár's Bond | 1 | 10 / 14 / 18 | Rakibin harcadığı jeton başına 1 / 2 / 3 can |

## Aşama 5 — Etkileşim ve uyarlama kararları

S7 tekil etkileri tanımlar; aşağıdaki sınır durumlarını açıklamaz. Bunlar bu oyunun açık ve test edilen
uyarlama profilidir; Valhalla'nın bütün iç davranışlarının doğrulandığı iddiası değildir.

1. **Hedef niyeti:** Frigg ve Loki için gereken sayıda farklı zar, güç onayında seçilir. Frigg iki
   taraftan da seçebilir. Seçim sırası korunur. Daha erken bir güç hedefi kaldırırsa hedef atlanır;
   otomatik başka zar seçilmez. Seviye düşerse ilk N hedef kullanılır. Yeniden atışlar mevcut
   ilk oyuncu/zar sırasıyla rastgele kaynak tüketir; fazdaki üç atış hakkını değiştirmez.
2. **Ek zar tanımları:** Freyja sırasıyla temel `die-1`, `die-2`, `die-3` tanımlarının kopyalarını
   `bonus-1..3` kimlikleriyle atar. Her kopyanın sabit yüz/çerçevesi aynıdır. Sonuç core rastgeleliğinden
   gelir; tekrar seçim veya dördüncü normal atış açılmaz. Ek zarlar aynı turda saldırır, savunur,
   çalar ve çerçeve jetonu üretir; sonraki tur kaldırılır. Özgün oyunun ek zar çerçeveleri doğrulanmadı.
3. **Çoğunluk:** İki balta yüzü tek simgedir. Freyr'ın çoğunluğu çağırma anındaki kaldırılmamış
   zarların etki toplamından hesaplanır. Eşitlikte oyuncunun seçtiği simge kullanılır. Daha erken
   Loki/Frigg çoğunluğu değiştirirse yeni çoğunluk esas alınır; artık geçerli olmayan seçimde eşitlik
   sırası balta → ok → miğfer → kalkan → eldir. Bonus ilk uygun zarın değerinde gösterilir.
4. **Değer/çerçeve ayrımı:** Baldr ve Skaði her fiziksel zara ek etki verir. Brunhild tek toplamı
   çarpıp bir kez yuvarlar; ek miktar ilk baltada gösterilir. Altın çerçeve değerle çarpılmaz.
   Bragi ve Skuld fiziksel el/ok zarlarını sayar. Freyr'ın el bonusu çalma sayısını artırır.
5. **Savunma kaldırma:** Víðarr savunma birimlerini sırayla azaltır. Baldr önce çağrıldıysa büyüyen
   değer azalır; sıfıra inen miğfer zarı kaldırılır ve çerçevesi kaybolur. Kısmen kalan zar çerçevesini
   korur. Víðarr önce çağrıldıysa kaldırılan zar Baldr'a katılmaz. Loki bütün fiziksel zarı kaldırır.
6. **Thrymr:** Sıfıra inen güç iptal edilir ve bedel ödemez. Pozitif kalan seviyenin düşük bedeli
   ödenir. İki Thrymr'da ilk oyuncu önce çalışır. Önceden çağrılmış güç geri alınmaz; dolayısıyla önce
   etkinleşen Vár daha sonraki Thrymr ödemesinden iyileşir. Başarısız güç ödeme/etki üretmez.
7. **Tetiklenme anı:** Vár yalnızca etkinleştikten sonraki gerçek rakip ödemesinden, ödeme ile etki
   arasında iyileşir. Daha önceki ödemeyi geriye dönük saymaz. Mímir normal veya Thor hasarının gerçek
   miktarından anında jeton alır; feda edilen can hasar sayılmaz. Heimdall gerçek bloktan sonra,
   Hel gerçek balta isabetinden sonra iyileşir. Ullr'ın kalkan aşan okları savunma hakkı tüketmez.
8. **Can feda etme:** Oyuncu 0 ile mevcut canı arasında bir miktar seçer; çalışırken kalan canla
   sınırlanır. Son canı feda etmek anında yenilgidir. Ölümden sonra jeton getirisi, yok etme,
   Mímir/Hel tetikleri veya iyileştirme uygulanmaz. İyileştirme her olayda 15'te kesilir.
9. **Tur ömrü:** Bütün değer artışları, kancalar, seviye düşürme ve kaldırılma bu tur içindir.
   Sonraki tur temel altı zarın yüz/değerleri temizlenir; kuşanılmış üç güç ve kaynaklar korunur.


## Aşama 7 — Bilgisayar rakibi

Bilgisayar Oyuncu II olarak aynı atış, saklama, güç, ödeme ve ölüm kurallarına uyar; ek atış veya
kaynak almaz. Zorluk yalnızca karar değerlendirmesini değiştirir. Görünür zarlar ve kuşanılan
üç güç açıktır; rakibin henüz çözülmemiş güç niyeti ve gelecek rastgele sonuçlar karar girdisi değildir.
Bilgisayarın olası sonuçları ayrı seed’lerle denemesi canlı atış/yeniden atış kaynağını ilerletmez.
Savaş ve sonraki tur kullanıcı onayıyla başlar. Bu aşama mevcut kural sonuçlarını değiştirmez.

## Aşama 7D — Uygulanan sunum akışı

Yukarıdaki elle **Sonraki tur** davranışı önceki teslimlerin tarihsel kaydıdır.
[olay sunumunda](../ARCHITECTURE.md#sahne-ve-sunum) bütün çözümleme olayları, kaynak temasları ve
kullanılan zarların toplanması bitince uygulama katmanı mevcut `NextRound` komutunu otomatik
gönderir. **Savaşı başlat** kullanıcı eylemi olarak kalır. Maç bittiyse yeni tur başlamaz.
Bu, sunum akışının değişmesidir; güç önceliği, saldırı/blok, jeton hesabı, ilk sıfır can ve
yeni turda kaynakların korunması kuralları değişmez. Kullanılmış zarın görsel olarak kenara
alınması, kural gereği zar kaldırılması (`removed`) değildir. Olaylara eklenen zar kaynak
kimlikleri yalnızca sunum bağıdır; sonuçlar ve işlem sırası aynı çekirdekten gelir.

## 7F için netleştirilen güç ve akış sunumu

28 Ekim 2026 kullanıcı açıklaması. yerel arşivde korunan 7F planının 01–06 maddeleri
uygulandı; 29 Ekim isteğiyle tanrı menüsü/bütçe bildirimi/otomatik savaş da 07–11 kapsamında tamamlandı. Mevcut niyet/ödeme, güç önceliği, kural sırası,
rastgelelik, ölüm ve kaynak sınırları aynıdır.

- Üçüncü atışta bütün kalan zarlar zaten zorunlu saklanır; sunumu bitince kullanıcıdan
  ek onay alınmadan ilgili tamamlanma komutu gönderilir (7F.06). İlk iki atış seçim onayı kalır.
- İki taraf tamamlandığında ayrı Tanrı gücü fazı ve kısa başlığı vardır. Oyuncu masadaki
  tanrının menüsünden güç/seviye/hedef niyetini kesinleştirir veya Devam et ile pas geçer.
  Panel otomatik açılmaz; yalnız hover bir seçim sayılmaz. Üç tanrı kuşanma hazırlığı kalır.
- Bütün seviyeler bütçeden bağımsız görünür/seçilebilir kalır; mevcut jeton veya gelecekte
  kazanılabilecek/çalınabilecek jeton üzerinden UI yeterlilik hesabı yapılmaz. Yasal
  hedef ve faz/giriş denetimleri devam eder. Erken “jeton yetmiyor/yetecek” işareti olmaz.
- Örnek 5 jeton / 5–8–12 bedellerinde 8 veya 12 seçilebilir; bu katalog değişikliği değildir.
  Gerçek çalışma sırası gelince core kaynağı denetler. Yetmezse ödeme/etki yoktur ve gerçek
  başarısızlık olayından kısa Yeterli jeton yok · Güç kullanılamadı bildirimi gösterilir.
- Savaş öncesi güç henüz kazanılmamış altını önden kullanamaz. Sonrası güç, kendi sırasına
  kadar gerçekleşen kazanım/çalma/kayıplardan etkilenir. Bütün güçleri savaş sonuna taşımak
  bu açıklamanın parçası değildir. Diğer başarısızlık nedenleri ayrı sunulur.
- İki karar ve sunum tamamlanınca savaş otomatik bir kez başlar; savaş düğmesi kalkar.
  Sonraki tur, 7D'deki gibi bütün temaslar/toplama tamamlanınca otomatik açılır.
- Bu teslimde kaynaklar görsel HUD'da sayı olarak gösterilmez; gerçek sayılar core ve
  ekran okuyucu anlatımında korunur. 30 Ekim mobil yol haritasının Aşama 1'i ile dar/kısa
  yatay ekranlara aynı sunum anını izleyen sayısal can/jeton göstergeleri eklenmiştir.
  Fiziksel taşlar/altınlar ve menüdeki sayısal seviye bedelleri korunur; kural değişmez.
- Beşlik altın yığınları ve toplu el hareketi yalnız sunumdur: bir yığının yüksekliği beş,
  toplam jeton için yeni üst sınır yoktur. Çalma gerçek olay miktarıyla sınırlıdır; oyuncu
  sırası, iki yönlü çalma ve son kaynaklar yeniden hesaplanmaz.


## Aşama 7G — Sunum ve hazırlık sınırı

Robot hazırlığı tek Normal profiliyle devam eder; AI bilgi sınırı ve üç profilin
çekirdek testleri korunur. Oda kurma/katılma yalnız UI önizlemesidir ve aynı bilgisayarda
maça devam eder. Yeni ağ veya oyun kuralı yoktur. Çalmadaki el görselinin yerine N gerçek
jetonun glow ile grup hareketi geçti; El zar simgesi/kuralı, olay miktarı ve varışta tek
toplu kaynak güncellemesi değişmedi. Zar hover/odak vurgusu seçim niyeti üretmez.

## 30 Ekim — Aynı masada yeniden maç

Maç sonunda Yeni oyun aynı oyuncularla tanrı seçimini açar. Son maçın üç
tanrısı seçili gelir. Oyuncu değiştirebilir veya doğrudan Hazırım diyebilir.
Botta insan hazır verince, arkadaşla iki insan hazır verince yeni maç açılır.
Tur 1'e, 15 cana, 0 jetona ve atılmamış zarlara dönülür. Önceki maçta ilk
başlayan oyuncunun karşısı başlar; tekrar yazı tura yapılmaz.
Yeni maçın sonucu ayrı oyun kimliği ve olay kaydıyla tutulur.

Güncel çevrim içi uygulama gerçek oda sunucusudur; tarihsel 7G önizlemesinin
yerini alır. İki oyuncu bağlıyken ve son sunum tamamlanınca iki koltuktan biri
Yeni oyun isteyebilir. Aynı oda, adlar ve oturumlar korunur; eşzamanlı istek
tek tanrı hazırlığı açar. İki hazır onayı gelmeden yeni maç oluşturulmaz.
Ana menüye dön ayrı bir odadan ayrılma eylemidir.

## 30 Ekim — Mobil güç seçimi

Mobil maçtaki Tanrı gücü paneli aynı üç kuşanılmış gücü ve aynı core hedef
doğrulamasını kullanır. Mevcut jeton gösterilir; bedeli yüksek seviyeler de
seçilebilir. Gücü onayla mevcut güç komutunu, Güç kullanmadan devam et mevcut
pas komutunu gönderir. İnceleme ve paneli kapatma komut üretmez. Bu arayüz
uyarlaması ödeme/öncelik, hedef, jeton kazanımı veya başarısızlık kurallarını
değiştirmez; gerçek yeterlilik yalnız gücün çalışma sırasında denetlenir.

## Mobil zar incelemesi

Mobil yüz hedefleri aynı core yüzünü, jeton çerçevesini ve seçili/kilitli
durumu gösterir. Uygun kendi zarına kısa dokunma mevcut seçim komutunu
gönderir. Rakip/kilitli zar incelemesi, uzun basma ve bilgiyi kapatma oyun
komutu üretmez. Ekran hedeflerinin ayrılması zar sonucu, fizik kaydı veya
oyundaki saklama/jeton kurallarını değiştirmez.
