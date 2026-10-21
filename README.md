# Undangan Digital Pernikahan (Aris & Widya | Dimas & Winda)

Website undangan pernikahan digital bertema oriental/sakura modern lengkap dengan backend RSVP, ucapan doa, dan dashboard kurasi admin.

## Fitur Utama
- **Interaktif & Responsif:** Tampilan mobile-first yang responsif dengan animasi guguran bunga sakura dan kontrol musik latar.
- **Daftar Pasangan & Acara:** Detail lengkap kedua pasangan pengantin, ayat Al-Qur'an, waktu acara akad/resepsi, denah lokasi, dan daftar turut mengundang keluarga & tokoh masyarakat.
- **Sistem RSVP & Ucapan Doa:** Form konfirmasi kehadiran dan pengiriman ucapan doa langsung terhubung ke database SQLite.
- **Dashboard Admin:** Antarmuka khusus untuk melihat statistik kehadiran (Hadir, Ragu, Berhalangan) dan switch kurasi untuk memilih ucapan mana saja yang ditampilkan di website publik.

## Struktur Direktori
- `index.html`: Halaman utama undangan pernikahan.
- `dashboard.html`: Halaman dashboard admin moderasi doa dan kehadiran.
- `server.ts`: Server backend Bun HTTP dan REST API berbasis SQLite.
- `assets/`: Aset visual oriental, lukisan lanskap, border sakura, line art, potret pasangan, dan logo.
- `.github/workflows/deploy.yml`: Pipeline CI/CD GitHub Actions untuk validasi kode dan deployment.

## Menjalankan Secara Lokal
Pastikan [Bun](https://bun.sh) sudah terpasang:
```bash
bun run server.ts
```
Buka browser:
- Undangan: `http://localhost:3020`
- Dashboard: `http://localhost:3020/dashboard`
