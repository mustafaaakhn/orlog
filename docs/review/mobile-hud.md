# Aşama 1 — Mobil kaynak göstergeleri doğrulaması

Tarih: 30 Ekim 2026. Yalnız mobil yol haritasının Aşama 1'i uygulanmıştır.

## Uygulama

- `MatchResources.vue`, mevcut `viewerId` ile rakibi üstte, oyuncuyu altta
  gösterir. İki kaynak kalp/jeton ikonu ve tam sayı olarak okunur.
- Veri, `createRollSession().state` üzerinden gelir. Core'un bekleyen nihai
  sonucu kullanılmaz; fiziksel kaynaklar ile aynı temas/aktarımda güncellenir.
- Genişlik ≤600px veya yatay yükseklik ≤500px mobil HUD'u açar. Masaüstü ve
  dikey tablet görünümünde ek satırlar gizlidir. Kamera, güç menüsü, kurallar
  ve sunum sahipliği değiştirilmemiştir.
- Dikeyde alt HUD ve eylem ortak akıştadır. Kısa yatayda eylem için sağda alan
  ayrılır. Uzun adlar kısalır; sayılar korunur. `viewport-fit=cover` ve maçın
  güvenli alan değişkenleri çentik/alt kenar boşluklarını hesaba katar.
- Mevcut ekran okuyucu canlı bildirimi aynı değerleri okumaya devam eder;
  görsel kopyalar erişilebilirlik ağacında tekrarlanmaz. Yeni dış varlık yoktur.

## Otomatik kontroller

Node 24.21.0 ile:

- `npm run check`: başarılı; tip denetimi ve üretim derlemesi tamamlandı.
- `npm run test:ci`: 32 dosya, 431 test başarılı.
- `git diff --check`: başarılı.

Yeni dört Vitest senaryosu iki koltuğun sırasını, 0 can/jeton ve 123456 jeton
metnini, gerçek core çözümlemesindeki kazanım/çalma/ödeme/hasar/iyileştirme
temaslarını doğrular. Bekleyen sonucun erkenden görünmemesi, iki taraflı
çalmanın aynı anda görünmesi, iyileştirmenin ara adımı, yanlış grup/tekrar/eski
callback ve yeniden başlatma sonrası kaynaklar da kapsanır.

## Tarayıcı kontrolleri

Playwright ile yerel geliştirme sunucusunda Chromium **143.0.7499.4** kullanıldı.
Bu kontroller ekran boyutu benzetimi ve fare etkileşimidir; fiziksel dokunma
veya Safari testi değildir.

| Görünüm | Doğrulanan durum |
| --- | --- |
| 320×568, 360×800, 390×844, 430×932 | Rakip üstte, oyuncu altta; tur/sıra ve eylem ayrı; yatay taşma yok |
| 568×320, 667×375, 844×390 | Kaynaklar solda; tur/sıra ve eylem sağda; kontrol örtüşmesi yok |
| 768×1024, 1440×900 | Mobil HUD gizli; mevcut masa ve ana eylem görünümü korunuyor |
| 390×844, üst 47px / alt 34px benzetimi | Başlık ve alt kontroller güvenli alan içinde |
| 844×390, sol/sağ 44px / alt 21px benzetimi | HUD ve eylem güvenli alan içinde |
| 390×844, 844×390 güç fazı | Açıklama, Devam et ve çok satırlı hata kaynak göstergelerini örtmüyor |
| 390×844, yerel ikinci koltuk | Alt gösterge oyuncu II'nin kaynaklarına geçiyor |

Toplam 14 yerleşim kontrolünde uzun/boşluksuz oyuncu adları ve 0/999 jetonla
DOM sınırları denetlendi; ekran görüntüleri incelendi. 360×800'de Zar at →
görünür zar seçimi → Seçimi onayla → ikinci koltuk → Zar at akışı fareyle geçti.
İlk zarın hedefi komşu zarla örtüşebildiği için seçim son görünür zar üzerinden
tamamlandı; planda zaten kayıtlı hedef örtüşmesi Aşama 4'te kalır.

Gerçek core olaylarından oluşturulan çözümleme, mevcut 3B sunum kuyruğunda
normal ve azaltılmış hareketle ayrı ayrı oynatıldı. Her modda 21 sunum durumu
yayınında HUD'un iki taraf için gösterdiği sayılar oturum durumuyla eşleşti.
Kazanım, altı jetonun birlikte çalınması, dört jetonluk ödemeler, normal/Tanrı
hasarı ve iki adımlı iyileştirme kapsandı. Tarayıcı çalışma zamanı hatası yoktu.
Bu kontrollü senaryo tam maç veya iki cihazla ağ testi olarak sayılmaz.

## Yerel kanıtlar ve sınırlar

Yeniden üretilebilir inceleme çıktıları Git dışındaki `output/mobile-hud/`
klasöründedir:

- `check.log`, `tests.log`
- `browser-results.json`, `normal-browser-results.json`
- `layout-360x800.png`, `layout-390x844.png`, `layout-844x390.png`,
  `layout-1440x900.png` ve diğer kontrol boyutlarının `layout-*.png` dosyaları
- `safe-portrait.png`, `safe-landscape.png`, `favor-390x844.png`,
  `favor-844x390.png`, `local-seat-2.png`
- `resolution-normal.png`, `resolution-reduced.png`, `controls-360x800.png`

Güvenli alan testlerinde CSS değişkenlerine örnek inset değerleri verildi;
gerçek cihazın `env()` değerleri, tarayıcı çubukları, dokunma ve fiziksel cihaz
performansı doğrulanmadı. iPhone/Safari ve Android/Chrome kabulü Aşama 5'te
açıktır. Sonraki geliştirme Aşama 2'dir ve ayrıca istenmelidir.
