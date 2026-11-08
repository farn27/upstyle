#!/usr/bin/env python3
"""Salin hasil skrip (CSV di folder bukti/<sesi>/...) ke salinan Lembar_Pengujian_Bizgrow.xlsx.
Berkas asli TIDAK diubah; hasil disimpan sebagai berkas baru.

  python3 isi_lembar.py --lembar Lembar_Pengujian_Bizgrow.xlsx --bukti bukti/<sesi> [--isi-nilai] [--isi-status] [--keluar terisi.xlsx]

Default hanya mengisi keluaran ringkas, waktu, hasil aktual keamanan, dan waktu performa.
--isi-nilai  : juga isi kolom Nilai/Jenis kesalahan dengan USULAN otomatis (ekstraksi & akun saja; analitis tetap dinilai manual).
--isi-status : juga isi Status keamanan dengan usulan (hanya yang berstatus Lulus/Gagal).
Anda tetap bertanggung jawab memeriksa setiap sel sebelum dipakai sebagai hasil.
"""
import argparse, csv, os, sys
import openpyxl

ap = argparse.ArgumentParser()
ap.add_argument('--lembar', required=True); ap.add_argument('--bukti', required=True)
ap.add_argument('--keluar', default=None); ap.add_argument('--isi-nilai', action='store_true'); ap.add_argument('--isi-status', action='store_true')
a = ap.parse_args()

wb = openpyxl.load_workbook(a.lembar)

import glob
def baca(sub, berkas):
    """Baca <berkas> dan semua varian berstempel waktu (mis. ekstraksi-081530.csv) berurutan; yang lebih baru menimpa."""
    dasar = os.path.splitext(berkas)[0]
    hasil = []
    for f in sorted(glob.glob(os.path.join(a.bukti, sub, dasar + '.csv')) + glob.glob(os.path.join(a.bukti, sub, dasar + '-*.csv'))):
        with open(f, newline='', encoding='utf-8-sig') as fh: hasil += list(csv.DictReader(fh))
    return hasil

def cari_baris(ws, kolom_id, awal, akhir):
    return {str(ws[f'{kolom_id}{r}'].value): r for r in range(awal, akhir + 1) if ws[f'{kolom_id}{r}'].value}

def angka(v):
    try: return float(v) if v not in (None, '') else None
    except ValueError: return None

# (sheet, file, kolom awal tiap run [ringkas,nilai,salah,waktu], boleh isi nilai otomatis)
peta = [('AI-Ekstraksi', 'ekstraksi.csv', {1: 'IJKL', 2: 'MNOP', 3: 'QRST'}, True, 5, 34),
        ('AI-Akun', 'akun.csv', {1: 'GHIJ', 2: 'KLMN', 3: 'OPQR'}, True, 5, 24),
        ('AI-Analitis', 'analitis.csv', {1: 'GHIJ', 2: 'KLMN', 3: 'OPQR'}, False, 5, 24)]
diisi = 0
for nama, berkas, kol, nilai_ok, r0, r1 in peta:
    ws = wb[nama]; baris = cari_baris(ws, 'A', r0, r1)
    for row in baca('ai', berkas):
        r = baris.get(row['id'])
        if not r: print('ID tidak ada di lembar:', row['id']); continue
        for run, (c_ring, c_nilai, c_salah, c_ms) in kol.items():
            if f'R{run}_ringkas' not in row: continue
            if row[f'R{run}_ringkas'].startswith('(galat'):
                print(f"{row['id']} R{run}: galat server — dilewati, ULANGI kasus ini"); continue
            ws[f'{c_ring}{r}'] = row[f'R{run}_ringkas']
            m = angka(row[f'R{run}_ms']);  ws[f'{c_ms}{r}'] = m
            if a.isi_nilai and nilai_ok and row[f'R{run}_nilai']:
                ws[f'{c_nilai}{r}'] = row[f'R{run}_nilai']
                if row[f'R{run}_salah']: ws[f'{c_salah}{r}'] = row[f'R{run}_salah'].split(';')[0].strip()
            diisi += 1

# keamanan
ws = wb['Keamanan']; baris = {(str(ws[f'A{r}'].value), str(ws[f'B{r}'].value)): r for r in range(5, 16)}
for f in ('ringkasan.csv', 'ringkasan-ratelimit.csv'):
    for row in baca('keamanan', f):
        subs = [row['sub']] if row['sub'] != 'a+b' else ['a', 'b']
        for sub in subs:
            kunci = (str(row['no']), row['no'] if sub == '' else f"{row['no']}{sub}")
            r = baris.get(kunci)
            if not r: continue
            ws[f'G{r}'] = row['hasil_aktual']
            if a.isi_status and row['status_usulan'] in ('Lulus', 'Gagal'): ws[f'H{r}'] = row['status_usulan']
            diisi += 1

# performa
ws = wb['Performa']
for berkas, kol in (('pos.csv', 'B'), ('stok.csv', 'C')):
    for row in baca('performa', berkas):
        i = int(row['percobaan']); v = angka(row.get('event_pos_ms') or row.get('stok_ms'))
        if 1 <= i <= 20 and v is not None: ws[f'{kol}{4 + i}'] = v; diisi += 1

keluar = a.keluar or os.path.splitext(a.lembar)[0] + '_terisi.xlsx'
wb.save(keluar); print(f'{diisi} sel diisi → {keluar}')
