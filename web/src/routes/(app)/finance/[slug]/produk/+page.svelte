<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores'; 
    import { toastPesan } from '$lib/notifStore';
    import { invalidateAll, goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { contextMap } from '$lib/bussinesConfig';
    import { stockUpdate } from '$lib/realtimeStore';

    export let data; 
    
    $: if (browser) {}
    $: unitAktif = data?.unitInfo; 
    $: products = data?.products || [];
    $: daftarKategori = data?.categories || [];
    $: stockHistory = data?.stockHistory || [];
    $: historyId = $page.url.searchParams.get('history');
    $: slug = $page.params.slug;
    $: unitType = (unitAktif?.tipe || 'DEFAULT').toUpperCase();
    $: config = contextMap[unitType] || contextMap['DEFAULT'];

    let loading = false;
    let searchTerm = "";
    let openedDetails = new Set();
    let selectedCategory = "ALL";
    let sortBy = "NEWEST";
    let showOnlyLowStock = false;
    let viewMode = "list"; // 'list' atau 'grid'
    let selectedStatus = "ANY";
    let minPrice = '';
    let maxPrice = '';
    let minStock = '';
    let maxStock = '';
    let selectedProducts = new Set();
    let bulkMessage = '';

    function toggleSelectProduct(id) {
        if (selectedProducts.has(id)) selectedProducts.delete(id);
        else selectedProducts.add(id);
        selectedProducts = new Set(selectedProducts);
    }

    function toggleSelectAll() {
        const visibleIds = filteredProducts.map(p => p.id);
        const allSelected = visibleIds.every(id => selectedProducts.has(id));
        if (allSelected) {
            visibleIds.forEach(id => selectedProducts.delete(id));
        } else {
            visibleIds.forEach(id => selectedProducts.add(id));
        }
        selectedProducts = new Set(selectedProducts);
    }

    function clearSelection() {
        selectedProducts = new Set();
    }

    async function bulkSoftDelete() {
        if (selectedProducts.size === 0) return;
        if (!confirm(`Hapus ${selectedProducts.size} produk ke Sampah?`)) return;

        const res = await fetch(`/finance/${slug}/produk`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'soft-delete', ids: Array.from(selectedProducts) })
        });

        if (res.ok) {
            bulkMessage = `✅ ${selectedProducts.size} produk dipindahkan ke Sampah.`;
            clearSelection();
            await invalidateAll();
            setTimeout(() => bulkMessage = '', 3000);
        } else {
            const err = await res.json();
            alert(err.error || 'Gagal memindahkan produk ke Sampah');
        }
    }

    async function bulkRestore() {
        if (selectedProducts.size === 0) return;

        const res = await fetch(`/finance/${slug}/produk`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'restore', ids: Array.from(selectedProducts) })
        });

        if (res.ok) {
            bulkMessage = `✅ ${selectedProducts.size} produk berhasil dikembalikan.`;
            clearSelection();
            await invalidateAll();
            setTimeout(() => bulkMessage = '', 3000);
        } else {
            const err = await res.json();
            alert(err.error || 'Gagal restore produk');
        }
    }

    $: valuasiAset = products.reduce((acc, p) => acc + (Number(p.hargaBeli || 0) * Number(p.stok || 0)), 0);
    $: lowStockCount = products.filter(p => Number(p.stok) <= Number(p.minStok || 5)).length;
    $: stockHealth = products.length > 0 ? Math.max(0, 100 - (lowStockCount * (100 / products.length))) : 100;

    $: filteredProducts = products
        .filter(p => {
            if (p.deletedAt) return false;
            if (showOnlyLowStock && Number(p.stok) > Number(p.minStok || 5)) return false;
            if (selectedCategory !== "ALL") {
                const categoryId = selectedCategory === "TANPA_KATEGORI" ? null : Number(selectedCategory);
                if (p.kategoriId !== categoryId) return false;
            }
            if (selectedStatus !== 'ANY' && String(p.status || 'active') !== selectedStatus) return false;
            if (minPrice && Number(p.hargaJual || 0) < Number(minPrice)) return false;
            if (maxPrice && Number(p.hargaJual || 0) > Number(maxPrice)) return false;
            if (minStock && Number(p.stok || 0) < Number(minStock)) return false;
            if (maxStock && Number(p.stok || 0) > Number(maxStock)) return false;
            if (!searchTerm) return true;
            const s = searchTerm.toLowerCase().trim();
            return p.nama?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s) || String(p.hargaJual || '').includes(s);
        })
        .sort((a, b) => {
            if (sortBy === "NAME_ASC") return a.nama.localeCompare(b.nama);
            if (sortBy === "NAME_DESC") return b.nama.localeCompare(a.nama);
            if (sortBy === "STOCK_ASC") return Number(a.stok || 0) - Number(b.stok || 0);
            if (sortBy === "STOCK_DESC") return Number(b.stok || 0) - Number(a.stok || 0);
            if (sortBy === "PRICE_ASC") return Number(a.hargaJual || 0) - Number(b.hargaJual || 0);
            if (sortBy === "PRICE_DESC") return Number(b.hargaJual || 0) - Number(a.hargaJual || 0);
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

    function formatRupiah(val) {
        return new Intl.NumberFormat("id-ID").format(val || 0);
    }

    async function exportToExcel() {
        try {
            const XLSX = await import('xlsx');
            const dataToExport = [];
            
            products.forEach(p => {
                const categoryName = p.kategoriProduk?.namaKategori || 'UMUM';
                if (p.productVariants && p.productVariants.length > 0) {
                    p.productVariants.forEach(v => {
                        dataToExport.push({
                            'Nama Produk': p.nama,
                            'Varian': v.namaVariasi,
                            'SKU': v.sku || p.sku || '',
                            'Kategori': categoryName,
                            'HPP (Harga Beli)': Number(v.hargaBeli || p.hargaBeli || 0),
                            'Harga Jual': Number(v.hargaJual || p.hargaJual || 0),
                            'Stok': Number(v.stok || 0),
                            'Min Stok Alert': Number(p.minStok || 5)
                        });
                    });
                } else {
                    dataToExport.push({
                        'Nama Produk': p.nama,
                        'Varian': '-',
                        'SKU': p.sku || '',
                        'Kategori': categoryName,
                        'HPP (Harga Beli)': Number(p.hargaBeli || 0),
                        'Harga Jual': Number(p.hargaJual || 0),
                        'Stok': Number(p.stok || 0),
                        'Min Stok Alert': Number(p.minStok || 5)
                    });
                }
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Katalog Produk');
            const max_keys = Object.keys(dataToExport[0] || {});
            worksheet['!cols'] = max_keys.map(key => ({
                wch: Math.max(...dataToExport.map(row => (row[key] || '').toString().length), key.length) + 3
            }));
            XLSX.writeFile(workbook, `Katalog_Produk_${unitAktif?.namaUnit?.replace(/[\s\-\/]+/g, '_') || 'Unit'}.xlsx`);
            toastPesan.set("✅ Katalog diexport ke Excel!");
            setTimeout(() => toastPesan.set(""), 3000);
        } catch (e) {
            console.error("Gagal export:", e);
            alert("Terjadi kesalahan saat mengekspor data ke Excel.");
        }
    }

    function toggleDetail(id) {
        if (openedDetails.has(id)) openedDetails.delete(id);
        else openedDetails.add(id);
        openedDetails = openedDetails;
    }

    async function handleDelete(id) {
        if (!confirm("Hapus produk ini ke Sampah?")) return;

        const res = await fetch(`/finance/${slug}/produk`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'soft-delete', ids: [id] })
        });

        if (res.ok) {
            await invalidateAll();
            toastPesan.set("PRODUK DIPINDAHKAN KE SAMPAH!");
            setTimeout(() => toastPesan.set(""), 3000);
        } else {
            const err = await res.json();
            alert(err.error || 'Gagal memindahkan produk ke Sampah');
        }
    }

    // Listen for stock updates via Socket.io
    $: if ($stockUpdate) {
        if ($stockUpdate.action === 'stock-updated' || $stockUpdate.action === 'product-added') {
            invalidateAll();
        }
    }
</script>

<PageLayout title="Katalog Produk" subtitle="Kelola persediaan dan informasi produk" badge={data.unitInfo?.tipe || 'General'} slug={slug} unit={unitAktif}>
    <div slot="actions" class="flex items-center gap-2">
        {#if !historyId}
            <button on:click={() => goto('?history=all')} class="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-md hover:text-indigo-600 dark:text-indigo-400 transition shadow-sm" title="Log Mutasi">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button on:click={exportToExcel} class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition shadow-sm">Export</button>
            <button on:click={() => goto(`/finance/${slug}/produk/pricing`)} class="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition shadow-sm">Pricing</button>
            <a href={`/finance/${slug}/produk/kategori`} class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-sm">Kategori</a>
            <a href={`/finance/${slug}/produk/add`} class="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-md hover:bg-indigo-700 transition flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path d="M12 4v16m8-8H4"/></svg>
                Tambah
            </a>
        {/if}
    </div>

    {#if historyId}
        <!-- ===== RIWAYAT MUTASI VIEW ===== -->
        <div class="animate-in fade-in duration-300">
            <button on:click={() => goto($page.url.pathname)} class="mb-4 mt-6 flex items-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest gap-1 hover:opacity-70 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M15 19l-7-7 7-7"/></svg>
                Kembali ke Katalog
            </button>
            <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <h1 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Riwayat Pergerakan Produk</h1>
                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{stockHistory.length} entri</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 dark:bg-slate-900 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b">
                            <tr>
                                <th class="px-4 py-3">Waktu</th>
                                <th class="px-4 py-3">Item</th>
                                <th class="px-4 py-3 text-center">Mutasi</th>
                                <th class="px-4 py-3">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            {#each stockHistory as log}
                                <tr class="text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50">
                                    <td class="px-4 py-3">
                                        <p class="font-bold text-slate-700 dark:text-slate-200">{new Date(log.createdAt).toLocaleDateString('id-ID')}</p>
                                        <p class="text-slate-400 dark:text-slate-500 uppercase text-[9px]">{new Date(log.createdAt).toLocaleTimeString('id-ID')}</p>
                                    </td>
                                    <td class="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-bold uppercase">{log.productName}</td>
                                    <td class="px-4 py-3 text-center">
                                        <span class="px-2 py-0.5 rounded font-black text-[10px] {log.perubahan >= 0 ? 'bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:text-rose-400 dark:bg-rose-900/30 dark:text-rose-400'}">
                                            {log.perubahan > 0 ? '+' : ''}{log.perubahan}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 italic text-[10px]">{log.keterangan || '-'}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    {:else}
        <!-- ===== MAIN PRODUCT LIST VIEW ===== -->
        <div class="mt-6 pb-10">

            <!-- SubNav removed as it's handled by PageLayout -->

            <!-- Filter + Search Bar -->
            <div class="flex flex-wrap items-center gap-3 mb-4">
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mr-1">
                    <span class="text-indigo-600 dark:text-indigo-400 font-black">{filteredProducts.length}</span> {config.item}
                </span>
                <button on:click={() => showOnlyLowStock = !showOnlyLowStock} 
                    class="px-3 py-2 rounded-md text-xs font-bold transition border shadow-sm flex items-center gap-1.5 cursor-pointer {showOnlyLowStock ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 border-rose-200 dark:border-rose-900/50' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}">
                    <span class="w-1.5 h-1.5 rounded-full {showOnlyLowStock ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}"></span>
                    Menipis
                </button>
                <button on:click={() => viewMode = viewMode === 'list' ? 'grid' : 'list'} 
                    class="px-3 py-2 rounded-md text-xs font-bold transition border shadow-sm flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900" title="Ganti Tampilan">
                    {#if viewMode === 'list'}
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                        List
                    {:else}
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                        Grid
                    {/if}
                </button>
                <select bind:value={selectedCategory} class="border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 shadow-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    <option value="ALL">Semua Kategori</option>
                    {#each daftarKategori as kat}
                        <option value={kat.id}>{kat.namaKategori || kat.nama_unit}</option>
                    {/each}
                    <option value="TANPA_KATEGORI">Tanpa Kategori</option>
                </select>
                <select bind:value={sortBy} class="border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 shadow-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    <option value="NEWEST">Terbaru</option>
                    <option value="NAME_ASC">Nama A–Z</option>
                    <option value="NAME_DESC">Nama Z–A</option>
                    <option value="STOCK_ASC">Stok ↑</option>
                    <option value="STOCK_DESC">Stok ↓</option>
                    <option value="PRICE_ASC">Harga ↑</option>
                    <option value="PRICE_DESC">Harga ↓</option>
                </select>
                <select bind:value={selectedStatus} class="border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 shadow-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    <option value="ANY">Semua Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                </select>
                <div class="flex gap-2 items-center">
                    <div class="grid grid-cols-2 gap-2">
                        <input type="number" bind:value={minPrice} placeholder="Min Harga" class="border border-slate-200 dark:border-slate-700 rounded-md text-xs px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" />
                        <input type="number" bind:value={maxPrice} placeholder="Max Harga" class="border border-slate-200 dark:border-slate-700 rounded-md text-xs px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="number" bind:value={minStock} placeholder="Min Stok" class="border border-slate-200 dark:border-slate-700 rounded-md text-xs px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" />
                        <input type="number" bind:value={maxStock} placeholder="Max Stok" class="border border-slate-200 dark:border-slate-700 rounded-md text-xs px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" />
                    </div>
                    <div class="relative flex-1 min-w-[160px] max-w-xs ml-auto">
                        <svg class="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" bind:value={searchTerm} placeholder="Cari {config.item}..." 
                            class="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition shadow-sm bg-white dark:bg-slate-800" />
                    </div>
                </div>
            </div>

            {#if viewMode === 'list'}
                <!-- BULK ACTION BANNER -->
                {#if selectedProducts.size > 0}
                    <div class="mb-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div class="space-y-1">
                            <p class="text-sm font-semibold text-slate-900 dark:text-white">{selectedProducts.size} produk dipilih</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Pilih aksi bulk untuk mengubah status atau hapus ke Sampah.</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button on:click={bulkSoftDelete} class="px-3 py-2 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition">Hapus ke Sampah</button>
                            <button on:click={bulkRestore} class="px-3 py-2 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition">Restore</button>
                            <button on:click={clearSelection} class="px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition">Batal</button>
                        </div>
                    </div>
                {/if}

                <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-slate-50/80 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider">
                            <tr>
                                <th class="px-6 py-4 font-black">
                                    <input type="checkbox" checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id))} on:change={toggleSelectAll} class="h-4 w-4 text-indigo-600 dark:text-indigo-400 border-slate-300 rounded" />
                                </th>
                                <th class="px-6 py-4 font-black">Produk</th>
                                <th class="px-6 py-4 font-black">Harga</th>
                                <th class="px-6 py-4 font-black text-center">Stok</th>
                                <th class="px-6 py-4 font-black text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            {#each filteredProducts as p (p.id)}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/40 transition-all group">
                                    <td class="px-6 py-4">
                                        <input type="checkbox" checked={selectedProducts.has(p.id)} on:change={() => toggleSelectProduct(p.id)} class="h-4 w-4 text-indigo-600 dark:text-indigo-400 border-slate-300 rounded" />
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {#if p.foto}<img src={p.foto} class="w-full h-full object-cover" alt="" />
                                                {:else}<svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z"/></svg>{/if}
                                            </div>
                                            <div class="min-w-0">
                                                <p class="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight truncate max-w-[300px]">{p.nama}</p>
                                                <div class="flex items-center gap-2 mt-1 flex-wrap">
                                                    {#if p.kategoriProduk}
                                                        <span class="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded uppercase">{p.kategoriProduk?.namaKategori || 'UMUM'}</span>
                                                    {/if}
                                                    <span class="text-[10px] font-mono text-slate-300">{p.sku || 'N/A'}</span>
                                                    {#if p.productVariants && p.productVariants.length > 0}
                                                        <button on:click={() => toggleDetail(p.id)} class="text-[10px] font-black {openedDetails.has(p.id) ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'} px-2 py-1 rounded-full uppercase transition">
                                                            {openedDetails.has(p.id) ? '▲' : '▼'} {p.productVariants.length} Var
                                                        </button>
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        {#if p.productVariants && p.productVariants.length > 0}
                                            {#if p.productVariants.map(v => Number(v.hargaJual || 0)).filter(h => h > 0).length === 0}
                                                <p class="text-xs font-black tracking-tighter text-slate-300">Belum diset</p>
                                            {:else}
                                                {@const hList = p.productVariants.map(v => Number(v.hargaJual || 0)).filter(h => h > 0)}
                                                {@const minH = Math.min(...hList)}
                                                {@const maxH = Math.max(...hList)}
                                                <p class="text-xs font-black tracking-tighter text-slate-800 dark:text-slate-100">
                                                    {#if minH === maxH}Rp {formatRupiah(minH)}{:else}Rp {formatRupiah(minH)} – {formatRupiah(maxH)}{/if}
                                                </p>
                                            {/if}
                                            <p class="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase">HPP: {formatRupiah(p.hargaBeli)}</p>
                                        {:else}
                                            <p class="text-xs font-black tracking-tighter text-slate-800 dark:text-slate-100">Rp {formatRupiah(p.hargaJual)}</p>
                                            <p class="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase">HPP: {formatRupiah(p.hargaBeli)}</p>
                                        {/if}
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <div class="inline-flex flex-col items-center">
                                            <span class="text-xs font-black {Number(p.stok) <= Number(p.minStok || 5) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}">{p.stok}</span>
                                            <div class="w-8 h-1 bg-slate-100 dark:bg-slate-800/80 rounded-full mt-1 overflow-hidden">
                                                <div class="h-full {Number(p.stok) <= Number(p.minStok || 5) ? 'bg-rose-500' : 'bg-indigo-500'} transition-all" style="width: {Math.min((Number(p.stok)/Math.max(1, Number(p.minStok || 5)))*60, 100)}%"></div>
                                            </div>
                                            <span class="text-[7px] text-slate-300 uppercase mt-0.5">{config.qty}</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                            <a href={`/finance/${slug}/produk/${p.slug}/stock_logs`} class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:shadow transition" title="Kelola Stok">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                                            </a>
                                            <a href={`/finance/${slug}/produk/${p.slug}/update`} class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:shadow transition" title="Edit">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                            </a>
                                            <button on:click={() => handleDelete(p.id)} class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:shadow transition" title="Hapus">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {#if openedDetails.has(p.id) && p.productVariants && p.productVariants.length > 0}
                                    <tr class="bg-indigo-50/50 dark:bg-indigo-900/20">
                                        <td colspan="4" class="px-10 py-3">
                                            <div class="bg-white dark:bg-slate-800 rounded-md border border-indigo-100 dark:border-indigo-800/50 overflow-hidden animate-in slide-in-from-top-1 duration-150">
                                                <table class="w-full text-xs">
                                                    <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                                        <tr class="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500">
                                                            <th class="px-4 py-2 text-left">Varian</th>
                                                            <th class="px-4 py-2 text-left">SKU</th>
                                                            <th class="px-4 py-2 text-right">Harga Jual</th>
                                                            <th class="px-4 py-2 text-center">Stok</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody class="divide-y divide-slate-50">
                                                        {#each p.productVariants as v}
                                                            <tr class="hover:bg-indigo-50/80 dark:hover:bg-indigo-900/40">
                                                                <td class="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px]">{v.namaVariasi}</td>
                                                                <td class="px-4 py-2 font-mono text-[9px] text-slate-400 dark:text-slate-500">{v.sku || '-'}</td>
                                                                <td class="px-4 py-2 text-right font-black text-slate-800 dark:text-slate-100">Rp {formatRupiah(v.hargaJual)}</td>
                                                                <td class="px-4 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{v.stok} {config.qty}</td>
                                                            </tr>
                                                        {/each}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                {/if}
                            {:else}
                                <tr>
                                    <td colspan="4" class="py-20 text-center text-xs font-black text-slate-300 uppercase tracking-[0.3em]">
                                        Katalog Kosong
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else}
                <!-- GRID VIEW: Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {#each filteredProducts as p (p.id)}
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                            <div class="p-4">
                                <div class="flex items-start gap-3 mb-3">
                                    <div class="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {#if p.foto}<img src={p.foto} class="w-full h-full object-cover" alt="" />
                                        {:else}<svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z"/></svg>{/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight truncate">{p.nama}</p>
                                        <span class="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded uppercase tracking-tighter">{p.kategoriProduk?.namaKategori || 'UMUM'}</span>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Harga Jual</p>
                                        <p class="text-sm font-black text-slate-800 dark:text-slate-100">
                                            {#if p.productVariants && p.productVariants.length > 0}
                                                {#if p.productVariants.map(v => Number(v.hargaJual || 0)).filter(h => h > 0).length === 0}
                                                    <span class="text-slate-300">Belum diset</span>
                                                {:else}
                                                    {@const hList = p.productVariants.map(v => Number(v.hargaJual || 0)).filter(h => h > 0)}
                                                    {@const minH = Math.min(...hList)}
                                                    {@const maxH = Math.max(...hList)}
                                                    {#if minH === maxH}Rp {formatRupiah(minH)}{:else}Rp {formatRupiah(minH)} – {formatRupiah(maxH)}{/if}
                                                {/if}
                                            {:else}
                                                Rp {formatRupiah(p.hargaJual)}
                                            {/if}
                                        </p>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Stok</p>
                                            <p class="text-xs font-black {Number(p.stok) <= Number(p.minStok || 5) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}">{p.stok} {config.qty.toUpperCase()}</p>
                                        </div>
                                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <a href={`/finance/${slug}/produk/${p.slug}/update`} class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-600 border border-slate-200 dark:border-slate-700 rounded hover:border-amber-200 transition" title="Edit">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                            </a>
                                            <button on:click={() => handleDelete(p.id)} class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 rounded hover:border-rose-200 dark:border-rose-900/50 transition" title="Hapus">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div class="col-span-full py-20 text-center">
                            <svg class="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            <p class="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Katalog Inventori Kosong</p>
                        </div>
                    {/each}
                </div>
            {/if}

        </div>
    {/if}


<!-- ===== STICKY STATUS BAR (selalu terlihat, fixed di bawah layar) ===== -->
{#if !historyId}
<div class="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 ">
    <div class="max-w-[1400px] mx-auto px-6 h-9 flex items-center justify-between">
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-1.5">
                <svg class="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                <span class="text-[9px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{products.length} Item</span>
            </div>
            <span class="text-slate-200 text-xs">|</span>
            <div class="flex items-center gap-1.5">
                <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span class="text-[9px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Modal HPP</span>
                <span class="text-[9px] font-black text-slate-700 dark:text-slate-200">Rp {formatRupiah(valuasiAset)}</span>
            </div>
        </div>
        <button on:click={() => showOnlyLowStock = !showOnlyLowStock}
            class="flex items-center gap-1.5 transition cursor-pointer group {showOnlyLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300'}">
            <span class="w-2 h-2 rounded-full {stockHealth < 80 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}"></span>
            <span class="text-[9px] font-bold uppercase tracking-wider">
                Stok Health <span class="font-black {stockHealth < 80 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">{stockHealth.toFixed(0)}%</span>
            </span>
            {#if lowStockCount > 0}
                <span class="ml-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:text-rose-400 dark:bg-rose-900/30 dark:text-rose-400 text-[8px] font-black border border-rose-100">
                    {lowStockCount} menipis
                </span>
            {/if}
        </button>
    </div>
</div>
{/if}
</PageLayout>