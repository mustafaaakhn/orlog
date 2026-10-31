# Aşama 11 — Kararlı mobil sıralar

31 Ekim 2026. Oyuncu/zar kimliği yuvaları ortak en yakın hücre aramasının
yerini aldı. Rakip merkez / sen merkez / sen hazne grupları ayrı; 6 normal
zar ve sonraki bonus sırası kimlik deliklerini korur. Taslak yüzleri taşımaz.
İnceleme çizgisi ilgili yüzün güncel izdüşümünü gösterir. Rakip hazne özeti
eklenmedi, core kuralları ve tanrı hedefleri değiştirilmedi.

Node 24.22.1: `npm run check`, `npm run test:ci` (43 dosya, 531 test),
`git diff --check` geçti. Testler 0–9 zar, iki koltuk, kimlik sırası,
kaldırma, hazne/merkez ve değişen izdüşümlerle yuva kararlılığını kapsar.

Playwright Chromium 143.0.7499.4 / gerçek WebGL masa:

- 360×800, 390×844, 430×932, 844×390: beş hızlı seçim, toplu taşıma,
  beş geri alma, erken onay, tek seçim olayları ve 44px yüzler kontrol edildi.
  Kaydırma durumunda ekran koordinatı yerine aynı yuva/stil korunumu ölçüldü.
- Core'un ürettiği snapshot'larla 12 ve iki Freyja etkisi sonrası 18 zar
  gösterildi. 360/390/430 dikeyde normal altılı ve bonus sıraları ayrık;
  844×390, 568×320 ve 568×280'de başlıklı gruplar kaydırıldı. CDP sürüklemesi
  gerçek scrollTop değişimi üretti. Loki ile kaldırılan kimlik görünmedi.
- Normal harekette 390×844 → 844×390 → 390×844, iki seçim ve 2000 ms
  zamanlayıcısı korundu; tek toplu komut oluştu.
- Normal/azaltılmış harekette uzun basma, toplu sunum kilidi, bırakma ve
  komşuya kayan tıklama sınırı geçti; ikinci seçim oluşmadı. İlk eşzamanlı
  tarayıcı koşusunda uzun basma örneklemesi zaman sınırını kaçırdı; yalnız
  yeniden koşu geçti. Kesin süre doğrulaması sahte saat testlerindedir.
- 768×1024 ve 1440×900: klavye tekli seçim, aynı DOM/odak kimliği,
  güç/savaş ve tur 2 geçti. Masaüstü görünümü korunur.

12/18 zar ve seçim ekranları açılarak görsel olarak incelendi. Sıralar
tek basamaklı kümeye karışmıyor; bonuslar ayrı satırda. Eşzamanlı bağlantı
çizgileri görsel karmaşa oluşturduğu için yalnız inceleme/işaret etmede
çizgi gösterilir. Kısa görünümün kaydırması 44px yüzleri küçültmez.

Kanıtlar Git dışında `output/stage11/`: `driver.mjs`, `matrix.mjs/json`,
`edges.mjs/json`, `orientation.mjs/json`, `touch-boundary.mjs/json`,
`desktop.mjs/json`, `twelve-390x844.png`, `eighteen-*.png`, seçim/geri alma/
masaüstü ekranları, `check.log`, `tests.log`. Çalışma zamanı istisnası yoktu.
Fiziksel iPhone/Safari ve Android/Chrome kabulü bu tarayıcı kontrolleriyle
kapanmaz. Genel savaş yüz/kadraj sürekliliği sonraki Aşama 12'dir.

Kullanıcının özgün IMG_1965–IMG_1971 dosyaları bu çalışmada mevcut değildi.
12 yüzün kümelenme senaryosu core snapshot'ıyla yeniden kuruldu; özgün
fotoğraflarla piksel düzeyinde birebir karşılaştırma iddia edilmez.
