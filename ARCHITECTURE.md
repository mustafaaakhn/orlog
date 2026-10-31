# Mimari

## Katmanlar

| Dizin | Sorumluluk |
| --- | --- |
| `src/core` | Saf TypeScript kuralları, zarlar, 20 güç, komutlar ve olaylar |
| `src/ai` | Görünür bilgiyle bilgisayar rakibinin kararları |
| `src/app` | Yerel/çevrim içi oturum, komut kilitleri ve yaşam döngüsü |
| `src/network` | Socket.IO istemcisi ve ortak protokol |
| `src/presentation` | Olay kuyruğu, fizik kayıtları ve animasyon sunumu |
| `src/scene` | Three.js masa, geometri, doku, kamera ve seçim hedefleri |
| `src/audio` | Yerel ses kataloğu ve Howler oynatıcısı |
| `src/ui` | Vue ekranları, kontroller ve erişilebilir etkileşim |
| `server` | Yetkili oyun durumu, oda yönetimi ve üretim HTTP sunucusu |

Core; Vue, DOM, Three.js, GSAP, ses veya ağ bağımlılığı almaz. Yerel oyunda
sonucu core, çevrim içi oyunda sunucudaki core üretir. Görsel katman sonuç,
hasar veya jeton üretmez. Durum ve sunum aynı sıralı olay kaydını izler;
kaynak görünümü ilgili temas/aktarım tamamlandığında güncellenir.

Mobil `MatchResources` bileşeni fiziksel kaynaklar ve ekran okuyucu metniyle
aynı `createRollSession().state` değerini okur. Bekleyen grubun `state` sonucu
HUD'a verilmez. `progress` temasları ve `present` olayları mevcut oturum
üzerinden yayınlanır; UI ayrıca kaynak hesabı, sayaç veya zamanlayıcı tutmaz.
Koltuğun ekrandaki sırası mevcut `viewerId` ile belirlenir. Mobil alt kaynak
satırı ana eylemi slot olarak taşır; geniş görünümde bu kapsayıcılar
`display: contents` ile mevcut eylem yerleşimini korur.

## Sahne ve sunum

Rapier 3D kaydı Web Worker’da, hazne yerelinde sabit 1/60 saniye adımlarla
üretilir. Küp simetrisi core olayındaki yüzü üstte gösterecek şekilde bütün
kayda uygulanır; sonunda yüz değiştirilmez. Geçersiz duruşlar sınırlı yeniden
deneme ve kontrollü düşüşle değiştirilir.

Fizik kaydı ve GSAP aynı nesnenin konumunu eşzamanlı yönetmez. Olay kuyruğu
kayıt, aktarım, temas ve sonlandırma sahipliğini sırayla devreder. İptal edilen
sunumların geç callback’leri güncel duruma yazamaz. Toplu kazanım/çalma/ödeme ve
tanrı hasarı, aynı olayın parçalarını ortak varış/temasla günceller.

Masa boşta sürekli çizilmez. Yerel iki kişide kamera aktif koltuğa döner;
botta ve ağ oyununda kişisel koltuk sabittir. Gizli sekme veya odak kaybı
oyunun gerçek ilerlemesini engellemez. Dönüşte mevcut sahne güncel durumla
eşitlenir; WebGL kaybı ayrı yeniden kurma yolunu kullanır.

Mobil kamera `useTableInsets` ile gerçek HUD/eylem boyutlarını ölçer;
`frameTableCamera` bu boş alanda yakın hazne ve dokuz zara kadar iki merkez
sırasını kadrajlar. Çözümlemede o anki olayın kaynak/hedef zarları, kaynak ve tanrı temas
noktaları kapsanır. GSAP yalnız odak zarfını, geçiş ağırlığını ve
mevcut koltuk dönüş açısını değiştirir; kameranın konumu/izdüşümü tek
`frameCamera` yolunda yazılır. Fizik ve zar sahipliği değiştirilmez. Mobil
zar seçim hedefleri aynı kamera izdüşümünü okur; HUD altında kalan merkezler
görünmez seçim alanları oluşturmaz. Masaüstünde kamera kaydırması temizlenir
ve önceki tam masa hesaplaması kullanılır.

