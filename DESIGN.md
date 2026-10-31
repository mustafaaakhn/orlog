# Tasarım

## Görsel dil

Orlog; koyu fiyort yeşili, eskitilmiş ceviz, kemik ve pirinç malzemelerini
kullanır. Masaüstü girişte sessiz sinematik video ve ilk kare posteri vardır.
Oyuna Başla → rakip seçimi → tanrı hazırlığı → yazı tura → 3B masa akışı izlenir.
Dar ekran karşılama mevcut statik görselleri kullanır.

| Rol | Renk / yazı tipi |
| --- | --- |
| Maç zemini | `#17221c` |
| Panel | `#1c2921` |
| Kemik metin | `#f5ebd8` |
| Pirinç vurgu | `#d3b176` |
| Odak | `#f4d899` |
| ORLOG markası | Norse 700 |
| Başlıklar ve arayüz | Metamorphous 400 |

Gerçek token ve responsive ölçülerin kaynağı `src/ui/*.css` dosyalarıdır.
Yerel fontlar kullanılır; Metamorphous Latin Extended Türkçe glifleri sağlar.

## Masa ve etkileşim

Maç tek viewport içindedir: oyuncu yakında, rakip karşıda; her koltuğun kendi
haznesi, can taşları ve üç tanrı levhası vardır. Kaynaklar fiziksel taş ve
jetonlarla gösterilir. Sayısal durum ekran okuyucu metninde de korunur.

Kullanılabilir genişlik 600px veya altındaysa ya da yatay ekranın yüksekliği
500px veya altındaysa, rakibin adı/canı/jetonu üstte, oyuncununkiler altta
kompakt satırlarda da gösterilir. Can kalp, jeton masadaki altınla aynı ikon
ve tam sayıyla okunur. Uzun adlar üç noktayla kısalır; kaynak sayıları kısalmaz.
Yerel iki kişide alt satır aktif koltuğu, botta/çevrim içi oyunda kişisel
koltuğu izler. Geniş masaüstü ve dikey tablet düzeninde bu ek satırlar gizlidir.

Dikey mobilde alt kaynak satırı ve ana eylem aynı akıştadır; açıklama veya
hata metni satırı yukarı iter. Kısa yatayda kaynaklar solda, tur/sıra sağ üstte,
ana eylem sağ alttadır. Maç başlığı ve kontroller güvenli ekran kenarlarını
(`safe-area-inset-*`) hesaba katar.
HUD, fiziksel kaynaklarla aynı sunum durumunu okur; bekleyen olay grubunun
nihai değerini erkenden göstermez. Mevcut ekran okuyucu bildirimi korunur,
görsel kopyalar tekrar okutulmaz.

Zarlar doğrudan masada seçilir; saklananlar merkez sırasına geçer. İki tarafın
zarları hover/odakla incelenebilir. Tanrı önizlemesi geçicidir; güç seçimi
bilinçli tıklama, dokunma veya klavye eylemiyle sabitlenir.

Mobil kamera, dış masa sınırı yerine kendi hazneni ve iki merkez zar sırasını
kadrajlar. Rakip hazne için ayrı bir özet, başlık veya inceleme hedefi
yoktur; haznenin kendisi kadraja ayrıca sığdırılmaz. Rakibin merkezdeki
zarlarının yüzleri, jeton işaretleri ve incelemesi korunur. Güç paneli,
seçilen tanrının mevcut kurallarına göre haznede kalanlar dahil bütün
geçerli zar hedeflerini sunar.

Kamera başlık, kaynaklar ve alt eylemlerin ölçülen alanını boş bırakır;
kaldırılan özet için boş şerit ayırmaz. Kısa yatayda kaynaklar solda,
yakın oyun alanı sağdadır; eylemler yer varsa yan yana durur. Çözümlemede kadraj o anki olayın kaynak ve hedeflerini, can/jeton/tanrı
temaslarını ve hareket alanını birlikte gösterir. Bütün masa sürekli uzaktan
gösterilmez; toplamada yalnız ilgili zar ve kenar bölgesi kapsanır. Normal harekette
geçiş yumuşaktır; azaltılmış harekette kamera animasyonu yapılmaz. Masaüstü
tam masa kadrajını korur. Koltuk yönü mevcut yerel/bot/çevrim içi davranışını
izler; kamera oyun sonucu üretmez.

Mobil okunur seçim kartları yalnız kendi haznendeki zarlarda bulunur.
44px açık kemik yüzler kimliğe ait sabit yuvaları korur; jetonlu yüzün
altın çerçevesi ve ayrı jeton simgesi, bekleyen seçimin camgöbeği onay
iminden ayrılır. Kartlar haznenin alt bölgesindedir; dar alanda yalnız bu
bölge kaydırılır. Merkezde başlık veya yüz kartı bulunmaz. Merkeze geçmiş
zarın gerçek 3B izdüşümündeki saydam 44px hedef geri alma ve incelemeyi
sağlar; hazneye dönünce aynı kart yuvası geri gelir.

