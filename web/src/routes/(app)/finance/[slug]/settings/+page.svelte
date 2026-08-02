<script>
    import { enhance } from '$app/forms';
    import { fade, scale } from 'svelte/transition';

    export let data;
    export let form;

    $: unit = data.unit;
    let isSubmitting = false;
    let isDeleting = false;
    let portalMessage = '';
    let portalMessageType = '';

    // Modal konfirmasi hapus
    let showDeleteModal = false;
    let deleteConfirmText = '';
    $: deleteConfirmValid = deleteConfirmText === unit.namaUnit;

    $: loginSlug = unit.loginSlug ?? null;

    $: if (form?.success) {
        portalMessage = form.message ?? '';
        portalMessageType = 'success';
        setTimeout(() => { window.location.reload(); }, 1500);
    }
    $: if (form?.message && !form?.success) {
        portalMessage = form.message;
        portalMessageType = 'error';
    }

    $: portalUrl = loginSlug
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${loginSlug}`
        : '';

    function copyPortalLink() {
        navigator.clipboard.writeText(portalUrl)
            .then(() => {
                portalMessage = 'Link berhasil disalin!';
                portalMessageType = 'success';
                setTimeout(() => { portalMessage = ''; }, 2000);
            })
            .catch(() => {});
    }

    async function konfirmasiHapus() {
        if (!deleteConfirmValid) return;
        isDeleting = true;
        showDeleteModal = false;
        try {
            const res = await fetch(`/api/app/business?unitId=${unit.id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                window.location.href = '/finance';
            } else {
                portalMessage = 'Gagal menghapus: ' + (result.message || 'Terjadi kesalahan');
                portalMessageType = 'error';
            }
        } catch {
            portalMessage = 'Terjadi kesalahan jaringan';
            portalMessageType = 'error';
        } finally {
            isDeleting = false;
        }
    }
</script>

