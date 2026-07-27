<script>
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';

    export let data;
    export let form;
    
    const { unit, shopeeIntegration } = data;
    
    $: successMsg = $page.url.searchParams.get('success') === 'true';
    
    let isEditingKey = !shopeeIntegration || !shopeeIntegration.partnerId;
    let isLoading = false;
</script>

<PageLayout title="Integrasi Shopee" subtitle="Hubungkan toko dengan Shopee Open Platform" badge="Integrasi" slug={unit.slug} {unit}>
    <div class="mt-4" in:fade>
        <a href={`/ecommerce/${unit.slug}/integrasi`} class="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 uppercase flex items-center gap-1 mb-6 w-fit transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Kembali ke Daftar Integrasi
        </a>

        {#if successMsg || form?.success}
        <div class="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div>
                <p class="text-sm font-black text-emerald-800 dark:text-emerald-400">Pembaruan Berhasil!</p>
                <p class="text-xs text-emerald-600 dark:text-emerald-500">Konfigurasi Shopee Anda telah disimpan dan diamankan.</p>
            </div>
        </div>
        {/if}

        {#if form?.error}
        <div class="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-300 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
            <div>
                <p class="text-sm font-black text-rose-800 dark:text-rose-400">Gagal Disimpan!</p>
                <p class="text-xs text-rose-600 dark:text-rose-500">{form.error}</p>
            </div>
        </div>
        {/if}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Kolom Kiri: Form & Status -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div class="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-500/30 shrink-0">
                            S
                        </div>
                        <div>
                            <h2 class="text-lg font-black text-slate-800 dark:text-white">Shopee Open Platform</h2>
                            <p class="text-xs text-slate-500">
                                {#if shopeeIntegration && shopeeIntegration.shopId}
                                    Terhubung dengan Shop ID: <span class="font-mono font-bold text-orange-600">{shopeeIntegration.shopId}</span>
                                {:else}
                                    Belum login ke toko Shopee.
                                {/if}
                            </p>
                        </div>
                        <div class="ml-auto">
                            {#if shopeeIntegration && shopeeIntegration.shopId}
                                <span class="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200">AKTIF</span>
                            {:else}
                                <span class="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 shadow-sm border border-slate-200">NONAKTIF</span>
                            {/if}
                        </div>
                    </div>

                    <!-- Mode Edit Kredensial -->
                    {#if isEditingKey}
                        <form method="POST" action="?/saveCredentials" use:enhance={() => { isLoading = true; return async ({ update }) => { await update(); isLoading = false; isEditingKey = false; } }}>
                            <div class="p-4 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl space-y-4 mb-6">
                                <div>
                                    <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 mb-1">Partner ID</h3>
                                    <input type="text" name="partnerId" required value={shopeeIntegration?.partnerId || ''}
                                        class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-orange-500 transition" 
                                        placeholder="Contoh: 1004567" />
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 mb-1">Partner Key</h3>
                                    <input type="password" name="partnerKey" required 
                                        class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-orange-500 transition font-mono" 
                                        placeholder="Masukkan Partner Key Anda (akan dienkripsi)" />
                                    <p class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        Disimpan terenkripsi dengan AES-256-GCM.
                                    </p>
                                </div>
                                
                                <div class="flex gap-2 pt-2">
                                    <button type="submit" disabled={isLoading} class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-black transition disabled:opacity-50">
                                        {isLoading ? 'Menyimpan...' : 'Simpan Kredensial'}
                                    </button>
                                    {#if shopeeIntegration?.partnerId}
                                    <button type="button" on:click={() => isEditingKey = false} class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">
                                        Batal
                                    </button>
                                    {/if}
                                </div>
                            </div>
                        </form>
                    {:else}
                        <!-- Mode View & Action -->
                        <div class="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Partner ID Terdaftar</p>
                                <p class="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{shopeeIntegration?.partnerId}</p>
                            </div>
                            <button on:click={() => isEditingKey = true} class="text-xs font-bold text-orange-500 hover:text-orange-600 underline">
                                Ubah Kredensial
                            </button>
                        </div>
                    {/if}

                    <!-- Otorisasi Button (Hanya jika Kredensial sudah diisi) -->
                    {#if shopeeIntegration?.partnerId}
                        <div class="space-y-4">
                            {#if shopeeIntegration.shopId}
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                        <p class="text-[10px] font-black text-emerald-600/70 uppercase tracking-wider mb-1">Status Sinkronisasi</p>
                                        <div class="flex items-center justify-between">
                                            <p class="text-sm font-bold text-emerald-800 dark:text-emerald-400">Aktif Berjalan</p>
                                            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                        </div>
                                    </div>
                                    <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Refresh Token Valid s/d</p>
                                        <p class="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {new Date(shopeeIntegration.tokenExpiresAt).toLocaleString('id-ID', { dateStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                                <div class="flex gap-3 pt-4">
                                    <a href={`/api/shopee/auth?slug=${unit.slug}`} class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition border border-slate-200">
                                        Otorisasi Ulang
                                    </a>
                                    <form method="POST" action="?/disconnect" class="ml-auto" use:enhance>
                                        <button class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition border border-rose-100">
                                            Putuskan Koneksi
                                        </button>
                                    </form>
                                </div>
                            {:else}
                                <a href={`/api/shopee/auth?slug=${unit.slug}`} class="block w-full text-center px-4 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-black uppercase shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5">
                                    Login & Otorisasi Toko Shopee
                                </a>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
            
            <!-- Kolom Kanan: Panduan -->
            <div class="space-y-4">
                <div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-5 shadow-sm">
                    <h3 class="text-sm font-black text-blue-800 dark:text-blue-400 mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        Panduan Integrasi Shopee
                    </h3>
                    
                    <div class="space-y-4 text-xs text-blue-900/80 dark:text-blue-300/80">
                        <p>Shopee mewajibkan setiap aplikasi (ERP) yang terhubung untuk didaftarkan secara mandiri (Jika menggunakan Sandbox Mode).</p>
                        <ol class="list-decimal pl-4 space-y-2 font-medium">
                            <li>Buka website <a href="https://open.shopee.com" target="_blank" class="text-orange-600 underline font-bold">Shopee Open Platform</a>.</li>
                            <li>Daftar/Login sebagai <strong>Developer</strong>.</li>
                            <li>Buat <strong>Console App</strong> baru (Pilih tipe ERP / Custom).</li>
                            <li>Dapatkan <strong>Partner ID</strong> dan <strong>Partner Key</strong>, lalu masukkan di formulir sebelah.</li>
                        </ol>
                    </div>
                </div>

                <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-5 shadow-sm">
                    <h3 class="text-xs font-black text-amber-800 dark:text-amber-500 mb-2 uppercase tracking-wide">Pengaturan Callback URL</h3>
                    <p class="text-xs text-amber-900/70 dark:text-amber-400/70 mb-3 font-medium">
                        Anda WAJIB memasukkan URL Callback ini di pengaturan Aplikasi Shopee Open Platform Anda:
                    </p>
                    <div class="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                        <code class="text-[10px] text-slate-700 dark:text-slate-300 break-all select-all">
                            { $page.url.origin }/api/shopee/callback
                        </code>
                    </div>
                    {#if $page.url.hostname === 'localhost' || $page.url.hostname === '127.0.0.1'}
                    <div class="mt-3 text-[10px] text-amber-700 bg-amber-100 p-2 rounded border border-amber-300">
                        <strong>⚠️ Mode Lokal Terdeteksi:</strong> Shopee tidak menerima "localhost" sebagai callback. 
                        Gunakan <strong>Ngrok</strong> atau <strong>Cloudflare Tunnel</strong> untuk mendapatkan public HTTPS URL saat testing lokal.
                    </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</PageLayout>
