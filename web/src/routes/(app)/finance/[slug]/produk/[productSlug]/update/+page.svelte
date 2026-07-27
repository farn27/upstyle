<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { toastPesan } from '$lib/notifStore';
    import { contextMap } from '$lib/bussinesConfig';
    import { deserialize } from '$app/forms';

    export let data;

    // DATA CONTEXT
    $: unitAktif = data.product?.unitBisni || data.unitInfo;
    $: daftarKategori = data.categories || [];
    $: slug = $page.params.slug;
    $: unitType = (unitAktif?.tipe || 'DEFAULT').toUpperCase();
    $: config = contextMap[unitType] || contextMap['DEFAULT'];

    // FORM STATE
    let loading = false;
    let filePreview = data.product?.foto || null;
    let fileAsli = null;

    // DATA VARIAN - pastikan stok berupa Number
    let variants = (data.product?.productVariants || []).map(v => ({
        ...v,
        stok: Number(v.stok || 0),
        hargaBeli: Number(v.hargaBeli || 0),
        hargaJual: Number(v.hargaJual || 0),
    }));

    // Form utama - kategori_id harus integer atau ''
    let formBody = {
        id: data.product?.id,
        nama: data.product?.nama || '',
        sku: data.product?.sku || '',
        kategori_id: data.product?.kategoriId ? Number(data.product.kategoriId) : '',
        harga_beli: Number(data.product?.hargaBeli || 0),
        harga_jual: Number(data.product?.hargaJual || 0),
        stok: Number(data.product?.stok || 0),
        min_stok: Number(data.product?.minStok || 5),
    };

    // Computed: apakah ada varian?
    $: hasVariants = variants.length > 0;

    // Computed: stok total dari varian
    $: totalStokVarian = variants.reduce((sum, v) => sum + Number(v.stok || 0), 0);
    $: stokDitampilkan = hasVariants ? totalStokVarian : formBody.stok;

    // Computed: range harga jual dari varian
    $: hargaVarianList = variants.map(v => Number(v.hargaJual || 0)).filter(h => h > 0);
    $: minHarga = hargaVarianList.length > 0 ? Math.min(...hargaVarianList) : Number(formBody.harga_jual || 0);
    $: maxHarga = hargaVarianList.length > 0 ? Math.max(...hargaVarianList) : Number(formBody.harga_jual || 0);
    $: rangeHarga = (minHarga === maxHarga || hargaVarianList.length === 0)
        ? `Rp ${minHarga.toLocaleString('id-ID')}`
        : `Rp ${minHarga.toLocaleString('id-ID')} – Rp ${maxHarga.toLocaleString('id-ID')}`;

    function addVariant() {
        variants = [...variants, {
            id: crypto.randomUUID(),
            namaVariasi: '',
            sku: '',
            stok: 0,
            hargaBeli: Number(formBody.harga_beli || 0),
            hargaJual: Number(formBody.harga_jual || 0)
        }];
    }

    function removeVariant(index) {
        variants = variants.filter((_, i) => i !== index);
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (file) {
            fileAsli = file;
            filePreview = URL.createObjectURL(file);
        }
    }

    async function handleUpdate() {
        if (!formBody.nama) return alert("Nama produk wajib diisi lurd!");

        // Validasi varian: namaVariasi tidak boleh kosong
        if (variants.length > 0) {
            const invalid = variants.some(v => !v.namaVariasi?.trim());
            if (invalid) return alert("Semua nama varian wajib diisi!");
        }

        loading = true;
        const formData = new FormData();
        formData.append('id', formBody.id);
        formData.append('nama', formBody.nama);
        formData.append('sku', formBody.sku);
        formData.append('kategoriId', formBody.kategori_id !== '' ? String(formBody.kategori_id) : '');
        formData.append('hargaBeli', formBody.harga_beli);
        // Jika ada varian: kirim minHarga dari varian sebagai hargaJual produk
        formData.append('hargaJual', hasVariants && hargaVarianList.length > 0 ? minHarga : formBody.harga_jual);
        formData.append('minStok', formBody.min_stok);
        formData.append('variants', JSON.stringify(variants));

        if (fileAsli) formData.append('foto', fileAsli);

        try {
            const response = await fetch(`?`, { method: 'POST', body: formData });
            const result = deserialize(await response.text());
            if (result.type === 'success') {
                toastPesan.set("✅ PERUBAHAN BERHASIL DISIMPAN!");
                goto(`/finance/${slug}/produk`, { invalidateAll: true });
            } else {
                alert(`Gagal: ${result.data?.message || 'Terjadi kesalahan'}`);
            }
        } catch (err) {
            alert("Terjadi kesalahan jaringan.");
        } finally {
            loading = false;
        }
    }

