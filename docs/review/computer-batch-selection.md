# Aşama 10 — Botun toplu seçimi

31 Ekim 2026. `decideCommand` mevcut değerlendirmeyle son kilitsiz zar
kümesini tek komutta üretir. İnsan seçim zamanlayıcısı değiştirilmedi.

Node 24.22.1 ile `npm run check` ve `npm run test:ci` geçti: 40 dosyada
508 test. Eski algoritmadan değişiklik öncesi kaydedilen beş seed / üç
zorluk için nihai kümeler eşleşti. Aynı kararda seçim/geri alma, tek
revision/olay, kilitli zarlar, üçüncü atış ve sunum bitince tek onay
kontrol edildi. Mevcut ortak zaman çizgisi ve kesinti testleri geçti.
İlk tam koşuda ağ yeniden maç testinde istemciler arası zamanlama
uyuşmazlığı görüldü; ikinci tam koşu başarılı oldu. Bu test için kod
veya bekleme değiştirilmedi.

Playwright Chromium 143.0.7499.4, 390×844 ve 1440×900; normal ve azaltılmış
harekette seed 1 / normal bot sırası çalıştırıldı. Botun iki zarı tek
`DiceSelectionChanged` olayıyla sakladığı, tekli seçim olayı üretmediği ve
sunum sonrası aynı iki zarın kilitlendiği doğrulandı. Normal hareketin
sunum ortası ve son ekran görüntüleri açılarak incelendi. Tarayıcıdaki
seçim grubu ve olay kaydı otomatik kontrol edildi; fiziksel cihaz testi
yapılmadı.

Kanıtlar Git dışındaki `output/stage10/` içinde: `browser.mjs`,
`browser.json`, `batch-*.png`, `settled-*.png`, `check.log`, `tests.log`.
Mevcut Vite import uzantısı ve büyük parça uyarıları sürer.

Bu doğrulama sırasında başka bir süreç savaş animasyonu / yüz takibi
üzerinde eşzamanlı değişiklik yaptı. Bu dosyalar Aşama 10 commit'ine
alınmadı; ilgili değişiklikler korunmuştur.
