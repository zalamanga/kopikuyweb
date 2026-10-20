# Kopi Kuy Web

Website latihan berupa halaman kedai kopi, katalog produk, dan keranjang belanja di browser. Data produk serta harga merupakan contoh untuk demonstrasi antarmuka.

Versi ini memakai HTML, CSS, dan JavaScript ES modules dengan aset Bootstrap lokal. Aset jQuery dari source lama tetap disimpan; logika katalog dan keranjang yang baru memakai JavaScript tanpa jQuery. Varian PHP/MySQL lama disimpan secara terpisah dari repository statis ini.

## Fitur

- Halaman utama dengan navigasi ke katalog dan keranjang.
- Sembilan produk dari `data.json` dalam kategori Arabica, Robusta, Milkshake, dan Non-Kopi.
- Pencarian nama, filter kategori, dan pengurutan harga berdasarkan nilai angka.
- Tambah produk ke keranjang, penggabungan jumlah produk yang sama, dan penghapusan satu unit melalui tombol Hapus satu.
- Keranjang tetap tersedia setelah halaman dimuat ulang melalui `localStorage`.
- Subtotal, biaya simulasi 10%, dan total demo.
- Gambar produk eksternal yang gagal dimuat memakai placeholder lokal.

Checkout, pembayaran, dan pencatatan pesanan belum terhubung ke backend.

## Menjalankan lokal

Gunakan browser modern dan server HTTP statis. Contoh berikut memakai Python 3; Node.js, npm, PHP, dan database tidak diperlukan untuk menjalankan website.

```powershell
git clone https://github.com/zalamanga/kopikuyweb.git
Set-Location -LiteralPath '.\kopikuyweb'
python -m http.server 8080 --bind 127.0.0.1
```

Jika project sudah ada di komputer, jalankan server dari folder yang berisi `index.html` dan `data.json`. HTTP diperlukan agar browser dapat memuat JSON serta ES modules.

Buka halaman berikut di browser:

