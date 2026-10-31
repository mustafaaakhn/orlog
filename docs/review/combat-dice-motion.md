# Aşama 13 — Saldırgan zar hareketi

31 Ekim 2026. Kullanıcı isteğiyle yalnız Aşama 13–15 ele alındı;
Bu işte Aşama 10–12 uygulanmadı. Aşama 10 eşzamanlı ayrı çalışma olarak
`da2c608` commit’iyle geldi; Aşama 11–12 açık kaldı. Bu nedenle Aşama 12'nin genel yüz sürekliliği ve
olay odaklı kadrajı mevcut kabul edilmedi.

## Uygulama

Saldırı artık küçük simge uçuşu yerine kaynak 3B zarını hareket ettirir.
Blok hedefi `defenderDieId`, hasar kaynağı `dieId` ve can taşı gerçek
`DamageDealt.amount/health` alanlarından gelir. Kural, güç önceliği veya
rastgelelik değişmedi. Hazırlık → yaklaşma → temas/tepki → dönüş tek olay
zaman çizgisindedir. Çok değerli zar bütün gerçek katkılarını tamamlar;
kenara toplama mevcut son katkı hesabındadır.

İptal anında konumlar, can taşı malzemesi ve geçici roller temizlenir.
Olay kuyruğu fizik/düzenleme işlemini bitirmeden savaş hareketine geçmez.
Mobilde aktif kaynak/savunma yüzleri salt okunur izdüşümden beslenir;
seçim, uzun basma veya klavye hedefi oluşturmaz. Genel sıraları yeniden
kurmak ve diğer savaş olaylarını kalıcı yüzlerle göstermek yapılmadı.

## Doğrulama

Node 24.22.1; `npm run check`, `npm run test:ci` ve `git diff --check`.
Saldırgan/savunma hareketi, çok değerli ve ölümle sınırlanmış hasar,
temas başına tek progress, azaltılmış hareket, hız, duraklama ve iptal
senaryoları; mevcut normal/azaltılmış olay kaydı ve son katkıda toplama
testleriyle birlikte çalıştırılır.

Tarayıcı kanıtları Git dışındaki `output/stage13/` altındadır:
`browser.mjs`, `driver.mjs`, `browser.json`, `combat-*.png`,
`check.log`, `tests.log`. Hareketli yüz koordinatları ardışık örneklerle
kaydedilir; statik ekran görüntüsü tek başına hareket kanıtı sayılmaz.

Fiziksel iPhone/Safari ve Android/Chrome erişimi yoktur. Cihaz kabulü ve
Aşama 11–12 bağımlılıkları açık kalır; Aşama 15 bunları tamamlandı saymaz.

Chromium **143.0.7499.4**: 390×844, 844×390 ve 1440×900'de
normal/azaltılmış hareketle ilk tur ve ikinci turun açılması tamamlandı.
Mobilde altışar ardışık yüz koordinatı örneği alındı; normal harekette
her örnek farklıydı. Aktif yüzler `SPAN`, `aria-hidden=true` idi; etkileşim
kilidi korundu. Dikey/yatay ekran görüntüleri açılarak incelendi. Yakalanan
çalışma zamanı istisnası yoktu. Son otomatik denetim: **41 dosya, 515 test**.
Can taşı, kaynak güncellemesinde kaybolmadan önce aktif hedef olarak
ışıklandırılır; bu, canı erken değiştirmez.