Mobil rakip hazne özeti ve yalnız ona hizmet eden `useVisibleDice` kaldırıldı.
`useTableInsets` özet alanı ölçmez; dikeyde kaynak satırı/ağ bildiriminin
altından başlayan boş alanı, kısa yatayda sol kaynak sütununun sağını kullanır.
Kamera yakın hazne ve iki merkez sırasını kadrajlamaya devam eder; rakip
hazneyi ayrıca kapsamaz. `SceneDiceControls` mobilde rakibin hazne hedeflerini
filtreler, merkezdeki seçili/kilitli zarların tek hedefini ve incelemesini korur.
`FavorPicker` hedeflerini kadrajdan değil mevcut oyun durumundan ve core
kurallarından alır; haznedeki geçerli hedefler panelde kalır. `presented`,
`progress`, `collected` ve oturumun ortak olay akışı korunur; kaynak sunumu,
fizik kayıtları, kurallar ve botun gördüğü bilgi değişmez.

Sesler `src/audio/catalog.ts` üzerinden yerel dosyalardan yüklenir. İki müzik
sırayla oynar; ortam/su döngüsü kaldırıldı. Tarayıcı otomatik oynatmayı engellerse ilk
etkileşim yeniden dener; gizli sekme sesi duraklatır. HTML5 oynatma isteği
tamamlanana kadar parça kimliği ve bekleyen istek korunur; yükleme callback’leri
aynı parçayı tekrar başlatamaz. Duraklatılan parça aynı ses kimliğiyle sürer.

## Mobil güç paneli

`MobileFavorPanel`, `App` içindeki mevcut sunum `state` ve `viewerId`
değerlerinden beslenir; bedel, etki ve hedef doğrulaması mevcut `FavorPicker`
ve core kataloğundan gelir. Yerel taslak aynı anda yalnız bir tanrıya aittir.
Jeton yeterliliği UI'da tahmin edilmez. Onay/pas olayları `App` içindeki mevcut
sıra, faz ve oturum kilitlerinden geçerek aynı komutlara dönüşür.

Panel native modal `dialog` kullanır. Üst katman arkadaki DOM ve WebGL
hedeflerini etkisiz bırakır, odağı panelde tutar; arka plan sunum kuyruğunu
ayrı bir duraklatma/senkronizasyon yoluna taşımaz. Kapatma taslağı temizler
ve açan düğmeye odak döndürür; oyun komutu göndermez. Koltuk/maç değişimi
ve masaüstü genişliğine geçiş paneli kapatır. Kullanılabilir alan eşiği mobil
kaynak göstergeleriyle aynıdır; telefon modeli veya tarayıcı kimliği okunmaz.

## Mobil zar hedefleri

`SceneDiceControls` yalnız sunumda görünür zarları `inspectableDice` üzerinden
okur. Mobilde aynı zarın simgesi, jeton işareti ve seçili/kilitli vurgusu 44px
bir yüz hedefinde gösterilir. `layoutDieTargets`, HUD dışında kalan ekran
alanında hedefleri 4px arayla yerleştirir; kayan hedef ile gerçek 3B izdüşümü
ince çizgiyle bağlanır. Yerleşim yalnız ekran koordinatıdır; fizik, GSAP ve
core zar konumlarına yazmaz. Alan bütün hedefleri alamıyorsa aynı kimlikler
kaydırılabilir bir listede korunur. Kaldırılan zar için hedef üretilmez.

