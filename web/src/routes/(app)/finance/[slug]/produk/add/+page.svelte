<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { toastPesan } from '$lib/notifStore';
    import { contextMap } from '$lib/bussinesConfig';
    import { deserialize } from '$app/forms';
    import { onMount } from 'svelte';
    export let data;

    // DATA CONTEXT
    $: unitAktif = data.unitInfo;
    $: daftarKategori = data.categories || [];
    $: slug = $page.params.slug;
    $: config = contextMap[(unitAktif?.tipe || 'DEFAULT').toUpperCase()] || contextMap['DEFAULT'];

    // FORM STATE
    let loading = false;
    let filePreview = null;
    let fileAsli = null;

    let formBody = {
        nama: '',
        sku: '',
        kategori_id: '',
        harga_beli: 0,   // HPP default (bisa di-override per varian)
        harga_jual: 0,   // Harga jual untuk produk TANPA varian
        stok: 0,         // Stok awal untuk produk TANPA varian
        min_stok: 5
    };

    // --- LOGIKA VARIAN ---
    let variantOptions = [{ name: '', values: [], temp: '' }];
    let variants = [];
    let bulkPrice = 0;
    let bulkStock = 0;

    // Computed: apakah ada varian aktif?
    $: hasVariants = variants.length > 0;

    // Computed: total stok dari semua varian
    $: totalStokVarian = variants.reduce((sum, v) => sum + Number(v.stok || 0), 0);

    // Computed: range harga jual varian
    $: hargaVarianList = variants.map(v => Number(v.hargaJual || 0)).filter(h => h > 0);
    $: minHarga = hargaVarianList.length > 0 ? Math.min(...hargaVarianList) : 0;
    $: maxHarga = hargaVarianList.length > 0 ? Math.max(...hargaVarianList) : 0;
    $: rangeHarga = minHarga === maxHarga
        ? `Rp ${minHarga.toLocaleString('id-ID')}`
        : `Rp ${minHarga.toLocaleString('id-ID')} – Rp ${maxHarga.toLocaleString('id-ID')}`;

    function addOptionGroup() {
        if (variantOptions.length >= 3) return;
        variantOptions = [...variantOptions, { name: '', values: [], temp: '' }];
    }

    function removeOptionGroup(index) {
        variantOptions = variantOptions.filter((_, i) => i !== index);
        generateCombinations();
    }

    function addValue(optionIndex) {
        const val = variantOptions[optionIndex].temp.trim();
        if (!val || variantOptions[optionIndex].values.includes(val)) return;
        variantOptions[optionIndex].values = [...variantOptions[optionIndex].values, val];
        variantOptions[optionIndex].temp = '';
        generateCombinations();
    }

    function removeValue(optionIndex, val) {
        variantOptions[optionIndex].values = variantOptions[optionIndex].values.filter(v => v !== val);
        generateCombinations();
    }

    function generateCombinations() {
        const activeOptions = variantOptions.filter(opt => opt.name.trim() !== '' && opt.values.length > 0);
        if (activeOptions.length === 0) { variants = []; return; }
        const tempOptions = JSON.parse(JSON.stringify(activeOptions));
        const combinations = tempOptions.reduce(
            (a, b) => a.flatMap(d => b.values.map(e => `${d} - ${e}`)),
            tempOptions.shift().values
        );
        // Pertahankan data lama jika nama varian sama
        variants = combinations.map(name => {
            const existing = variants.find(v => v.namaVariasi === name);
            return existing || {
                id: crypto.randomUUID(),
                namaVariasi: name,
                sku: `${formBody.sku || 'SKU'}-${name.replace(/[\s\-\/]+/g, '').toUpperCase().slice(0, 8)}`,
                stok: bulkStock || 0,
                hargaBeli: Number(formBody.harga_beli || 0),
                hargaJual: bulkPrice || Number(formBody.harga_jual || 0)
            };
        });
    }

    function applyBulk() {
        variants = variants.map(v => ({
            ...v,
            hargaJual: bulkPrice > 0 ? bulkPrice : v.hargaJual,
            stok: bulkStock > 0 ? bulkStock : v.stok
        }));
        toastPesan.set("✅ Varian diperbarui!");
        setTimeout(() => toastPesan.set(''), 2000);
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (file) { fileAsli = file; filePreview = URL.createObjectURL(file); }
    }

    async function handleSave() {
        if (!formBody.nama) return alert("Nama wajib lurd!");
        loading = true;

        const formData = new FormData();
        formData.append('nama', formBody.nama);
        formData.append('sku', formBody.sku);
        formData.append('kategori_id', formBody.kategori_id);
        formData.append('harga_beli', formBody.harga_beli);
        formData.append('min_stok', formBody.min_stok);

        if (hasVariants) {
            // Produk dengan varian: stok & harga jual dihitung dari varian
            formData.append('harga_jual', minHarga);   // simpan harga terendah sebagai referensi
            formData.append('stok', totalStokVarian);   // simpan total stok
        } else {
            // Produk tanpa varian: pakai input langsung
            formData.append('harga_jual', formBody.harga_jual);
            formData.append('stok', formBody.stok);
        }

        formData.append('variants', JSON.stringify(variants));
        if (fileAsli) formData.append('foto', fileAsli);

        try {
            const response = await fetch(`?/createProduct`, { method: 'POST', body: formData });
            const result = deserialize(await response.text());
            if (result.type === 'success') {
                toastPesan.set("✅ Produk berhasil ditambahkan!");
                goto(`/finance/${slug}/produk`, { invalidateAll: true });
            } else {
                alert(`Gagal: ${result.data?.message || 'Terjadi kesalahan'}`);
            }
        } catch (err) {
            alert("Error jaringan.");
        } finally {
            loading = false;
        }
    }
