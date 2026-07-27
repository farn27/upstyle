<script>
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';
    export let data; export let form;
    const { page, productList } = data;
    const content = page.contentJson || { sections: [], globalSettings: {} };
    const global = content.globalSettings || {};
    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);
    let submitted = false;
    $: if (form?.success) submitted = true;
</script>

<svelte:head>
    <title>{page.title}</title>
    <meta name="description" content={content.sections?.[0]?.data?.headline || page.title} />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; margin: 0; }
    </style>
</svelte:head>

<div class="min-h-screen bg-white" in:fade>
    {#each content.sections || [] as section (section.id)}

        <!-- ── HERO ──────────────────────────────────────────── -->
        {#if section.type === 'hero'}
        <section class="relative px-6 py-20 text-center overflow-hidden"
                 style="background:{section.data.bgColor||'#1e293b'}; color:{section.data.textColor||'#fff'}">
            {#if section.data.bgImage}
                <img src={section.data.bgImage} alt="" class="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" />
            {/if}
            <div class="relative z-10 max-w-2xl mx-auto">
                <h1 class="text-3xl md:text-4xl font-black leading-tight mb-4">{section.data.headline}</h1>
                <p class="text-base md:text-lg opacity-80 mb-8 leading-relaxed">{section.data.subheadline}</p>
                <a href="#contact-form"
                   class="inline-block px-8 py-3.5 rounded-2xl text-white font-black text-base shadow-xl hover:opacity-90 transition"
                   style="background:{section.data.ctaColor||'#4f46e5'}">
                    {section.data.ctaText || 'Mulai Sekarang'}
                </a>
            </div>
        </section>

        <!-- ── ABOUT ─────────────────────────────────────────── -->
        {:else if section.type === 'about'}
        <section class="py-14 px-6 bg-white">
            <div class="max-w-3xl mx-auto">
                {#if section.data.imageUrl}
                    <img src={section.data.imageUrl} alt={section.data.title}
                         class="w-full max-h-72 object-cover rounded-2xl mb-8 shadow-md" />
                {/if}
                <h2 class="text-2xl font-black text-slate-800 mb-4">{section.data.title}</h2>
                <p class="text-slate-600 leading-relaxed text-base">{section.data.content}</p>
            </div>
        </section>

        <!-- ── PRODUCTS ──────────────────────────────────────── -->
        {:else if section.type === 'products'}
        <section class="py-14 px-6 bg-slate-50">
            <div class="max-w-5xl mx-auto">
                <div class="text-center mb-10">
                    <h2 class="text-2xl font-black text-slate-800 mb-2">{section.data.title}</h2>
                    <p class="text-slate-500">{section.data.subtitle}</p>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {#each productList as p}
                    <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        {#if p.foto}
                            <img src={p.foto} alt={p.nama} class="w-full aspect-square object-cover" />
                        {:else}
                            <div class="w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                <span class="text-4xl opacity-30">📦</span>
                            </div>
                        {/if}
                        <div class="p-3">
                            <p class="text-sm font-bold text-slate-800 truncate mb-1">{p.nama}</p>
                            <p class="text-sm font-black text-indigo-600">{fmt(p.hargaJual)}</p>
                            {#if p.stok <= 0}
                                <span class="text-[9px] font-bold text-rose-500 uppercase">Habis</span>
                            {:else if p.stok <= 5}
                                <span class="text-[9px] font-bold text-amber-500 uppercase">Stok Terbatas</span>
                            {/if}
                        </div>
                    </div>
                    {:else}
                    <div class="col-span-full py-10 text-center text-slate-400">Produk belum tersedia</div>
                    {/each}
                </div>
            </div>
        </section>

        <!-- ── BENEFITS ──────────────────────────────────────── -->
        {:else if section.type === 'benefits'}
        <section class="py-14 px-6 bg-white">
            <div class="max-w-3xl mx-auto">
                <h2 class="text-2xl font-black text-slate-800 mb-8 text-center">{section.data.title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {#each section.data.items || [] as item}
                    <div class="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                        <span class="text-xl leading-none shrink-0">{item.split(' ')[0]}</span>
                        <p class="text-sm font-semibold text-slate-700">{item.split(' ').slice(1).join(' ')}</p>
                    </div>
                    {/each}
                </div>
            </div>
        </section>

        <!-- ── TESTIMONIAL ───────────────────────────────────── -->
        {:else if section.type === 'testimonial'}
        <section class="py-14 px-6 bg-slate-50">
            <div class="max-w-4xl mx-auto">
                <h2 class="text-2xl font-black text-slate-800 mb-8 text-center">{section.data.title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each section.data.items || [] as t}
                    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                        <div class="text-amber-400 text-lg mb-2">{'⭐'.repeat(t.rating || 5)}</div>
                        <p class="text-slate-600 italic mb-3 leading-relaxed">"{t.text}"</p>
                        <p class="text-sm font-black text-slate-800">— {t.name}</p>
                    </div>
                    {/each}
                </div>
            </div>
        </section>

        <!-- ── CTA BANNER ────────────────────────────────────── -->
        {:else if section.type === 'cta'}
        <section class="py-14 px-6 text-center" style="background:{section.data.bgColor||'#f8fafc'}">
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl md:text-3xl font-black text-slate-800 mb-3">{section.data.headline}</h2>
                <p class="text-slate-500 mb-8 text-base">{section.data.subtext}</p>
                <a href="#contact-form"
                   class="inline-block px-8 py-3.5 rounded-2xl text-white font-black text-base shadow-xl hover:opacity-90 transition"
                   style="background:{section.data.ctaColor||'#4f46e5'}">
                    {section.data.ctaText || 'Hubungi Kami'}
                </a>
            </div>
        </section>

        <!-- ── CONTACT FORM ──────────────────────────────────── -->
        {:else if section.type === 'contact_form'}
        <section id="contact-form" class="py-14 px-6 bg-white">
            <div class="max-w-md mx-auto">
                <div class="text-center mb-8">
                    <h2 class="text-2xl font-black text-slate-800 mb-2">{section.data.title}</h2>
                    <p class="text-slate-500">{section.data.subtitle}</p>
                </div>
                {#if submitted}
                <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center" transition:fade>
                    <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-black text-slate-800 mb-1">Terima Kasih! 🎉</h3>
                    <p class="text-slate-500 text-sm">Data kamu sudah kami terima. Tim kami akan menghubungi dalam 1×24 jam.</p>
                </div>
                {:else}
                <form method="POST" action="?/submitLead" use:enhance
                      class="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1.5">Nama Depan *</label>
                            <input type="text" name="first_name" required placeholder="Budi"
                                class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1.5">Nama Belakang</label>
                            <input type="text" name="last_name" placeholder="Santoso"
                                class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
                        <input type="email" name="email" placeholder="budi@contoh.com"
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1.5">Nomor WhatsApp</label>
                        <input type="tel" name="phone" placeholder="08xxxxxxxxxx"
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1.5">Pesan / Pertanyaan</label>
                        <textarea name="notes" rows="3" placeholder="Ceritakan kebutuhan kamu..."
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition resize-none"></textarea>
                    </div>
                    {#if form?.error}
                        <p class="text-xs text-rose-600 font-bold">{form.error}</p>
                    {/if}
                    <button type="submit"
                        class="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg hover:opacity-90 transition"
                        style="background:{global.primaryColor || '#4f46e5'}">
                        Kirim Sekarang →
                    </button>
                    <p class="text-center text-[10px] text-slate-400">Kami tidak akan mengirim spam. Data kamu aman.</p>
                </form>
                {/if}
            </div>
        </section>
        {/if}
    {/each}

    <!-- Footer -->
    <footer class="py-6 px-6 bg-slate-900 text-center">
        <p class="text-[11px] text-slate-500 font-medium">
            Dibuat dengan ❤️ menggunakan
            <a href="https://bizgrow.id" target="_blank" class="text-indigo-400 hover:text-indigo-300 font-bold">Bizgrow</a>
        </p>
    </footer>
</div>
