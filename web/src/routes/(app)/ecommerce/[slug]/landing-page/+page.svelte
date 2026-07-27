<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade, fly } from 'svelte/transition';
    export let data; export let form;
    const { unit, pages, templates } = data;

    let showCreate = false;
    let selectedTemplate = 'leadgen';
    let titleVal = '';
    let slugVal = '';
    $: slugVal = titleVal.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    $: if (form?.success) { showCreate = false; titleVal = ''; selectedTemplate = 'leadgen'; }

    const TEMPLATE_ICONS = { 
        promo: '🔥', 
        leadgen: '🎯', 
        catalog: '📦', 
        portfolio: '💼',
        minimal: '⬜',
        luxury: '💎',
        event: '🎉',
        seasonal: '🌸',
        webinar: '📚',
        restaurant: '🍽️'
    };
    const TEMPLATE_DESC = {
        promo: 'Ideal untuk flash sale, diskon, dan promosi terbatas',
        leadgen: 'Capture leads dan nomor HP pelanggan potensial',
        catalog: 'Tampilkan katalog produk lengkap dengan harga',
        portfolio: 'Perkenalkan bisnis jasa dan portofolio kamu',
        minimal: 'Desain minimalis modern dengan fokus pada esensi',
        luxury: 'Koleksi premium untuk mereka yang menghargai kualitas',
        event: 'Template untuk peluncuran produk dan acara spesial',
        seasonal: 'Promosi musiman dengan tema yang relevan',
        webinar: 'Registrasi webinar dan masterclass',
        restaurant: 'Template untuk restoran dan bisnis F&B'
    };
</script>

