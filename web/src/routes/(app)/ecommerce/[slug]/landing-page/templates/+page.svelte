<script>
    import { enhance } from '$app/forms';
    import { fade, fly, scale } from 'svelte/transition';
    import PageLayout from '$lib/components/PageLayout.svelte';
    
    export let data;
    const { unit, templates, existingPages, categories, styles, difficulties } = data;
    
    let selectedCategory = 'All';
    let selectedStyle = 'All';
    let selectedDifficulty = 'All';
    let searchQuery = '';
    let showPreview = false;
    let selectedTemplate = null;
    
    $: filteredTemplates = Object.values(templates).filter(tmpl => {
        const matchesCategory = selectedCategory === 'All' || tmpl.category === selectedCategory;
        const matchesStyle = selectedStyle === 'All' || tmpl.style === selectedStyle;
        const matchesDifficulty = selectedDifficulty === 'All' || tmpl.difficulty === selectedDifficulty;
        const matchesSearch = searchQuery === '' || 
            tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tmpl.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesStyle && matchesDifficulty && matchesSearch;
    });
    
    $: templateCount = filteredTemplates.length;
    
    function openPreview(template) {
        selectedTemplate = template;
        showPreview = true;
    }
    
    function closePreview() {
        showPreview = false;
        selectedTemplate = null;
    }
    
    function getDifficultyColor(difficulty) {
        switch(difficulty) {
            case 'beginner': return 'bg-emerald-100 text-emerald-700';
            case 'intermediate': return 'bg-amber-100 text-amber-700';
            case 'advanced': return 'bg-rose-100 text-rose-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    }
    
    function isTemplateUsed(templateId) {
        return existingPages.some(page => page.templateId === templateId);
    }
</script>

<PageLayout title="Template Marketplace" subtitle="Choose from professionally designed templates" badge="Ecommerce" slug={unit.slug} {unit}>
    <div slot="actions">
        <a href={`/ecommerce/${unit.slug}/landing-page`}
            class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase transition flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to Pages
        </a>
    </div>

    <!-- Filters -->
    <div class="mb-6 space-y-4">
        <!-- Search -->
        <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="Search templates..." 
                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            />
        </div>
        
        <!-- Filter Pills -->
        <div class="flex flex-wrap gap-2">
            <!-- Category Filter -->
            <div class="flex flex-wrap gap-1.5">
                {#each categories as category}
                    <button
                        on:click={() => selectedCategory = category}
                        class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all
                            {selectedCategory === category 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                        {category}
                    </button>
                {/each}
            </div>
            
            <!-- Style Filter -->
            <div class="flex flex-wrap gap-1.5">
                {#each styles as style}
                    <button
                        on:click={() => selectedStyle = style}
                        class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all
                            {selectedStyle === style 
                                ? 'bg-purple-600 text-white shadow-md' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                        {style}
                    </button>
                {/each}
            </div>
            
            <!-- Difficulty Filter -->
            <div class="flex flex-wrap gap-1.5">
                {#each difficulties as difficulty}
                    <button
                        on:click={() => selectedDifficulty = difficulty}
                        class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all
                            {selectedDifficulty === difficulty 
                                ? 'bg-emerald-600 text-white shadow-md' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                        {difficulty}
                    </button>
                {/each}
            </div>
        </div>
        
        <!-- Results Count -->
        <p class="text-xs text-slate-500 dark:text-slate-400">
            Showing <span class="font-bold text-slate-700 dark:text-slate-300">{templateCount}</span> templates
        </p>
    </div>

    <!-- Template Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {#each filteredTemplates as template}
            <div 
                class="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-200 dark:border-slate-800"
                on:click={() => openPreview(template)}
                transition:scale={{ duration: 200 }}
            >
                <!-- Preview Card -->
                <div class="aspect-[4/3] relative overflow-hidden" style="background: {template.previewGradient}">
                    <!-- Template Preview Mockup -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center p-4">
                        <div class="text-4xl mb-2">{template.thumbnail}</div>
                        <div class="w-16 h-1 bg-white/30 rounded-full"></div>
                        <div class="w-12 h-1 bg-white/20 rounded-full mt-1"></div>
                    </div>
                    
                    <!-- Hover Overlay -->
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button class="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-black uppercase transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            Preview Template
                        </button>
                    </div>
                    
                    <!-- Badges -->
                    <div class="absolute top-3 left-3 flex gap-1.5">
                        <span class="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[9px] font-bold text-slate-800">
                            {template.category}
                        </span>
                        <span class="px-2 py-0.5 {getDifficultyColor(template.difficulty)} rounded-full text-[9px] font-bold">
                            {template.difficulty}
                        </span>
                    </div>
                    
                    <!-- Used Badge -->
                    {#if isTemplateUsed(template.id)}
                        <div class="absolute top-3 right-3">
                            <span class="px-2 py-0.5 bg-indigo-500 text-white rounded-full text-[9px] font-bold">
                                ✓ Used
                            </span>
                        </div>
                    {/if}
                </div>
                
                <!-- Card Content -->
                <div class="p-4">
                    <div class="flex items-start justify-between mb-2">
                        <div>
                            <h3 class="text-sm font-black text-slate-800 dark:text-white leading-tight">{template.name}</h3>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{template.style} • {template.sections} sections</p>
                        </div>
                    </div>
                    
                    <p class="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">
                        {template.description}
                    </p>
                    
                    <!-- Tags -->
                    <div class="flex flex-wrap gap-1">
                        {#each template.tags.slice(0, 3) as tag}
                            <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[8px] font-medium">
                                #{tag}
                            </span>
                        {/each}
                    </div>
                </div>
            </div>
        {/each}
        
        {#if templateCount === 0}
            <div class="col-span-full py-16 text-center">
                <div class="text-5xl mb-4">🔍</div>
                <p class="text-slate-600 dark:text-slate-400 font-bold text-sm mb-1">No templates found</p>
                <p class="text-slate-400 text-xs">Try adjusting your filters or search terms</p>
            </div>
        {/if}
    </div>
</PageLayout>

<!-- Preview Modal -->
{#if showPreview && selectedTemplate}
<div class="fixed inset-0 z-[600] bg-slate-900/90 flex items-center justify-center p-4 overflow-y-auto" transition:fade={{duration:150}}>
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 my-4"
         transition:fly={{ y: 20, duration: 250 }}>
        
        <!-- Header -->
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="text-3xl">{selectedTemplate.thumbnail}</span>
                <div>
                    <p class="font-black text-sm text-slate-800 dark:text-white">{selectedTemplate.name}</p>
                    <p class="text-[10px] text-slate-500">{selectedTemplate.category} • {selectedTemplate.style}</p>
                </div>
            </div>
            <button on:click={closePreview} class="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        
        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <!-- Preview Area -->
            <div class="aspect-video rounded-xl mb-6 overflow-hidden" style="background: {selectedTemplate.previewGradient}">
                <div class="absolute inset-0 flex flex-col items-center justify-center p-8">
                    <div class="text-6xl mb-4">{selectedTemplate.thumbnail}</div>
                    <div class="w-32 h-2 bg-white/30 rounded-full mb-2"></div>
                    <div class="w-24 h-2 bg-white/20 rounded-full"></div>
                </div>
            </div>
            
            <!-- Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Description</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{selectedTemplate.description}</p>
                </div>
                <div>
                    <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Features</h4>
                    <ul class="space-y-1">
                        {#each selectedTemplate.features as feature}
                            <li class="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <svg class="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                                </svg>
                                {feature}
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
            
            <!-- Stats -->
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                    <p class="text-2xl font-black text-indigo-600">{selectedTemplate.sections}</p>
                    <p class="text-[10px] text-slate-500 uppercase">Sections</p>
                </div>
                <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                    <p class="text-2xl font-black text-purple-600">{selectedTemplate.features.length}</p>
                    <p class="text-[10px] text-slate-500 uppercase">Features</p>
                </div>
                <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                    <p class="text-lg font-black text-emerald-600">{selectedTemplate.difficulty}</p>
                    <p class="text-[10px] text-slate-500 uppercase">Difficulty</p>
                </div>
            </div>
            
            <!-- Tags -->
            <div class="mb-6">
                <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tags</h4>
                <div class="flex flex-wrap gap-2">
                    {#each selectedTemplate.tags as tag}
                        <span class="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                            #{tag}
                        </span>
                    {/each}
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <button on:click={closePreview}
                class="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase transition">
                Cancel
            </button>
            <form method="POST" action="/ecommerce/{unit.slug}/landing-page?/create" class="flex-1">
                <input type="hidden" name="template" value={selectedTemplate.id} />
                <input type="hidden" name="title" value={selectedTemplate.name} />
                <input type="hidden" name="page_slug" value={selectedTemplate.id} />
                <button type="submit"
                    class="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase shadow-lg transition">
                    Use This Template
                </button>
            </form>
        </div>
    </div>
</div>
{/if}
