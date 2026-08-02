<script>
    import { page } from '$app/stores';
    import { cart } from '../cartStore';
    export let data;
    
    $: store = data.store;
    $: totalItems = $cart.reduce((acc, curr) => acc + curr.qty, 0);
</script>

<div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <!-- Navbar -->
    <nav class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex-shrink-0 flex items-center gap-2 sm:gap-3">
                    {#if store.logoUrl}
                        <img class="h-7 sm:h-8 w-auto rounded" src={store.logoUrl} alt={store.storefrontName}>
                    {:else}
                        <div class="h-7 sm:h-8 w-7 sm:w-8 bg-indigo-600 rounded text-white flex items-center justify-center font-bold text-sm sm:text-lg">
                            {store.storefrontName.charAt(0)}
                        </div>
                    {/if}
                    <a href={`/store/${data.domainSlug}`} class="font-black text-lg sm:text-xl tracking-tight hover:text-indigo-600 transition">
                        {store.storefrontName}
                    </a>
                </div>
                
                <div class="flex items-center gap-2 sm:gap-4">
                    <a href={`/store/${data.domainSlug}/checkout`} class="relative p-2 text-slate-600 hover:text-indigo-600 transition">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        {#if totalItems > 0}
                            <span class="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">{totalItems}</span>
                        {/if}
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main>
        <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 mt-12">
        <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
            <p class="text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} {store.storefrontName}. All rights reserved.
            </p>
            <p class="text-slate-400 text-xs mt-2">
                Powered by Bizgrow
            </p>
        </div>
    </footer>
</div>
