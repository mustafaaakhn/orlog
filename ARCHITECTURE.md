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
sırasını kadrajlar. Çözümleme olay gruplarında iki tarafın kaynak ve tanrı
temas noktaları da kapsanır. GSAP yalnız kadraj genişleme katsayısını ve
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
sırayla, ortam döngüyle oynar. Tarayıcı otomatik oynatmayı engellerse ilk
etkileşim yeniden dener; gizli sekme sesi duraklatır.

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
insan seçimini bu taslağa yönlendirir; masaüstü ve bot `SetDieSelection`
kullanmaya devam eder. Her geçerli değişiklik süreyi yeniler; geçersiz kimlik,
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
