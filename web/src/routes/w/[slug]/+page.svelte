<script>
    import { page } from '$app/stores';

    export let data;

    $: unit = data.unit;
    $: settings = data.settings;
    $: products = data.products;
    $: categories = data.categories;

    let selectedCategory = 'ALL';
    let searchQuery = '';

    $: filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'ALL' || p.kategori === selectedCategory;
        const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    function getWaLink(product) {
        const rawPhone = settings?.contactPhone || '';
        // Format phone to international format without + or spaces
        const formattedPhone = rawPhone.replace(/[^0-9]/g, '');
        const message = `Halo Admin ${unit?.namaUnit || ''},\n\nSaya tertarik untuk memesan produk ini:\n- Nama Produk: ${product.nama}\n- Harga: Rp ${product.hargaJual.toLocaleString('id-ID')}\n\nApakah produk ini masih tersedia lurd?`;
        return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    }
</script>

<svelte:head>
    <title>{unit?.namaUnit || 'Katalog'} - Katalog Online Resmi</title>
    <meta name="description" content={settings?.heroSubtitle || ''} />
</svelte:head>

<div 
    class="min-h-screen bg-slate-50 font-sans text-slate-800"
    style="--primary-color: {settings.colorPrimary || '#4F46E5'}"
>
    <!-- NAVBAR -->
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div class="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm shadow-sm" style="background-color: var(--primary-color)">
                    {(unit?.namaUnit || 'B').charAt(0).toUpperCase()}
                </div>
                <span class="text-base font-black tracking-tight text-slate-900">{unit?.namaUnit || ''}</span>
            </div>
            
            <div class="flex items-center gap-4">
                {#if settings?.contactPhone}
                    <a 
                        href="https://wa.me/{settings.contactPhone.replace(/[^0-9]/g, '')}" 
                        target="_blank" 
                        class="text-xs font-bold text-white px-4 py-2 rounded-full transition-all shadow-sm flex items-center gap-2 hover:scale-105"
                        style="background-color: var(--primary-color)"
                    >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.64 1.97 14.168 1.94 11.535 1.94c-5.442 0-9.868 4.374-9.872 9.803-.001 1.73.46 3.418 1.336 4.908l-.997 3.639 3.755-.984zm13.125-6.732c-.328-.164-1.945-.96-2.245-1.07-.3-.109-.519-.164-.737.164-.219.329-.848 1.07-.1.329 1.15.547 2.062.902 2.825.164.763.164 1.63-.437 1.849-.765.219-.327.219-.607.109-.771-.109-.164-.437-.328-.765-.492zm-7.625-3.238c-.219-.328-.437-.656-.656-.984a.42.42 0 00-.317-.184c-.164 0-.328.164-.328.328 0 .164 1.64 2.625 2.187 3.44.11.164.219.273.328.328.219.109.437 0 .656-.219.656-.656 1.968-2.625 2.515-3.44.11-.164.11-.328 0-.492-.109-.164-.328-.328-.547-.328a.42.42 0 00-.317.184c-.219.328-.437.656-.656.984z"/>
                        </svg>
                        Hubungi Penjual
                    </a>
                {/if}
            </div>
        </div>
    </nav>

    <!-- HERO SECTION -->
    <header class="relative bg-white py-20 border-b border-slate-100 overflow-hidden">
        <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(var(--primary-color) 1.5px, transparent 1.5px); background-size: 24px 24px;"></div>
        <div class="max-w-4xl mx-auto px-6 text-center relative z-10">
            <span class="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-500 mb-4 inline-block">Katalog Resmi</span>
            <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-6">
                {settings.heroTitle}
            </h1>
            <p class="text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                {settings.heroSubtitle}
            </p>
        </div>
    </header>

    <!-- MAIN CATALOG CONTAINER -->
    <main class="max-w-6xl mx-auto px-6 py-12">
        <div class="flex flex-col lg:flex-row gap-8 items-start">
            
            <!-- LEFT PANEL: Filters -->
            <aside class="w-full lg:w-64 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                <!-- Search Bar -->
                <div class="mb-6">
                    <label for="search" class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Cari Produk</label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="search" 
                            bind:value={searchQuery}
                            placeholder="Cari nama barang..."
                            class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        <svg class="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>

                <!-- Categories -->
                <div>
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Kategori</h3>
                    <div class="flex flex-wrap lg:flex-col gap-2">
                        <button 
                            on:click={() => selectedCategory = 'ALL'}
                            class="px-4 py-2 rounded-xl text-xs font-bold text-left transition-all border
                                {selectedCategory === 'ALL' ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50'}"
                            style={selectedCategory === 'ALL' ? 'background-color: var(--primary-color)10; color: var(--primary-color); border-color: var(--primary-color)20' : ''}
                        >
                            Semua Produk
                        </button>
                        {#each categories as category}
                            <button 
                                on:click={() => selectedCategory = category}
                                class="px-4 py-2 rounded-xl text-xs font-bold text-left transition-all border
                                    {selectedCategory === category ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50'}"
                                style={selectedCategory === category ? 'background-color: var(--primary-color)10; color: var(--primary-color); border-color: var(--primary-color)20' : ''}
                            >
                                {category}
                            </button>
                        {/each}
                    </div>
                </div>
            </aside>

            <!-- RIGHT PANEL: Products Grid -->
            <section class="flex-1 w-full">
                <div class="flex justify-between items-center mb-6">
                    <p class="text-xs font-bold text-slate-400">{filteredProducts.length} Produk ditemukan</p>
                </div>

                {#if filteredProducts.length === 0}
                    <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
                        <svg class="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                        <h3 class="text-sm font-bold text-slate-700">Produk Tidak Ditemukan lurd</h3>
                        <p class="text-xs text-slate-400 mt-1">Coba cari dengan kata kunci lain atau pilih kategori berbeda.</p>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {#each filteredProducts as product}
                            <article class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                                <!-- Image Placeholder / Foto -->
                                <div class="h-44 bg-slate-100 relative flex items-center justify-center shrink-0">
                                    {#if product.foto}
                                        <img src={product.foto} alt={product.nama} class="w-full h-full object-cover" />
                                    {:else}
                                        <svg class="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    {/if}
                                    <span class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-black uppercase text-slate-600 tracking-wider shadow-sm border border-slate-100">{product.kategori}</span>
                                </div>

                                <!-- Product Info -->
                                <div class="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 class="text-sm font-bold text-slate-800 leading-tight mb-2 truncate" title={product.nama}>{product.nama}</h3>
                                        <p class="text-lg font-black text-slate-900 tracking-tight">Rp {product.hargaJual.toLocaleString('id-ID')}</p>
                                    </div>

                                    <div class="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-3">
                                        <div class="flex justify-between items-center text-xs font-semibold text-slate-400">
                                            <span>Ketersediaan Stok:</span>
                                            {#if product.stok > 0}
                                                <span class="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">Tersedia ({product.stok})</span>
                                            {:else}
                                                <span class="text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold">Habis</span>
                                            {/if}
                                        </div>

                                        <a 
                                            href={getWaLink(product)}
                                            target="_blank"
                                            class="w-full text-center py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 hover:brightness-105"
                                            style="background-color: var(--primary-color)"
                                        >
                                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.64 1.97 14.168 1.94 11.535 1.94c-5.442 0-9.868 4.374-9.872 9.803-.001 1.73.46 3.418 1.336 4.908l-.997 3.639 3.755-.984zm13.125-6.732c-.328-.164-1.945-.96-2.245-1.07-.3-.109-.519-.164-.737.164-.219.329-.848 1.07-.1.329 1.15.547 2.062.902 2.825.164.763.164 1.63-.437 1.849-.765.219-.327.219-.607.109-.771-.109-.164-.437-.328-.765-.492zm-7.625-3.238c-.219-.328-.437-.656-.656-.984a.42.42 0 00-.317-.184c-.164 0-.328.164-.328.328 0 .164 1.64 2.625 2.187 3.44.11.164.219.273.328.328.219.109.437 0 .656-.219.656-.656 1.968-2.625 2.515-3.44.11-.164.11-.328 0-.492-.109-.164-.328-.328-.547-.328a.42.42 0 00-.317.184c-.219.328-.437.656-.656.984z"/>
                                            </svg>
                                            Pesan via WhatsApp
                                        </a>
                                    </div>
                                </div>
                            </article>
                        {/each}
                    </div>
                {/if}
            </section>

        </div>
    </main>

    <!-- ABOUT SECTION -->
    <section class="bg-white py-16 border-t border-slate-100">
        <div class="max-w-4xl mx-auto px-6">
            <h2 class="text-2xl font-black text-slate-900 tracking-tight text-center mb-8">Tentang Kami</h2>
            <div class="bg-slate-50 rounded-2xl border border-slate-100 p-8">
                <p class="text-sm font-medium text-slate-600 leading-relaxed text-center whitespace-pre-line">
                    {settings.aboutUs}
                </p>
            </div>
        </div>
    </section>

    <!-- FOOTER -->
    <footer class="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div class="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 class="text-white font-black tracking-tight mb-4">{unit.namaUnit}</h3>
                <p class="text-xs leading-relaxed max-w-sm mb-4">
                    Website katalog resmi yang terhubung langsung dengan sistem inventori dan kasir toko kami. Belanja mudah, cepat, dan aman via WhatsApp.
                </p>
            </div>
            
            <div class="space-y-3">
                <h4 class="text-white text-xs font-black uppercase tracking-widest mb-4">Kontak & Alamat</h4>
                {#if settings.contactPhone}
                    <p class="text-xs flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                        WA: {settings.contactPhone}
                    </p>
                {/if}
                {#if settings.contactEmail}
                    <p class="text-xs flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        Email: {settings.contactEmail}
                    </p>
                {/if}
                {#if settings.contactAddress}
                    <p class="text-xs flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Alamat: {settings.contactAddress}
                    </p>
                {/if}
            </div>
        </div>
        
        <div class="max-w-6xl mx-auto px-6 border-t border-slate-800 mt-8 pt-8 text-center text-[10px]">
            <p>© {new Date().getFullYear()} {unit.namaUnit}. Powered by Bizgrow ERP. All rights reserved.</p>
        </div>
    </footer>
</div>
