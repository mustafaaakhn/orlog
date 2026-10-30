# Aşama 5 — Birlikte doğrulama ve mobil kabul

Tarih: 30 Ekim 2026. **Tarayıcı kontrolleri tamamlandı; fiziksel cihaz kabulü
açıktır.** Aşama 1–4'ün birleşik sürümü kullanıldı. Yeni oyun özelliği, kural,
zar sonucu, kaynak hesabı veya animasyon sahipliği değişikliği yapılmadı.

## Bulgu ve düzeltme

360px ve altında maç başlığındaki beş yardımcı düğmenin genişliği mevcut
bir CSS kuralıyla 40px'e düşüyordu. `src/ui/entry-tools.css` içinde yalnız
maç için 44px genişlik ve küçülmeme kuralı eklendi. 320px ve 360px dahil
kontrol edilen görünümlerde düğmeler 44×44px, içerik viewport içindedir.
Masaüstü ve karşılama görünümü korunur. Kozmetik değişiklik için yeni bir
uygulama testi eklenmedi; boyutlar ve görünüm tarayıcıda denetlendi.

## Otomatik kontroller

- Node **24.21.0** ile `npm run check`: tip denetimi ve üretim derlemesi geçti.
- `npm run test:ci`: **37 dosya, 460 test başarılı**.
- `git diff --check`: geçti.

Vite'ın mevcut dosya uzantısı/derleme parça boyutu uyarıları kabul engeli
olarak değerlendirilmedi; bu aşamada paket veya derleme mimarisi değiştirilmedi.

## Tam maçlar ve yeniden maç

Playwright ve macOS üzerindeki Chromium **143.0.7499.4** ile gerçek UI
komutları kullanıldı. Normal hareket testlerinde hızlı sunum açıktı;
normal hızda savaş sunumu ayrıca oynatıldı. Düşük can veya kısa maç sonucu
enjekte edilmedi. Yerel maçlarda yalnız başlangıç rastgeleliği seed 42 ile
tekrarlanabilir hale getirildi; bot ve oda maçları doğal rastgelelik kullandı.

| Mod / görünüm | Tamamlanan akış |
| --- | --- |
| Bot, 390×844, azaltılmış hareket | Karşılama → rakip/tanrı seçimi → yazı tura → 5 tur → bilgisayarın galibiyeti → sonuç inceleme → yeniden maç |
| Yerel iki kişi, 360×800, azaltılmış hareket | 4 tur; koltuk değişimleri, güç kararı, savaş, sonuç ve iki hazır onayıyla yeniden maç |
| Yerel iki kişi, 430×932, normal hareket | 4 tur; istenen zar kimliklerinin seçimi, Thor/Iðunn kullanımı, savaş, sonuç ve yeniden maç |
| Gerçek Socket.IO, kurucu 844×390 / misafir 390×844 | 5 tur; iki koltuktan atış/saklama/güç, aynı sonuç, aynı odada iki hazır onayıyla yeni maç |

Maç bitmeden sonuç penceresi açılmadı. Sonuçta Masayı incele ve Sonucu
göster çalıştı. Yeniden maçlarda adlar/kuşanılan tanrılar korundu; oyun
kimliği yenilendi, canlar 15 ve jetonlar 0 oldu. Başlangıç, **önceki maçın
ilk turunda başlayan kişinin** karşısına geçti; son turun sırasıyla
karşılaştırılmadı. Oda ve koltuklar çevrim içi yeniden maçta korundu.

HUD sayıları, oyun ve sunum ilerlerken DOM üzerinden oturumun sunum
durumuyla karşılaştırıldı; uyuşmazlık görülmedi. Çevrim içi iki istemcinin
son can/jeton, tur ve kazananı eşleşti. Normal ve azaltılmış hareketin
aynı seed ve aynı seçimlerle ilk tur olay kaydı/kaynakları da eşleşti:
13/13 can, 3/4 jeton ve aynı saklanan zarlar.

## Ek kontroller ve kanıt sınırları

| Kontrol | Kanıt / sonuç |
| --- | --- |
| 768×1024 tablet ve 1440×900 masaüstü | Bir tam tur; eski fiziksel tanrı menüsünden seçim, savaş ve tur 2. Mobil panel/özet gizli kaldı |
| Uzun/boşluksuz adlar, 0/999 jeton | 320×568, 360×800, 390×844, 430×932, 844×390, 768×1024, 1440×900; yatay sayfa taşması yok, sayılar okunuyor |
| Düşük / otomatik / yüksek kalite | Uygulama tercihleri üzerinden test edildi; canvas piksel oranları yaklaşık 1 / 1 / 1,75 ve sahne hazır. Kalite seçicisinin UI'da bulunduğu iddia edilmez |
| Kısa dokunma / uzun basma | Chromium CDP ile 550ms basma yalnız bilgi açtı; bırakma seçim üretmedi. Sonraki kısa dokunma seçti, tekrar dokunma geri aldı |
| Panel kaydırma | Chromium CDP sürüklemesiyle iç scrollTop 0'dan 364'e ilerledi; başlık/Kapat erişilebilir kaldı |
| Gerçek sekme geçişi | Pencereli Google Chrome **156.0.8078.74**, `noDefaults` ile odak benzetimi kapalı. `document.hidden=true`, odak yok, uygulama arka planda ve bekleyen sunum tamamlanmış. Dönüşte aynı canvas, tek atış ve güncel zarlar |
| Hareket / yön | Azaltılmış ve normal hareket, dikey/kısa yatay görünüm; kamera ve kontrol yerleşimleri korundu |

CDP dokunması gerçek tarayıcı giriş hattını kullanır; **fiziksel dokunma,
iPhone/Safari veya Android/Chrome doğrulaması değildir**. Kalite kontrolü
telefon akıcılığı, pil veya ısınma ölçümü değildir. Fiziksel tarayıcı
çubukları ve gerçek güvenli ekran kenarları bu oturumda denenmedi.

## Yerel kanıt konumları

Git dışındaki `output/mobile-acceptance/` içinde:

- `check.log`, `tests.log`, `matches.json`, `online.json`, `desktop.json`,
  `edges.json`, `visibility.json`, `compare.json`, `combat.json`
- `bot-390-*`, `local-360-*`, `local-430-normal-*`: zar, panel, sonuç ve
  yeniden maç ekranları
- `online-host-result.png`, `online-guest-result.png`,
  `online-host-rematch.png`, `online-guest-rematch.png`
- `edge-*.png`, `quality-*.png`, `desktop-*.png`, `touch-panel-scroll.png`,
  `visibility-return.png`, `combat-normal.png`
- İnceleme betikleri: `driver.mjs`, `matches.mjs`, `online.mjs`, `edges.mjs`,
  `desktop.mjs`, `visibility.mjs`, `compare.mjs`, `combat.mjs`

## Açık kabul ve devam

Fiziksel iPhone/Safari ve Android/Chrome yoktu. ROADMAP Aşama 5'in fiziksel
cihaz maddesi ve Aşama 4'ün fiziksel dokunma maddesi açık kalır. Her iki
cihazda [kabul yönergesi ve kayıt tablosu](../MOBILE_DEVICE_CHECKLIST.md)
tamamlanmalı; bulunan sorunlar aynı cihazda düzeltme sonrası tekrar denenmeli.

Tarayıcıda görülen kapsam içi düğme sorunu düzeltildi. Bu kayıt tüm mobil
kabulün veya fiziksel cihaz performansının tamamlandığı anlamına gelmez.
