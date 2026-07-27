<script>
    import { enhance } from '$app/forms';
    import PageLayout from '$lib/components/PageLayout.svelte';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { unit } = data;
    let articles = data.articles || [];
    let showModal = false;
    let expandedId = null;
    $: if (form?.success) { showModal = false; }
    $: articles = data.articles || [];

    // Group by category
    $: grouped = articles.reduce((acc, a) => {
        if (!acc[a.category]) acc[a.category] = [];
        acc[a.category].push(a);
        return acc;
    }, {});
</script>

<PageLayout title="Knowledge Base" subtitle="Buat artikel FAQ untuk bantu pelanggan mandiri" badge="CS" slug={unit.slug} {unit}>
    <div slot="actions">
        <button on:click={() => showModal = true}
            class="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
            + Artikel Baru
        </button>
    </div>

    {#if articles.length === 0}
    <div class="mt-10 text-center py-20" in:fade>
        <div class="text-5xl mb-4">📚</div>
        <p class="text-slate-600 dark:text-slate-400 font-bold">Belum ada artikel FAQ</p>
        <p class="text-slate-400 text-xs mt-1 mb-6">Buat artikel untuk membantu pelanggan menjawab pertanyaan mereka sendiri</p>
        <button on:click={() => showModal = true}
            class="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">
            Buat Artikel Pertama
        </button>
    </div>
    {:else}
    <div class="mt-4 space-y-6" in:fade>
        {#each Object.entries(grouped) as [cat, catArticles]}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <span class="text-sm">📂</span>
                <h3 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{cat}</h3>
                <span class="text-[9px] text-slate-400 font-bold ml-1">{catArticles.length} artikel</span>
            </div>
            <div class="divide-y divide-slate-50 dark:divide-slate-800">
                {#each catArticles as article}
                <div class="px-5 py-4">
                    <div class="flex items-start justify-between gap-3">
                        <button
                            type="button"
                            class="flex-1 text-left"
                            on:click={() => expandedId = expandedId === article.id ? null : article.id}
                        >
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-black text-slate-400 transition-transform
                                    {expandedId === article.id ? 'rotate-90' : ''}">▶</span>
                                <p class="text-sm font-bold text-slate-800 dark:text-white hover:text-cyan-600 transition-colors">
                                    {article.title}
                                </p>
                            </div>
                        </button>
                        <form method="POST" action="?/delete" use:enhance>
                            <input type="hidden" name="id" value={article.id} />
                            <button type="submit"
                                on:click|preventDefault={(e) => { if(confirm('Hapus artikel ini?')) e.target.closest('form').submit(); }}
                                class="shrink-0 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </form>
                    </div>
                    {#if expandedId === article.id}
                    <div class="mt-3 pl-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed" transition:fade={{ duration: 150 }}>
                        {article.content}
                        <p class="text-[9px] text-slate-300 dark:text-slate-600 mt-3">
                            {Number(article.views || 0)} kali dilihat · {new Date(article.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                        </p>
                    </div>
                    {/if}
                </div>
                {/each}
            </div>
        </div>
        {/each}
    </div>
    {/if}
</PageLayout>

{#if showModal}
<div class="fixed inset-0 z-[500] bg-slate-900/70 flex items-center justify-center p-4" transition:fade={{duration:120}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p class="font-black text-sm text-slate-800 dark:text-white">Tambah Artikel FAQ</p>
            <button on:click={() => showModal = false} class="text-slate-400 hover:text-rose-500 transition-colors">✕</button>
        </div>
        <form method="POST" action="?/create" use:enhance class="p-5 space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Judul Artikel *</label>
                    <input type="text" name="title" required placeholder="Contoh: Bagaimana cara mengembalikan barang?"
                        class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Kategori</label>
                    <input type="text" name="category" placeholder="Umum" value="Umum"
                        class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-cyan-500 outline-none transition" />
                </div>
            </div>
            <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Konten Jawaban *</label>
                <textarea name="content" required rows="5" placeholder="Tulis jawaban lengkap di sini..."
                    class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition resize-none"></textarea>
            </div>
            {#if form?.error}<p class="text-[10px] text-rose-600 font-bold">{form.error}</p>{/if}
            <div class="flex gap-3 pt-1">
                <button type="button" on:click={() => showModal = false}
                    class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-black uppercase transition">Batal</button>
                <button type="submit"
                    class="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase shadow-md transition">Simpan</button>
            </div>
        </form>
    </div>
</div>
{/if}
