<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    export let data;
    let name = '';
    let phone = '';
    let email = '';
</script>

<div class="min-h-screen bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-sans">
    <div class="max-w-6xl mx-auto p-6">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Unit</p>
                <h1 class="text-2xl font-black text-slate-900 dark:text-white">Daftar Pelanggan POS</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Kelola profil pelanggan yang dipakai di kasir dan laporan penjualan.</p>
            </div>
            <a href={`/finance/${$page.params.slug}/pos`} class="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition">
                ← Kembali ke POS
            </a>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section class="space-y-4">
                <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-black text-slate-900 dark:text-white">Tambah Pelanggan Baru</h2>
                        <span class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">POS</span>
                    </div>
                    <form method="POST" action="?/create" use:enhance={() => {
                        return async ({ update, result }) => {
                            if (result.type === 'success') {
                                name = ''; phone = ''; email = '';
                            }
                            await update();
                        };
                    }} class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama Pelanggan</label>
                            <input name="name" bind:value={name} class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" placeholder="Contoh: Budi Santoso" />
                        </div>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <div class="space-y-2">
                                <label class="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500">Telepon</label>
                                <input name="phone" bind:value={phone} class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" placeholder="0812xxxxxxx" />
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500">Email</label>
                                <input name="email" bind:value={email} type="email" class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" placeholder="email@pelanggan.com" />
                            </div>
                        </div>
                        <button type="submit" class="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">Simpan Pelanggan</button>
                    </form>
                </div>

                <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                    <h2 class="text-lg font-black text-slate-900 dark:text-white mb-4">Pelanggan Terdaftar ({data.customers.length})</h2>
                    {#if data.customers.length === 0}
                        <div class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">Belum ada pelanggan POS. Tambahkan data pelanggan agar bisa dipilih saat checkout.</div>
                    {:else}
                        <div class="space-y-3">
                            {#each data.customers as customer}
                                <div class="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                                    <div class="flex items-center justify-between gap-4">
                                        <div>
                                            <p class="text-sm font-black text-slate-900 dark:text-white">{customer.nama_customer}</p>
                                            <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{customer.telepon || 'No phone'} · {customer.email || 'No email'}</p>
                                        </div>
                                        <span class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">ID {customer.id}</span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </section>
        </div>
    </div>
</div>
