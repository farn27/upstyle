<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { addNotif } from '$lib/notifStore';
  import { deserialize } from '$app/forms';
  import { ICONS } from '$lib/financeConstants';

  export let data;

  let sedangMemuat = false;
  let loadingAI = false;
  let teksInput = "";

  $: slug = $page.params.slug;
  $: unit = data.unit;
  $: hasCoa = data.hasCoa ?? true;
  $: products = data.products || [];
  $: coaAccounts = data.coaAccounts || [];
  $: kasAccounts = data.kasAccounts || [];

  let seedingCoa = false;
  let showTambahKas = false;
  let addingKas = false;
  let kasCustomNama = '';
  let kasCustomKode = '';

  // Preset rekomendasi akun kas/bank
  const KAS_PRESETS = [
    { nama: 'Kas Tunai', kode: '1-10001', icon: '💵', desc: 'Uang cash di tangan' },
    { nama: 'Bank BCA', kode: '1-10002', icon: '🏦', desc: 'Rekening / Transfer BCA' },
    { nama: 'Bank Mandiri', kode: '1-10003', icon: '🏦', desc: 'Rekening / Transfer Mandiri' },
    { nama: 'Bank BNI', kode: '1-10004', icon: '🏦', desc: 'Rekening / Transfer BNI' },
    { nama: 'Bank BRI', kode: '1-10005', icon: '🏦', desc: 'Rekening / Transfer BRI' },
    { nama: 'QRIS / Dompet Digital', kode: '1-10006', icon: '📱', desc: 'GoPay, OVO, Dana, ShopeePay' },
  ];

  async function handleAddKas(nama, kode) {
    addingKas = true;
    try {
      const fd = new FormData();
      fd.append('nama_akun', nama);
      fd.append('kode_akun', kode);
      const res = await fetch('?/addKasAccount', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
      const result = deserialize(await res.text());
      if (result.type === 'success' && result.data?.success) {
        const newAkun = { id: result.data.newKasId, namaAkun: result.data.namaAkun, kodeAkun: result.data.kodeAkun, tipeAkun: 'ASET_LANCAR' };
        kasAccounts = [...kasAccounts, newAkun];
        selectedKasCoa = result.data.newKasId.toString();
        showTambahKas = false;
        kasCustomNama = '';
        kasCustomKode = '';
        addNotif(`✅ Akun "${result.data.namaAkun}" berhasil ditambahkan!`, 'success');
      } else {
        addNotif(result.data?.message || 'Gagal menambah akun', 'error');
      }
    } catch(e) {
      addNotif('Gagal menambah akun', 'error');
    } finally {
      addingKas = false;
    }
  }
  async function handleSeedCoa() {
    seedingCoa = true;
    try {
      const fd = new FormData();
      const res = await fetch('?/seedCoa', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
      const result = deserialize(await res.text());
      if (result.type === 'success') {
        addNotif(`✅ ${result.data?.message || 'COA berhasil dibuat!'}`, 'success');
        // Reload halaman agar data COA termuat
        await goto(`/finance/${slug}/entry`, { invalidateAll: true });
      } else {
        addNotif('Gagal membuat COA', 'error');
      }
    } catch(e) {
      addNotif('Gagal membuat COA', 'error');
    } finally {
      seedingCoa = false;
    }
  }

  let kategoriTerpilih = "Masuk";
  let qtyInput = 1;
  let rawNominal = 0;
  let displayNominal = "";
  let selectedProductId = "";
  let selectedCoaId = "";
  let selectedKasCoa = "";
  let produkTerpilih = null;
  let keteranganInput = "";

  // Set default kas account saat pertama load
  $: if (kasAccounts.length > 0 && !selectedKasCoa) {
    selectedKasCoa = kasAccounts[0].id.toString();
  }

  // --- 1. FILTER COA BERDASARKAN TIPE TRANSAKSI ---
  $: coaTerfilter = coaAccounts.filter(c => {
    if (kategoriTerpilih === 'Masuk') {
      return ['PENDAPATAN', 'PENDAPATAN_LAINNYA'].includes(c.tipeAkun);
    } else {
      return ['BEBAN_OPERASIONAL', 'BEBAN_LAINNYA', 'HPP'].includes(c.tipeAkun);
    }
  });

  // Reset selectedCoaId saat tipe berubah
  let tipeLama = kategoriTerpilih;
  $: if (kategoriTerpilih !== tipeLama) {
    tipeLama = kategoriTerpilih;
    selectedCoaId = "";
    selectedProductId = "";
    produkTerpilih = null;
    rawNominal = 0;
    displayNominal = "";
    qtyInput = 1;
    keteranganInput = "";
  }

  // --- 2. AUTO-SELECT COA PERTAMA SAAT LIST BERUBAH ---
  $: if (coaTerfilter.length > 0 && !selectedCoaId) {
    selectedCoaId = coaTerfilter[0].id.toString();
  }

  // --- 3. LOGIKA PRODUK: HITUNG NOMINAL OTOMATIS ---
  $: if (produkTerpilih) {
    const hargaSatuan = kategoriTerpilih === 'Masuk'
      ? Number(produkTerpilih.hargaJual || produkTerpilih.harga_jual || 0)
      : Number(produkTerpilih.hargaBeli || produkTerpilih.harga_beli || 0);
    rawNominal = hargaSatuan * (qtyInput || 1);
    displayNominal = new Intl.NumberFormat('id-ID').format(rawNominal);
  }

  // --- 4. AUTO-DESKRIPSI DARI PRODUK ---
  $: if (produkTerpilih && kategoriTerpilih) {
    if (kategoriTerpilih === 'Masuk') {
      keteranganInput = `PENJUALAN ${produkTerpilih.nama.toUpperCase()} SEBANYAK ${qtyInput || 1} PCS`;
    } else {
      keteranganInput = `PEMBELIAN / RESTOCK ${produkTerpilih.nama.toUpperCase()} SEBANYAK ${qtyInput || 1} PCS`;
    }
  } else if (!selectedProductId) {
    keteranganInput = "";
  }

  // --- 5. VALIDASI STOK ---
  $: isStokKurang = kategoriTerpilih === 'Masuk' && produkTerpilih && qtyInput > produkTerpilih.stok;
  $: isTombolDisabled = sedangMemuat || isStokKurang || !selectedCoaId || !selectedKasCoa;

  // --- 6. HELPER FORMAT ---
  function handleInputManual(e) {
    let val = e.target.value.replace(/\D/g, "");
    rawNominal = Number(val);
    displayNominal = new Intl.NumberFormat('id-ID').format(rawNominal);
  }

  // --- 7. LABEL TIPE AKUN COA ---
  const TIPE_LABEL = {
    'PENDAPATAN': 'Pendapatan',
    'PENDAPATAN_LAINNYA': 'Pendapatan Lain',
    'HPP': 'HPP',
    'BEBAN_OPERASIONAL': 'Beban Operasional',
    'BEBAN_LAINNYA': 'Beban Lainnya',
  };

  // --- 8. GROQ AI ASSISTANT ---
  async function prosesAI() {
    if (teksInput.length < 5) return;
    loadingAI = true;
    try {
      const formData = new FormData();
      formData.append('teksInput', teksInput);
      const response = await fetch('?/prosesAI', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true' } });
      const result = deserialize(await response.text());
      if (result.type === 'success' && result.data?.success) {
        const h = result.data.hasil;
        if (h) {
          if (h.product_id) {
            kategoriTerpilih = "Masuk";
            selectedProductId = h.product_id.toString();
            produkTerpilih = products.find(p => p.id == h.product_id) || null;
          } else if ((h.kategori || "").toLowerCase().includes('keluar')) {
            kategoriTerpilih = "Keluar";
          }
          qtyInput = Number(h.qty) || 1;
          if (kategoriTerpilih === 'Keluar' || !produkTerpilih) {
            rawNominal = Number(h.nominal) || 0;
            displayNominal = new Intl.NumberFormat('id-ID').format(rawNominal);
          }
          if (h.coa_id) selectedCoaId = h.coa_id.toString();
          if (h.kas_coa_id) selectedKasCoa = h.kas_coa_id.toString();
          keteranganInput = (h.catatan || "").toUpperCase();
          addNotif("AI Sinkron!", "success");
        }
      }
    } catch (e) { addNotif("Gagal", "error"); }
    finally { loadingAI = false; }
  }
</script>

<div class="min-h-screen bg-[#FDFDFD] dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-sans selection:bg-indigo-100">
  <header class="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-40">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-6">
        <button on:click={() => goto(`/finance/${unit.slug}`)} class="group flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-all">
          <svg class="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">{@html ICONS.back}</svg>
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">Dashboard</span>
        </button>
        <div class="h-4 w-px bg-slate-200"></div>
        <h1 class="text-xs font-black uppercase tracking-[0.3em] text-slate-800 dark:text-slate-100">Entri Transaksi</h1>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{unit?.namaUnit}</span>
      </div>
    </div>
  </header>

  {#if !hasCoa}
    <!-- ⚠️ BLOKIR: COA BELUM ADA -->
    <div class="max-w-2xl mx-auto mt-16 px-6">
      <!-- Badge Penting -->
      <div class="flex justify-center mb-6">
        <span class="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-amber-200 dark:border-amber-700">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          Setup Diperlukan
        </span>
      </div>

      <!-- Card Utama -->
      <div class="bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-700/50 rounded-2xl shadow-xl shadow-amber-50 dark:shadow-none overflow-hidden">
        <!-- Header Card -->
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-8 py-6 border-b border-amber-100 dark:border-amber-800">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-slate-100">Chart of Accounts (COA) Belum Ada</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unit bisnis ini belum memiliki daftar akun. COA diperlukan untuk mencatat transaksi secara akuntansi.</p>
            </div>
          </div>
        </div>

        <!-- Body Card -->
        <div class="px-8 py-6 space-y-6">
          <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Sebelum mencatat transaksi, Anda perlu memiliki <span class="font-bold text-slate-800 dark:text-slate-100">Chart of Accounts (COA)</span> — yaitu daftar akun keuangan seperti Kas, Pendapatan, dan Biaya. Tanpa COA, sistem tidak bisa membuat jurnal akuntansi yang benar.
          </p>

          <!-- 2 Pilihan -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Opsi 1: Pakai Template Standar -->
            <div class="border-2 border-indigo-200 dark:border-indigo-700 rounded-xl p-5 bg-indigo-50/50 dark:bg-indigo-900/20 flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 bg-indigo-600 text-white rounded-full text-[10px] font-black flex items-center justify-center">1</span>
                <span class="text-xs font-black text-slate-800 dark:text-slate-100">Gunakan Template Standar</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Kami akan otomatis membuatkan <span class="font-bold">{data.coaStandar?.length || 20} akun COA standar</span> yang siap pakai — Kas, Bank, Pendapatan Penjualan, Biaya Operasional, dan lainnya.
              </p>
              <ul class="space-y-1">
                {#each ['Kas Tunai & Bank/Transfer', 'Pendapatan Penjualan & Jasa', 'Biaya Gaji, Sewa, Listrik', 'Biaya Bahan Baku & Iklan', 'HPP & Beban Lainnya'] as item}
                  <li class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <svg class="w-3 h-3 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    {item}
                  </li>
                {/each}
              </ul>
              <button
                on:click={handleSeedCoa}
                disabled={seedingCoa}
                class="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
              >
                {#if seedingCoa}
                  <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Membuat COA...</span>
                {:else}
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
                  <span>Pakai Template Standar</span>
                {/if}
              </button>
            </div>

            <!-- Opsi 2: Setup Manual -->
            <div class="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-white dark:bg-slate-800 flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 bg-slate-600 text-white rounded-full text-[10px] font-black flex items-center justify-center">2</span>
                <span class="text-xs font-black text-slate-800 dark:text-slate-100">Setup COA Manual</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Buat daftar akun sendiri sesuai kebutuhan bisnis Anda di halaman Master Data COA. Cocok jika Anda sudah memiliki struktur akun khusus.
              </p>
              <div class="mt-auto space-y-2">
                <a
                  href="/finance/{slug}/master-data/coa"
                  class="block w-full py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all text-center"
                >
                  → Buka Master Data COA
                </a>
              </div>
            </div>
          </div>

          <!-- Info Apa itu COA -->
          <div class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">📚 Apa itu COA?</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Chart of Accounts adalah daftar semua akun keuangan yang digunakan bisnis — seperti buku indeks keuangan. Setiap transaksi akan dipetakan ke akun yang tepat sehingga laporan keuangan (Laba Rugi, Neraca) dapat dibuat secara otomatis.
            </p>
          </div>
        </div>
      </div>
    </div>

  {:else}

  <main class="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
    <div class="lg:col-span-7">
      <form
        method="POST"
        action="?/addTransaction"
        use:enhance={() => {
          sedangMemuat = true;
          return async ({ result, update }) => {
            if (result.type === 'success') {
              sedangMemuat = false;
              addNotif("Data Disimpan", "success");
              await goto(`/finance/${unit.slug}`, { invalidateAll: false, replaceState: true });
            } else {
              sedangMemuat = false;
              if (result.type === 'failure') {
                addNotif(result.data?.message || "Cek Inputan", "error");
              } else {
                addNotif("Terjadi kesalahan server", "error");
              }
              await update();
            }
          };
        }}
        class="space-y-8"
      >

        <!-- SECTION 1: INFO DASAR -->
        <div class="space-y-4">
          <h2 class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b border-indigo-50 pb-2">Informasi Dasar</h2>
          <div class="grid grid-cols-2 gap-6">

            <!-- Tipe Arus Kas -->
            <div class="space-y-1.5">
              <label class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tipe Arus Kas</label>
              <div class="relative group">
                <select
                  bind:value={kategoriTerpilih}
                  name="kategori_trx"
                  class="w-full text-xs font-bold p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer"
                >
                  <option value="Masuk">MASUK (INCOME)</option>
                  <option value="Keluar">KELUAR (EXPENSE)</option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  {#if kategoriTerpilih === 'Masuk'}
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
                  {:else}
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941"/>
                  {/if}
                </svg>
              </div>
            </div>

            <!-- Metode Bayar (dari akun kas/bank COA) -->
            <div class="space-y-1.5">
              <label class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Metode Bayar
                <span class="text-[8px] font-black text-slate-300 normal-case ml-1">— uangnya dari/ke mana?</span>
              </label>

              {#if kasAccounts.length > 0}
                <!-- Ada akun: tampilkan dropdown + tombol tambah -->
                <select name="kas_coa_id" bind:value={selectedKasCoa}
                  class="w-full text-xs font-bold p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:border-indigo-500 outline-none transition-all cursor-pointer">
                  {#each kasAccounts as kas}
                    <option value={kas.id.toString()}>{kas.icon || ''} [{kas.kodeAkun}] {kas.namaAkun}</option>
                  {/each}
                </select>
                <button type="button" on:click={() => showTambahKas = !showTambahKas}
                  class="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 transition-colors mt-0.5">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                  {showTambahKas ? 'Tutup' : 'Tambah Akun Kas/Bank Baru'}
                </button>
              {:else}
                <!-- Belum ada akun: langsung tampilkan panel tambah -->
                <div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <p class="text-[10px] font-black text-amber-700 dark:text-amber-400 mb-1">⚠️ Belum ada akun kas/bank</p>
                  <p class="text-[10px] text-amber-600 dark:text-amber-500 mb-3">Pilih salah satu rekening/metode bayar yang Anda gunakan:</p>
                  <div class="grid grid-cols-2 gap-2 mb-3">
                    {#each KAS_PRESETS as preset}
                      <button type="button"
                        on:click={() => handleAddKas(preset.nama, preset.kode)}
                        disabled={addingKas}
                        class="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-wait group"
                      >
                        <span class="text-base leading-none">{preset.icon}</span>
                        <div>
                          <p class="text-[10px] font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{preset.nama}</p>
                          <p class="text-[9px] text-slate-400 leading-tight">{preset.desc}</p>
                        </div>
                      </button>
                    {/each}
                  </div>
                  <!-- Atau isi manual -->
                  <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2">atau isi nama lain:</p>
                  <div class="flex gap-2">
                    <input type="text" bind:value={kasCustomNama} placeholder="Contoh: GoPay, OVO..."
                      class="flex-1 text-xs font-bold p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500" />
                    <button type="button"
                      on:click={() => { if(kasCustomNama.trim()) handleAddKas(kasCustomNama.trim(), `1-1000${kasAccounts.length + 7}`) }}
                      disabled={addingKas || !kasCustomNama.trim()}
                      class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase rounded-md disabled:opacity-40 transition-all flex items-center gap-1">
                      {#if addingKas}
                        <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {:else}
                        Tambah
                      {/if}
                    </button>
                  </div>
                </div>
                <!-- Hidden input agar form tidak error -->
                <input type="hidden" name="kas_coa_id" value={selectedKasCoa} />
              {/if}

              <!-- Panel tambah akun (muncul jika klik tombol Tambah di atas dropdown) -->
              {#if showTambahKas && kasAccounts.length > 0}
                <div class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pilih preset atau isi manual:</p>
                  <div class="grid grid-cols-3 gap-2">
                    {#each KAS_PRESETS.filter(p => !kasAccounts.find(k => k.namaAkun === p.nama)) as preset}
                      <button type="button"
                        on:click={() => handleAddKas(preset.nama, preset.kode)}
                        disabled={addingKas}
                        class="flex flex-col items-center gap-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all text-center disabled:opacity-50 group"
                      >
                        <span class="text-lg leading-none">{preset.icon}</span>
                        <p class="text-[9px] font-black text-slate-600 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 leading-tight">{preset.nama}</p>
                      </button>
                    {/each}
                  </div>
                  <div class="flex gap-2 pt-1">
                    <input type="text" bind:value={kasCustomNama} placeholder="Nama akun lain..."
                      class="flex-1 text-xs font-bold p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500" />
                    <button type="button"
                      on:click={() => { if(kasCustomNama.trim()) handleAddKas(kasCustomNama.trim(), `1-1000${kasAccounts.length + 7}`) }}
                      disabled={addingKas || !kasCustomNama.trim()}
                      class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase rounded-md disabled:opacity-40 transition-all">
                      Tambah
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- SECTION 2: DETAIL & ALOKASI -->
        <div class="space-y-6">
          <h2 class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b border-indigo-50 pb-2">02. Detail & Alokasi</h2>

          <!-- Pilih Produk -->
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Produk / Jasa (Opsional)</label>
            <select bind:value={selectedProductId} on:change={(e) => {
              produkTerpilih = products.find(p => p.id == e.target.value) || null;
              if (produkTerpilih) qtyInput = 1;
            }} class="w-full text-xs font-medium p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500 transition-all">
              <option value="">-- TANPA PRODUK (MANUAL) --</option>
              {#each products as p}
                <option value={p.id}>{p.nama} (Sisa: {p.stok})</option>
              {/each}
            </select>
            <input type="hidden" name="product_id" value={selectedProductId} />
          </div>

          <!-- Pilih Akun COA -->
          <div class="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-md space-y-2">
            <label class="text-[9px] font-bold text-indigo-500 uppercase tracking-wider flex items-center justify-between">
              <span>{kategoriTerpilih === 'Masuk' ? '📈 Akun Pendapatan (COA)' : '📉 Akun Beban (COA)'}</span>
              <span class="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black">DOUBLE-ENTRY</span>
            </label>
            <select name="coa_id" bind:value={selectedCoaId}
              class="w-full text-xs font-bold p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500">
              <option value="">-- PILIH AKUN --</option>
              {#each coaTerfilter as coa}
                <option value={coa.id.toString()}>[{coa.kodeAkun}] {coa.namaAkun}</option>
              {/each}
            </select>
            {#if selectedCoaId}
              {@const selectedCoa = coaAccounts.find(c => c.id.toString() === selectedCoaId)}
              {#if selectedCoa}
                <p class="text-[9px] text-slate-400 font-semibold px-1">
                  ✦ Jurnal: {kategoriTerpilih === 'Masuk' 
                    ? `Debit ${kasAccounts.find(k => k.id.toString() === selectedKasCoa)?.namaAkun || 'Kas'} → Kredit ${selectedCoa.namaAkun}`
                    : `Debit ${selectedCoa.namaAkun} → Kredit ${kasAccounts.find(k => k.id.toString() === selectedKasCoa)?.namaAkun || 'Kas'}`
                  }
                </p>
              {/if}
            {/if}
            <a
              href="/finance/{slug}/master-data/coa"
              target="_blank"
              class="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Tambah Akun COA Baru
            </a>
          </div>
        </div>

        <!-- SECTION 3: NOMINAL -->
        <div class="space-y-4">
          <h2 class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b border-indigo-50 pb-2">Kalkulasi Nominal</h2>
          <div class="grid grid-cols-12 gap-6">
            <div class="col-span-4 space-y-1.5">
              <label class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jumlah / Qty</label>
              <input type="number" bind:value={qtyInput} min="1"
                class="w-full p-3 text-sm font-black border-2 border-slate-200 dark:border-slate-700 rounded-md focus:border-indigo-500 outline-none" />
            </div>
            <div class="col-span-8 space-y-1.5">
              <label class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right block">Total Nominal Transaksi</label>
              <div class="relative group">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-indigo-500 transition-colors">IDR</span>
                <input
                  type="text"
                  bind:value={displayNominal}
                  on:input={handleInputManual}
                  readonly={produkTerpilih && kategoriTerpilih === 'Masuk'}
                  class="w-full pl-12 p-3 text-sm font-black tracking-widest border border-slate-200 dark:border-slate-700 rounded-md focus:border-indigo-500 outline-none transition-all
                  {produkTerpilih && kategoriTerpilih === 'Masuk' ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-800'}"
                />
              </div>
              <input type="hidden" name="nominal" bind:value={rawNominal} />
            </div>
          </div>
        </div>

        <!-- SECTION 4: DESKRIPSI -->
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Deskripsi / Keterangan</label>
          <textarea
            name="keterangan"
            value={keteranganInput}
            on:input={(e) => (keteranganInput = e.currentTarget.value)}
            class="w-full p-4 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-md h-24 outline-none focus:border-indigo-500 resize-none uppercase bg-white dark:bg-slate-800 leading-relaxed placeholder:text-slate-200"
            placeholder="Ketik keterangan di sini..."
          ></textarea>
        </div>

        <!-- TOMBOL SUBMIT -->
        <div class="pt-4">
          <button type="submit" disabled={isTombolDisabled}
            class="w-full py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-md hover:bg-black transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-slate-100 flex justify-center items-center gap-3">
            {#if isStokKurang}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              <span>Stok Tidak Cukup</span>
            {:else if !selectedCoaId}
              <span>Pilih Akun COA Terlebih Dahulu</span>
            {:else if sedangMemuat}
              <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Sedang Memproses...</span>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              <span>Simpan & Catat Jurnal</span>
            {/if}
          </button>
        </div>
      </form>
    </div>

    <!-- ASIDE: AI ASSISTANT -->
    <aside class="lg:col-span-5 space-y-6">
      <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md p-6 shadow-sm sticky top-24">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2 bg-indigo-600 rounded-md text-white shadow-lg shadow-indigo-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">{@html ICONS.ai}</svg>
          </div>
          <div>
            <h3 class="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">AI Logic Assistant</h3>
            <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Powered by Groq Llama 3.1</p>
          </div>
        </div>

        <div class="space-y-4">
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Input data dalam bahasa manusia, AI akan otomatis memetakan produk, akun COA, dan nominal transaksi.
          </p>
          <div class="relative group">
            <textarea bind:value={teksInput}
              class="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-md p-4 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none resize-none transition-all shadow-inner"
              placeholder="Contoh: 'Jual kopi 3 cup' atau 'Bayar listrik 150rb'">
            </textarea>
          </div>
          <button on:click={prosesAI} disabled={loadingAI || teksInput.length < 3}
            class="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded hover:bg-indigo-600 hover:text-white transition-all flex justify-center items-center gap-2">
            {#if loadingAI}
              <div class="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">{@html ICONS.ai}</svg>
              <span>Jalankan AI Sinkron</span>
            {/if}
          </button>
        </div>

        <!-- Info Box: Cara Kerja Double Entry -->
        <div class="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-md">
          <p class="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">📚 Cara Kerja Double-Entry</p>
          <div class="space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <p>🟢 <span class="font-black">MASUK:</span> Debit Kas/Bank → Kredit Akun Pendapatan</p>
            <p>🔴 <span class="font-black">KELUAR:</span> Debit Akun Beban → Kredit Kas/Bank</p>
            <p class="pt-1 text-indigo-500 dark:text-indigo-400 font-semibold">Transaksi otomatis masuk ke Jurnal Umum & Buku Besar.</p>
          </div>
        </div>
      </div>
    </aside>
  </main>
  {/if}
</div>

<style>
  input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
</style>