<script>
    import { page } from '$app/stores';
    $: orderNumber = $page.url.searchParams.get('order');
</script>

<div class="max-w-3xl mx-auto px-4 py-16 text-center">
    <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
    </div>
    
    <h1 class="text-4xl font-black text-slate-900 mb-4">Pesanan Berhasil!</h1>
    <p class="text-slate-600 text-lg mb-8">Terima kasih telah berbelanja. Nomor pesanan Anda adalah <strong class="text-slate-900">{orderNumber}</strong>.</p>
    
    <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-left max-w-lg mx-auto mb-8">
        <h3 class="font-bold text-indigo-900 mb-2">Langkah Selanjutnya:</h3>
        <p class="text-indigo-800 text-sm">Pesanan Anda sedang kami proses. Admin toko akan segera menghubungi Anda melalui nomor WhatsApp yang diberikan untuk konfirmasi pembayaran dan pengiriman.</p>
    </div>

    <a href={`/store/${$page.params.domainSlug}`} class="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-bold rounded-lg shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
        Kembali ke Toko
    </a>
</div>
