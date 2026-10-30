# Aşama 3 — Yakın mobil sahne doğrulaması

Tarih: 30 Ekim 2026. Aşama 1 HUD'u ve Aşama 2 güç paneliyle birleşik sürüm.

## Davranış

- Mobil eşikleri mevcut HUD ile aynı: genişlik ≤600px veya yatay yükseklik
  ≤500px. Kamera kendi hazneni ve iki merkez sırasını kapsar; dış masa ve
  rakip haznenin tamamını sığdırmak zorunda değildir.
- Gerçek DOM ölçüleri başlık, kaynak satırları, zar özeti, ağ bildirimi ve
  alt eylemler için boş alan ayırır. Kısa yatayda özet/kaynak solda, oyun
  alanı sağdadır; eylemler yan yana durabilir, hata metni ayrı satıra geçer.
- Çözümleme boyunca kadraj iki tarafın can/jeton/tanrı temas noktalarına
  genişler. Normal harekette 450ms geçiş vardır; azaltılmış harekette geçiş
  animasyonu yoktur. Kamera tek hesaplama yolundan yönetilir; fizik/GSAP zar
  sahipliği, core sonuçları ve olay sırası değişmez.
- Rakip hazne özeti yalnız sunulmuş zarları okur. Atılmamış zar çizgi,
  atılmakta olan zar üç nokta ile gösterilir. Yüz ancak ilgili olayın 3B
  oynatımı bitince açıklanır. Simgeler, jeton işareti ve artırılmış değerler
  korunur. Seçili/saklı/kaldırılmış/toplanmış zarlar listeden çıkar; gizli
  güç niyeti okunmaz.
- Seçim hedefleri güncel kamera izdüşümünü izler. Mobil HUD altında kalan
  zar merkezleri için görünmez hedef üretilmez. Mobil güç paneli kadraj
  dışındaki tanrılara erişimi sürdürür. Masaüstü tam masa görünümündedir.

## Komutlar ve test kapsamı

Node 24.21.0 ile `npm run check` başarılı; tip denetimi ve üretim derlemesi
geçti. `npm run test:ci`: **34 dosya / 443 test başarılı**.

Kamera senaryoları iki koltuğu, yakın hazneyi, dokuz zarlık merkez sıralarını,
çözümleme temas sınırlarını, eski kadraja göre büyümeyi ve masaüstünde tam
masa/koltuk dönüşünü denetler. Üç yeni zar özeti senaryosu atış/yeniden atış
yayın anını, kaynak olayı sırasında görünümün korunmasını, kaldırmayı,
koltuk ayrımını, jeton/değerleri ve geçersiz/eski callback'leri kapsar.

Bir tam koşuda mevcut ağ yeniden maç testinin iki istemci snapshot'ını
karşılaştıran satırı aralıklı başarısız oldu: misafir yeni maçı almışken
kurucunun eski snapshot'ı henüz değişmemişti (`server/__tests__/rooms.test.ts:110`).
Sunucu veya o test değiştirilmedi; sonraki tam koşu sonucu yukarıda verildi.

## Tarayıcı kanıtları

macOS üzerinde Playwright / Chromium **143.0.7499.4**, fare/klavye ve ekran
boyutu benzetimi kullanıldı. Tarayıcı çalışma zamanı hatası alınmadı.

| Kontrol | Sonuç |
| --- | --- |
| 360×800, 390×844, 430×932 | Yakın hazne ve merkez zarları okunuyor; hedefler ölçülen HUD boşluğunda |
| 568×320, 667×375, 844×390 | Sol özet/kaynak ve sağ oyun alanı; ana eylemler HUD'u örtmüyor |
| 768×1024, 1440×900 | Mobil özet gizli, mevcut tam masa kadrajı korunuyor |
| Dikey → yatay → masaüstü | Kamera izdüşümü ve hedefler yeniden ölçülüyor; masaüstünde mobil kaydırma temizleniyor |
| Gerçek bot turu | Oyuncu I yakında kalıyor; rakip zarlar önce Atılıyor, sonra gerçek yüz olarak görülüyor |
| Yerel iki kişi | Zar at → klavyeyle seç → onayla → koltuk II; normal ve azaltılmış dönüş geçti |
| İki gerçek Socket.IO istemcisi | Bir atış ve onayla sıra değişti; her istemcinin kendi koltuğu yakında kaldı |
| Mobil güç paneli | Rakip tanrıları inceleme ve Kapat, yeni kadrajda kullanılabiliyor |
| Normal / azaltılmış çözümleme | Gerçek core olaylarıyla kazanım, çalma, ödemeler, balta/Thor hasarı ve Iðunn iyileştirmesi oynadı; son kaynaklar eşleşti |
| Freyja çıktısıyla iki dokuz zarlık sıra | 390×844, 844×390, 568×320'de 18 zar hedefinin tamamı HUD boşluğunda |
| Güvenli alan benzetimi | Dikey üst 47px/alt 34px; yatay sol/sağ 44px/alt 21px ile dokuz zar ve kontroller sığıyor |
| Çok satırlı hata | Üç dokuz-zar görünümünde hata metni ve alt kaynak satırı örtüşmüyor |

Kamera büyümesi, yakın hazne merkezinde 0,88 dünya birimlik zarın izdüşümüyle
eski kameraya karşı aynı viewport ve güncel HUD ölçülerinde hesaplandı:

| Viewport | Önceki genişlik | Yeni genişlik | Oran |
| --- | --- | --- | --- |
| 360×800 | 15,43px | 23,48px | 1,52× |
| 390×844 | 16,76px | 25,51px | 1,52× |
| 430×932 | 18,59px | 28,29px | 1,52× |
| 844×390 | 10,94px | 16,78px | 1,53× |
| 667×375 | 10,18px | 15,58px | 1,53× |
| 568×320 | 7,40px | 10,83px | 1,46× |

Bu, fiziksel piksel yoğunluğu veya dokunma başarısı ölçümü değildir.

## Yerel çıktılar ve açık sınırlar

Git dışındaki `output/mobile-camera/` altında:

- `check.log`, `tests.log`, `browser-results.json`, `extra-results.json`
- `layout-*.png`, `bot-visible-dice.png`, `local-seat-2.png`,
  `normal-seat-turn.png`, `online-seat-1.png`, `online-seat-2.png`
- `income-full.png`, `income-system.png`, `resolution-full.png`,
  `resolution-system.png` (`system`, azaltılmış hareket benzetimidir)
- `nine-dice-*.png`, `error-*.png`, `camera-metrics.txt` ve inceleme betikleri

Güvenli alanlar CSS değişkenleriyle benzetildi. Gerçek iPhone/Safari,
Android/Chrome, dokunma/uzun basma, tarayıcı çubukları ve fiziksel cihaz
performansı Aşama 5'te açık kalır. Bu teslim tüm mobil kabul veya tam çevrim
içi maç testi değildir. Zar sembolü/3B jeton işareti ve komşu dokunma hedefi
iyileştirmeleri Aşama 4'tedir; bu aşamada zar geometrisi değiştirilmedi.