</script>

<div class="min-h-screen font-sans text-slate-600 dark:text-slate-300 pb-32 bg-slate-50/50 dark:bg-slate-900/50">
    <!-- HEADER -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 pt-10 z-40">
        <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button on:click={() => history.back()} class="group p-2 rounded-md border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:bg-indigo-900/30 transition-all">
                    <svg class="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div class="flex flex-col">
                    <h1 class="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">Update {config?.item || 'Produk'}</h1>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Unit: {unitAktif?.namaUnit || unitAktif?.nama_unit || '...'}
                            <span class="mx-1 text-slate-200">|</span>
                            ID: {formBody.id?.slice(0, 8)}
                        </p>
                    </div>
                </div>
            </div>
            <span class="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded uppercase tracking-widest">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Mode Koreksi
            </span>
        </div>
    </div>

    <div class="max-w-6xl mx-auto px-6 py-6">
        <div class="grid grid-cols-12 gap-5">
            <!-- SIDEBAR KIRI -->
            <div class="col-span-12 lg:col-span-3 space-y-4">
                <!-- Foto -->
                <div class="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <label class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        Foto Utama
                    </label>
                    <div class="relative w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-md border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-indigo-300 transition-colors">
                        {#if filePreview}
                            <img src={filePreview} alt="preview produk" class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span class="text-white text-[10px] font-bold uppercase">Ganti Foto</span>
                            </div>
                        {:else}
                            <div class="text-center">
                                <svg class="w-8 h-8 text-slate-200 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <span class="text-[9px] text-slate-300 font-bold uppercase">Klik untuk upload</span>
                            </div>
                        {/if}
                        <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" on:change={handleFileChange} />
                    </div>
                </div>

                <!-- SKU -->
                <div class="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <label class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                        SKU Utama
                    </label>
                    <input type="text" bind:value={formBody.sku} class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded text-xs font-mono font-bold outline-none uppercase focus:border-indigo-300 focus:bg-white dark:bg-slate-800 transition" />
                </div>

                <!-- Info Stok -->
                <div class="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        Stok Saat Ini
                    </p>
                    <div class="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-center">
                        <span class="text-2xl font-black text-slate-700 dark:text-slate-200">{stokDitampilkan}</span>
                        <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 ml-1 uppercase">{config?.qty || 'unit'}</span>
                    </div>
                    {#if variants.length > 0}
                        <p class="text-[9px] text-indigo-500 font-bold mt-2 text-center">= Total stok semua varian</p>
                    {:else}
                        <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-2 text-center leading-tight">Stok diubah melalui menu <span class="font-black text-slate-600 dark:text-slate-300">Riwayat Stok</span></p>
                    {/if}
                </div>
            </div>

            <!-- AREA KANAN -->
            <div class="col-span-12 lg:col-span-9 space-y-5">

                <!-- Informasi Dasar -->
                <div class="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p class="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4"/></svg>
                        Informasi Dasar
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nama Produk <span class="text-rose-500">*</span></label>
                            <input type="text" bind:value={formBody.nama} class="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold focus:bg-white dark:bg-slate-800 focus:border-indigo-300 outline-none transition" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Kategori</label>
                            <select bind:value={formBody.kategori_id} class="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-semibold outline-none focus:border-indigo-300 transition">
                                <option value="">-- Pilih Kategori --</option>
                                {#each daftarKategori as kat}
                                    <option value={Number(kat.id)}>{kat.namaKategori}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Harga -->
                <div class="bg-white dark:bg-slate-800 p-5 rounded-lg border {hasVariants ? 'border-indigo-100 dark:border-indigo-800/50' : 'border-slate-200 dark:border-slate-700'} shadow-sm">
                    <div class="flex items-center justify-between mb-4 border-b {hasVariants ? 'border-indigo-100 dark:border-indigo-800/50' : 'border-slate-200 dark:border-slate-700'} pb-2">
                        <p class="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                            <svg class="w-4 h-4 {hasVariants ? 'text-indigo-500' : 'text-emerald-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Harga & Stok
                        </p>
                        {#if hasVariants}
                            <span class="text-[8px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                                Otomatis dari {variants.length} varian
                            </span>
                        {/if}
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <!-- HPP: selalu bisa diedit -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">HPP / Harga Beli</label>
                            <input type="number" bind:value={formBody.harga_beli} min="0" class="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none focus:border-indigo-300 transition" />
                            {#if hasVariants}<p class="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">HPP default / acuan</p>{/if}
                        </div>

                        <!-- Harga Jual: readonly jika ada varian -->
                        <div>
                            <label class="text-[10px] font-bold {hasVariants ? 'text-indigo-500' : 'text-emerald-600'} uppercase">Harga Jual</label>
                            {#if hasVariants}
                                <div class="mt-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded text-xs font-black text-indigo-700 dark:text-indigo-300 cursor-not-allowed">
                                    {rangeHarga}
                                </div>
                                <p class="text-[8px] text-indigo-400 mt-0.5">Range terendah–tertinggi varian</p>
                            {:else}
                                <input type="number" bind:value={formBody.harga_jual} min="0" class="w-full mt-1 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded text-sm font-bold text-emerald-700 outline-none focus:border-emerald-300 transition" />
                            {/if}
                        </div>

                        <!-- Stok: selalu readonly (dari varian atau stock log) -->
                        <div>
                            <label class="text-[10px] font-bold {hasVariants ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'} uppercase">Stok {hasVariants ? '(total varian)' : 'Aktif'}</label>
                            <div class="mt-1 px-3 py-2 {hasVariants ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-500'} border rounded text-sm font-black flex justify-between uppercase cursor-not-allowed" title="{hasVariants ? 'Total dari semua stok varian' : 'Ubah stok via Riwayat Stok'}">
                                <span>{stokDitampilkan}</span>
                                <span class="text-[8px]">{config?.qty || 'unit'}</span>
                            </div>
                            {#if !hasVariants}<p class="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">Ubah via menu Riwayat Stok</p>{/if}
                        </div>

                        <!-- Min Stok: selalu bisa diedit -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Min. Stok Alert</label>
                            <input type="number" bind:value={formBody.min_stok} min="0" class="w-full mt-1 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 rounded text-sm text-rose-600 font-bold outline-none focus:border-rose-300 transition" />
                        </div>
                    </div>

                    <!-- Margin Info: tampil hanya jika tidak ada varian -->
                    {#if !hasVariants && formBody.harga_jual > 0 && formBody.harga_beli > 0}
                        {@const margin = ((formBody.harga_jual - formBody.harga_beli) / formBody.harga_jual * 100).toFixed(1)}
                        {@const profit = formBody.harga_jual - formBody.harga_beli}
                        <div class="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-md border border-emerald-100 flex items-center gap-4">
                            <div class="text-center"><p class="text-[9px] font-bold text-emerald-600 uppercase">Margin</p><p class="text-lg font-black text-emerald-700">{margin}%</p></div>
                            <div class="h-8 w-px bg-emerald-200"></div>
                            <div><p class="text-[9px] font-bold text-emerald-600 uppercase">Profit / Unit</p><p class="text-sm font-black text-emerald-700">Rp {profit.toLocaleString('id-ID')}</p></div>
                        </div>
                    {:else if hasVariants && hargaVarianList.length > 0}
                        {@const avgHPP = Number(formBody.harga_beli || 0)}
                        <div class="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-md border border-indigo-100 dark:border-indigo-800/50">
                            <p class="text-[9px] font-black text-indigo-600 uppercase mb-2">Ringkasan Varian</p>
                            <div class="flex items-center gap-6">
                                <div><p class="text-[8px] text-indigo-400 uppercase">Total Stok</p><p class="text-lg font-black text-indigo-700 dark:text-indigo-300">{totalStokVarian}</p></div>
                                <div class="h-8 w-px bg-indigo-200"></div>
                                <div><p class="text-[8px] text-indigo-400 uppercase">Range Harga</p><p class="text-xs font-black text-indigo-700 dark:text-indigo-300">{rangeHarga}</p></div>
                                {#if avgHPP > 0}
                                    <div class="h-8 w-px bg-indigo-200"></div>
                                    <div><p class="text-[8px] text-indigo-400 uppercase">Margin Min</p><p class="text-xs font-black text-emerald-600">{((minHarga - avgHPP) / minHarga * 100).toFixed(1)}%</p></div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Varian Produk -->
                <div class="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div>
                            <p class="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                                <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                Varian Produk
                                {#if variants.length > 0}
                                    <span class="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black">{variants.length} varian</span>
                                {/if}
                            </p>
                            {#if variants.length > 0}
                                <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Stok produk utama = total stok semua varian</p>
                            {/if}
                        </div>
                        <button on:click={addVariant} class="text-[9px] font-bold bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition flex items-center gap-1 shadow-sm">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Tambah Varian
                        </button>
                    </div>

                    {#if variants.length > 0}
                        <div class="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm">
                            <table class="w-full text-left border-collapse bg-white dark:bg-slate-800">
                                <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr class="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                        <th class="px-4 py-3">Nama Varian <span class="text-rose-400">*</span></th>
                                        <th class="px-4 py-3">Kode SKU</th>
                                        <th class="px-4 py-3 w-24 text-center">
                                            Stok
                                            <span class="block text-[8px] text-indigo-400 normal-case font-normal">bisa diedit</span>
                                        </th>
                                        <th class="px-4 py-3 w-32 text-right">HPP (Rp)</th>
                                        <th class="px-4 py-3 w-32 text-right">Harga Jual (Rp)</th>
                                        <th class="px-4 py-3 w-12 text-center">Hapus</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    {#each variants as v, i}
                                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50 transition-colors">
                                            <td class="px-4 py-2">
                                                <input type="text" bind:value={v.namaVariasi} placeholder="Contoh: Merah / XL / 500ml" class="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-300 border-b border-transparent focus:border-indigo-300 transition pb-0.5" />
                                            </td>
                                            <td class="px-4 py-2">
                                                <input type="text" bind:value={v.sku} placeholder="SKU-VAR" class="w-full bg-transparent text-xs font-mono uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500 outline-none placeholder:text-slate-300" />
                                            </td>
                                            <td class="px-4 py-2">
                                                <input type="number" bind:value={v.stok} min="0" placeholder="0" class="w-full bg-transparent text-xs font-bold text-center text-indigo-600 outline-none focus:bg-indigo-50 dark:bg-indigo-900/30 rounded px-1 transition" />
                                            </td>
                                            <td class="px-4 py-2">
                                                <input type="number" bind:value={v.hargaBeli} min="0" placeholder="0" class="w-full bg-transparent text-xs font-semibold text-right text-slate-500 dark:text-slate-400 dark:text-slate-500 outline-none" />
                                            </td>
                                            <td class="px-4 py-2">
                                                <input type="number" bind:value={v.hargaJual} min="0" placeholder="0" class="w-full bg-transparent text-xs font-black text-right text-emerald-600 outline-none" />
                                            </td>
                                            <td class="px-4 py-2 text-center">
                                                <button on:click={() => removeVariant(i)} class="p-1 text-slate-300 hover:text-rose-600 transition-colors rounded hover:bg-rose-50 dark:bg-rose-950/30" title="Hapus varian ini">
                                                    <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                                <!-- Footer: Total -->
                                <tfoot class="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                    <tr class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                                        <td class="px-4 py-2" colspan="2">Total Stok Gabungan</td>
                                        <td class="px-4 py-2 text-center text-indigo-700 dark:text-indigo-300 text-sm">{totalStokVarian}</td>
                                        <td colspan="3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    {:else}
                        <div class="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">
                            <svg class="w-8 h-8 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                            <p class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Produk ini tidak memiliki varian</p>
                            <p class="text-[9px] text-slate-300 mt-1">Klik "Tambah Varian" jika produk tersedia dalam berbagai ukuran / warna / tipe</p>
                        </div>
                    {/if}
                </div>

            </div>
        </div>
    </div>

    <!-- FOOTER ACTION BAR -->
    <div class="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 z-50 shadow-lg flex justify-center">
        <div class="max-w-6xl w-full flex justify-between items-center gap-3 px-6">
            <p class="text-[9px] text-slate-400 dark:text-slate-500 hidden md:block">
                Perubahan akan langsung tersinkronisasi ke semua data terkait
            </p>
            <div class="flex gap-3">
                <button on:click={() => history.back()} class="px-5 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide hover:text-slate-600 dark:text-slate-300 transition">Batal</button>
                <button on:click={handleUpdate} disabled={loading} class="px-7 py-2.5 rounded text-xs font-bold text-white bg-slate-900 hover:bg-indigo-600 shadow-lg transition-all uppercase tracking-wide flex items-center gap-2 active:scale-95 disabled:opacity-60">
                    {#if loading}
                        <svg class="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Menyimpan...
                    {:else}
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        Simpan Perubahan
                    {/if}
                </button>
            </div>
        </div>
    </div>
</div>