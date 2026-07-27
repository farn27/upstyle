<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { toastPesan } from '$lib/notifStore';
    let file;

    async function upload() {
        if (!file) return alert('Pilih file Excel/CSV terlebih dahulu');

        const form = new FormData();
        form.append('file', file);

        const res = await fetch(`/finance/${$page.params.slug}/produk/import`, {
            method: 'POST',
            body: form
        });

        if (res.ok) {
            toastPesan.set('✅ Import berhasil!');
            goto(`/finance/${$page.params.slug}/produk`, { invalidateAll: true });
        } else {
            const err = await res.json();
            alert(err.error || 'Gagal import file');
        }
    }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-sans">
    <div class="max-w-3xl mx-auto px-4 py-6">
        <div class="mb-6">
            <p class="text-xs uppercase text-slate-400 dark:text-slate-500">Import Produk</p>
            <h1 class="text-xl font-black text-slate-900 dark:text-white">Upload Excel / CSV</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Unggah data produk massal untuk mempercepat setup inventori.</p>
        </div>

        <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
            <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white mb-2">Pilih file</p>
                <input type="file" accept=".xlsx,.xls,.csv" on:change={(e) => file = e.target.files[0]} class="text-sm text-slate-700 dark:text-slate-200" />
            </div>
            <div class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 space-y-2">
                <p>Format yang didukung: Excel (.xlsx, .xls) dan CSV.</p>
                <p>File harus berisi kolom nama, sku, kategori, harga_beli, harga_jual, stok, min_stok.</p>
            </div>
            <div class="flex items-center gap-3">
                <button on:click={upload} class="px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 transition">Upload</button>
                <a href={`/finance/${$page.params.slug}/produk`} class="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 transition">Batal</a>
            </div>
        </div>
    </div>
</div>
