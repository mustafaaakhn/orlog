# Fiziksel mobil cihaz kabulü

Bu liste, ROADMAP Aşama 4'ün açık dokunma kontrolü ile Aşama 5'in fiziksel
kabulü içindir. Tarayıcı boyutu veya CDP dokunma benzetimi bu kaydın yerine
geçmez. iPhone/Safari ve Android/Chrome ayrı ayrı denenmelidir.

## Bağlanma ve kayıt

Bilgisayarda proje klasöründe:

```sh
nvm use
npm ci
npm run dev -- --host 0.0.0.0
```

Telefonu aynı ağa bağlayıp terminaldeki **Network** adresini aç. Oyun için
API anahtarı gerekmez. Test sonunda geliştirme sunucusunu Ctrl+C ile kapat.

| Kayıt | iPhone / Safari | Android / Chrome |
| --- | --- | --- |
| Cihaz modeli | Test edilmedi | Test edilmedi |
| İşletim sistemi / tarayıcı sürümü | — | — |
| Test edilen commit (`git rev-parse --short HEAD`) | — | — |
| Tarih / test eden | — | — |
| Sonuç / kalan sorun | — | — |

## Her iki telefonda yapılacaklar

1. **Tam maç:** Robota karşı üç tanrı seç, yazı tura ve maç akışını tamamla.
   Zar atma, saklama, güç seçimi, savaş ve sonuçtan sonra Yeni oyun'u dene.
   Yeni maçta can 15, jeton 0 olmalı; ilk başlayan, önceki maçın ilk
   başlayanının karşısı olmalı. Son turun ilk oyuncusuyla karşılaştırma.
2. **Zar seçimi:** Kendi altı zarına sırayla kısa dokun; istenen zar merkeze
   geçmeli. Merkezden geri al; komşu zar seçilmemeli. Simge, altın jeton
   işareti ve seçili/kilitli onay imi birbirinden ayırt edilmeli.
3. **Uzun basma ve iptal:** En az yarım saniye bas; yalnız bilgi açılmalı.
   Parmağı kaldırıp Kapat'a dokun; zar seçilmemeli. Sonraki kısa dokunma
   seçmeli. Parmağı sürükleyip hareketi iptal etmek seçim üretmemeli.
   Kilitli zar ve rakibin merkezdeki zarı yalnız bilgi göstermeli. Aşama 6
   ile kaldırılan rakip hazne özeti ve ona ait dokunma hedefi görünmemeli.
4. **Güç paneli:** Tanrı gücü'nü aç; üç tanrıyı ve rakibin tanrılarını incele,
   listeyi parmakla kaydır. Başlık/Kapat görünür kalmalı. Kapat ve dış alana
   dokunma oyun komutu veya pas üretmemeli. Frigg/Loki ile gereken sayıda
   zar seçip onaylamayı dene; güç bedeli yalnız çalışma sırasında ödenmeli.
5. **Yön ve tarayıcı çubukları:** Zar seçerken ve panel açıkken dikey/yatay
   çevir. Tarayıcı adres/alt çubuklarını açıp kapat. HUD, simgeler, Kapat ve
   ana eylem çentik/alt kenar altında kalmamalı; dar zar listesi parmakla
   kayabilmeli. Uzun oyuncu adı ve birikmiş jeton sayıları okunabilmeli.
6. **Arka plan ve hareket:** Atış veya çözümleme sırasında ana ekrana/başka
   sekmeye geç; geri dönünce sahne ve kaynaklar güncel olmalı, aynı zar veya
   kaynak ikinci kez işlenmemeli. Telefonun hareket azaltma tercihi açıkken
   de dene; uzun kamera/zar animasyonları uygulanmamalı.
7. **İki oyuncu:** Aynı cihazda sıra değişiminde yakın tarafı kontrol et.
   İki cihazla oda kur/katıl; her cihazda kendi tarafı yakında kalmalı.
   Sonuçtan sonra aynı odada yeniden maç ve iki hazır onayını dene.
8. **Akıcılık:** En az bir tam maç boyunca kaydırma/dokunma gecikmesi, takılma
   veya belirgin ısınma görülürse cihazı, modu, yaklaşık süreyi ve tetikleyen
   adımı kaydet. Sadece ekran görüntüsüne bakarak performans kabulü verme.

## Sorun kaydı

Her sorun için cihaz/tarayıcı, yön, oyun modu, tur/faz, beklenen davranış,
gerçek davranış ve tekrar adımlarını yaz. Test edilmeyen adımı açıkça belirt.

İki telefonun sonuçları gelmeden ROADMAP Aşama 5'in fiziksel cihaz maddesi
ve Aşama 4'ün açık fiziksel dokunma maddesi `[x]` yapılmaz. Bir sorun varsa
ilgili madde, düzeltme ve aynı cihazda tekrar doğrulama tamamlanana kadar
açık kalır.
