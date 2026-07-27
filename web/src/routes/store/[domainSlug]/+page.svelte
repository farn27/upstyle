<script>
    import { cart } from '../cartStore';
    
    export let data;
    const { productsList, store, categories } = data;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
    
    let selectedCategory = 'all';

    $: filteredProducts = selectedCategory === 'all' 
        ? productsList 
        : productsList.filter(p => p.kategoriId === selectedCategory);

    function addToCart(product) {
        cart.add(product);
        // Tampilkan notifikasi kecil via UI state jika perlu (misal toast)
        alert(`${product.nama} ditambahkan ke keranjang`);
    }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
    <!-- Hero Section (opsional jika deskripsi ada) -->
    {#if store.description}
    <div class="bg-indigo-600 rounded-2xl shadow-xl overflow-hidden mb-10 text-white text-center py-12 px-6">
        <h1 class="text-4xl font-black mb-4">{store.storefrontName}</h1>
        <p class="text-indigo-100 max-w-2xl mx-auto">{store.description}</p>
    </div>
    {/if}

    <div class="flex flex-col md:flex-row gap-8">
        <!-- Sidebar Kategori -->
        <div class="w-full md:w-64 flex-shrink-0">
            <h2 class="font-bold text-lg mb-4 text-slate-800">Kategori Produk</h2>
            <div class="space-y-2">
                <button 
                    on:click={() => selectedCategory = 'all'} 
                    class="block w-full text-left px-3 py-2 rounded-lg text-sm transition {selectedCategory === 'all' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}">
                    Semua Kategori
                </button>
                {#each categories as cat}
                <button 
                    on:click={() => selectedCategory = cat.id} 
                    class="block w-full text-left px-3 py-2 rounded-lg text-sm transition {selectedCategory === cat.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}">
                    {cat.namaKategori}
                </button>
                {/each}
            </div>
        </div>

        <!-- Product Grid -->
        <div class="flex-1">
            <h2 class="font-bold text-lg mb-4 text-slate-800">
                {selectedCategory === 'all' ? 'Semua Produk' : categories.find(c => c.id === selectedCategory)?.namaKategori}
            </h2>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each filteredProducts as product}
                    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition">
                        <div class="aspect-w-1 aspect-h-1 bg-slate-100 w-full h-48 relative">
                            {#if product.foto}
                                <img src={product.foto} alt={product.nama} class="w-full h-full object-cover" />
                            {:else}
                                <div class="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                            {/if}
                            {#if product.stok <= 0}
                                <div class="absolute inset-0 bg-white/70 flex items-center justify-center">
                                    <span class="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Habis</span>
                                </div>
                            {/if}
                        </div>
                        <div class="p-4 flex flex-col flex-1">
                            <p class="text-xs text-indigo-600 font-bold mb-1">{product.kategori?.namaKategori || 'Umum'}</p>
                            <h3 class="font-bold text-slate-900 leading-tight mb-2 flex-1">{product.nama}</h3>
                            <div class="flex items-end justify-between mt-4">
                                <span class="font-black text-lg text-slate-900">{rp(product.hargaJual)}</span>
                                <button 
                                    disabled={product.stok <= 0}
                                    on:click={() => addToCart(product)}
                                    class="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}

                {#if filteredProducts.length === 0}
                    <div class="col-span-full py-12 text-center text-slate-500">
                        Tidak ada produk dalam kategori ini.
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
