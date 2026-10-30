# Orlog

Assassin’s Creed Valhalla’daki Orlog’dan esinlenen, tarayıcıda oynanan bağımsız
bir hayran yapımı zar oyunu. Ubisoft ile resmî bağlantısı yoktur.

- Robota karşı, aynı bilgisayarda iki kişi veya oda koduyla çevrim içi oyun.
- Fizik tabanlı 3B zarlar, 20 tanrı gücü ve olaylarla eşleşen animasyonlar.
- Yerel müzik/ses ayarları, klavye kontrolleri ve azaltılmış hareket desteği.

## Kurulum

Node **24.21.0** ve npm kullanılır; sürüm `.nvmrc` / `.node-version` içindedir.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Oyun ve Socket.IO oda sunucusu birlikte `http://127.0.0.1:5173` üzerinde açılır.
Oynamak için API anahtarı veya `.env` dosyası gerekmez. WebGL 2 destekleyen
bir tarayıcı gerekir.

## Üretim sunucusu

```sh
npm run build
npm start
```

Varsayılan port `3000`; `HOST` ve `PORT` ortam değişkenleriyle değiştirilebilir.
Çevrim içi oyun Node.js ve WebSocket destekleyen tek bir sunucu gerektirir.
`npm run preview` yalnız statik önizleme sunar. Odalar bellekte tutulur;
sunucu yeniden başlatıldığında kapanır.

Aynı ağda iki cihazla geliştirme için `npm run dev -- --host 0.0.0.0`
çalıştırıp terminaldeki Network adresini kullan.

## Doğrulama

```sh
npm run check
npm run test:ci
```

`check` tip denetimi ve üretim derlemesini, `test:ci` oyun/sunum/ağ testlerini
çalıştırır. `npm test` testleri izleme modunda açar.

## Belgeler

- [Mimari](ARCHITECTURE.md)
- [Tasarım](DESIGN.md)
- [Oyun kuralları ve kaynakları](docs/GAME_RULES.md)
- [Çevrim içi oyun](docs/ONLINE_PLAY.md)
- [Varlık kaynakları ve lisans kayıtları](docs/ASSETS.md)
- [Depo çalışma kuralları](AGENTS.md)

## Yerel arşiv

Geliştirme raporları, eski planlar, deneme medyası, üretim araçları ve anahtar
dosyaları `local-archive/` altında saklanır. Bu klasör Git tarafından dışlanır;
geliştirme sunucusundan erişilemez ve üretim çıktısına dahil edilmez.
`node_modules/`, `dist/` ve yeniden oluşabilecek `output/` da Git dışındadır.

Yerel çalışma deposunun özgün geçmişi korunur. GitHub için hazırlanan ayrı
yayın kopyasında geliştirme commit’leri korunurken yayın dışı dosyalar bütün
geçmişten çıkarılır; kısa güncel belgeler sonradan eklenir. Yalnız arşivi
`.gitignore` ile dışlamak eski commit’lerdeki dosyaları kaldırmaz.

## Kaynaklar

Kurallar için [sansarc/orlog](https://github.com/sansarc/orlog) incelenmiştir;
proje bu deponun fork’u değildir. Kaynak atfı, üçüncü taraf kod veya varlıkların
yeniden dağıtım izni anlamına gelmez. Varlıklara ilişkin mevcut izin sınırları
`docs/ASSETS.md` içinde korunur.