Mobil kısa dokunma tıklanan hedefin sabit zar kimliğini kullanır; komşu zarı
mesafeden tekrar seçmez. Uzun basma incelemeyi açar ve ardından gelen tıklamayı
tüketir; sürükleme/iptal seçim üretmez. Sunum ve koltuk kilidi bekleyen hareketi
iptal eder. İptal edilen dokunmanın tüketilmiş işareti kilit açılınca da
korunur: bırakma tıklaması yerleşimde kaymış komşu zara aktarılsa bile seçim
üretmez. Yeni pointerdown yeni bir hareket başlatır. Mobil inceleme, kısa
dokunma sonrasında geri gelen odaktan ayrı
tutulur; yeni zar seçimini örten bir pencere kendiliğinden açılmaz. Masaüstü
izdüşüm hedefleri ve klavye dolaşımı korunur. Dinlenen mobil 3B üst yüzün açık,
yüksek kontrastlı dokusu aynı core yüzünü gösterir; atış kaydı değiştirilmez.

## Mobil toplu zar seçimi

`src/app/diceSelectionDraft.ts` tek 2000 ms zamanlayıcıyla yalnız zar
kimliklerinden oluşan yerel seçim niyetini tutar. `App`, mobil alan eşiğinde
insan seçimini bu taslağa yönlendirir; masaüstündeki insan `SetDieSelection`,
bot Aşama 10 ile `SetDiceSelection` kullanır. Her geçerli değişiklik süreyi yeniler; geçersiz kimlik,
inceleme ve uzun basma yenilemez. `SceneDiceControls`, taslak kimliklerini
yalnız onay imi/vurgu ve erişilebilir seçim açıklamasına uygular. Geometri,
fizik, yüzler ve core durumu bekleme boyunca değiştirilmez.

Süre bitiminde son seçim `SetDiceSelection` komutuyla atomik uygulanır.
Core bütün kimlikleri, fazı, oyuncuyu ve kilitleri mutasyondan önce doğrular;
tek revision ve tek `DiceSelectionChanged` olayı üretir. `dicePresenter`
bu olayı bir `arrange` çağrısıyla, bütün zarlar aynı GSAP zaman çizgisinde
hareket edecek şekilde sunar. Yerel ve sunucu oturumları aynı olay kaydını
kullanır. Değişmeyen seçim taslakta komut üretmez; core'a doğrudan gönderilirse
revision/olay üretmez ve oturumlar boş sunum grubu oluşturmaz. Seçim olayı
`ConfirmRoll`, atış veya sıra değişimi üretmez; eski kilitler korunur.

`createDiceSelectionDraft.confirm`, 2000 ms dolmadan son taslağı uygular.
Tek işlem kaydı seçim isteği → seçim sunumu → onay isteği sırasını korur.
`rollSession.dispatchAsync`, yerelde aynı core sonucunu, ağda sunucunun kabul
cevabını döndürür. Onay için hem kabul cevabı hem beklenen revision/seçimle
sunumun bitmesi ve iki koltuğun hazır olması gerekir. Cevap ve sunum hangi
sırada gelirse gelsin tek onay üretilir. Süre dolarken yapılan onay mevcut
seçim işlemine katılır; değişmeyen taslak seçim olayı oluşturmadan onaylanır.

`applying` yalnız bu seçimin sürmekte olduğunu, `confirming` aynı onayın
tekrar gönderilemeyeceğini bildirir. Onay düğmesi toplu seçim sunumu sürerken
kullanılabilir; yeni zar seçimi mevcut sunum kilidini izler. Geç kabul
cevapları işlem kimliğiyle, zamanlayıcılar nesil numarasıyla reddedilir.
Maç/tur/faz/koltuk, atış sayısı ve zar kimliği/yüzü/kilitleri değişirse eski
işlem devam edemez. Core'a zamanlayıcı veya UI bağımlılığı eklenmez.

`App.selectionInterrupted`; hazırlık/çıkış, insan sırası, sahne hazır oluşu,
sekme/odak, yardımcı pencere, mobil güç paneli, mobil alan eşiği ve ağ
bağlantısını birlikte izler. Güç paneli açılışını senkron `openChange` olayıyla
bildirir. Kesinti taslağı ve bekleyen onayı temizler; zaten yetkili olarak
kabul edilmiş seçim geri alınmaz. Yeniden maç ve WebGL toparlanması eski
callback'leri yeni oturuma taşımaz. Mobil içindeki yön değişiminde bu
bağlam değişmediği için aynı zamanlayıcı ve kalan süre korunur.

