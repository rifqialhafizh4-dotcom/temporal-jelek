# Album Kenangan — terhubung ke API

Foto diambil langsung dari `https://temporal-iota.vercel.app/temple.json`.
Buka `index.html` di browser (atau host di server statis mana pun).

## Struktur
```
index.html / gallery.html / about.html
css/style.css, css/animations.css
js/photo-engine.js   ← koneksi API + pemotong area hitam otomatis
js/home.js           ← beranda: slideshow hero, statistik, foto pilihan
js/gallery.js        ← galeri: filter, muat bertahap, lightbox
js/birthday.js       ← halaman ucapan ulang tahun (lilin, confetti, polaroid)
js/main.js           ← navigasi, animasi, transisi halaman
```

## Cara kerja
- Setiap item API (`id`, `image_url`, `keterangan`) menjadi satu foto; `keterangan` menjadi kategori.
  Kategori baru dari API otomatis mendapat tombol filter.
- Area hitam di tepi foto dideteksi dan dipotong di browser (file asli tidak diubah).
- Jika browser tidak boleh membaca piksel foto (CORS), foto di-zoom otomatis sebagai cadangan.
- Jika API tidak terjangkau, galeri memakai salinan cadangan yang tertanam di `photo-engine.js`.

## Pengaturan (bagian atas `js/photo-engine.js`, objek `ALBUM_CONFIG`)
| Opsi | Fungsi |
|---|---|
| `api` | Alamat API |
| `darkLuma` | Batas kecerahan piksel yang dianggap hitam (naikkan bila masih ada sisa garis gelap) |
| `barFraction` | Persentase piksel hitam dalam satu baris/kolom agar dianggap bingkai (turunkan bila bingkai tidak rata) |
| `fallbackZoom` | Besar zoom cadangan (default 1.3) |

## Fitur
Galeri masonry, skeleton loading, muat bertahap saat scroll, lightbox (panah, keyboard, geser di layar sentuh,
klik untuk zoom), tautan langsung ke foto (`gallery.html#foto-12`) dan kategori (`gallery.html#perjalanan`),
serta dukungan `prefers-reduced-motion`.

## Halaman ucapan ulang tahun (`about.html`)
Isi nama penerima dan pengirim pada baris pembuka `<section class="bday" ... data-nama="" data-dari="">`
di `about.html`, misalnya `data-nama="Sinta" data-dari="Andi"`. Teks surat dan tiga doa bisa diubah langsung di file yang sama.