</script>

<div class="min-h-screen font-sans text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800">
    <!-- HEADER -->
    <div class="border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-sm">
        <div class="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button on:click={() => history.back()} aria-label="Kembali" title="Kembali" class="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    <span>Kembali</span>
                </button>
                <div class="flex flex-col">
                    <h1 class="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">TAMBAH {config?.item || 'PRODUK'}</h1>
                    <div class="flex flex-wrap gap-2 items-center text-[9px] text-slate-400 dark:text-slate-500 uppercase mt-1">
                        <span>Produk</span>
                        <span class="text-slate-200">|</span>
                        <span>Tambah</span>
                    </div>
                    <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Unit: {unitAktif?.nama_unit || '...'}</span>
                </div>
            </div>
            <button on:click={handleSave} disabled={loading} class="bg-indigo-600 text-white px-6 py-2 rounded-md text-[10px] font-black uppercase hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-60">
                {#if loading}
                    <span class="animate-spin text-sm">↻</span> Menyimpan...
                {:else}
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    Simpan Data
                {/if}
            </button>
        </div>
    </div>

    <div class="max-w-[1600px] mx-auto px-4 py-6 space-y-8">

        <!-- INFORMASI PRODUK -->
        <div class="flex flex-col lg:flex-row gap-6 items-start">
            <!-- Foto -->
            <div class="w-32 h-32 shrink-0 group">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 block">Foto Produk</label>
                <div class="relative w-full h-full bg-slate-50 dark:bg-slate-900 rounded-md border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-all">
                    {#if filePreview}
                        <img src={filePreview} alt="preview" class="w-full h-full object-cover" />
                    {:else}
                        <svg class="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    {/if}
                    <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" on:change={handleFileChange} />
                </div>
            </div>

            <!-- Field Utama -->
            <div class="flex-1 grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-6">
                <div class="md:col-span-2">
                    <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Nama {config?.item || 'Produk'} <span class="text-rose-500">*</span></label>
                    <input type="text" bind:value={formBody.nama} class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Kategori</label>
                    <select bind:value={formBody.kategori_id} class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm font-semibold outline-none focus:bg-white dark:bg-slate-800">
                        <option value="">-- Pilih --</option>
                        {#each daftarKategori as kat}
                            <option value={kat.id}>{kat.namaKategori || kat.nama_unit}</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1.5">SKU Utama</label>
                    <input type="text" bind:value={formBody.sku} on:input={generateCombinations} class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2 text-sm font-mono outline-none focus:bg-white dark:bg-slate-800" placeholder="AUTO" />
                </div>

                <!-- HARGA & STOK — Adaptif berdasarkan ada/tidaknya varian -->
                <div class="md:col-span-4 rounded-md border overflow-hidden {hasVariants ? 'border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/30' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}">
                    <div class="px-4 py-2 border-b {hasVariants ? 'border-indigo-100 dark:border-indigo-800/50 bg-indigo-50' : 'border-slate-100 dark:border-slate-800 bg-slate-50/80'} flex items-center justify-between">
                        <span class="text-[9px] font-black uppercase tracking-widest {hasVariants ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}">
                            {hasVariants ? '📊 Harga & Stok (dihitung otomatis dari varian)' : '💰 Harga & Stok'}
                        </span>
                        {#if hasVariants}
                            <span class="text-[8px] font-bold text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                                {variants.length} varian aktif
                            </span>
                        {/if}
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                        <!-- HPP: selalu tampil -->
                        <div>
                            <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">HPP (Modal)</label>
                            <input type="number" bind:value={formBody.harga_beli} min="0"
                                class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm font-medium outline-none focus:border-indigo-300 transition" />
                            {#if hasVariants}
                                <p class="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">HPP default, bisa di-override per varian</p>
                            {/if}
                        </div>

                        {#if !hasVariants}
                            <div class="md:col-span-2 flex flex-col gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Kalkulator Harga</p>
                                        <p class="text-[10px] text-slate-400 dark:text-slate-500">Pindah ke halaman Pricing untuk fitur kalkulasi lengkap.</p>
                                    </div>
                                    <a href={`/finance/${slug}/produk/pricing`} class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:text-indigo-200 transition">Buka Pricing</a>
                                </div>
                                <div class="text-[9px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Harga jual otomatis akan terisi saat Anda melakukan kalkulasi di halaman Pricing.</div>
                            </div>
                        {/if}

                        <!-- Harga Jual: readonly saat ada varian -->
                        <div>
                            <label class="text-[9px] font-black {hasVariants ? 'text-indigo-500' : 'text-emerald-500'} uppercase block mb-1">
                                Harga Jual {hasVariants ? '(dari varian)' : ''}
                            </label>
                            {#if hasVariants}
                                <div class="w-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-md px-3 py-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300 cursor-not-allowed">
                                    {rangeHarga}
                                </div>
                                <p class="text-[8px] text-indigo-400 mt-0.5">Range harga terendah–tertinggi</p>
                            {:else}
                                <input type="number" bind:value={formBody.harga_jual} min="0"
                                    class="w-full bg-white dark:bg-slate-800 border border-emerald-200 rounded-md px-3 py-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-300 transition" />
                            {/if}
                        </div>

                        <!-- Stok: readonly saat ada varian -->
                        <div>
                            <label class="text-[9px] font-black {hasVariants ? 'text-indigo-500' : 'text-blue-500'} uppercase block mb-1">
                                Stok Awal {hasVariants ? '(total varian)' : ''}
                            </label>
                            {#if hasVariants}
                                <div class="w-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-md px-3 py-1.5 text-sm font-black text-indigo-700 dark:text-indigo-300 cursor-not-allowed flex justify-between items-center">
                                    <span>{totalStokVarian}</span>
                                    <span class="text-[8px] text-indigo-400 uppercase">{config?.qty || 'unit'}</span>
                                </div>
                                <p class="text-[8px] text-indigo-400 mt-0.5">= total stok semua varian</p>
                            {:else}
                                <input type="number" bind:value={formBody.stok} min="0"
                                    class="w-full bg-white dark:bg-slate-800 border border-blue-200 rounded-md px-3 py-1.5 text-sm font-black text-blue-600 outline-none focus:border-blue-300 transition" />
                            {/if}
                        </div>

                        <!-- Min Stok: selalu tampil -->
                        <div>
                            <label class="text-[9px] font-black text-rose-400 uppercase block mb-1">Alert Minimum</label>
                            <input type="number" bind:value={formBody.min_stok} min="0"
                                class="w-full bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 rounded-md px-3 py-1.5 text-sm font-bold text-rose-600 dark:text-rose-400 outline-none focus:border-rose-300 transition" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- KONFIGURASI VARIAN -->
        <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                    </div>
                    <div>
                        <span class="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Konfigurasi Atribut / Varian</span>
                        <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Tambahkan varian jika produk tersedia dalam berbagai ukuran, warna, dll.</p>
                    </div>
                </div>
                <button on:click={addOptionGroup} class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-md border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all">+ TAMBAH ATRIBUT</button>
            </div>

            <div class="space-y-3">
                {#each variantOptions as opt, i}
                    <div class="flex flex-col md:flex-row gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-800">
                        <div class="w-full md:w-56">
                            <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 block">Nama Atribut</label>
                            <input type="text" placeholder="Contoh: Warna / Ukuran" bind:value={opt.name} on:input={generateCombinations}
                                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div class="flex-1">
                            <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 block">Nilai Pilihan (tekan Enter)</label>
                            <div class="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md min-h-[42px]">
                                {#each opt.values as val}
                                    <span class="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                                        {val}
                                        <button on:click={() => removeValue(i, val)} class="hover:opacity-70">
                                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
                                        </button>
                                    </span>
                                {/each}
                                <input type="text" placeholder="Tambah nilai..." class="flex-1 text-xs px-2 outline-none border-none min-w-[120px] bg-transparent"
                                    bind:value={opt.temp}
                                    on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(i); } }} />
                            </div>
                        </div>
                        <button on:click={() => removeOptionGroup(i)} class="p-2 text-rose-400 hover:bg-rose-50 dark:bg-rose-950/30 rounded-md self-center transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                {/each}
            </div>
        </div>

        <!-- TABEL KOMBINASI VARIAN -->
        {#if variants.length > 0}
            <div class="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm">
                <!-- Header tabel -->
                <div class="bg-slate-900 px-4 py-3 flex items-center justify-between">
                    <span class="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        Kombinasi ({variants.length}) — Total Stok: <span class="text-emerald-400">{totalStokVarian}</span>
                    </span>
                    <!-- ISI MASAL -->
                    <div class="flex items-center gap-2 bg-white/10 p-1 rounded-md">
                        <span class="text-[8px] text-white/50 font-bold uppercase px-2">Isi Masal:</span>
                        <input type="number" placeholder="Harga Jual" bind:value={bulkPrice} min="0"
                            class="w-28 bg-white/10 text-white text-[10px] px-2 py-1 rounded-md outline-none placeholder:text-white/20" />
                        <input type="number" placeholder="Stok" bind:value={bulkStock} min="0"
                            class="w-16 bg-white/10 text-white text-[10px] px-2 py-1 rounded-md outline-none placeholder:text-white/20" />
                        <button on:click={applyBulk} title="Terapkan ke semua varian"
                            class="bg-emerald-500 p-1.5 rounded-md hover:bg-emerald-400 active:scale-90 transition">
                            <svg class="w-3 h-3 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="4" d="M5 13l4 4L19 7"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Tabel varian -->
                <div class="overflow-x-auto max-h-[400px]">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 dark:bg-slate-900 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                            <tr class="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                <th class="px-6 py-3">Nama Varian</th>
                                <th class="px-6 py-3">Kode SKU</th>
                                <th class="px-6 py-3 w-32 text-center">
                                    Stok Awal
                                    <span class="block text-[7px] text-indigo-400 font-normal normal-case">masukkan per varian</span>
                                </th>
                                <th class="px-6 py-3 w-32 text-center">HPP</th>
                                <th class="px-6 py-3 w-44 text-right">
                                    Harga Jual (Rp)
                                    <span class="block text-[7px] text-emerald-500 font-normal normal-case">tiap varian bisa beda harga</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            {#each variants as v, i}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors">
                                    <td class="px-6 py-2 text-xs font-bold text-slate-900 dark:text-white">{v.namaVariasi}</td>
                                    <td class="px-6 py-2">
                                        <input type="text" bind:value={v.sku} class="w-full bg-transparent text-xs font-mono uppercase text-slate-400 dark:text-slate-500 outline-none focus:text-slate-700 dark:text-slate-200" />
                                    </td>
                                    <td class="px-6 py-2">
                                        <input type="number" bind:value={v.stok} min="0"
                                            class="w-full bg-transparent text-xs font-black text-center text-indigo-600 dark:text-indigo-400 outline-none focus:bg-indigo-50 dark:bg-indigo-900/30 rounded px-1 transition" />
                                    </td>
                                    <td class="px-6 py-2">
                                        <input type="number" bind:value={v.hargaBeli} min="0" placeholder={formBody.harga_beli}
                                            class="w-full bg-transparent text-xs text-center text-slate-400 dark:text-slate-500 outline-none" />
                                    </td>
                                    <td class="px-6 py-2 text-right">
                                        <input type="number" bind:value={v.hargaJual} min="0"
                                            class="w-32 text-right bg-transparent text-xs font-black text-emerald-600 dark:text-emerald-400 outline-none focus:text-indigo-600 dark:text-indigo-400" />
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                        <!-- Footer summary -->
                        <tfoot class="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                            <tr class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                                <td class="px-6 py-2" colspan="2">TOTAL / SUMMARY</td>
                                <td class="px-6 py-2 text-center text-indigo-700 dark:text-indigo-300 text-sm font-black">{totalStokVarian}</td>
                                <td class="px-6 py-2"></td>
                                <td class="px-6 py-2 text-right text-emerald-700">{rangeHarga}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        {/if}
    </div>
</div>