Ağ istemcisi reddedilen komuttan sonra `room:resume` ile yetkili snapshot alır;
red cevabını kabul saymaz ve kuyruğa alınmış onayı göndermez. Kopma nesli
ilerletir: eski ACK yeni isteğin kilidini açamaz. Cihazın `offline` olayı
Socket.IO kalp atışını beklemeden bağlantıyı kapatır; `online` olayı mevcut
koltuğu snapshot ile geri alır. Belirsiz/kayıp ACK komutu tekrar göndermez.
Yeni dış varlık veya bağımlılık eklenmedi.

## Ağ ve çalıştırma

Vite geliştirmede oyunla aynı HTTP sunucusuna Socket.IO ekler. Üretimde
`server/index.ts`, `sirv` ile `dist/` dosyalarını ve aynı süreçte odaları sunar.
`GET /health` yanıtı `ok` olur. `HOST` / `PORT` ortam değişkenleridir.

Oda sunucusu dört rakamlı paylaşım kodu, koltuk başına gizli UUID ve revision
kontrolü kullanır. Oyun komutu gönderen koltuğa ve faza göre doğrulanır;
gizli güç niyetleri rakibe gönderilmez. Görünürlük/sunum onayları oyun sonucu
üretmez. Odalar bellektedir; kapasite ve kopma sınırları
[çevrim içi oyun belgesinde](docs/ONLINE_PLAY.md) açıklanır.

## Depo ve yerel arşiv

Oyun için API anahtarı gerekmez. Hazır varlıkların üretim araçları, anahtarlar,
eski belgeler ve inceleme çıktıları yalnız `local-archive/` altındadır.
Arşiv `.gitignore` ile dışlanır; Vite’ın varsayılan dosya engelleri korunarak
arşiv erişimi de engellenir. Üretim yalnız `public/` ve import edilen kaynakları
derler. Arşiv oyun/test/derleme bağımlılığı değildir.

Dosya taşıma önceki Git commit’lerini temizlemez. Özgün yerel geçmiş korunur;
ayrı yayın kopyasında yalnız güncel kod/config/varlık yolları geçmiş boyunca
tutulur. Eski belgeler geçmişe dahil edilmez; kısa güncel rehberler sonradan
eklenir. Yalnız yayın kopyasının `main` branch’i GitHub’a gönderilir; yerel
arşiv, eski etiketler ve özgün geliştirme deposu gönderilmez.

## Botun toplu seçimi

`decideCommand`, kilitsiz ve görünür zarların son seçimini mevcut desirability
hesabıyla tek `SetDiceSelection` komutunda döndürür. Değerlendirme seçili
bayrağına bağlı olmadığından önceki tekli kararların nihai kümesi korunur;
görünür bilgi, güç örneklemesi ve rastgele kaynak değişmez. Kilitli zarlar
listeye girmez. Değişiklik yoksa doğrudan `ConfirmRoll` döner.
`computerDriver` mevcut kısa düşünme süresini ve oturumun sunum kilidini
kullanır; yeni taslak/zamanlayıcı yoktur. Kabul edilen seçim tek revision ve
`DiceSelectionChanged` olayı üretir, `dicePresenter` tek ortak zaman çizgisi
oynatır. Sunum bitmeden sürücü yeni onay üretemez.

## Saldıran zarın hareket sahipliği — Aşama 13

Olay kuyruğu önce `dicePresenter.play` işlemini bekler, ardından aynı olayın
`combatPresenter.play` işlemini çalıştırır. `AttackBlocked` kaynak ve savunma
kimliğini; zar kaynaklı `DamageDealt` kaynak kimliği ve gerçek can miktarını
sağlar. Kural hesabı değiştirilmez; sunum katmanında yeni eşleştirme yapılmaz.

