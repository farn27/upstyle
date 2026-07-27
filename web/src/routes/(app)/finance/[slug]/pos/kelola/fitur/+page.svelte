<script>
    import { enhance } from '$app/forms';
    export let data;

    let overrides = { ...data.activeFeatures };

    const featureGroups = [
        {
            title: "1. Modul Industri Dasar",
            description: "Modul-modul dasar yang disesuaikan dengan jenis industri Anda.",
            features: [
                { key: 'posEnabled', label: 'Modul POS Aktif', description: 'Aktifkan jika unit bisnis ini butuh kasir harian.' },
                { key: 'tableManagement', label: 'Manajemen Meja', description: 'Untuk F&B/Resto. Pilih meja dan pisahkan pesanan per meja.' },
                { key: 'kitchenDisplay', label: 'Tampilan Dapur / Antrean', description: 'Hub antrean untuk melihat dan mengelola pesanan yang sedang diproses.' },
                { key: 'appointmentBooking', label: 'Sistem Booking/Reservasi', description: 'Untuk Klinik/Salon. Atur slot waktu kedatangan pelanggan.' },
                { key: 'workOrderTracking', label: 'Pelacakan Pengerjaan (Work Order)', description: 'Untuk Bengkel/Jasa. Lacak status pengerjaan jasa yang sedang berjalan.' }
            ]
        },
        {
            title: "2. Pengaturan Checkout & Pembayaran",
            description: "Kustomisasi bagaimana transaksi dan pembayaran diproses.",
            features: [
                { key: 'splitPayment', label: 'Multi-Metode Pembayaran (Split Payment)', description: 'Izinkan pembayaran kombinasi (misal: Tunai & QRIS sekaligus).' },
                { key: 'manualDiscount', label: 'Diskon Bebas (Manual)', description: 'Izinkan kasir memasukkan nominal diskon bebas saat transaksi.' },
                { key: 'openPrice', label: 'Ubah Harga (Open Price)', description: 'Izinkan kasir meng-override (mengubah) harga jual produk.' },
                { key: 'autoCalcChange', label: 'Hitung Kembalian Otomatis', description: 'Tampilkan modal kalkulator kembalian otomatis saat bayar tunai.' },
                { key: 'autoPrintReceipt', label: 'Otomatis Cetak Struk', description: 'Langsung panggil jendela cetak struk ketika transaksi sukses.' }
            ]
        },
        {
            title: "3. Keamanan & Manajemen Kas",
            description: "Pengaturan pengawasan laci uang dan operasional kasir.",
            features: [
                { key: 'mandatoryShiftClose', label: 'Wajib Tutup Shift', description: 'Wajibkan rekonsiliasi kas (hitung uang) di akhir jam kerja.' },
                { key: 'preventNegativeCash', label: 'Cegah Laci Kas Minus', description: 'Tolak Cash Out jika melebihi pencatatan kas sistem.' },
                { key: 'requirePinForVoid', label: 'Wajib PIN untuk Void/Retur', description: 'Memerlukan otorisasi PIN saat melakukan retur transaksi.' }
            ]
        },
        {
            title: "4. Tampilan UI & Preferensi",
            description: "Penyesuaian antarmuka POS.",
            features: [
                { key: 'barcodeScanner', label: 'Fitur Barcode Scanner', description: 'Gunakan scanner untuk mencari barang dengan cepat.' },
                { key: 'autoFocusScanner', label: 'Auto-Focus Barcode', description: 'Selalu fokuskan kursor di kolom pencarian agar scanner siap sedia.' },
                { key: 'showStock', label: 'Tampilkan Sisa Stok', description: 'Tampilkan indikator kuantitas stok di atas produk.' },
                { key: 'lowStockAlert', label: 'Peringatan Stok Tipis', description: 'Tandai produk yang sisa stoknya menipis.' }
            ]
        }
    ];

    $: isModified = Object.keys(overrides).some(key => overrides[key] !== data.activeFeatures[key]);
</script>

<div class="p-6 max-w-4xl mx-auto">
    <div class="mb-8">
        <h1 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Kustomisasi Fitur POS</h1>
        <p class="text-slate-500 text-sm">Unit bisnis ini berkategori <span class="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{data.category}</span>.</p>
    </div>

    <form method="POST" action="?/updateFeatures" use:enhance class="space-y-10">
        {#each featureGroups as group}
            <div>
                <div class="mb-4">
                    <h2 class="text-lg font-black text-slate-800 dark:text-slate-100">{group.title}</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
                </div>
                
                <div class="grid gap-4 md:grid-cols-2">
                    {#each group.features as feature}
                        {@const isOverridden = Object.keys(data.overrideObj).includes(feature.key) && data.overrideObj[feature.key] !== data.defaultFeatures[feature.key]}
                        <div class="bg-white dark:bg-slate-800 border {isOverridden ? 'border-orange-200 shadow-orange-100/50' : 'border-slate-200 dark:border-slate-700'} p-5 rounded-2xl flex items-start gap-4 justify-between transition-all hover:shadow-md">
                            <div class="flex-1">
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">{feature.label}</h3>
                                    {#if isOverridden}
                                        <span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-100 text-orange-600 uppercase tracking-wider">Manual</span>
                                    {:else}
                                        <span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-400 uppercase tracking-wider">Default</span>
                                    {/if}
                                </div>
                                <p class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{feature.description}</p>
                            </div>
                            
                            <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                <input type="checkbox" name={feature.key} value="true" class="sr-only peer" bind:checked={overrides[feature.key]}>
                                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}

        <div class="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
            <button type="submit" formaction="?/resetDefaults" class="text-sm font-bold text-red-500 hover:text-red-600 underline">
                Reset ke Default Kategori
            </button>
            
            <button type="submit" disabled={!isModified} class="px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all {isModified ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}">
                Simpan Perubahan
            </button>
        </div>
    </form>
</div>