- [Halaman utama](http://127.0.0.1:8080/index.html)
- [Katalog produk](http://127.0.0.1:8080/produk.html)
- [Keranjang](http://127.0.0.1:8080/cart.html)

Tekan `Ctrl+C` pada terminal untuk menghentikan server.

## Menjalankan dengan Docker

Pasang Docker Engine dengan Compose, atau Docker Desktop dan aktifkan Linux containers. Dari folder repo, jalankan:

```powershell
docker compose up -d --build
docker compose ps
```

Buka [Kopi Kuy](http://127.0.0.1:18084). Nginx melayani website statis; Python, Node.js, PHP, dan database tidak perlu dipasang pada host. Unduhan image pertama membutuhkan internet.

Container berjalan sebagai pengguna `nginx`, memakai filesystem baca saja dan direktori sementara di `/tmp`. Hanya file website dan konfigurasi Nginx yang masuk ke image. Port `18084` terikat ke komputer lokal. Jika port tersebut sudah dipakai, pilih port lain sebelum memulai:

```powershell
$env:APP_PORT = '18085'
docker compose up -d --build
```

Dengan contoh itu, buka `http://127.0.0.1:18085`. Untuk menghentikan dan menghapus container serta network proyek:

```powershell
docker compose down
```

Keranjang tersimpan di browser. Gunakan alamat dan port yang sama untuk membuka kembali keranjang sebelumnya. Perubahan HTML, JSON, CSS, atau JavaScript memerlukan build ulang dengan `docker compose up -d --build`; folder sumber tidak dipasang sebagai volume.

Image dasar Nginx dikunci dengan digest di `Dockerfile`. Untuk memperbaruinya, ambil digest terbaru dari image resmi `nginx:stable-alpine`, perbarui baris `FROM`, lalu build dan jalankan tes kembali.

## Data dan keranjang

Seluruh katalog berasal dari `data.json` lokal. Pemilihan kategori, pencarian, dan pengurutan harga berjalan di browser tanpa mengambil katalog dari API eksternal.

Keranjang menggunakan key `list_belanja` pada `localStorage`. Format lama berupa item berulang serta item dengan properti `qty` dapat dibaca dan digabungkan. Tombol Hapus satu mengurangi satu unit; baris produk hilang ketika jumlahnya mencapai nol.

Data keranjang berlaku untuk browser, alamat, dan port yang sama. Gunakan alamat server yang konsisten saat menguji penyimpanan; data ini tidak disinkronkan antarperangkat.

Perhitungan demo:

```text
Subtotal       = jumlah (harga produk × jumlah unit)
Biaya simulasi = pembulatan (subtotal × 10%) ke angka bulat
Total demo     = subtotal + biaya simulasi
```

Angka 10% merupakan biaya tetap untuk demonstrasi perhitungan, tanpa acuan ke aturan pajak yang berlaku.

## Aset dan konten contoh

Sebagian gambar produk, peta Google Maps, dan tautan chat masih memakai URL eksternal dari source lama. Bagian tersebut membutuhkan koneksi internet; gambar produk eksternal yang gagal dimuat digantikan placeholder lokal.

Nama tim, testimonial, kontak, lokasi, dan harga merupakan konten latihan yang belum diverifikasi sebagai fakta bisnis. Tautan ke layanan luar tidak membuktikan adanya integrasi pembayaran atau pemrosesan pesanan.

Source awal memuat rujukan ke [API latihan kopi Riki Kurnia](https://rikikurnia.com/prakerja/api/kopi). Rujukan ini dicatat sebagai asal materi; katalog versi ini menggunakan data lokal.

## Struktur repository

```text
index.html      Halaman utama
produk.html     Katalog, pencarian, dan filter
cart.html       Keranjang dan total demo
data.json       Data contoh sembilan produk
css/            Stylesheet website
js/catalog.js   Kontrol katalog, pencarian, dan filter
js/cart.js      Tampilan dan interaksi keranjang
js/browser-store.js Penyimpanan browser dan gambar pengganti
js/store.js     Perhitungan, normalisasi data, dan operasi keranjang
tests/store.test.js Tes logika dengan test runner bawaan Node.js
tests/browser.spec.js Tes interaksi browser dengan Playwright
playwright.config.js Konfigurasi browser dan server tes lokal
vendor/         Aset Bootstrap dan ikon
fonts/          Font lokal
images/         Gambar dan placeholder lokal
package.json    Perintah tes pengembangan
package-lock.json Versi dependency pengembangan yang dikunci
Dockerfile      Image Nginx untuk website statis
compose.yaml    Port lokal, filesystem baca saja, dan pembatasan container
docker/nginx.conf Konfigurasi HTTP dan tipe MIME
.dockerignore   Daftar file yang boleh masuk konteks build
```

## Pengujian

Node.js 22+ dan npm direkomendasikan untuk pengembangan. Keduanya hanya dipakai untuk tes; tes dasar memakai test runner bawaan Node.js tanpa instalasi dependency:

```powershell
npm test
```

Untuk tes browser opsional, pasang dependency pengembangan dan Chromium:

```powershell
npm ci
npx playwright install chromium
npm run test:browser
```

Jika Microsoft Edge sudah terpasang, setelah `npm ci` gunakan channel berikut sebagai alternatif unduhan Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
```

Tes browser memakai Python 3 untuk memulai server lokal otomatis pada port `8765`. Playwright memblokir permintaan nonlokal dan memakai data simulasi; kontak maupun transaksi eksternal tidak dijalankan.

Untuk menguji container yang sudah berjalan, arahkan suite yang sama ke Docker. Python tidak diperlukan pada cara ini:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:18084'
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Ganti port pengujian jika `APP_PORT` diubah. Tanpa `PLAYWRIGHT_BASE_URL`, suite kembali memakai server Python otomatis.

Verifikasi: 13 tes unit lulus dengan Node.js 22.14.0; 10 skenario browser lulus dengan Playwright 1.64.1 melalui Microsoft Edge. Pemeriksaan mencakup penyimpanan keranjang, filter, kegagalan pemuatan dan percobaan ulang, serta tiga halaman pada lebar 320, 390, dan 768 piksel tanpa overflow horizontal.

Verifikasi Docker: image Nginx 1.30.6 berhasil dibangun dan berstatus sehat dengan UID 101 serta filesystem baca saja. Sepuluh skenario browser yang sama lulus melalui container. Seluruh 60 file website yang dilayani HTTP cocok SHA256 dengan source; 12 pemeriksaan HTTP memastikan halaman/aset tersedia, file pengembangan tidak disajikan, dan metode tulis ditolak.

Pemeriksaan manual melalui browser:

- Muat katalog dan periksa sembilan produk serta empat kategori.
- Gabungkan pencarian, filter kategori, dan urutan harga.
- Tambah produk yang sama beberapa kali, lalu buka keranjang dan muat ulang halaman.
- Klik Hapus satu dan periksa penurunan jumlah, subtotal, biaya simulasi, serta total.
- Periksa keadaan keranjang kosong, gambar pengganti, dan tampilan di layar kecil.