Saldırı tek GSAP zaman çizgisinde hazırlık, yaklaşma, temas/tepki ve kayıtlı
konuma dönüşü yürütür. Blok savunma zarını kısa geri iter; hasar gerçek can
taşını işaretleyip aynı temas callback'inde `progress` yayınlar. Çok değerli
zar her gerçek hasar adımını aynı olay içinde gösterir. `lastContributions`
son katkıyı belirler; geri dönüş ve nihai kenara toplama ayrı işlemlerdir.
Fizik kaydı ve düzenleme bu sırada konuma yazmaz. İptal zaman çizgisini
öldürür, geçici konum/malzeme/vurguyu eşzamanlı temizler; sonraki callback
eski nesneye yazamaz. Mevcut sekme ve WebGL yeniden kurma yolu korunur.

Geçici `combatRole`, yalnız aktif kaynak/savunma nesnesinin sunum bilgisidir.
Animasyon invalidate çağrıları bunların güncel kamera izdüşümünü yayınlar.
Mobilde ilgili okunur yüzler dekoratif `span` olur; odak/tıklama açılmaz.
Yakın temasta yüzler dikey 36px ayrılır ve izdüşüme çizgiyle bağlanır.
Azaltılmış harekette zar yolculuğu yapılmaz; kaynak/hedef işareti ve temas
beklemesi korunur. Aşama 13 tesliminde kapsam dışında olan genel mobil sıralar ve bütün olaylarda
yüz/kadraj sürekliliği sonradan Aşama 11–12 ile tamamlandı.

## Lobi hazır durumu — Aşama 14

`RoomView.preparationId`, her `gods` girişinde üretilen ayrı UUID'dir;
ilk hazırlık ve yeniden maç aynı kimliği paylaşmaz. `room:ready` artık
`{ preparationId, ready: false }` veya açık `ready: true` ile ad/tanrı
listesini taşır. İstek koltuğu socket üyeliğinden gelir; istemciden hedef
koltuk alınmaz. Sunucu fazı, hazırlık kimliğini ve yükü doğrular; senkron
handler iki hazır/geri alma yarışını tek sıraya koyar. Tekrarlanan aynı hedef
hazır durumu idempotenttir; hazırken başka tanrı listesiyle değiştirmek
önce geri alma gerektirir. Geçişten sonra geri alma kabul edilmez.

İstemci hazır durumunu tahminen değiştirmez. `room:update` veya resume
snapshot'ı tek kaynaktır. Hazır/geri alma mevcut `request` nesli ve `busy`
kilidini kullanır; red resume ile uzlaştırılır, kayıp ACK tekrar istek
üretmeden yeniden bağlanır. Bağlantı yokken hazır isteği buffer'a alınmaz.
Hazır, bekleyen istek veya kopma ad/tanrı düzenlemesini kilitler. Geri alma
onayı seçimleri silmez. Core ve yerel/bot hazırlığı değişmez.

Önceki Aşama 15 doğrulamasındaki masaüstü regresyonunda sıradan seçim sunumu hedef listesini
boşaltıp klavye odağını kaybettiriyordu. Aşama 12 ile
`publishTargets` masaüstünde sunum boyunca mevcut hedefleri korur. Mobil
salt okunur izdüşümler her sunum karesinde güncellenir; masaüstü düğmesi
ve klavye odağı kilitte korunur.

## Kararlı mobil yüz sıraları — Aşama 11

`dieTargetLayout` izdüşümden bağımsız, `viewerId` ve zar kimliğine ait yuvalar
ayırır: rakip merkez, kendi merkez, kendi hazne. Normal altı zar aynı sırayı,
bonus kimlikleri sonraki sırayı kullanır; dar alanda düzenli sarılır. Boş
kimlik yuvaları korunur. Taslak seçimi yalnız vurguyu değiştirir; yetkili
sunumda hazne/merkez değişince yalnız ilgili yüz kendi aynı sütununa geçer.
`sourceX/sourceY` güncel 3B bağını korur; inceleme/işaret etmede çizgi görünür.

