# Proje çalışma kuralları

## Kapsam

Bu depo, Valhalla'daki Orlog deneyiminden esinlenen bir web oyunu içindir.
Belgeler Türkçe, kod adları ve kısa commit mesajları İngilizce yazılır.
Geliştirmeden önce README.md, ARCHITECTURE.md ve ilgili tasarım belgesini oku.

## Git ve branch düzeni — kullanıcı şartı

- Her işe `git status --short --branch` ile başla. Mevcut kullanıcı değişikliklerini koru; üstüne yazma, kendiliğinden stash veya reset yapma.
- Tamamlanmış her aşamayı doğrula ve commit et; sonraki aşamaya temiz çalışma ağacıyla geç. Dosyalar düzenlenirken geçici değişiklik olması normaldir.
- İlk depo kurulum commit'i dışında kısa ömürlü `feat/…`, `fix/…`, `chore/…` veya `docs/…` branch'i kullan.
- Bitmiş işi doğruladıktan sonra yerel `main` branch'ine tercihen `--ff-only` ile birleştir; birleştirilmiş iş branch'ini `git branch -d` ile kaldır.
- Başka bir işe ait branch'i veya değişikliği silme. `reset --hard`, `clean -fd` ve force push kullanma.
- Her teslimde aktif branch, son commit ve çalışma ağacının temizliğini bildir. Tamamlanmış işi commitsiz bırakma.
- Commit mesajları kısa ve açıklayıcı olsun: `docs: add project guides`, `feat: animate dice rolls`, `fix: resolve favor order`.
- Remote ve push, ayrı bir kullanıcı isteği olmadıkça yerel çalışma kapsamına dahil değildir.

## Uygulama ve doğrulama

- Yalnızca istenen aşamayı uygula; ROADMAP.md gelecekteki işleri otomatik yapma yetkisi değildir.
- `src/core` saf TypeScript olmalı; Vue, DOM, Three.js, GSAP veya ses bağımlılığı alamaz.
- Kural sonucu ile görsel gösterim aynı olay kaydından beslenmeli. Görsel katman hasar, jeton veya zar sonucu üretmez.
- Bir nesnenin konumunu fizik ve GSAP aynı anda yönetmesin; sahiplik geçişini açıkça yap.
- Kural değişikliklerini anlamlı Vitest senaryolarıyla doğrula. Kozmetik düzenlemeler için yapay test ekleme.
- Kod/config değişikliklerinde `npm run check` çalıştır. Oyun testleri mevcutsa `npm run test:ci` de zorunludur.
- 3B/animasyon değişikliklerini tarayıcıda da kontrol et; derlemenin geçmesi görsel doğrulama değildir.
- Paketlerde `--force` ve `--legacy-peer-deps` ile uyumsuzluk gizleme. package-lock.json dosyasını commit et.
- Her tamamlanan roadmap maddesini aynı işin commit'inde işaretle. Sadece gerçekten doğrulanan işleri `[x]` yap.
- Yeni bir mimari karar alındığında ARCHITECTURE.md'yi, kural netleştiğinde docs/GAME_RULES.md'yi güncelle.
- Dış kod, model, doku ve ses için kaynak/lisans bilgisini docs/ASSETS.md'ye kaydet. Referans depodaki varlıkları otomatik kopyalama.
