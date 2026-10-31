# Aşama 14 — Lobi hazırlığını geri alma

31 Ekim 2026. Mobil/masaüstü ve aynı odada yeniden maç için hazır geri alma
uygulandı. İstek açık hedef durum ve hazırlık UUID'si taşır; koltuğu sunucu
üyeliği belirler. Ad/tanrılar korunur. Etiket ve kilitler yetkili oda durumunu
izler; bekleyen istek, red/kayıp ACK ve kopma mevcut nesil/resume yolundadır.

## Doğrulama

- Gerçek Socket.IO sunucusu ve iki istemci: iki koltukta hazır → hazır değil
  → farklı tanrı → tekrar hazır; idempotent tekrar; yabancı koltuk, eski
  hazırlık kimliği, yanlış faz; kopma ve aynı koltuğu resume etme.
- Geri alma önce ve ikinci hazır önce sıraları, ayrıca eşzamanlı istekler.
  İkinci durumda geç geri alma coin/playing aşamasını geri çeviremez.
- Tam maç sonrası aynı odada yeniden hazırlıkta eski hazırlık kimliğini
  reddetme, geri alma ve tekrar hazır; tek yeni maç, 15 can / 0 jeton ve
  önceki ilk başlayanın karşısı korunur.
- İstemci testleri: iyimser hazır etiketi yok; tekrar tıklama kilidi;
  redden sonra yetkili aşamaya resume; kayıp ACK'de tekrar göndermeden
  toparlanma; kopukken istek buffer'ına girmeme. UI testleri seçimleri
  koruma, ad/tanrı kilidi, hata görünürlüğü ve onay beklemeyi kapsar.
- Chromium 143.0.7499.4: kurucu 390×844 / misafir 1440×900 ve ters
  boyutlarda iki gerçek ağ koltuğu. Her koltuk yalnız hazırken geri aldı,
  tanrısını değiştirdi, tekrar hazır verdi; iki hazırdan sonra ortak yazı
  tura ve aynı yüklerle masa açıldı. Ekran görüntüleri açılarak incelendi;
  yakalanan çalışma zamanı istisnası yoktu.

Kanıtlar Git dışındaki `output/stage14/`: `browser.mjs`, `driver.mjs`,
`browser.json`, `*-ready.png`, `*-edited.png`, `*-table.png`,
`check.log`, `tests.log`. Node 24.22.1 ile `npm run check` ve
`npm run test:ci`; `git diff --check`. Fiziksel cihaz testi yapılmadı.