Kısa alanda aynı yuvalar, grup başlıkları ve 44px yüzler kaydırılan yüzeyde
kalır; bir grubun zarı diğer grubun boşluğunu kullanmaz. Ekranda hiçbir yüz
kalmamışsa liste ilk görünür sıraya kayar. Bu ekran yerleşimi core, fizik
ve GSAP konumlarını değiştirmez; kişisel/aktif koltuk mevcut `viewerId`'dır.

## Savaş yüzleri ve olay kadrajı — Aşama 12

`visualEvent` yalnız kuyruğun yürüttüğü olayı tutar. `eventFocusPoints` ve
`eventDieRole`, aynı olayın zar kimliklerini ve sahnedeki gerçek kaynak,
can taşı, jeton ve tanrı temas noktalarını okur. Sonraki olayları veya
grubun nihai oyun durumunu okumaz; yeni kural hesabı yapmaz. Toplamada
mevcut son katkı sınırı ve gerçek kenar yuvaları kullanılır.

`frameCamera`, kamerayı yazan tek yoldur. GSAP konumu doğrudan değiştirmek
yerine mevcut odak zarfını ve yakın oyun alanıyla karışımını değiştirir;
`frameTableCamera` hareket payıyla bu zarfı ölçülen HUD boşluğuna sığdırır.
Olaylar arası geçiş .28 saniyeyi hız ayarına böler; azaltılmış harekette
anlık uygulanır. Masaüstünün tam masa kadrajı korunur.

`projectDiceTargets` sunum kilidinde de güncel parça/kamera izdüşümünü
okur. Mobilde kadraj dışındaki diğer mevcut zarlar sabit yuvalarını korur.
Atış/yeniden atış kimlikleri kendi olayının yayınlanmasına kadar gizlenir;
yeni yüzler, değerler ve kaynaklar halen oturumun `present`/`progress`
sınırında yayınlanır. Toplama bitince `finishedDice` ilgili yüzü temizler;
kaldırmada gerçek görünürlük sınırı izlenir. Kural ve kaynak güncelleme
sıraları değiştirilmedi.

Mobil kilitli yüzler odaklanamayan/tıklanamayan dekoratif `span` olur.
Aktif olay kimlikleri vurgulanır, diğer yüzler soluk kalır. Mevcut saldırı
hareketinin `combatRole` yüzü 3B izdüşümünü takip eder, diğer yuvalar akmaz.
Bu hareketli yüz kaydırma kabının dışında durur; kısa yatayda da HUD içinde
kalır. İptal, yeniden maç ve sahne kurulumunda olay/gizleme/bitmiş kimlikleri
temizlenir; sekme dönüşünde aynı yetkili durumla eşitlenir.

## Mobil hazne kartları — yeni roadmap, adım 1

`SceneDiceControls` okunur seçim kartlarını yalnız `viewerId` koltuğunun
`Haznede` konumundaki görünür zarları için üretir. `dieTargetLayout` tek
hazne şeridiyle kullanılır; kartların kaydırma yüzeyi merkezleri kapsamaz.
Merkezdeki kimlikler aynı `inspectableDice` verisi ve güncel 3B izdüşümüyle
44×44px görünmez hedef olarak kalır. Merkez başlıkları üretilmez.

Kart/izdüşüm ayrımı `location` sunum değerini izler; `draftSelectedIds`
yalnız seçimi vurgular. Süre dolumu, geri alma ve erken onay mevcut
`diceSelectionDraft`/oturum komutlarını kullanır. Fizik, GSAP, core ve
olay sınırları değişmez. Masaüstü mevcut izdüşüm hedeflerini korur.
Bu adımın tesliminde korunan geçici `combatRole` yüzleri, aşağıda açıklanan
4. adımla kaldırıldı.
Bu karar önceki Aşama 11–12’nin kalıcı merkez kartı düzeninin yerini alır.

