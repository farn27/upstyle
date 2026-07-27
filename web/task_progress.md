# DAFTAR MASALAH & PERBAIKAN

## 🔴 Critical Bugs
- [x] 1. app.html: Duplikat `<link rel="preconnect">` baris 7 & 8
- [x] 2. schema.js: Duplikasi index di `kategoriProduk` (3x unique namaKategori)
- [x] 3. schema.js: Duplikasi index di `riwayatAksi` (4x index user_id)
- [x] 4. schema.js: `employees.companyId` salah referensi ke `unitBisnis.id` (harus `companies.id`)
- [x] 5. hooks.server.js: Guard path cuma `/finance`, tidak melindungi route lain di `(app)`
- [x] 6. +layout.svelte: Duplikasi logika red dot (baris 47-52 & 93-99)
- [x] 7. +layout.svelte: Impor `navigating` 2 kali (baris 9 & 10)

## 🟡 Svelte 5 Compatibility
- [x] 8. `<slot />` harus diganti `{@render children()}`
- [x] 9. `on:click` harus `onclick` (Svelte 5)
- [x] 10. `use:enhance` harus diupdate untuk Svelte 5

## 🟠 Code Quality
- [x] 11. console.log debug di hapus
- [x] 12. Typo nama file: `bussinesConfig.js` → Rapihin import
- [x] 13. Export name konsistensi: `pusherServer` vs `pusher`
- [x] 14. Import yang tidak dipakai dibersihkan