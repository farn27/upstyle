<script>
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { enhance } from '$app/forms';
    import { toastPesan } from '$lib/notifStore';
    import { fade } from 'svelte/transition';

    export let data;
    export let form;
    const { unit, storeSettings, stats, recentOrders } = data;

    function formatRupiah(val) {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(val) || 0);
    }

    function timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'baru saja';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
        return date.toLocaleDateString('id-ID');
    }

    $: if (form?.success) {
        toastPesan.set(form.message);
    } else if (form?.error) {
        toastPesan.set(form.error);
    }
</script>

<PageLayout title="E-Commerce Storefront" subtitle="Atur tampilan toko online dan pantau penjualan masuk" badge={unit?.tipe || 'General'} slug={unit.slug} unit={unit}>
    
    <div slot="actions" class="flex flex-wrap items-center gap-2">
        <a href={`/ecommerce/${unit.slug}`} class="px-3 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md">
            Setelan
        </a>
        <a href={`/ecommerce/${unit.slug}/katalog`} class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition">
            Katalog
        </a>
        <a href={`/ecommerce/${unit.slug}/integrasi`} class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition">
            Integrasi
        </a>
        <a href={`/ecommerce/${unit.slug}/landing-page`} class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition">
            Landing Page
        </a>
        <a href={`https://${storeSettings.domainSlug}.bizgrow.id`} target="_blank" class="flex items-center gap-1.5 px-3 py-2 border border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl text-xs font-black uppercase tracking-wider transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            Kunjungi Toko
        </a>
    </div>

    <!-- METRICS GRID -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6" in:fade={{ duration: 150 }}>
        <!-- Card 1: Total Orders -->
        <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-md text-white relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-white/70">Total Pesanan</p>
                    <h3 class="text-3xl font-black mt-1">{stats.totalOrders}</h3>
                </div>
                <div class="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                </div>
            </div>
        </div>

        <!-- Card 2: Pending Orders -->
        <div class="bg-white dark:bg-slate-850 border-t-4 border-t-rose-500 border-x border-b border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition relative overflow-hidden group">
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Menunggu Pembayaran</p>
                    <h3 class="text-2xl font-black mt-1 text-rose-500 dark:text-rose-400">{stats.pendingOrders}</h3>
                </div>
                <div class="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
            </div>
        </div>

        <!-- Card 3: Revenue -->
        <div class="bg-white dark:bg-slate-850 border-t-4 border-t-emerald-500 border-x border-b border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition relative overflow-hidden group">
            <div class="flex justify-between items-start relative z-10">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Pendapatan Bersih</p>
                    <h3 class="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{formatRupiah(stats.totalRevenue)}</h3>
                </div>
                <div class="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
            </div>
        </div>
    </div>

    <!-- EKOSISTEM DIGITAL (NEW INTEGRATED MODULES) -->
    <div class="mt-8 mb-4">
        <h2 class="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4">Ekosistem Digital (E-Commerce & B2B)</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4" in:fade={{ duration: 150, delay: 50 }}>
            <!-- Pipeline B2B -->
            <a href={`/ecommerce/${unit.slug}/sales`} class="bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 rounded-xl p-5 transition flex items-center justify-between group">
                <div>
                    <h3 class="text-sm font-bold text-indigo-900 dark:text-indigo-300">Pipeline & Deals</h3>
                    <p class="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">Kelola penjualan B2B dan target tim sales</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
            </a>

            <!-- Pemasaran -->
            <a href={`/ecommerce/${unit.slug}/marketing`} class="bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/40 border border-pink-100 dark:border-pink-800 rounded-xl p-5 transition flex items-center justify-between group">
                <div>
                    <h3 class="text-sm font-bold text-pink-900 dark:text-pink-300">Promosi & Pemasaran</h3>
                    <p class="text-[10px] text-pink-600 dark:text-pink-400 mt-1">Lacak leads, iklan digital, dan diskon promo</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                </div>
            </a>

            <!-- Layanan (CS) -->
            <a href={`/ecommerce/${unit.slug}/layanan`} class="bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-100 dark:border-cyan-800 rounded-xl p-5 transition flex items-center justify-between group">
                <div>
                    <h3 class="text-sm font-bold text-cyan-900 dark:text-cyan-300">Layanan Pelanggan</h3>
                    <p class="text-[10px] text-cyan-600 dark:text-cyan-400 mt-1">Manajemen keluhan, chat, dan ticketing CS</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-cyan-200 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>
                </div>
            </a>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <!-- STORE SETTINGS FORM -->
        <div class="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" in:fade={{ duration: 150, delay: 100 }}>
            <div class="p-5 border-b border-slate-100 dark:border-slate-800">
                <h2 class="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Pengaturan Toko</h2>
            </div>
            <form method="POST" action="?/updateSettings" use:enhance class="p-5 space-y-4">
                <div>
                    <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status Toko</label>
                    <div class="flex items-center gap-3">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isActive" value="true" checked={storeSettings.isActive} class="sr-only peer">
                            <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-orange-500"></div>
                        </label>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{storeSettings.isActive ? 'Toko Buka (Online)' : 'Toko Tutup (Maintenance)'}</span>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Nama Toko Online</label>
                    <input type="text" name="storefrontName" value={storeSettings.storefrontName} required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition text-slate-700 dark:text-slate-200">
                </div>

                <div>
                    <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Slug URL (Domain)</label>
                    <div class="flex">
                        <span class="inline-flex items-center px-3 text-xs text-slate-500 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg dark:bg-slate-800 dark:border-slate-700">
                            https://
                        </span>
                        <input type="text" name="domainSlug" value={storeSettings.domainSlug} required class="rounded-none w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition text-slate-700 dark:text-slate-200">
                        <span class="inline-flex items-center px-3 text-xs text-slate-500 bg-slate-100 border border-l-0 border-slate-200 rounded-r-lg dark:bg-slate-800 dark:border-slate-700">
                            .bizgrow.id
                        </span>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Deskripsi Toko (SEO)</label>
                    <textarea name="description" rows="3" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition text-slate-700 dark:text-slate-200">{storeSettings.description || ''}</textarea>
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full px-4 py-2 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md">Simpan Pengaturan</button>
                </div>
            </form>
        </div>

        <!-- RECENT ORDERS -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" in:fade={{ duration: 150, delay: 150 }}>
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Pesanan Masuk Terbaru</h2>
                <a href={`/ecommerce/${unit.slug}/orders`} class="text-[10px] font-bold uppercase text-orange-600 hover:underline">Lihat Semua</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50/50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th class="px-5 py-3">Order ID</th>
                            <th class="px-5 py-3">Pelanggan</th>
                            <th class="px-5 py-3 text-right">Total</th>
                            <th class="px-5 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                        {#each recentOrders as order}
                            <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                                <td class="px-5 py-3">
                                    <div class="font-bold text-slate-800 dark:text-slate-200">{order.orderNumber}</div>
                                    <div class="text-[9px] text-slate-500 font-mono mt-0.5">{timeAgo(order.createdAt)}</div>
                                </td>
                                <td class="px-5 py-3">
                                    <div class="font-medium text-slate-700 dark:text-slate-300">{order.customerName}</div>
                                </td>
                                <td class="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                                    {formatRupiah(order.totalAmount)}
                                </td>
                                <td class="px-5 py-3 text-center">
                                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider {order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                        {order.paymentStatus}
                                    </span>
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td colspan="4" class="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-wider">Belum ada pesanan masuk.</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</PageLayout>