Savaşta mobil merkez hedefleri de kaldırılır. Saldırı ve blok gerçek 3B
zarın hareketiyle, aktif kaynak/savunma kısa ince altın halkayla, hasar can
taşının temas tepkisiyle gösterilir. Azaltılmış harekette yolculuk yerine
aynı kaynak/hedef halkası ve temas bildirimi kalır. Kalıcı etiket veya
hareketli yüz kartı üretilmez. Eski aşama kayıtlarındaki kart anlatımı bu
güncel görünümün önceki tasarımıdır.

Mobil kısa dokunma kendi uygun zarının bekleyen seçimini anında camgöbeği
vurgu ve onay imiyle değiştirir; ikinci dokunuş geri alır. Yüzler ve 44px
hedefler beklerken yerinde kalır. Son geçerli seçim değişikliğinden **2000 ms**
sonra son seçim tek grupta uygulanır; saklamak için seçilenler merkeze,
seçimden çıkarılan kilitsiz zarlar hazneye birlikte gider. Her seçim/geri
alma süreyi yeniden başlatır. Taslak uygulanmış seçimle aynıysa taşıma olmaz.
Bu süre zar atmaz, kilitlemez veya sıra geçirmez. Masaüstünde insanın tekli seçim akışı korunur. Bot, bütün ekranlarda mevcut
kısa düşünme süresinden sonra son seçimini tek grupta uygular; insanın
2000 ms beklemesini kullanmaz. Değişmeyen seçim taşıma üretmez; onay
seçim sunumu bittikten sonra mevcut sürücü yoluyla bir kez gönderilir.

Bekleyen seçim yalnız bir niyettir; zar yüzü, jeton, can veya fizik sonucu
üretmez. Kilitli/rakip zarına dokunma ve kendi zarına uzun basma simge, etki
ve Jeton getirir bilgisini açar; görünür Kapat eylemi vardır. Uzun basma,
inceleme veya sürükleme seçim üretmez ve 2000 ms süresini yenilemez.
Rakibin haznesindeki zarlar için mobil dokunma hedefi üretilmez; merkezdeki
her zarın tek hedefi vardır. Masaüstünde mevcut 3B yüzler, hover bilgisi ve
klavye hedefleri korunur.

**Seçimi onayla**, süre dolmadan son bekleyen seçimi uygular ve taşıma
bitince mevcut onayı bir kez yürütür. Toplu taşıma zaten başlamışsa aynı
onay bu işlemin bitmesini bekler. Ek pencere açılmaz. Ağ oyununda sunucu
seçimi kabul etmeden ve iki masanın sunumu bitmeden onay gönderilmez;
reddedilen seçim güncel yetkili durumla uzlaştırılır. **Zar at**, uygun
fazda tek eylemdir; 2000 ms yalnız seçimi uygular. Üçüncü atışın otomatik
saklama/ilerleme davranışı korunur.

Tanrı gücü, yardım veya ayar penceresi açmak; sekmeden/oyundan çıkmak,
bağlantıyı kaybetmek, sahneyi yeniden kurmak veya mobil düzenden çıkmak
bekleyen taslağı ve onayı temizler. Kabul edilmiş seçim korunur; yeni
oyuna/koltuğa gecikmiş seçim gönderilmez. Mobil içinde dikey/yatay geçiş
ise taslağı ve kalan süreyi korur. Klavye seçimi de mobilde aynı niyeti
kullanır; inceleme, uzun basma ve kaydırma süreyi yenilemez.

Mobil maçta **Tanrı gücü** düğmesi alttan açılan bir panel sunar. Oyuncunun
üç kuşanılmış tanrısı portre, öncelik, zamanlama ve üç seviyenin bedel/etki
metniyle listelenir. Senin tanrıların / Rakibin tanrıları düğmeleriyle iki
taraf incelenir. Sıra/faz ve sunum kilitleri yalnız güç kullanma eylemlerini
sınırlar; sıra dışında kendi tanrıların da salt okunur gösterilir. Mevcut
jeton sunum durumundan okunur; bedeli yüksek seviyeler engellenmez.

Panelin başlığı, **Kapat** düğmesi ve sıra uygunsa **Güç kullanmadan devam et**
eylemi sabit kalır; uzun liste ve hedef alanları iç bölümde kayar. Kapat,
dış alana basıp bırakma ve Escape yalnız paneli kapatır, odağı açan düğmeye
döndürür. İnceleme ve kapatma pas geçme veya güç seçme komutu üretmez.
Seçim yalnız **Gücü onayla**, pas yalnız **Güç kullanmadan devam et** ile
kesinleşir. Yerel iki kişide panel koltuk değişiminde kapanır. Masaüstünde
mevcut levha menüsü ve Devam et eylemi korunur.

