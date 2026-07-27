<script>
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';

    export let data;
    export let form;

    $: unit = data.unit;
    let isSubmitting = false;
    let portalMessage = '';
    let portalMessageType = ''; // 'success' or 'error'

    // Logic sederhana untuk feedback toast jika form berhasil
    $: if (form?.success) {
        portalMessage = form.message;
        portalMessageType = 'success';
        // Reload page after 2 seconds to show updated slug
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
    $: if (form?.message && !form?.success) {
        portalMessage = form.message;
        portalMessageType = 'error';
    }
</script>
<div class="flex gap-2 items-center mt-1">
    <span class="px-2 py-0.5 bg-slate-200 text-[8px] font-black rounded uppercase">
        ID: {data.unit.id}
    </span>
    <span class="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-black rounded uppercase">
        Owner ID: {data.unit.user_id}
    </span>
</div>
<div class="max-w-4xl mx-auto p-6 space-y-8 font-manrope min-h-screen bg-slate-50/30 dark:bg-slate-900/30">
    
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
        <div class="space-y-1">
            <h1 class="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Pengaturan Bisnis</h1>
            <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Konfigurasi unit bisnis & akses karyawan</p>
        </div>
        <a href={`/finance/${unit.slug}`} class="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 dark:text-slate-100 transition-all uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md shadow-sm">
            ← Kembali
        </a>
    </div>

    <form 
    method="POST" 
    action="?/updateProfile" 
    use:enhance={() => {
        return async ({ result, update }) => {
            // Biarkan SvelteKit menangani update datanya secara default
            // Jangan tambahkan logika manual yang aneh-aneh di sini dulu
            await update({ reset: false }); 
        };
    }}

    class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <input type="hidden" name="id" bind:value={unit.id} />
        <div class="space-y-2">
            <h3 class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Identitas Bisnis</h3>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">Data ini akan muncul di dashboard dan laporan keuangan.</p>
        </div>

        <div class="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div class="space-y-1">
                <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nama Unit Bisnis</label>
                <input name="nama_unit" type="text" value={unit.nama_unit} required class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div class="space-y-1">
                <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Alamat Kantor</label>
                <textarea name="alamat" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" rows="3">{unit.alamat || ''}</textarea>
            </div>
            <div class="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
                <button type="submit" class="px-6 py-2.5 bg-slate-900 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-200">
                    Simpan Profil
                </button>
            </div>
        </div>
    </form>

    <form method="POST"
    action="?/updatePortal"
    use:enhance={() => {
        return async ({ update }) => {
            isSubmitting = true;
            await update({ reset: false });
            isSubmitting = false;
        };
    }}
     class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
     <input type="hidden" name="id" bind:value={unit.id} />
        <div class="space-y-2">
            <h3 class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Portal Staff</h3>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">Link khusus karyawan untuk login ke {unit.nama_unit}.</p>
        </div>

<div class="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
    <!-- Success/Error Message -->
    {#if portalMessage}
        <div class="p-4 rounded-md border text-[10px] font-bold text-center {portalMessageType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}" in:fade>
            {portalMessage}
        </div>
    {/if}

    <div class="space-y-3">
        <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Portal Staff</label>

        {#if unit.login_slug}
            <div class="p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div class="overflow-hidden">
                    <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Link Akses Karyawan</p>
                    <p class="text-xs text-indigo-600 font-bold truncate">
                        http://localhost:5173/portal/{unit.login_slug}
                    </p>
                </div>
                <button
                    type="button"
                    on:click={() => {
                        navigator.clipboard.writeText(`http://localhost:5173/portal/${unit.login_slug}`);
                        alert('Link lokal disalin!');
                    }}
                    class="ml-4 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all shadow-sm"
                >
                    <span class="text-[10px] font-bold text-slate-600 dark:text-slate-300">Salin</span>
                </button>
            </div>
        {:else}
            <div class="p-4 bg-amber-50 rounded-md border border-amber-100 text-[10px] text-amber-700 font-medium italic">
                Belum ada link portal. Klik tombol di bawah untuk membuat.
            </div>
        {/if}
    </div>

    <input type="hidden" name="nama_unit" value={unit.nama_unit} />

    <div class="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
        <button type="submit" disabled={isSubmitting} class="px-6 py-2.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Memproses...' : (unit.login_slug ? 'Generate Link Baru' : 'Buat Link Portal')}
        </button>
    </div>
</div>
    </form>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
        <div></div>
        <div class="md:col-span-2 bg-rose-50/50 p-6 rounded-md border border-rose-100 flex items-center justify-between shadow-sm">
            <div class="space-y-1">
                <h3 class="text-[11px] font-black text-rose-700 uppercase tracking-widest">Hapus Unit Bisnis</h3>
                <p class="text-[10px] text-rose-600/70 font-medium">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
            </div>
            <button class="px-5 py-2.5 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 text-rose-600 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                Hapus Bisnis
            </button>
        </div>
    </div>
</div>