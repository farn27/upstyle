<script>
    export let data;

    function formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(angka || 0);
    }
</script>

<div class="p-6 md:p-8">
    <header class="mb-8">
        <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Dashboard POS</h1>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Ringkasan Operasional Hari Ini</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Sales Today -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Penjualan Hari Ini</h3>
            <p class="text-3xl font-black text-slate-900">{formatRupiah(data.stats?.totalSalesToday)}</p>
        </div>

        <!-- Orders Today -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Transaksi</h3>
            <p class="text-3xl font-black text-slate-900">{data.stats?.orderCountToday || 0}</p>
        </div>

        <!-- Active Shifts -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Shift Aktif</h3>
            <p class="text-3xl font-black text-slate-900">{data.stats?.activeShiftsCount || 0}</p>
        </div>
    </div>

    <div class="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
        <div class="p-3 bg-blue-500 text-white rounded-xl shadow-md">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
            <h4 class="text-sm font-black text-blue-900 uppercase tracking-wide">Pusat Manajemen POS</h4>
            <p class="text-xs font-medium text-blue-700 mt-1 leading-relaxed max-w-2xl">
                Gunakan menu di sebelah kiri untuk mengelola produk yang tampil di aplikasi kasir, serta mengatur kode promo yang dapat digunakan oleh pelanggan saat bertransaksi di outlet Anda.
            </p>
        </div>
    </div>
</div>
