# Skrip pengujian skripsi Bizgrow

Panduan lengkap: `docs/skripsi/PANDUAN_PENGUJIAN.md`. Ringkas:

```bash
cp config.contoh.json config.json        # isi URL server uji & akun tenant A/B
node keamanan.mjs                         # skenario 1,2,3,5,6,7  → bukti/<tanggal>/keamanan
node performa.mjs pos                     # event POS realtime    → bukti/<tanggal>/performa
node ai.mjs --jenis ekstraksi|akun|analitis   # 3× per kasus     → bukti/<tanggal>/ai
node ratelimit.mjs                        # skenario 4, TERAKHIR (mengunci IP ±15 menit)
python3 isi_lembar.py --lembar ../../../docs/skripsi/Lembar_Pengujian_Bizgrow_revisi.xlsx --bukti bukti/<tanggal> --isi-nilai
node --test nilai.cek.mjs                # uji logika penilaian usulan
```

`config.json`, `acuan-analitis.json`, dan `bukti/` diabaikan git. `kasus-ai.json` diekstrak dari lembar uji (70 kasus).
