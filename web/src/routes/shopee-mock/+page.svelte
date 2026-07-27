<script>
    import { page } from '$app/stores';
    
    $: redirectUrl = $page.url.searchParams.get('redirect') || '';
    
    let shopId = '88997766'; // Mock Shop ID
    
    function authorize() {
        if (!redirectUrl) {
            alert('Redirect URL tidak ditemukan!');
            return;
        }
        
        // Buat mock authorization code
        const code = 'mock_auth_code_' + Math.random().toString(36).substring(7);
        
        // Redirect kembali ke callback dengan code dan shop_id
        const finalUrl = new URL(redirectUrl);
        finalUrl.searchParams.append('code', code);
        finalUrl.searchParams.append('shop_id', shopId);
        
        window.location.href = finalUrl.toString();
    }
</script>

<div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div class="bg-orange-500 p-6 text-center">
            <h1 class="text-white font-black text-2xl tracking-wide">SHOPEE OPEN PLATFORM</h1>
            <p class="text-orange-100 text-xs mt-1">(Simulator / Sandbox Mode)</p>
        </div>
        
        <div class="p-6 space-y-6">
            <div class="text-center">
                <p class="text-slate-600 text-sm">Aplikasi <strong class="text-slate-800">Bizgrow / Upstyle</strong> meminta akses ke toko Shopee Anda.</p>
            </div>
            
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Simulasi Shop ID</label>
                <input type="text" bind:value={shopId} class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-500 transition" />
                <p class="text-[10px] text-slate-400 mt-1">Ubah jika ingin mensimulasikan toko berbeda.</p>
            </div>
            
            <div class="space-y-3">
                <button on:click={authorize} class="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition shadow-md shadow-orange-500/20">
                    Beri Otorisasi Akses
                </button>
                
                <a href="/" class="block text-center w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition">
                    Batalkan
                </a>
            </div>
        </div>
    </div>
</div>
