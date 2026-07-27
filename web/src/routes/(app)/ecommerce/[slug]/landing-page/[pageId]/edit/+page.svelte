<script>
    import { enhance } from '$app/forms';
    import { fade, fly } from 'svelte/transition';
    import { page as pageStore } from '$app/stores';
    import GrapesEditor from '$lib/components/GrapesEditor.svelte';
    
    export let data; export let form;

    const { unit, productList } = data;

    let useAdvancedEditor = false;
    let pageTitle = data.page.title;
    let isPublished = data.page.isActive;
    let saveStatus = ''; // '', 'saving', 'saved', 'error'
    
    // Content for GrapesJS editor
    let editorContent = data.page.contentJson || { sections: [], globalSettings: { primaryColor: '#4f46e5' } };
    
    // Legacy content for simple editor
    let content = (() => {
        const raw = data.page.contentJson;
        if (!raw || typeof raw !== 'object') return { sections: [], globalSettings: { primaryColor: '#4f46e5' } };
        return {
            sections: Array.isArray(raw.sections) ? raw.sections : [],
            globalSettings: raw.globalSettings || { primaryColor: '#4f46e5' }
        };
    })();
    let selectedSectionIdx = null;
    let showAddSection = false;
    let showPreview = false;

    const fmt = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v)||0);

    // Section types catalog
    const SECTION_TYPES = [
        { type: 'hero', label: 'Hero Banner', icon: '🌟', desc: 'Header besar dengan judul dan tombol CTA' },
        { type: 'about', label: 'Tentang Kami', icon: '📖', desc: 'Cerita singkat tentang bisnis kamu' },
        { type: 'products', label: 'Produk', icon: '📦', desc: 'Grid produk dari inventori kamu' },
        { type: 'benefits', label: 'Keunggulan', icon: '✅', desc: 'Daftar keunggulan atau fitur layanan' },
        { type: 'testimonial', label: 'Testimoni', icon: '💬', desc: 'Review dan ulasan pelanggan' },
        { type: 'cta', label: 'Call to Action', icon: '🎯', desc: 'Banner ajakan dengan tombol besar' },
        { type: 'contact_form', label: 'Form Kontak', icon: '📋', desc: 'Form capture leads / hubungi kami' },
        { type: 'video', label: 'Video Section', icon: '🎬', desc: 'Embed video YouTube atau custom' },
        { type: 'gallery', label: 'Gallery', icon: '🖼️', desc: 'Grid gambar atau portfolio' },
        { type: 'faq', label: 'FAQ', icon: '❓', desc: 'Pertanyaan yang sering diajukan' },
        { type: 'pricing', label: 'Pricing', icon: '💰', desc: 'Tabel harga dan paket' },
    ];

    const DEFAULT_SECTION_DATA = {
        hero: { headline: 'Judul Halaman', subheadline: 'Deskripsi singkat di sini', ctaText: 'Mulai Sekarang', ctaColor: '#4f46e5', bgColor: '#1e293b', textColor: '#ffffff', bgImage: '' },
        about: { title: 'Tentang Kami', content: 'Ceritakan tentang bisnis kamu di sini...', imageUrl: '' },
        products: { title: 'Produk Kami', subtitle: 'Pilihan terbaik untuk kamu', columns: 3 },
        benefits: { title: 'Keunggulan Kami', items: ['✅ Kualitas Terjamin', '✅ Harga Bersaing', '✅ Layanan Cepat'] },
        testimonial: { title: 'Apa Kata Mereka', items: [{ name: 'Pelanggan', text: 'Produknya bagus banget!', rating: 5 }] },
        cta: { headline: 'Siap Memulai?', subtext: 'Hubungi kami sekarang dan dapatkan penawaran terbaik', ctaText: 'Hubungi Kami', ctaColor: '#4f46e5', bgColor: '#f8fafc' },
        contact_form: { title: 'Hubungi Kami', subtitle: 'Isi form dan kami akan segera menghubungi kamu' },
        video: { title: 'Video Kami', videoUrl: '', description: 'Deskripsi video' },
        gallery: { title: 'Gallery', images: [] },
        faq: { title: 'FAQ', items: [{ question: 'Pertanyaan 1', answer: 'Jawaban 1' }] },
        pricing: { title: 'Paket Harga', items: [{ name: 'Basic', price: 'Rp 100.000', features: ['Fitur 1', 'Fitur 2'] }] },
    };

    function addSection(type) {
        const newSection = {
            id: 's' + Date.now(),
            type,
            data: JSON.parse(JSON.stringify(DEFAULT_SECTION_DATA[type] || {}))
        };
        content = { ...content, sections: [...content.sections, newSection] };
        selectedSectionIdx = content.sections.length - 1;
        showAddSection = false;
    }

    function removeSection(idx) {
        if (!confirm('Hapus section ini?')) return;
        content.sections = content.sections.filter((_,i) => i !== idx);
        content = { ...content };
        if (selectedSectionIdx === idx) selectedSectionIdx = null;
    }

    function moveSection(idx, dir) {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= content.sections.length) return;
        const arr = [...content.sections];
        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        content = { ...content, sections: arr };
        selectedSectionIdx = newIdx;
    }

    function addBenefitItem(sectionIdx) {
        content.sections[sectionIdx].data.items = [...(content.sections[sectionIdx].data.items || []), '✅ Item baru'];
        content = { ...content };
    }

    function addTestimonialItem(sectionIdx) {
        content.sections[sectionIdx].data.items = [...(content.sections[sectionIdx].data.items || []), { name: 'Nama', text: 'Ulasan...', rating: 5 }];
        content = { ...content };
    }

    async function saveContent() {
        saveStatus = 'saving';
        const fd = new FormData();
        const contentToSave = useAdvancedEditor ? editorContent : content;
        fd.append('content_json', JSON.stringify(contentToSave));
        fd.append('title', pageTitle);
        const res = await fetch('?/save', { method: 'POST', body: fd });
        const result = await res.json();
        saveStatus = result?.type === 'success' ? 'saved' : 'error';
        setTimeout(() => saveStatus = '', 3000);
    }

    function handleEditorSave(data) {
        editorContent = { html: data.html, css: data.css };
        saveContent();
    }

    async function togglePublish() {
        const fd = new FormData();
        fd.append('is_active', String(!isPublished));
        const res = await fetch('?/publish', { method: 'POST', body: fd });
        const result = await res.json();
        if (result?.type === 'success') isPublished = !isPublished;
    }

    $: selectedSection = selectedSectionIdx !== null ? content.sections[selectedSectionIdx] : null;
    $: slug = $pageStore.params.slug;
    $: pageId = $pageStore.params.pageId;
    $: previewUrl = `/w/lp/${data.page.pageSlug}`;
