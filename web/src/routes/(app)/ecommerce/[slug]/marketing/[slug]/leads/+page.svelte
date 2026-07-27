<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data;
    const { unit, leads } = data;
</script>

<PageLayout title="Manajemen Leads" subtitle="Prospek dari landing page dan form" badge="Marketing" slug={unit.slug} {unit}>
    <div class="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" in:fade>
        <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <p class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Daftar Leads ({leads.length})
            </p>
            <a href={`/ecommerce/${unit.slug}/marketing/landing-page`}
                class="text-[9px] font-black text-fuchsia-600 uppercase hover:underline">
                + Buat Landing Page
            </a>
        </div>
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th class="px-5 py-3">Nama</th><th class="px-5 py-3">Email / Telepon</th>
                    <th class="px-5 py-3">Sumber</th><th class="px-5 py-3 text-center">Tanggal</th>
                    <th class="px-5 py-3 text-center">Status</th><th class="px-5 py-3 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each leads as lead}
                <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td class="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td class="px-5 py-3 text-slate-500 dark:text-slate-400">
                        <div>{lead.email || '—'}</div>
                        <div class="text-[9px]">{lead.phone || ''}</div>
                    </td>
                    <td class="px-5 py-3 text-slate-500 text-[10px]">{lead.landing_page_title || 'Manual'}</td>
                    <td class="px-5 py-3 text-center text-[10px] text-slate-400">
                        {new Date(lead.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'2-digit' })}
                    </td>
                    <td class="px-5 py-3 text-center">
                        {#if lead.is_transferred_to_crm}
                            <span class="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-700">Di CRM</span>
                        {:else}
                            <span class="px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-100 text-amber-700">Baru</span>
                        {/if}
                    </td>
                    <td class="px-5 py-3 text-center">
                        {#if !lead.is_transferred_to_crm}
                        <form method="POST" action="?/transferToCrm" use:enhance>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <button type="submit"
                                class="text-[9px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100 transition">
                                → Transfer ke CRM
                            </button>
                        </form>
                        {:else}
                            <span class="text-[9px] text-slate-300">—</span>
                        {/if}
                    </td>
                </tr>
                {:else}
                <tr><td colspan="6" class="py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Belum ada leads masuk</td></tr>
                {/each}
            </tbody>
        </table>
    </div>
</PageLayout>
