<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { unit, paymentConfig } = data;
    const midtrans = paymentConfig?.midtrans || {};
    let showKey = false;
</script>

<PageLayout title="Integrasi" subtitle="Hubungkan toko dengan payment gateway dan marketplace" badge="Ecommerce" slug={unit.slug} {unit}>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4" in:fade>
        <!-- Midtrans Payment Gateway -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div class="flex items-center gap-3 mb-5">
                <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">M</div>
                <div>
                    <p class="text-sm font-black text-slate-800 dark:text-white">Midtrans</p>
                    <p class="text-[10px] text-slate-400">Payment Gateway Indonesia</p>
                </div>
                <div class="ml-auto">
                    {#if midtrans.configured}
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">Terhubung</span>
                    {:else}
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500">Belum Dikonfigurasi</span>
                    {/if}
                </div>
            </div>
            <form method="POST" action="?/savePaymentConfig" use:enhance class="space-y-4">
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Client Key (Public)</label>
                    <input type="text" name="midtrans_client_key" placeholder="SB-Mid-client-xxxxxxxxxx"
                        value={midtrans.clientKey || ''}
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Server Key (Secret)</label>
                    <div class="relative">
                        <input type={showKey ? 'text' : 'password'} name="midtrans_server_key"
                            placeholder="SB-Mid-server-xxxxxxxxxx"
                            class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none pr-10" />
                        <button type="button" on:click={() => showKey = !showKey}
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]">
                            {showKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="midtrans_sandbox" value="true" checked={midtrans.sandbox !== false} class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-amber-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">Mode Sandbox (Testing)</span>
                </div>
                {#if form?.success}<p class="text-[10px] text-emerald-600 font-bold">✓ {form.message}</p>{/if}
                {#if form?.error}<p class="text-[10px] text-rose-600 font-bold">{form.error}</p>{/if}
                <button type="submit"
                    class="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
                    Simpan Konfigurasi
                </button>
            </form>
        </div>

        <!-- Marketplace (Coming Soon) -->
        <div class="space-y-4">
            <!-- Shopee (Active) -->
            <a href={`/ecommerce/${unit.slug}/integrasi/shopee`} class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-4 hover:border-orange-500 transition group cursor-pointer">
                <div class="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 group-hover:scale-110 transition-transform">
                    S
                </div>
                <div class="flex-1">
                    <p class="text-sm font-black text-slate-800 dark:text-white group-hover:text-orange-500 transition">Shopee</p>
                    <p class="text-[10px] text-slate-400">Sinkronisasi produk dan order dari Shopee</p>
                </div>
                <span class="text-orange-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </span>
            </a>

            {#each [{ name:'Tokopedia', color:'bg-green-600', desc:'Sinkronisasi produk dan order dari Tokopedia' }, { name:'TikTok Shop', color:'bg-slate-900', desc:'Kelola toko TikTok Shop langsung dari sini' }] as mkt}
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-4 opacity-75">
                <div class="w-9 h-9 {mkt.color} rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                    {mkt.name[0]}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-black text-slate-800 dark:text-white">{mkt.name}</p>
                    <p class="text-[10px] text-slate-400">{mkt.desc}</p>
                </div>
                <span class="px-2 py-1 rounded-lg text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Coming Soon
                </span>
            </div>
            {/each}
        </div>
    </div>
</PageLayout>