## Sade mobil masa — kadraj

Mobil kamera dokuzlu merkez sırasının zarfını ve yakın haznenin daha dar
zarfını ayrı ölçer. Dikey görünüm daha tepeden üst yüzü açar; kısa yatayda
hazne derinliğinin ekran yüksekliğini tüketmesini azaltan açı kullanılır.
Rakip hazne kadraj girdisi değildir. Atış yüksekliği ve olayın gerçek
kaynak/hedef payı korunur. Kamera yine yalnız `frameCamera` ile yazılır;
zarların ölçeği, fizik kaydı ve merkez yuvaları değiştirilmez.

## Mobil çizim kalitesi — yeni roadmap, adım 2

`TablePreview`, viewport’u `ResizeObserver` ile ölçerek mevcut
`isMobileTableView` eşiğini kalite seçimine uygular. Otomatik DPR aralığı
mobilde `[1, 1.75]`, yüksek kalite `[1, 2]`; düşük kalite `1` olur.
Masaüstünün eski DPR değerleri korunur. Observer bileşen kapanışında
bırakılır; yön/kalite değişiminde oturum veya fizik yeniden kurulmaz.

`createFaceTexture` mobil üst yüzleri 512px üretir; masaüstü 256px kalır.
Sembol ve jeton sınırları 256 birimlik aynı çizim alanında hesaplanır.
Doğrusal büyütme ve mipmap’li küçültme korunur; mobil yüz 8× anizotropi
ister, `createBoard` bütün istekleri gerçek renderer donanım sınırına kısar.
`mobileUpper` emisyon haritası aynı yüz dokusudur. Varsayılan renderer AA
artık açıkça belirtilir; ek ekran son işlemi veya sürekli çizim eklenmez.

## Sade mobil masa — kartsız savaş

Güncel mobil sunum yukarıdaki eski sabit merkez sıraları/hareketli savaş
kartlarının yerini alır. `SceneDiceControls` yalnız kişisel haznede okunur
kart üretir; merkezde güncel 3B izdüşümünde 44px saydam hedef bulunur.
Merkez hedefi sunum kilidinde kaldırılır; savaşta dekoratif yüz kartı da
üretilmez. Kaydırılabilir kart yüzeyi yalnız hazneye ayrılan alt bölgededir;
merkez hedefleri bu yüzeyin dışında kalır. Taslak seçimi yuvayı değiştirmez,
yalnız yetkili konum değişimi kartı kaldırır/geri getirir.

Kaynak ve savunma vurgusu mevcut `combatPresenter` olayının 3B
`activity-marker` halkasıdır. Gerçek zar hareketi, can taşı tepkisi ve
azaltılmış hareketin temas beklemesi aynı olay/`progress` yolunda kalır.
Kart kaldırılması yeni hasar, jeton, zamanlayıcı veya konum sahibi eklemez.

## İsteğe bağlı zar incelemesi

Mobil merkezde yalnız 400 ms uzun basma veya açık klavye isteği (F1;
salt okunur zarda Enter/Space) büyük yüzü açar. Odak, hover ve salt okunur
merkez zarına kısa dokunma bilgi penceresi açmaz. Uzun basma pointerdown'da
çözülen kimliği tutar; üst üste binen 44px hedeflerin DOM sırası kimliği
bırakmada değiştirmez. Sonradan klavye ile seçim eski dokunmanın kimliğini
kullanmaz. İnceleme olay yaymaz, seçim taslağını veya zamanlayıcısını yenilemez.

Tek bilgi penceresi mevcut sunum yüzü/değerinden beslenir. Kapat/Escape ve
dışarı dokunma geçici bilgiyi temizler; kilit ve kimlik kaybı eski bilgiyi
bırakmaz. Kısa ekranda içerik içeride kayar, 44px Kapat sabit kalır.
Masaüstünün mevcut hover/odak ve tekli seçim davranışı korunur.