Tek ana eylem görünür tutulur. Geniş masada eylem altta, kısa yatay ekranda
sağdadır. Yardım/ayar/sonuç pencereleri kendi içlerinde kayar. Sonuç penceresi
son sunum tamamlanınca açılır; Yeni oyun son tanrıları seçili getirir.

## Hareket ve erişilebilirlik

Animasyonlar core olayını gösterir; parça varışıyla kaynak güncellemesi aynı
sınırı kullanır. Yerel sıra değişiminde masa aktif koltuğa döner. Azaltılmış
harekette uzun dönüş/atış/ışık geçişleri uygulanmaz.

Klavye odağı görünürdür. Zar hedefleri Tab, Space/Enter, oklar ve Home/End
ile kullanılabilir; dokunma hedefleri en az 44px tutulur. Seçim, altın çerçeve
ve durum yalnız renk üzerinden anlatılmaz. Video için Escape, medya hatası ve
azaltılmış hareket kurtarma yolları vardır.
360px ve altındaki maç başlığında yardımcı araç düğmeleri de 44×44px
boyutunu korur; geniş masaüstü ve karşılama başlığı bu düzeltmeden etkilenmez.

Bu belge güncel uygulama rehberidir; tarihsel teslimlerin açık görsel kabul
maddelerini kendiliğinden tamamlanmış saymaz. Ayrıntılı eski tasarım belgeleri
ve görsel incelemeler yerel arşivde korunur.

## Saldırı ve savunma — Aşama 13

Normal harekette saldırgan zar önce yükselip gerilir, sonra olayın savunma
zarına veya gerçek can taşına yaklaşır. Blok savunma zarını kısa geri iter;
hasarda can taşı temasla işaretlenir ve can o anda düşer. Zar kayıtlı yerine
döner; son katkı tamamlandığında ayrı toplama hareketiyle kenara alınır.
Mobilde yalnız aktif saldırgan/savunanın okunur yüzü hareketi takip eder;
kimlik, simge, etki değeri ve jeton işareti mevcut sunum durumundan gelir.
Bu yüzler seçim veya odak hedefi değildir. Azaltılmış harekette yolculuk
ve geri itme yerine kısa kaynak/hedef işareti ve temas bildirimi vardır.
Bu Aşama 13 kaydından sonra Aşama 11–12 ile genel oyuncu sıraları ve bütün
savaş boyunca yüz/kadraj sürekliliği de eklendi.

## Çevrim içi hazırlık — Aşama 14

Hazır veren oyuncunun ana düğmesi **Hazır değilim** olur ve arkadaşı henüz
hazır değilken kullanılabilir kalır. Geri alma onaylanınca aynı ad ve tanrılar
korunarak düzenleme açılır; düğme **Hazırım** olur. Bekleyen istek ve bağlantı
kaybında düğme/ad/tanrı seçimi kilitlidir. Etiket sunucu onayını izler;
hata, hazır açıklaması tarafından gizlenmez. İlk maç ve aynı odada yeniden
maç, mobil ve masaüstünde aynı akışı kullanır.

Masaüstünde geçici atış/seçim kilidi zar düğmesinin DOM kimliğini ve klavye
odağını korur. Mobildeki dekoratif savaş yüzleri masaüstü odak akışını
etkilemez. Birleşik kabul ve açık bağımlılıklar
`docs/review/gameplay-acceptance.md` içinde kayıtlıdır.

## Savaş boyunca okunur yüzler — Aşama 12

Savaşa girince mevcut okunur yüzler görünür kalır. Kilitli yüzler dekoratiftir;
tıklama ve odak hedefi oluşturmaz. O anki olayın kaynak/hedef kimlikleri
pirinç vurguyla gösterilir, diğer yüzler soluktur. Saldıran/savunan yüz
hareket eden 3B zarını ince çizgiyle takip eder; diğer yuvalar boşluk kapatmaz.
Kısa yatayda hareketli yüz kaydırma yüzeyinden ayrı izlenir. Atılan yeni
yüz, değişen değer veya sonraki kaynak sonucu erkenden açılmaz. Kullanılmış
yüz toplamanın sonunda, kaldırılan yüz gerçek kaybolma sınırında temizlenir.

Kadraj mevcut olayın temas alanına yumuşak geçer; azaltılmış harekette uzun
kamera geçişi uygulanmaz. Başlık/kaynak/eylem alanı her kadrajda korunur.
Sekme dönüşü veya WebGL yeniden kurma eski yüz/vurgu bırakmaz. Masaüstü
aynı düğme/odak kimliğiyle tam masa görünümünü sürdürür.