<PageLayout title="Landing Page Builder" subtitle="Buat halaman promosi & capture leads dengan visual editor" badge="Ecommerce" slug={unit.slug} {unit}>
    <div slot="actions">
        <a href={`/ecommerce/${unit.slug}/landing-page/templates`}
            class="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-xs font-black uppercase shadow-lg transition flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            Template Marketplace
        </a>
        <button on:click={() => showCreate = true}
            class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase shadow-lg transition flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            Buat Landing Page
        </button>
    </div>

    {#if form?.error}
        <div class="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">{form.error}</div>
    {/if}

    <!-- Pages Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-4" in:fade>
        {#each pages as p}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
            <!-- Preview thumbnail -->
            <div class="h-36 relative overflow-hidden bg-gradient-to-br
                {p.contentJson?.sections?.[0]?.type === 'hero'
                    ? 'from-indigo-900 to-purple-900'
                    : 'from-slate-800 to-slate-900'}">
                <!-- Mockup lines -->
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                    <div class="w-3/4 h-3 bg-white/30 rounded-full"></div>
                    <div class="w-1/2 h-2 bg-white/20 rounded-full"></div>
                    <div class="w-16 h-6 bg-white/40 rounded-lg mt-1"></div>
                </div>
                <!-- Status overlay -->
                <div class="absolute top-2 right-2">
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black
                        {p.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500/80 text-white'}">
                        {p.isActive ? '● Live' : '○ Draft'}
                    </span>
                </div>
                <!-- Section count badge -->
                <div class="absolute bottom-2 left-2">
                    <span class="px-2 py-0.5 bg-black/40 text-white/80 rounded text-[9px] font-bold">
                        {p.contentJson?.sections?.length || 0} section
                    </span>
                </div>
            </div>

            <!-- Info -->
            <div class="p-4">
                <div class="flex items-start justify-between gap-2 mb-3">
                    <div>
                        <p class="text-sm font-black text-slate-800 dark:text-white leading-snug">{p.title}</p>
                        <p class="text-[10px] text-slate-400 font-mono mt-0.5">bizgrow.id/w/lp/{p.pageSlug}</p>
                    </div>
                    <form method="POST" action="?/toggle" use:enhance>
                        <input type="hidden" name="page_id" value={p.id} />
                        <button type="submit"
                            class="shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                            {p.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}">
                            <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                                {p.isActive ? 'translate-x-4' : 'translate-x-0.5'}"></span>
                        </button>
                    </form>
                </div>

                <div class="flex gap-2">
                    <a href={`/ecommerce/${unit.slug}/landing-page/${p.id}/edit`}
                        class="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase transition">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Edit
                    </a>
                    <a href={`/w/lp/${p.pageSlug}`} target="_blank"
                        class="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase transition">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        Preview
                    </a>
                    <form method="POST" action="?/delete" use:enhance>
                        <input type="hidden" name="page_id" value={p.id} />
                        <button type="submit" on:click|preventDefault={(e) => { if(confirm('Hapus halaman ini?')) e.target.closest('form').submit(); }}
                            class="p-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 text-rose-500 rounded-xl transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
        {:else}
        <div class="col-span-full py-20 text-center" in:fade>
            <div class="text-5xl mb-4">🚀</div>
            <p class="text-slate-600 dark:text-slate-400 font-bold text-sm mb-1">Belum ada landing page</p>
            <p class="text-slate-400 text-xs mb-6">Buat landing page pertama kamu dan mulai capture leads</p>
            <button on:click={() => showCreate = true}
                class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
                Buat Sekarang
            </button>
        </div>
        {/each}
    </div>
</PageLayout>

<!-- Modal Create -->
{#if showCreate}
<div class="fixed inset-0 z-[500] bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto" transition:fade={{duration:150}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 my-4"
         transition:fly={{ y: 20, duration: 250 }}>
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
                <p class="font-black text-sm text-slate-800 dark:text-white">Buat Landing Page Baru</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Pilih template dan masukkan nama halaman</p>
            </div>
            <button on:click={() => showCreate = false} class="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>

        <form method="POST" action="?/create" use:enhance class="p-5">
            <!-- Template picker -->
            <div class="mb-5">
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Pilih Template</p>
                <div class="grid grid-cols-2 gap-3">
                    {#each Object.entries(templates) as [key, tmpl]}
                    <label class="relative cursor-pointer">
                        <input type="radio" name="template" value={key} bind:group={selectedTemplate} class="sr-only" />
                        <div class="p-4 rounded-xl border-2 transition-all
                            {selectedTemplate === key
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}">
                            <div class="flex items-start gap-3">
                                <span class="text-2xl leading-none">{TEMPLATE_ICONS[key] || '📄'}</span>
                                <div>
                                    <p class="text-xs font-black text-slate-800 dark:text-white">{tmpl.name}</p>
                                    <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{TEMPLATE_DESC[key] || 'Template profesional'}</p>
                                    <p class="text-[9px] text-slate-400 mt-1">{tmpl.sections?.length || 4} section</p>
                                </div>
                            </div>
                            {#if selectedTemplate === key}
                            <div class="absolute top-2.5 right-2.5">
                                <div class="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                    <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                </div>
                            </div>
                            {/if}
                        </div>
                    </label>
                    {/each}
                </div>
            </div>

            <!-- Title & Slug -->
            <div class="space-y-3 mb-5">
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Judul Halaman *</label>
                    <input type="text" name="title" bind:value={titleVal} required
                        placeholder="Contoh: Flash Sale Lebaran 2026"
                        class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition" />
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">URL Slug</label>
                    <div class="flex">
                        <span class="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 border border-r-0 border-slate-200 dark:border-slate-600 rounded-l-xl text-[10px] text-slate-500 font-mono whitespace-nowrap">bizgrow.id/w/lp/</span>
                        <input type="text" name="page_slug" bind:value={slugVal} required
                            class="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-xl text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition" />
                    </div>
                </div>
            </div>

            <div class="flex gap-3">
                <button type="button" on:click={() => showCreate = false}
                    class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase transition">
                    Batal
                </button>
                <button type="submit"
                    class="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase shadow-lg transition">
                    Buat & Edit →
                </button>
            </div>
        </form>
    </div>
</div>
{/if}
