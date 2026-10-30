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

Sesler `src/audio/catalog.ts` üzerinden yerel dosyalardan yüklenir. İki müzik
sırayla, ortam döngüyle oynar. Tarayıcı otomatik oynatmayı engellerse ilk
etkileşim yeniden dener; gizli sekme sesi duraklatır.

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
