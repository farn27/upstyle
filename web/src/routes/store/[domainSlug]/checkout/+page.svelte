<script>
    import { cart } from '../../cartStore';
    import { enhance } from '$app/forms';

    export let data;
    const { store } = data; // from +layout.server.js

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

    $: totalItems = $cart.reduce((acc, curr) => acc + curr.qty, 0);
    $: totalAmount = $cart.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);

    let isSubmitting = false;
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-black text-slate-900 mb-8">Checkout Pesanan</h1>

    {#if totalItems === 0}
        <div class="bg-white p-12 text-center rounded-2xl shadow-sm border border-slate-200">
            <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            <h2 class="text-xl font-bold text-slate-700 mb-2">Keranjang Anda Kosong</h2>
            <p class="text-slate-500 mb-6">Silakan pilih produk terlebih dahulu sebelum melakukan checkout.</p>
            <a href={`/store/${data.domainSlug}`} class="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Kembali Belanja
            </a>
        </div>
    {:else}
        <div class="flex flex-col md:flex-row gap-8">
            <!-- Form Pengiriman -->
            <div class="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 class="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Informasi Pengiriman</h2>
                
                <form method="POST" action="?/placeOrder" class="space-y-4" use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'success') {
                            cart.clear();
                            // the server will redirect to a success page
                        }
                        update();
                    };
                }}>
                    <!-- Data Keranjang (Hidden) -->
                    <input type="hidden" name="cartData" value={JSON.stringify($cart)} />
                    <input type="hidden" name="totalAmount" value={totalAmount} />
                    <input type="hidden" name="unitId" value={store.unitId} />

                    <div>
                        <label for="customerName" class="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                        <input id="customerName" type="text" name="customerName" required class="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Budi Santoso">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="customerEmail" class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input id="customerEmail" type="email" name="customerEmail" required class="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="budi@email.com">
                        </div>
                        <div>
                            <label for="customerPhone" class="block text-sm font-medium text-slate-700 mb-1">No. WhatsApp</label>
                            <input id="customerPhone" type="text" name="customerPhone" required class="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="08123456789">
                        </div>
                    </div>
                    <div>
                        <label for="shippingAddress" class="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap Pengiriman</label>
                        <textarea id="shippingAddress" name="shippingAddress" rows="3" required class="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Jl. Sudirman No. 123..."></textarea>
                    </div>

                    <div class="pt-6 mt-6 border-t border-slate-100">
                        <button type="submit" disabled={isSubmitting} class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {isSubmitting ? 'Memproses...' : 'Buat Pesanan & Bayar'}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Ringkasan Pesanan -->
            <div class="w-full md:w-80">
                <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">Ringkasan</h2>
                    
                    <ul class="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                        {#each $cart as item}
                            <li class="flex items-start justify-between gap-2">
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                                    <p class="text-xs text-slate-500">{item.qty} x {rp(item.price)}</p>
                                </div>
                                <div class="text-sm font-bold text-slate-900">
                                    {rp(item.qty * item.price)}
                                </div>
                            </li>
                        {/each}
                    </ul>

                    <div class="border-t border-slate-200 pt-4 space-y-2">
                        <div class="flex justify-between text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span>{rp(totalAmount)}</span>
                        </div>
                        <div class="flex justify-between text-sm text-slate-600">
                            <span>Ongkos Kirim</span>
                            <span>Menyusul</span>
                        </div>
                        <div class="flex justify-between text-base font-black text-slate-900 mt-4 pt-4 border-t border-slate-200">
                            <span>Total Tagihan</span>
                            <span>{rp(totalAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
