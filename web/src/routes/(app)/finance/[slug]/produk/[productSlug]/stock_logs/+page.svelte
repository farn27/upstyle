<script>
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { toastPesan } from '$lib/notifStore';

    export let data;
    $: ({ product, logs } = data);
    
    let loading = false;

    // Inisialisasi varian jika ada
    $: variants = product?.productVariants ? product.productVariants.map(v => ({
        id: v.id,
        namaVariasi: v.namaVariasi,
        sku: v.sku,
        stokLama: Number(v.stok || 0),
        stokBaru: Number(v.stok || 0)
    })) : [];

    $: hasVariant = variants.length > 0;
    
    // Bind stok untuk non-variant
    let stokInput = Number(product?.stok || 0);
    $: if (product && !hasVariant) {
        stokInput = Number(product.stok || 0);
    }

    // Hitung total stok sistem & fisik
    $: totalStokSistem = hasVariant 
        ? variants.reduce((sum, v) => sum + v.stokLama, 0)
        : Number(product?.stok || 0);

    $: totalStokFisik = hasVariant 
        ? variants.reduce((sum, v) => sum + v.stokBaru, 0)
        : Number(stokInput || 0);

    $: selisih = totalStokFisik - totalStokSistem;

    function getAlasanBadgeClass(alasan) {
        switch (alasan) {
            case 'MASUK': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'KELUAR': return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 border-rose-100';
            case 'PENJUALAN': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'OPNAME': return 'bg-violet-50 text-violet-700 border-violet-100';
            case 'RUSAK': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'RETUR': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
            default: return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-800';
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
</script>

<div class="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 pb-20 font-sans">
    <!-- HEADER -->
    <div class="border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 bg-white dark:bg-slate-800 shadow-sm mb-6">
        <div class="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-4">
            <button on:click={() => history.back()} class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 rounded-md text-slate-400 dark:text-slate-500 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div class="flex flex-col">
                <h1 class="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">KELOLA STOK / OPNAME</h1>
                <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">{product?.nama}</span>
            </div>
        </div>
    </div>

    <div class="max-w-[1600px] mx-auto px-4">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- PANEL KIRI: FORM PENYESUAIAN (COL 5) -->
            <div class="lg:col-span-5 space-y-6">
                <!-- Info Ringkas Produk -->
                <div class="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    {#if product?.foto}
                        <img src={product.foto} alt={product.nama} class="w-14 h-14 object-cover rounded-md border border-slate-100 dark:border-slate-800" />
                    {:else}
                        <div class="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </div>
                    {/if}
                    <div>
                        <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase leading-snug">{product?.nama}</h2>
                        <p class="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">SKU: {product?.sku || 'N/A'}</p>
                        {#if hasVariant}
                            <span class="inline-block mt-1 text-[8px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 px-2 py-0.5 rounded-full uppercase">
                                {variants.length} Varian Aktif
                            </span>
                        {/if}
                    </div>
                </div>

                <!-- Form Penyesuaian -->
                <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500 tracking-wider">Formulir Koreksi</span>
                        <div class="text-right">
                            <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold block">SELISIH STOK</span>
                            <span class="text-xs font-black {selisih === 0 ? 'text-slate-400 dark:text-slate-500' : selisih > 0 ? 'text-emerald-600' : 'text-rose-600'}">
                                {selisih > 0 ? '+' : ''}{selisih} UNIT
                            </span>
                        </div>
                    </div>

                    <form method="POST" use:enhance={({ formData }) => {
                        loading = true;
                        if (hasVariant) {
                            formData.append('variants', JSON.stringify(variants));
                            formData.append('stokBaru', totalStokFisik);
                        } else {
                            formData.append('stokBaru', stokInput);
                        }
                        return async ({ result }) => {
                            loading = false;
                            if (result.type === 'success') {
                                toastPesan.set("✅ Stok berhasil diperbarui!");
                                setTimeout(() => toastPesan.set(""), 3000);
                                window.location.reload();
                            } else {
                                alert(`Gagal: ${result.data?.message || 'Terjadi kesalahan'}`);
                            }
                        };
                    }} class="p-6 space-y-6">
                        <input type="hidden" name="id" value={product?.id} />

                        <!-- Perbandingan Stok -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                                <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Stok Sistem</span>
                                <span class="text-lg font-black text-slate-700 dark:text-slate-200">{totalStokSistem}</span>
                            </div>
                            <div class="p-3 bg-indigo-50/50 dark:bg-indigo-900/50 rounded-md border border-indigo-100 dark:border-indigo-800/50/50">
                                <span class="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">Stok Fisik Baru</span>
                                <span class="text-lg font-black text-indigo-700 dark:text-indigo-300">{totalStokFisik}</span>
                            </div>
                        </div>

                        <!-- Input Varian atau Tunggal -->
                        {#if hasVariant}
                            <div class="space-y-3">
                                <label class="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Perincian Stok Per Varian</label>
                                <div class="divide-y divide-slate-100 max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50/20 pr-1">
                                    {#each variants as v}
                                        <div class="flex items-center justify-between p-3 gap-4">
                                            <div class="flex flex-col min-w-0">
                                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{v.namaVariasi}</span>
                                                <span class="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">SKU: {v.sku || '-'}</span>
                                            </div>
                                            <div class="flex items-center gap-3 shrink-0">
                                                <div class="text-right">
                                                    <span class="text-[8px] text-slate-400 dark:text-slate-500 block">Sistem: {v.stokLama}</span>
                                                    <input type="number" bind:value={v.stokBaru} min="0" 
                                                        class="w-20 text-center font-black text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:border-indigo-500 outline-none" required />
                                                </div>
                                                <span class="w-10 text-center text-[10px] font-black px-1.5 py-1 rounded {v.stokBaru - v.stokLama === 0 ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500' : v.stokBaru - v.stokLama > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                                    {v.stokBaru - v.stokLama > 0 ? '+' : ''}{v.stokBaru - v.stokLama}
                                                </span>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {:else}
                            <div>
                                <label class="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Input Stok Fisik</label>
                                <input type="number" bind:value={stokInput} min="0" 
                                    class="w-full text-xl font-black p-3 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition" required />
                            </div>
                        {/if}

                        <!-- Informasi Alasan -->
                        <div class="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label class="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Alasan Penyesuaian</label>
                                <select name="alasan" class="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:border-indigo-500 transition">
                                    <option value="OPNAME">Stock Opname (Koreksi Selisih)</option>
                                    <option value="MASUK">Barang Masuk (Restock)</option>
                                    <option value="KELUAR">Barang Keluar (Pengurangan)</option>
                                    <option value="RUSAK">Barang Rusak / Pecah</option>
                                    <option value="RETUR">Retur Barang</option>
                                    <option value="ADJUSTMENT">Adjustment Manual</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Keterangan Tambahan</label>
                                <input type="text" name="keterangan" placeholder="Misal: Opname bulanan Juni..." 
                                    class="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:border-indigo-500 transition" />
                            </div>
                        </div>

                        <button type="submit" disabled={loading || selisih === 0} 
                            class="w-full py-3.5 bg-slate-900 text-white font-black rounded-md hover:bg-indigo-600 transition disabled:opacity-50 disabled:hover:bg-slate-900 uppercase text-[10px] tracking-widest active:scale-98">
                            {loading ? 'Menyimpan...' : 'Simpan Koreksi Stok'}
                        </button>
                    </form>
                </div>
            </div>

            <!-- PANEL KANAN: RIWAYAT TIMELINE (COL 7) -->
            <div class="lg:col-span-7 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                <div>
                    <h3 class="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Riwayat Aktivitas Stok</h3>
                    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">50 Riwayat koreksi dan mutasi stok terakhir untuk produk ini</p>
                </div>

                {#if logs.length === 0}
                    <div class="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center">
                        <svg class="w-12 h-12 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Belum ada riwayat perubahan stok</p>
                    </div>
                {:else}
                    <div class="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-6 max-h-[650px] overflow-y-auto pr-2">
                        {#each logs as log}
                            <div class="relative">
                                <!-- Bullet Dot -->
                                <div class="absolute -left-[33px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm
                                    {log.perubahan > 0 ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                                
                                <div class="space-y-1.5">
                                    <div class="flex flex-wrap items-center justify-between gap-2">
                                        <div class="flex items-center gap-2">
                                            <span class="text-[10px] font-black px-2 py-0.5 rounded-full border uppercase {getAlasanBadgeClass(log.alasan)}">
                                                {log.alasan}
                                            </span>
                                            <span class="text-[10px] font-black text-slate-800 dark:text-slate-100">
                                                {log.perubahan > 0 ? '+' : ''}{log.perubahan} Unit
                                            </span>
                                        </div>
                                        <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                            {formatDate(log.createdAt)}
                                        </span>
                                    </div>

                                    <div class="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-md flex justify-between items-center gap-4">
                                        <div class="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                            {log.keterangan || 'Tidak ada catatan tambahan'}
                                        </div>
                                        <div class="text-right shrink-0">
                                            <span class="text-[8px] text-slate-400 dark:text-slate-500 font-bold block uppercase leading-none">STOK AKHIR</span>
                                            <span class="text-xs font-black text-slate-700 dark:text-slate-200 leading-none">{log.stokAkhir} UNIT</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

        </div>
    </div>
</div>