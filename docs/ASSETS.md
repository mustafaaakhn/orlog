# Varlık kaynakları ve lisans kayıtları

Bu belge oyunda kalan varlıkların kaynaklarını kaydeder. İzin belirsizlikleri
korunur; kaynak göstermek yeniden dağıtım izni alındığı anlamına gelmez.
Üretim istemleri, eski sürümler ve ayrıntılı teknik kayıtlar yerel arşivdedir.
Proje Ubisoft ile resmî bağlantısı olmayan bağımsız bir hayran uyarlamasıdır.

## Görseller ve video

| Dosya (`public/assets/`) | Kaynak ve kullanım |
| --- | --- |
| `art/gods-atlas.webp` | OpenAI ImageGen ile proje için üretilen 20 oyma tanrı portresi; HTML kartları ve 3B levhalar aynı atlası paylaşır |
| `art/welcome-orlog.webp` | OpenAI ImageGen ile üretilen karşılama görseli; dar/yatay ekran yedeği |
| `art/welcome-orlog-portrait.webp` | Aynı karşılama yönünün üretilmiş portre uyarlaması |
| `art/welcome-orlog-desktop.webp` | Aynı görsel yönün masaüstü varyantı; mevcut picture kaynaklarında korunur |
| `art/mode-robot.webp`, `art/mode-friend.webp` | OpenAI ImageGen ile proje için üretilen rakip seçim sahneleri |
| `art/fjord-panorama.webp` | OpenAI ImageGen ile üretilen uzak fiyort panoraması |
| `art/weathered-walnut.webp` | OpenAI ImageGen ile üretilen, masa/levha/iskelede paylaşılan ceviz dokusu |
| `art/toss-coin-i.webp`, `art/toss-coin-ii.webp` | OpenAI ImageGen ile proje için üretilip düzenlenen demir/altın sikke yüzleri |
| `video/orlog-intro-2k.mp4` | OpenRouter üzerinden HeyGen üretimi; yerel FFmpeg ile son ışık düzenlemesi, 2688×1536, 24 fps, 6,54 sn, sessiz |
| `art/welcome-orlog-intro-2k.webp` | Kullanılan giriş videosunun ilk karesinden elde edilen poster |

Görseller WebP olarak hazırlanmıştır. Referans oyun dosyaları/model/dokuları
kopyalanmamıştır. Eivor/Sigurd içeren üretilmiş sahneler hayran uyarlamasıdır;
ayrıca Ubisoft lisansı veya münhasır hak iddiası yoktur. Yapay üretim kaydı
kamu malı veya sınırsız yeniden kullanım hakkı iddiası değildir.

`public/favicon.svg` ve arayüz simgeleri proje kapsamında kodla çizilmiştir.
Kemik, taş, pirinç, dokuma ve diğer prosedürel yüzeyler proje koduyla üretilir.

## Fontlar

