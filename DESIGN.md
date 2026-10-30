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
kadrajlar. Rakip haznenin tamamını sığdırmak zorunlu değildir. Üst HUD'un
altında rakibin henüz merkeze alınmamış zarlarının simgeleri, jeton işaretleri
ve varsa artırılmış değerleri görünür. Atılmamış zarlar çizgiyle, henüz sunumu
bitmemiş atışlar üç noktayla gösterilir; gelecek yüzler erkenden açıklanmaz.
Saklanan, seçili, kaldırılmış ve kullanılıp toplanmış zarlar bu özetten çıkar.

Kamera başlık, kaynaklar, zar özeti ve alt eylemlerin ölçülen alanını boş
bırakır. Kısa yatayda kaynak/özet solda, yakın oyun alanı sağdadır; eylemler
yer varsa yan yana durur. Çözümleme sırasında iki tarafın can/jeton/tanrı
temaslarını göstermek için kadraj geçici olarak genişler. Normal harekette
geçiş yumuşaktır; azaltılmış harekette kamera animasyonu yapılmaz. Masaüstü
tam masa kadrajını korur. Koltuk yönü mevcut yerel/bot/çevrim içi davranışını
izler; kamera ve özet oyun sonucu üretmez.

Mobilde beş simge açık kemik zeminli, kameranın açısından etkilenmeyen 44px
zar yüzlerinde de okunur. Yakın hedefler 4px aralıkla ayrılır; gerçek zardan
uzaklaşan hedefi ince çizgi bağlar. Jetonlu yüzün altın çerçevesine sağ üstte
ayrı bir altın jeton simgesi eşlik eder. Seçili/kilitli durum açık camgöbeği
çizgi ve sol alttaki onay imiyle gösterilir; jeton kazancı ile karışmaz.
Çok kısa ekranda bütün zarlar sığmazsa hedefler aynı büyüklükte kayar.

Kısa dokunma kendi uygun zarını merkeze alır veya geri getirir. Kilitli/rakip
zarına dokunma ve kendi zarına uzun basma simge, etki ve Jeton getirir bilgisini
açar; görünür Kapat eylemi vardır. Uzun basma veya sürükleme seçim üretmez.
Rakibin haznesi yalnız üst özetteki 44px düğmelerden incelenir; aynı zara
iki mobil hedef çizilmez. Masaüstünde mevcut 3B yüzler, hover bilgisi ve
klavye hedefleri korunur.

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
