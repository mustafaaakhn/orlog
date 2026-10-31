# Fiziksel mobil cihaz kabulü

Bu liste, ROADMAP Aşama 9'un birleşik cihaz kabulü ile Aşama 4–5'in açık
fiziksel kontrolleri içindir. Tarayıcı boyutu ve CDP dokunma benzetimi bu
kaydın yerine geçmez. Gerçek iPhone/Safari ve Android/Chrome ayrı ayrı
denenmelidir. Son güncelleme: 31 Ekim 2026.

Aşama 9'un masaüstü tarayıcı kontrolleri ve açık sınırları
[doğrulama raporundadır](review/mobile-batch-acceptance.md). Aşağıdaki
cihaz kayıtları henüz doldurulmadı; yazılım kontrolü bunları kapatmaz.

## Bağlanma ve kayıt

Bilgisayarda proje klasöründe:

```sh
nvm use
npm ci
npm run dev -- --host 0.0.0.0
```

Telefonu aynı ağa bağlayıp terminaldeki **Network** adresini aç. Oyun için
API anahtarı gerekmez. Test sonunda geliştirme sunucusunu Ctrl+C ile kapat.
Test başında `git rev-parse --short HEAD` ile sürümü kaydet. Kod değişirse
etkilenen kontrolleri yeni sürümde tekrar yap.

| Kayıt | iPhone / Safari | Android / Chrome |
| --- | --- | --- |
| Cihaz modeli | Test edilmedi | Test edilmedi |
| İşletim sistemi / tarayıcı sürümü | — | — |
| Test edilen commit | — | — |
| Tarih / test eden | — | — |
| Ekran yönü / hareket tercihi | — | — |
| Hızlı beşli seçim / süre / geri alma | — | — |
| Erken / tekrarlı onay | — | — |
| Uzun basma / taşıma sırasında bırakma | — | — |
| Dar alan kaydırması / yön değişimi | — | — |
| Tarayıcı çubukları / güvenli kenarlar | — | — |
| Bot / yerel / ağ / yeniden maç | — | — |
| Akıcılık / ısınma / kalan sorun | — | — |

## Her iki telefonda yapılacaklar

1. **Hızlı beşli seçim:** İlk atıştan sonra beş farklı zara peş peşe kısa
   dokun. Onay imleri hemen görünmeli; yüzler ve 44px hedefler beklerken
   kaybolmamalı veya taşınmamalı. Son seçim değişikliğinden 2 saniye sonra
   hepsi birlikte merkeze geçmeli. Sürenin bitmesi zar atmamalı, seçimi
   kilitlememeli veya sırayı geçirmemeli. Rakip hazne özeti görünmemeli.
2. **Süre yenileme ve geri alma:** Bir zar seç, yaklaşık 1 saniye sonra
   başka birini seç. Taşıma ilk dokunuştan 2 saniye sonra başlamamalı;
   son değişiklikten 2 saniye beklemeli. Aynı zara iki kez dokunarak eski
   seçime dönmek taşıma üretmemeli. Merkezdeki beş kilitsiz zarı geri al;
   hepsi son değişiklikten 2 saniye sonra hazneye birlikte dönmeli.
3. **Erken ve tekrarlı onay:** Beş zarı seçip 2 saniye dolmadan Seçimi
   onayla'ya bas. Son taslak kaybolmamalı; tek taşıma ve tek onay olmalı.
   Hızlı çift onay ve süre dolarken onaylamayı da dene. Sıra geçtikten sonra
   Zar at uygun oyuncuda tek dokunuşla çalışmalı. Önceki atışlarda kilitlenen
   zar açılamamalı; üçüncü atışın kalan zarları otomatik saklanmalı.
4. **Uzun basma ve iptal:** Bir zara en az yarım saniye bas; yalnız bilgi
   açılmalı. Bırakıp Kapat'a dokun; seçim oluşmamalı. Bir zarı seçtikten
   sonra başka bir zara uzun bas ve 2 saniyelik taşıma bitene kadar parmağını
   kaldırma. Bıraktığında aynı/komşu zar seçilmemeli. Sonraki yeni kısa
   dokunma çalışmalı. Sürükleme ve iptal de seçim üretmemeli.
5. **İnceleme ve dar alan:** Kilitli/rakibin merkezdeki zarı yalnız bilgi
   göstermeli. Jeton işareti ve seçim onay imi ayırt edilmeli. Yatay/kısa
   alanda kaydırılabilir zar listesi oluşursa kaydırma zar seçmemeli, bütün
   kimlikler erişilebilir kalmalı. Ekstra ve kaldırılmış zar etkileri
   görülürse ekstra yüzleri incele; kaldırılmış zarın hedefi kalmamalı.
6. **Panel ve taslak iptali:** Bekleyen seçim varken Tanrı gücü, yardım veya
   ayar aç. Taslak iptal olmalı; panel açıkken süre dolsa da seçim/onay
   gönderilmemeli. Kapatmak pas geçme veya güç komutu üretmemeli. Tanrı
   listesini parmakla kaydır; başlık/Kapat erişilebilir kalmalı. Frigg/Loki
   için gereken hedefleri seçip onaylamayı dene.
7. **Yön ve tarayıcı çubukları:** Bekleyen seçimde mobil dikey/yatay çevir;
   taslak ve kalan süre korunmalı, süre baştan başlamamalı. Panel açıkken
   de çevir. Adres/alt çubuklarını açıp kapat; HUD, simgeler, Kapat ve ana
   eylem çentik/alt kenar altında kalmamalı. Uzun adlar ve jetonlar okunmalı.
8. **Arka plan ve bağlantı:** Bekleyen seçimde ana ekrana/başka sekmeye geç;
   dönüşte eski taslak uygulanmamalı. Atış/çözümleme sırasında da dene;
   sahne ve kaynaklar güncel olmalı, zar/kaynak ikinci kez işlenmemeli.
   Ağ maçında bağlantıyı kapatıp kısa süre içinde aç; eski seçim gönderilmeden
   aynı koltuk güncel duruma dönmeli. Azaltılmış hareket açıkken de kontrol et.
9. **Tam maç ve yeniden maç:** Botla ve aynı cihazda iki kişiyle
   atış–seçim–onay–güç–savaş–sonuç akışını tamamla. Yerelde yakın taraf sıra
   değişiminde doğru oyuncu olmalı. İki cihazla oda kur/katıl; her cihazın
   kendi tarafı yakında kalmalı ve sonuçlar eşleşmeli. Yeni oyun ve iki
   hazır onayını dene. Yeni maçta can 15, jeton 0; ilk başlayan önceki
   maçın ilk başlayanının karşısı olmalı. Son turun sırasıyla karşılaştırma.
10. **Akıcılık:** En az bir tam maç boyunca dokunma/kaydırma gecikmesi,
    takılma veya belirgin ısınma görülürse cihazı, modu, yaklaşık süreyi ve
    tetikleyen adımı kaydet. Ekran görüntüsü performans kabulü sayılmaz.

## Sorun kaydı ve kapanış

Her sorun için cihaz/tarayıcı, commit, yön, oyun modu, tur/faz, beklenen ve
gerçek davranış ile tekrar adımlarını yaz. Test edilmeyen adımı açıkça belirt.
Düzeltmeden sonra aynı cihazda ilgili senaryoyu yeniden dene.

İki telefonun sonuçları gelmeden ROADMAP Aşama 9'un fiziksel cihaz maddesi,
Aşama 5'in fiziksel kabulü ve Aşama 4'ün fiziksel dokunması `[x]` yapılmaz.
Bu maddeler, eksik cihaz veya açık sorun varken açık kalır.