| Dosya (`public/assets/fonts/`) | Kaynak ve lisans |
| --- | --- |
| `norse-bold.otf` | [Joël Carrouché — Norse](https://www.joelcarrouche.com/fonts/norse), Free Font License 1.2; tam metin `Norse-LICENSE.txt` |
| `metamorphous-latin-400-normal.woff2`, `metamorphous-latin-ext-400-normal.woff2` | [Fontsource — Metamorphous](https://fontsource.org/fonts/metamorphous), Sorkin Type Co / James Grieshaber; OFL-1.1, tam metin `Metamorphous-OFL.txt` |

Norse’ın mevcut lisans metni web sayfası/uygulamaya gömmeye izin verir;
font dosyasını değiştirmeyi ve yazılı izin olmadan yeniden dağıtmayı/paylaşmayı
yasaklar. Kamuya açık kaynak deposunda font dosyasının dağıtımına ilişkin yazılı
izin kaydı bu depoda yoktur. Font lisansları özgün metinleriyle korunur.

## Ses efektleri

`public/assets/audio/elevenlabs/` altındaki 16 MP3, proje için ElevenLabs
`eleven_text_to_sound_v2` ile üretilmiş ve kullanıcı tarafından dinlenip
onaylanmıştır. Üretim biçimi MP3 44,1 kHz / 128 kbit/s; kullanılan dinleme
kopyaları tepe −3 dB olacak şekilde dengelenip 192 kbit/s olarak kodlanmıştır.

Dosyalar: `dice-0`, `dice-1`, `dice-2`, `dice-3`, `dice-roll`, `attack`, `block`,
`token`, `favor`, `heal`, `earn-money`, `coin-flip`, `game-start`, `victory`,
`defeat`, `ambience` (`.mp3`). Ortam kaydı sonradan oynatma kataloğundan çıkarıldı; eski WAV kayıtları
ve üretim araçları yerel arşive taşınmıştır. Oyun API isteği yapmaz.

Kaynaklar: [ElevenLabs Sound Effects](https://elevenlabs.io/sound-effects),
[üretim API’si](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert),
[abonelik belgeleri](https://elevenlabs.io/docs/overview/administration/billing).
Önceki kaynak kaydında ticari kullanımın üretimin yapıldığı ücretli plana bağlı
olduğu belirtilmiştir; hesabın planı doğrulanmamıştır. Dinleme/onay, dağıtım
lisansının doğrulanması anlamına gelmez.

## Arka plan müzikleri

| Dosya (`public/assets/audio/`) | Kaynak |
| --- | --- |
| `background-1.opus` | Sarah Schachner — [Ravensthorpe](https://www.youtube.com/watch?v=YALP8tHYg-w) |
| `background-2.opus` | Sarah Schachner — [The First Departure](https://www.youtube.com/watch?v=LFzb6oIl2wM) |

İki parça Assassin’s Creed Valhalla (Original Game Soundtrack) albümündendir.
Kaynak hak kaydı: ℗ 2020 Ubisoft Music under exclusive license to Soundtrack
Records Inc d/b/a Lakeshore Records. Kullanıcının seçtiği YouTube kaynaklarından
yt-dlp ile alınmış, Opus paketleri FFmpeg ile yeniden kodlanmadan taşınmıştır.
Kaynak metadata’sında yeniden kullanım lisansı verilmemiştir; bu depoda oyun
veya kamuya açık depo üzerinden dağıtım izni alındığına dair kayıt yoktur.

## Kod bağımlılıkları

Harici npm paketleri ve tam sürümleri `package.json` / `package-lock.json`
içindedir; paketlerin kendi lisansları geçerlidir. Socket.IO, Socket.IO Client,
tsx ve sirv için önceki kaynak kaydı MIT lisansını belirtir. Referans
[sansarc/orlog](https://github.com/sansarc/orlog) deposundan kod veya medya
otomatik kopyalanmamıştır. Kullanılmayan eski fontların lisansları ilgili
fontlarla birlikte yerel arşivde korunur.

Mobil panelin DOM davranış testleri için [happy-dom](https://github.com/capricorn86/happy-dom)
21.0.4 kullanılır; MIT, © 2019 David Ortner (capricorn86). Sürüm ve lisans
kurulu paketin `package.json` ve `LICENSE` dosyalarından doğrulandı. Yalnız
geliştirme bağımlılığıdır; yeni görsel, model veya ses eklenmedi.

Mobil zar yüzleri, hedeflerdeki simgeler ve jeton işareti mevcut proje SVG
yolları ve prosedürel canvas çizimlerinden üretilir. Aşama 4 için dış görsel,
model, doku, ses veya yeni paket eklenmedi.

## Ses düzenlemesi — 31 Ekim 2026

Ortam/su döngüsü `ambience` oynatma kataloğundan çıkarıldı; tarihsel kaynak
kaydı korunur. Var olan iki müziğin yalnız sonundaki sessizlik, Opus paketleri
yeniden kodlanmadan kırpıldı (yaklaşık 158,7 ve 141,1 saniye). Yukarıdaki
kaynak/lisans koşulları değişmez; yeni dış kayıt eklenmedi.
