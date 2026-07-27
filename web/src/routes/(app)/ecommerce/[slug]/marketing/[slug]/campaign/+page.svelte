<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { unit, campaigns, adList, totalSpend, totalConversions } = data;
    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);
    const STATUS_COLOR = { DRAFT:'bg-slate-100 text-slate-600', SCHEDULED:'bg-blue-100 text-blue-700', ACTIVE:'bg-emerald-100 text-emerald-700', COMPLETED:'bg-purple-100 text-purple-700' };
    const TYPE_COLOR = { EMAIL:'bg-sky-100 text-sky-700', WA:'bg-green-100 text-green-700', AD_TRACKER:'bg-orange-100 text-orange-700' };
    let showModal = false;
    $: if (form?.success) showModal = false;
    const ctr = (a) => a.clicks > 0 && a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(2) + '%' : '—';
</script>

<PageLayout title="Kampanye Pemasaran" subtitle="Kelola kampanye dan lacak pengeluaran iklan" badge="Marketing" slug={unit.slug} {unit}>
    <div slot="actions">
        <button on:click={() => showModal = true}
            class="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
            + Buat Kampanye
        </button>
    </div>

    <!-- Campaigns Table -->
    <div class="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" in:fade>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th class="px-5 py-3">Nama Kampanye</th><th class="px-5 py-3 text-center">Tipe</th>
                    <th class="px-5 py-3 text-right">Budget</th><th class="px-5 py-3 text-center">Status</th>
                    <th class="px-5 py-3 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each campaigns as c}
                <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td class="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td class="px-5 py-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {TYPE_COLOR[c.type] || ''}">{c.type}</span>
                    </td>
                    <td class="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(c.budget)}</td>
                    <td class="px-5 py-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase {STATUS_COLOR[c.status] || ''}">{c.status}</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                        {#if c.status === 'DRAFT'}
                        <form method="POST" action="?/updateStatus" use:enhance>
                            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="ACTIVE" />
                            <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition">Aktifkan</button>
                        </form>
                        {:else if c.status === 'ACTIVE'}
                        <form method="POST" action="?/updateStatus" use:enhance>
                            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="COMPLETED" />
                            <button type="submit" class="text-[9px] font-bold px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition">Selesai</button>
                        </form>
                        {/if}
                    </td>
                </tr>
                {:else}
                <tr><td colspan="5" class="py-10 text-center text-slate-400 font-bold uppercase text-[10px]">Belum ada kampanye</td></tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- Ad Tracker Section -->
    <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm" in:fade>
            <h3 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Catat Iklan</h3>
            <form method="POST" action="?/addAdTracker" use:enhance class="space-y-3">
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Platform</label>
                    <select name="platform" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        <option>Meta (Facebook/IG)</option><option>Google Ads</option><option>TikTok Ads</option><option>Twitter Ads</option><option>Lainnya</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Spend (Rp)</label>
                        <input type="number" name="spend_amount" min="0" placeholder="0"
                            class="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Tanggal</label>
                        <input type="date" name="tracking_date"
                            class="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Impressions</label>
                        <input type="number" name="impressions" min="0" placeholder="0"
                            class="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Clicks</label>
                        <input type="number" name="clicks" min="0" placeholder="0"
                            class="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                    </div>
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Konversi</label>
                    <input type="number" name="conversions" min="0" placeholder="0"
                        class="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                </div>
                <button type="submit"
                    class="w-full px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase shadow-md transition">
                    Simpan
                </button>
            </form>
        </div>
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" in:fade>
            <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <p class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Riwayat Iklan</p>
                <div class="text-right">
                    <p class="text-[9px] font-bold text-slate-400">Total Spend: <span class="text-rose-600 font-black">{fmt(totalSpend)}</span></p>
                    <p class="text-[9px] font-bold text-slate-400">Total Konversi: <span class="text-emerald-600 font-black">{totalConversions}</span></p>
                </div>
            </div>
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                        <th class="px-4 py-2.5">Tanggal</th><th class="px-4 py-2.5">Platform</th>
                        <th class="px-4 py-2.5 text-right">Spend</th><th class="px-4 py-2.5 text-center">CTR</th>
                        <th class="px-4 py-2.5 text-center">Konversi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                    {#each adList.slice(0, 10) as a}
                    <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td class="px-4 py-2.5 text-slate-500">{a.trackingDate}</td>
                        <td class="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">{a.platform}</td>
                        <td class="px-4 py-2.5 text-right font-mono text-rose-600">{fmt(a.spendAmount)}</td>
                        <td class="px-4 py-2.5 text-center text-slate-500">{ctr(a)}</td>
                        <td class="px-4 py-2.5 text-center font-black text-emerald-600">{a.conversions}</td>
                    </tr>
                    {:else}
                    <tr><td colspan="5" class="py-10 text-center text-slate-400 font-bold uppercase text-[10px]">Belum ada data iklan</td></tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</PageLayout>

{#if showModal}
<div class="fixed inset-0 z-[500] bg-slate-900/70 flex items-center justify-center p-4" transition:fade={{duration:120}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between">
            <p class="font-black text-sm uppercase">Buat Kampanye Baru</p>
            <button on:click={() => showModal = false} class="text-slate-400 hover:text-rose-500">✕</button>
        </div>
        <form method="POST" action="?/create" use:enhance class="p-5 space-y-4">
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Nama Kampanye *</label>
                <input type="text" name="name" required placeholder="Contoh: Promo Lebaran 2026"
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Tipe</label>
                    <select name="type" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                        <option value="EMAIL">Email</option><option value="WA">WhatsApp</option><option value="AD_TRACKER">Ad Tracker</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Budget (Rp)</label>
                    <input type="number" name="budget" min="0" placeholder="0"
                        class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
            </div>
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Subject / Judul</label>
                <input type="text" name="compose_subject" placeholder="Subjek pesan..."
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
            </div>
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Isi Pesan</label>
                <textarea name="compose_text" rows="3" placeholder="Tulis isi kampanye..."
                    class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none"></textarea>
            </div>
            <div class="flex gap-3 pt-1">
                <button type="button" on:click={() => showModal = false}
                    class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-black uppercase">Batal</button>
                <button type="submit"
                    class="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-xs font-black uppercase shadow-md">Simpan</button>
            </div>
        </form>
    </div>
</div>
{/if}
