# Mobil roadmap — 1. adım: yalnız haznede seçim kartları

31 Ekim 2026. Kartlar yalnız kişisel/aktif koltuğun haznesinde kalır.
İki merkezde başlık ve kalıcı kart yoktur; görünmez 44×44px hedefler gerçek
3B izdüşümünü izler. Kartların geçişi mevcut sunum durumundan gelir.
Geçici savaş yüzleri 4. adıma bırakıldı. Core, olay zamanlaması, kamera ve
masaüstü akışı değiştirilmedi.

Node 24.22.1 ile `npm run check`, `npm run test:ci` (45 dosya, 552 test)
ve `git diff --check` geçti. Ek davranış senaryoları: kartın toplu seçim
sonrasında kalkması, geri almada dönmesi ve örtüşen merkez hedeflerinde
pointerdown kimliğinin uzun basma/bırakma boyunca korunması.

Playwright / Chromium 143.0.7499.4, gerçek WebGL:

- 360×800, 390×844, 430×932 ve 844×390: beş hızlı seçim sırasında aynı
  kart yuvaları; 2000 ms sonrası tek seçim olayı, beş görünmez merkez
  hedefi; beş geri alma sonrası kartların geri gelişi; erken onay sonrası
  tek kilitleme/sıra geçişi. Merkez hedefleri 44×44px, şeffaf, çerçevesiz
  ve simgesiz ölçüldü. Tek kalan başlık `Sen · Hazne` oldu.
- 390×844 ve 844×390: dokunma API’siyle hazneden seçim ve doğrudan
  merkez izdüşümünden geri alma doğrulandı. Kısa yatayda hedefler
  örtüşebildiği için merkez pointerdown en yakın izdüşüm kimliğini
  sabitler; hazne kartları daima kendi bağlı kimliğini kullanır.
- 768×1024 ve 1440×900: klavyeden tekli seçim ve seçim sunumu sonrasında
  aynı DOM/odak kimliği korundu. Mobil kart düzeni açılmadı.

Dikey ve yatay seçim/geri alma ekranları açılarak görsel olarak incelendi.
Çalışma zamanı istisnası görülmedi. Kanıtlar Git dışında çalışma ağacının
`output/mobile-steps/` dizininde: `matrix.json`, `step1-extra.json`, PNG’ler,
tarayıcı sürücüleri ve doğrulama günlükleri. Fiziksel cihaz kabulü yapılmadı.