</script>

<!-- ─── EDITOR LAYOUT ──────────────────────────────────────── -->
<div class="fixed inset-0 z-[300] bg-slate-100 dark:bg-slate-950 flex flex-col font-sans">

  <!-- Top Toolbar -->
  <div class="shrink-0 h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 gap-3 shadow-sm">
    <div class="flex items-center gap-3 min-w-0">
      <a href={`/ecommerce/${slug}/landing-page`}
        class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
      </a>
      <div class="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
      <input bind:value={pageTitle}
        class="text-sm font-bold text-slate-800 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-indigo-500 transition px-1 min-w-0 max-w-[200px]" />
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <!-- Editor Toggle -->
      <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        <button 
          on:click={() => useAdvancedEditor = false}
          class="px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition
          {!useAdvancedEditor ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
          Simple
        </button>
        <button 
          on:click={() => useAdvancedEditor = true}
          class="px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition
          {useAdvancedEditor ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
          Advanced
        </button>
      </div>

      <!-- Save status -->
      {#if saveStatus === 'saving'}
        <span class="text-[10px] text-slate-400 font-medium">Menyimpan...</span>
      {:else if saveStatus === 'saved'}
        <span class="text-[10px] text-emerald-600 font-bold">✓ Tersimpan</span>
      {:else if saveStatus === 'error'}
        <span class="text-[10px] text-rose-600 font-bold">Gagal simpan</span>
      {/if}

      <a href={previewUrl} target="_blank"
        class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase transition">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        Preview
      </a>

      <button on:click={saveContent}
        class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase transition">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
        Simpan
      </button>

      <button on:click={togglePublish}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition
        {isPublished ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}">
        {isPublished ? '⏸ Unpublish' : '🚀 Publish'}
      </button>
    </div>
  </div>

  <!-- Advanced Editor (GrapesJS) -->
  {#if useAdvancedEditor}
    <div class="flex-1">
      <GrapesEditor 
        content={editorContent} 
        products={productList} 
        onSave={handleEditorSave} 
      />
    </div>
  {:else}

  <!-- Main Editor Area: Left panel + Center canvas + Right properties -->
  <div class="flex-1 flex overflow-hidden">

    <!-- LEFT: Section list + Add section -->
    <div class="w-52 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
      <div class="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sections ({content.sections.length})</p>
      </div>
      <div class="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {#each content.sections as section, idx (section.id)}
        <div
          role="button" tabindex="0"
          on:click={() => selectedSectionIdx = idx}
          on:keydown={(e) => e.key === 'Enter' && (selectedSectionIdx = idx)}
          class="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-colors
            {selectedSectionIdx === idx ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}">
          <span class="text-sm leading-none">{SECTION_TYPES.find(s=>s.type===section.type)?.icon || '📄'}</span>
          <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">
            {SECTION_TYPES.find(s=>s.type===section.type)?.label || section.type}
          </span>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button on:click|stopPropagation={() => moveSection(idx, -1)} disabled={idx===0}
              class="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
            </button>
            <button on:click|stopPropagation={() => moveSection(idx, 1)} disabled={idx===content.sections.length-1}
              class="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <button on:click|stopPropagation={() => removeSection(idx)}
              class="p-0.5 text-slate-300 hover:text-rose-500">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {/each}
      </div>
      <div class="p-2 border-t border-slate-100 dark:border-slate-800">
        <button on:click={() => showAddSection = true}
          class="w-full py-2 flex items-center justify-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg transition uppercase tracking-wider">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          Tambah Section
        </button>
      </div>
    </div>

    <!-- CENTER: Canvas Preview -->
    <div class="flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-800 p-4">
      <div class="max-w-[390px] mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700">
        {#each content.sections as section, idx (section.id)}
        <div
          role="button" tabindex="0"
          on:click={() => selectedSectionIdx = idx}
          on:keydown={(e) => e.key === 'Enter' && (selectedSectionIdx = idx)}
          class="relative cursor-pointer group"
          class:ring-2={selectedSectionIdx === idx}
          class:ring-indigo-500={selectedSectionIdx === idx}>
          <!-- Section indicator -->
          {#if selectedSectionIdx === idx}
          <div class="absolute top-0 left-0 right-0 z-10 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 text-center">
            {SECTION_TYPES.find(s=>s.type===section.type)?.label}
          </div>
          {/if}

          <!-- HERO -->
          {#if section.type === 'hero'}
          <div class="relative px-6 py-12 text-center {selectedSectionIdx === idx ? 'pt-8' : ''}"
               style="background:{section.data.bgColor||'#1e293b'};color:{section.data.textColor||'#fff'}">
            {#if section.data.bgImage}
              <img src={section.data.bgImage} alt="" class="absolute inset-0 w-full h-full object-cover opacity-30" />
            {/if}
            <div class="relative z-10">
              <h1 class="text-xl font-black leading-tight mb-2">{section.data.headline}</h1>
              <p class="text-sm opacity-80 mb-5 leading-relaxed">{section.data.subheadline}</p>
              <button class="px-6 py-2.5 rounded-xl text-sm font-black text-white shadow-lg"
                      style="background:{section.data.ctaColor||'#4f46e5'}">{section.data.ctaText}</button>
            </div>
          </div>

          <!-- ABOUT -->
          {:else if section.type === 'about'}
          <div class="px-5 py-8 bg-white {selectedSectionIdx === idx ? 'pt-8' : ''}">
            <h2 class="text-base font-black text-slate-800 mb-2">{section.data.title}</h2>
            {#if section.data.imageUrl}
              <img src={section.data.imageUrl} alt="" class="w-full h-32 object-cover rounded-xl mb-3" />
            {/if}
            <p class="text-xs text-slate-600 leading-relaxed">{section.data.content}</p>
          </div>

          <!-- PRODUCTS -->
          {:else if section.type === 'products'}
          <div class="px-4 py-6 bg-slate-50 {selectedSectionIdx === idx ? 'pt-8' : ''}">
            <h2 class="text-base font-black text-slate-800 mb-1 text-center">{section.data.title}</h2>
            <p class="text-xs text-slate-500 text-center mb-4">{section.data.subtitle}</p>
            <div class="grid grid-cols-2 gap-2">
              {#each productList.slice(0,4) as p}
              <div class="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                {#if p.foto}
                  <img src={p.foto} alt={p.nama} class="w-full h-20 object-cover" />
                {:else}
                  <div class="w-full h-20 bg-slate-100 flex items-center justify-center text-slate-300 text-xl">📦</div>
                {/if}
                <div class="p-2">
                  <p class="text-[10px] font-bold text-slate-700 truncate">{p.nama}</p>
                  <p class="text-[10px] font-black text-indigo-600">{fmt(p.hargaJual)}</p>
                </div>
              </div>
              {/each}
              {#if productList.length === 0}
              <div class="col-span-2 py-8 text-center text-[10px] text-slate-400">Belum ada produk</div>
              {/if}
            </div>
          </div>

          <!-- BENEFITS -->
          {:else if section.type === 'benefits'}
          <div class="px-5 py-6 bg-white {selectedSectionIdx === idx ? 'pt-8' : ''}">
            <h2 class="text-base font-black text-slate-800 mb-4 text-center">{section.data.title}</h2>
            <ul class="space-y-2">
              {#each section.data.items || [] as item}
              <li class="text-xs text-slate-700 font-medium">{item}</li>
              {/each}
            </ul>
          </div>

          <!-- TESTIMONIAL -->
          {:else if section.type === 'testimonial'}
          <div class="px-5 py-6 bg-slate-50 {selectedSectionIdx === idx ? 'pt-8' : ''}">
            <h2 class="text-base font-black text-slate-800 mb-4 text-center">{section.data.title}</h2>
            {#each section.data.items || [] as t}
            <div class="bg-white rounded-xl p-3 mb-2 shadow-sm border border-slate-100">
              <p class="text-[10px] text-slate-600 italic mb-1.5">"{t.text}"</p>
              <p class="text-[9px] font-black text-slate-700">— {t.name} {'⭐'.repeat(t.rating||5)}</p>
            </div>
            {/each}
          </div>

          <!-- CTA -->
          {:else if section.type === 'cta'}
          <div class="px-5 py-8 text-center {selectedSectionIdx === idx ? 'pt-8' : ''}"
               style="background:{section.data.bgColor||'#f8fafc'}">
            <h2 class="text-base font-black text-slate-800 mb-1">{section.data.headline}</h2>
            <p class="text-xs text-slate-500 mb-4">{section.data.subtext}</p>
            <button class="px-6 py-2.5 rounded-xl text-sm font-black text-white shadow-lg"
                    style="background:{section.data.ctaColor||'#4f46e5'}">{section.data.ctaText}</button>
          </div>

          <!-- CONTACT FORM -->
          {:else if section.type === 'contact_form'}
          <div class="px-5 py-6 bg-white {selectedSectionIdx === idx ? 'pt-8' : ''}">
            <h2 class="text-base font-black text-slate-800 mb-1 text-center">{section.data.title}</h2>
            <p class="text-[10px] text-slate-500 text-center mb-4">{section.data.subtitle}</p>
            <div class="space-y-2">
              {#each ['Nama Lengkap', 'Email / WhatsApp', 'Pesan'] as field}
              <div class="h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 flex items-center">
                <span class="text-[10px] text-slate-400">{field}...</span>
              </div>
              {/each}
              <div class="h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                <span class="text-[10px] text-white font-black">Kirim Sekarang</span>
              </div>
            </div>
          </div>
          {/if}
        </div>
        {/each}

        {#if content.sections.length === 0}
        <div class="py-20 text-center text-slate-400">
          <div class="text-4xl mb-3">🏗️</div>
          <p class="text-xs font-bold">Tambah section untuk mulai membangun</p>
        </div>
        {/if}
      </div>
    </div>

    <!-- RIGHT: Properties Panel -->
    <div class="w-64 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
      {#if selectedSection}
      <div class="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Edit: {SECTION_TYPES.find(s=>s.type===selectedSection.type)?.label}</p>
        <button on:click={() => selectedSectionIdx = null} class="text-slate-300 hover:text-slate-500 text-[10px]">✕</button>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-3">

        <!-- HERO properties -->
        {#if selectedSection.type === 'hero'}
        <label class="prop-group">
          <span class="prop-label">Judul Utama</span>
          <input type="text" bind:value={selectedSection.data.headline} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <label class="prop-group">
          <span class="prop-label">Sub Judul</span>
          <textarea bind:value={selectedSection.data.subheadline} rows="2" class="prop-input resize-none" on:input={() => content = {...content}}></textarea>
        </label>
        <label class="prop-group">
          <span class="prop-label">Teks Tombol CTA</span>
          <input type="text" bind:value={selectedSection.data.ctaText} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="prop-group">
            <span class="prop-label">Warna Tombol</span>
            <div class="flex items-center gap-2">
              <input type="color" bind:value={selectedSection.data.ctaColor} class="w-8 h-8 rounded cursor-pointer border-0" on:input={() => content = {...content}} />
              <input type="text" bind:value={selectedSection.data.ctaColor} class="prop-input text-xs" on:input={() => content = {...content}} />
            </div>
          </label>
          <label class="prop-group">
            <span class="prop-label">Warna BG</span>
            <div class="flex items-center gap-2">
              <input type="color" bind:value={selectedSection.data.bgColor} class="w-8 h-8 rounded cursor-pointer border-0" on:input={() => content = {...content}} />
              <input type="text" bind:value={selectedSection.data.bgColor} class="prop-input text-xs" on:input={() => content = {...content}} />
            </div>
          </label>
        </div>
        <label class="prop-group">
          <span class="prop-label">URL Gambar Background (opsional)</span>
          <input type="url" bind:value={selectedSection.data.bgImage} placeholder="https://..." class="prop-input" on:input={() => content = {...content}} />
        </label>

        <!-- ABOUT properties -->
        {:else if selectedSection.type === 'about'}
        <label class="prop-group">
          <span class="prop-label">Judul</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <label class="prop-group">
          <span class="prop-label">Isi Teks</span>
          <textarea bind:value={selectedSection.data.content} rows="4" class="prop-input resize-none" on:input={() => content = {...content}}></textarea>
        </label>
        <label class="prop-group">
          <span class="prop-label">URL Gambar</span>
          <input type="url" bind:value={selectedSection.data.imageUrl} placeholder="https://..." class="prop-input" on:input={() => content = {...content}} />
        </label>

        <!-- PRODUCTS properties -->
        {:else if selectedSection.type === 'products'}
        <label class="prop-group">
          <span class="prop-label">Judul Section</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <label class="prop-group">
          <span class="prop-label">Sub Judul</span>
          <input type="text" bind:value={selectedSection.data.subtitle} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <div class="text-[9px] text-slate-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-2 rounded-lg">
          📦 Menampilkan produk aktif dari inventori kamu secara otomatis
        </div>

        <!-- BENEFITS properties -->
        {:else if selectedSection.type === 'benefits'}
        <label class="prop-group">
          <span class="prop-label">Judul</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <div>
          <p class="prop-label mb-1.5">Daftar Item</p>
          {#each selectedSection.data.items || [] as item, iIdx}
          <div class="flex gap-1.5 mb-1.5">
            <input type="text" bind:value={selectedSection.data.items[iIdx]} class="prop-input flex-1"
              on:input={() => content = {...content}} />
            <button on:click={() => { selectedSection.data.items.splice(iIdx,1); content = {...content}; }}
              class="text-rose-400 hover:text-rose-600 text-xs px-1">✕</button>
          </div>
          {/each}
          <button on:click={() => addBenefitItem(selectedSectionIdx)}
            class="w-full text-[9px] font-bold text-indigo-600 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition uppercase">+ Tambah Item</button>
        </div>

        <!-- TESTIMONIAL properties -->
        {:else if selectedSection.type === 'testimonial'}
        <label class="prop-group">
          <span class="prop-label">Judul</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        {#each selectedSection.data.items || [] as t, tIdx}
        <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[9px] font-black text-slate-500 uppercase">Testimoni {tIdx+1}</span>
            <button on:click={() => { selectedSection.data.items.splice(tIdx,1); content = {...content}; }}
              class="text-[9px] text-rose-400 hover:text-rose-600">Hapus</button>
          </div>
          <input type="text" bind:value={t.name} placeholder="Nama" class="prop-input" on:input={() => content = {...content}} />
          <textarea bind:value={t.text} rows="2" placeholder="Ulasan..." class="prop-input resize-none" on:input={() => content = {...content}}></textarea>
          <select bind:value={t.rating} class="prop-input" on:change={() => content = {...content}}>
            {#each [5,4,3,2,1] as r}<option value={r}>{'⭐'.repeat(r)}</option>{/each}
          </select>
        </div>
        {/each}
        <button on:click={() => addTestimonialItem(selectedSectionIdx)}
          class="w-full text-[9px] font-bold text-indigo-600 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition uppercase">+ Tambah Testimoni</button>

        <!-- CTA properties -->
        {:else if selectedSection.type === 'cta'}
        <label class="prop-group">
          <span class="prop-label">Judul</span>
          <input type="text" bind:value={selectedSection.data.headline} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <label class="prop-group">
          <span class="prop-label">Sub Teks</span>
          <textarea bind:value={selectedSection.data.subtext} rows="2" class="prop-input resize-none" on:input={() => content = {...content}}></textarea>
        </label>
        <label class="prop-group">
          <span class="prop-label">Teks Tombol</span>
          <input type="text" bind:value={selectedSection.data.ctaText} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="prop-group">
            <span class="prop-label">Warna Tombol</span>
            <input type="color" bind:value={selectedSection.data.ctaColor} class="w-full h-8 rounded cursor-pointer border border-slate-200" on:input={() => content = {...content}} />
          </label>
          <label class="prop-group">
            <span class="prop-label">Warna BG</span>
            <input type="color" bind:value={selectedSection.data.bgColor} class="w-full h-8 rounded cursor-pointer border border-slate-200" on:input={() => content = {...content}} />
          </label>
        </div>

        <!-- CONTACT FORM properties -->
        {:else if selectedSection.type === 'contact_form'}
        <label class="prop-group">
          <span class="prop-label">Judul Form</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <label class="prop-group">
          <span class="prop-label">Sub Judul</span>
          <input type="text" bind:value={selectedSection.data.subtitle} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <div class="text-[9px] text-slate-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2.5 py-2 rounded-lg">
          📋 Form otomatis capture nama, email, dan WhatsApp ke database Leads kamu
        </div>

        <!-- VIDEO properties -->
        {:else if selectedSection.type === 'video'}
        <label class="prop-group">
          <span class="prop-label">Judul Section</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <label class="prop-group">
          <span class="prop-label">URL Video (YouTube)</span>
          <input type="url" bind:value={selectedSection.data.videoUrl} placeholder="https://youtube.com/watch?v=..." class="prop-input" on:input={() => content = {...content}} />
        </label>
        <label class="prop-group">
          <span class="prop-label">Deskripsi</span>
          <textarea bind:value={selectedSection.data.description} rows="3" class="prop-input resize-none" on:input={() => content = {...content}}></textarea>
        </label>

        <!-- GALLERY properties -->
        {:else if selectedSection.type === 'gallery'}
        <label class="prop-group">
          <span class="prop-label">Judul Gallery</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        <div>
          <p class="prop-label mb-1.5">URL Gambar</p>
          {#each selectedSection.data.images || [] as img, iIdx}
          <div class="flex gap-1.5 mb-1.5">
            <input type="url" bind:value={selectedSection.data.images[iIdx]} placeholder="https://..." class="prop-input flex-1"
              on:input={() => content = {...content}} />
            <button on:click={() => { selectedSection.data.images.splice(iIdx,1); content = {...content}; }}
              class="text-rose-400 hover:text-rose-600 text-xs px-1">✕</button>
          </div>
          {/each}
          <button on:click={() => { selectedSection.data.images = [...(selectedSection.data.images || []), '']; content = {...content}; }}
            class="w-full text-[9px] font-bold text-indigo-600 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition uppercase">+ Tambah Gambar</button>
        </div>

        <!-- FAQ properties -->
        {:else if selectedSection.type === 'faq'}
        <label class="prop-group">
          <span class="prop-label">Judul Section</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        {#each selectedSection.data.items || [] as faq, fIdx}
        <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[9px] font-black text-slate-500 uppercase">FAQ {fIdx+1}</span>
            <button on:click={() => { selectedSection.data.items.splice(fIdx,1); content = {...content}; }}
              class="text-[9px] text-rose-400 hover:text-rose-600">Hapus</button>
          </div>
          <input type="text" bind:value={faq.question} placeholder="Pertanyaan" class="prop-input" on:input={() => content = {...content}} />
          <textarea bind:value={faq.answer} rows="2" placeholder="Jawaban" class="prop-input resize-none" on:input={() => content = {...content}}></textarea>
        </div>
        {/each}
        <button on:click={() => { selectedSection.data.items = [...(selectedSection.data.items || []), { question: '', answer: '' }]; content = {...content}; }}
          class="w-full text-[9px] font-bold text-indigo-600 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition uppercase">+ Tambah FAQ</button>

        <!-- PRICING properties -->
        {:else if selectedSection.type === 'pricing'}
        <label class="prop-group">
          <span class="prop-label">Judul Section</span>
          <input type="text" bind:value={selectedSection.data.title} class="prop-input" on:input={() => content = {...content}} />
        </label>
        {#each selectedSection.data.items || [] as price, pIdx}
        <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[9px] font-black text-slate-500 uppercase">Paket {pIdx+1}</span>
            <button on:click={() => { selectedSection.data.items.splice(pIdx,1); content = {...content}; }}
              class="text-[9px] text-rose-400 hover:text-rose-600">Hapus</button>
          </div>
          <input type="text" bind:value={price.name} placeholder="Nama Paket" class="prop-input" on:input={() => content = {...content}} />
          <input type="text" bind:value={price.price} placeholder="Harga" class="prop-input" on:input={() => content = {...content}} />
          <div>
            <p class="prop-label mb-1">Fitur (satu per baris)</p>
            <textarea 
              value={price.features.join('\n')} 
              rows="3" 
              placeholder="Fitur 1&#10;Fitur 2&#10;Fitur 3" 
              class="prop-input resize-none" 
              on:input={(e) => { price.features = e.target.value.split('\n').filter(f => f.trim()); content = {...content}; }}
            ></textarea>
          </div>
        </div>
        {/each}
        <button on:click={() => { selectedSection.data.items = [...(selectedSection.data.items || []), { name: '', price: '', features: [] }]; content = {...content}; }}
          class="w-full text-[9px] font-bold text-indigo-600 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition uppercase">+ Tambah Paket</button>
        {/if}

      </div>
      {:else}
      <div class="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <div class="text-3xl mb-3">👈</div>
          <p class="text-[11px] font-bold text-slate-500">Klik section di canvas untuk edit propertinya</p>
        </div>
      </div>
      {/if}
    </div>
  </div>
  {/if}
</div>

<!-- Add Section Modal -->
{#if showAddSection}
<div class="fixed inset-0 z-[400] bg-slate-900/70 flex items-center justify-center p-4" transition:fade={{duration:120}}>
  <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
    <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <p class="font-black text-sm text-slate-800 dark:text-white">Pilih Tipe Section</p>
      <button on:click={() => showAddSection = false} class="text-slate-400 hover:text-slate-600 text-xs">✕</button>
    </div>
    <div class="p-3 grid grid-cols-2 gap-2">
      {#each SECTION_TYPES as st}
      <button on:click={() => addSection(st.type)}
        class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-left transition group">
        <span class="text-xl leading-none shrink-0">{st.icon}</span>
        <div>
          <p class="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{st.label}</p>
          <p class="text-[9px] text-slate-400 mt-0.5 leading-snug">{st.desc}</p>
        </div>
      </button>
      {/each}
    </div>
  </div>
</div>
{/if}

<style>
  :global(.prop-group) { display: flex; flex-direction: column; gap: 4px; }
  :global(.prop-label) { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
  :global(.prop-input) {
    width: 100%; padding: 6px 10px;
    background: #f8fafc; border: 1px solid #e2e8f0;
    border-radius: 8px; font-size: 12px; color: #1e293b;
    outline: none; transition: border-color 0.15s;
  }
  :global(.dark .prop-input) { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  :global(.prop-input:focus) { border-color: #6366f1; }
</style>