<div class="max-w-4xl mx-auto p-6 space-y-8 font-manrope min-h-screen bg-slate-50/30 dark:bg-slate-900/30">

    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
        <div class="space-y-1">
            <h1 class="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Pengaturan Bisnis</h1>
            <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Konfigurasi unit bisnis & akses karyawan</p>
        </div>
        <a href={`/finance/${unit.slug}`} class="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-all uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md shadow-sm">
            ← Kembali
        </a>
    </div>

    <!-- FORM: Identitas Bisnis -->
    <form
        method="POST"
        action="?/updateProfile"
        use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
                await update({ reset: false });
                isSubmitting = false;
            };
        }}
        class="grid grid-cols-1 md:grid-cols-3 gap-8"
    >
        <input type="hidden" name="id" value={unit.id} />

        <div class="space-y-2">
            <h3 class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Identitas Bisnis</h3>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">Data ini akan muncul di dashboard dan laporan keuangan.</p>
        </div>

        <div class="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            {#if form?.success && form?.action !== 'updatePortal'}
                <div class="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold" in:fade>
                    {form.message}
                </div>
            {/if}
            {#if form?.message && !form?.success}
                <div class="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold" in:fade>
                    {form.message}
                </div>
            {/if}

            <div class="space-y-1">
                <label for="nama_unit" class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nama Unit Bisnis</label>
                <input
                    id="nama_unit"
                    name="nama_unit"
                    type="text"
                    value={unit.namaUnit}
                    required
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            <div class="space-y-1">
                <label for="alamat" class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Alamat Kantor</label>
                <textarea
                    id="alamat"
                    name="alamat"
                    rows="3"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >{unit.alamat || ''}</textarea>
            </div>
            <div class="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    class="px-6 py-2.5 bg-slate-900 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
                >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
            </div>
        </div>
    </form>

    <!-- FORM: Portal Staff -->
    <form
        method="POST"
        action="?/updatePortal"
        use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
                await update({ reset: false });
                isSubmitting = false;
            };
        }}
        class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800"
    >
        <input type="hidden" name="id" value={unit.id} />
        <input type="hidden" name="nama_unit" value={unit.namaUnit} />

        <div class="space-y-2">
            <h3 class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Portal Staff</h3>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                Link khusus karyawan untuk login ke {unit.namaUnit}.
            </p>
        </div>

        <div class="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">

            {#if portalMessage}
                <div
                    class="p-3 rounded-md border text-[10px] font-bold text-center {portalMessageType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}"
                    in:fade
                >
                    {portalMessage}
                </div>
            {/if}

            <div class="space-y-3">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Link Akses Karyawan</p>

                {#if loginSlug}
                    <div class="p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                        <div class="overflow-hidden min-w-0">
                            <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">URL Portal</p>
                            <p class="text-xs text-indigo-600 font-bold truncate">{portalUrl}</p>
                        </div>
                        <button
                            type="button"
                            on:click={copyPortalLink}
                            class="shrink-0 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-sm text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        >
                            Salin
                        </button>
                    </div>
                {:else}
                    <div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/30 text-[10px] text-amber-700 dark:text-amber-400 font-medium italic">
                        Belum ada link portal. Klik tombol di bawah untuk membuat.
                    </div>
                {/if}
            </div>

            <div class="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    class="px-6 py-2.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {#if isSubmitting}
                        Memproses...
                    {:else if loginSlug}
                        Generate Link Baru
                    {:else}
                        Buat Link Portal
                    {/if}
                </button>
            </div>
        </div>
    </form>

    <!-- Hapus Unit Bisnis -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
        <div></div>
        <div class="md:col-span-2 bg-rose-50/50 dark:bg-rose-900/10 p-6 rounded-md border border-rose-100 dark:border-rose-900/30 flex items-center justify-between shadow-sm">
            <div class="space-y-1">
                <h3 class="text-[11px] font-black text-rose-700 uppercase tracking-widest">Hapus Unit Bisnis</h3>
                <p class="text-[10px] text-rose-600/70 font-medium">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
            </div>
            <button
                type="button"
                on:click={() => { showDeleteModal = true; deleteConfirmText = ''; }}
                disabled={isDeleting}
                class="px-5 py-2.5 bg-white dark:bg-slate-800 border border-rose-200 text-rose-600 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isDeleting ? 'Menghapus...' : 'Hapus Bisnis'}
            </button>
        </div>
    </div>

</div>

<!-- ─── Modal Konfirmasi Hapus ─────────────────────────────────────────────── -->
{#if showDeleteModal}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
        on:click|self={() => showDeleteModal = false}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
    >
        <!-- Modal card -->
        <div
            class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden"
            transition:scale={{ duration: 150, start: 0.95 }}
        >
            <!-- Header -->
            <div class="bg-rose-50 dark:bg-rose-900/20 px-6 py-5 border-b border-rose-100 dark:border-rose-800/30 flex items-start gap-4">
                <div class="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <div>
                    <h3 id="modal-title" class="font-black text-rose-800 dark:text-rose-300 text-sm">Hapus Unit Bisnis?</h3>
                    <p class="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1 leading-relaxed">
                        Semua data <strong>{unit.namaUnit}</strong> — transaksi, produk, karyawan — akan dihapus permanen.
                    </p>
                </div>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Untuk mengkonfirmasi, ketik nama bisnis di bawah ini:
                </p>
                <div class="space-y-1.5">
                    <p class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Ketik: <span class="text-slate-800 dark:text-slate-200 font-mono">{unit.namaUnit}</span>
                    </p>
                    <input
                        type="text"
                        bind:value={deleteConfirmText}
                        placeholder={unit.namaUnit}
                        class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm outline-none transition-all
                            {deleteConfirmValid
                                ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'}"
                        autocomplete="off"
                    />
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                    type="button"
                    on:click={() => showDeleteModal = false}
                    class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    Batal
                </button>
                <button
                    type="button"
                    on:click={konfirmasiHapus}
                    disabled={!deleteConfirmValid || isDeleting}
                    class="px-5 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                    {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                </button>
            </div>
        </div>
    </div>
{/if}
