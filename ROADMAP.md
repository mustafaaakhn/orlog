# Mobil masa: sade görünüm ve net zarlar

## Sorunlar

- Aynı zar hem 3B taş hem ayrı yüz kartı olarak gösteriliyor. İki tarafın
  merkez kartları ve hareket eden saldırı kartları masayı kalabalıklaştırıyor.
- “Sen · Merkez” ve “Rakip · Merkez” başlıkları oyun alanını kaplıyor.
  Kartlarla gerçek zarların farklı konumlarda olması takibi zorlaştırıyor.
- Merkezdeki 3B zarlar küçük ve sembolleri yeterince net değil. Mobil
  benzetimde 3× ekran yoğunluğuna karşı otomatik çizim çözünürlüğü yaklaşık
  1,25×; yüksek kalite görüntüyü iyileştirse de zarlar hâlâ küçük kalıyor.

## 1. Kartları yalnız kendi haznemizde tut

- [ ] Okunaklı seçim kartlarını yalnız kendi haznemizdeki zarlar için göster.
  Rakibin hazne kartlarını ve iki tarafın merkez kartlarını kaldır.
- [ ] “Sen · Merkez” ve “Rakip · Merkez” başlıklarını kaldır. Merkezde
  iki tarafın yalnız gerçek 3B zarları görünsün.
- [ ] Zar merkeze taşındığında kartını kaldır; hazneye geri döndüğünde
  yeniden göster. Mevcut iki saniyelik toplu seçim ve erken onay korunsun.
- [ ] Kendi merkezimizdeki kilitsiz zarı doğrudan 3B zar üzerinden geri
  almayı koru; görünmez dokunma alanları en az 44×44px olsun.

## 2. 3B zarların netliğini artır

- [ ] Mobil otomatik çizim çözünürlüğünü iyileştir; 1,75–2× aralığını
  görüntü netliği ve akıcılık açısından karşılaştır.
- [ ] Üst yüz sembollerini daha büyük, koyu ve belirgin yap. Açık yüz
  zemini, altın jeton çerçevesi ve semboller kolay ayırt edilsin.
- [ ] Doku ve kenar yumuşatma ayarlarını birlikte değerlendir; yalnız
  çözünürlüğü artırmayı yeterli kabul etme.

## 3. Merkez zarlarını daha büyük ve rahat izlenir göster

- [ ] Mobil kadrajı kendi haznemize ve iki merkez sırasına yaklaştır;
  rakibin haznesini kadraja sığdırmak için alan ayırma.
- [ ] Merkez zarlarının ekran üzerindeki boyutunu artır; kamera açısını
  üst yüzlerin rahat okunacağı şekilde düzenle.
- [ ] Altışar zar ve ek zarlarla dokuzar zar durumunda sıralar birbirine
  girmesin; can/jeton göstergeleri ve ana eylemler zarları örtmesin.

## 4. Savaşı kartlar olmadan anlat

- [ ] Saldıran veya savunan zarın üstünde hareket eden büyük yüz kartlarını
  kaldır. Saldırı, blok ve hasarı gerçek 3B zarın hareketiyle göster.
- [ ] Aktif zar ve temas hedefini kısa, ince bir vurguyla belirt;
  diğer zarların üstünde kalıcı kart veya etiket bırakma.
- [ ] Azaltılmış harekette kaynak, hedef ve temas anlaşılır kalsın.
  Can/jeton güncellemeleri mevcut olay ve temas zamanlamasını izlesin.

## 5. Ayrıntıyı yalnız istendiğinde göster ve sonucu doğrula

- [ ] Merkezdeki zara uzun basıldığında yalnız o zarın büyük yüzünü ve
  bilgisini geçici olarak aç; kapatıldığında masa yeniden boş kalsın.
- [ ] İnceleme seçim veya oyun komutu üretmesin; kendi haznemizdeki
  kısa dokunma, uzun basma ve toplu seçim davranışı korunsun.
- [ ] Kullanıcının IMG_1972–IMG_1975 görüntülerindeki durumları yeniden
  kur; kendi haznemiz dışında kalıcı yüz kartı bulunmadığını doğrula.
- [ ] Dikey/kısa yatay mobilde seçim, geri alma ve savaş akışını kontrol et.
  Netlik ve akıcılığı gerçek iPhone/Safari ve Android/Chrome üzerinde de
  değerlendir; tarayıcı benzetimini fiziksel cihaz kabulü sayma.

Bu adımlar yalnız mobil sunumu sadeleştirir. Oyun kuralları, zar sonuçları,
tanrı güçlerinin öncelik/ödeme sırası ve masaüstü davranışı korunur.
