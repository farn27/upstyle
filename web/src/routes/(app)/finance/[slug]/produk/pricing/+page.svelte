<script>
    export let data;

    const unit = data?.unit || {};
    /** @type {Array<any>} */
    const products = data?.products || [];

    let selectedProductId = 'custom';
    let selectedProduct = null;
    let lastSelectedProductId = '';
    $: isCustomProduct = selectedProductId === 'custom';

    let currency = 'IDR';
    let hpp = 0;
    let pricingMethod = 'markup';
    let markupPersen = 25;
    let marginPersen = 20;
    let overhead = 0;
    let overheadType = 'percent';
    let taxRate = 11;
    let taxMode = 'exclusive';
    let compareAt = 0;
    let discountType = 'percent';
    let discountValue = 0;
    let buyX = 1;
    let getY = 0;
    let moq = 1;
    let mov = 0;
    let floorPrice = 0;
    let selectedUom = 'pcs';
    let showAdvanced = false;
    let channelPrices = [
        { channel: 'Toko Online', price: 0 },
        { channel: 'Shopee', price: 0 },
        { channel: 'Tokopedia', price: 0 },
    ];
    let customerPrices = [
        { group: 'Retail', price: 0 },
        { group: 'Reseller', price: 0 },
    ];
    let tierPrices = [
        { min: 1, max: 10, price: 0 },
        { min: 11, max: 50, price: 0 },
        { min: 51, max: 9999, price: 0 },
    ];
    let variants = [
        { name: 'Varian A', adjust: 0 },
        { name: 'Varian B +5.000', adjust: 5000 },
    ];
    let uoms = [
        { key: 'pcs', label: 'Pcs', factor: 1 },
        { key: 'kg', label: 'Kg', factor: 1 },
        { key: 'ltr', label: 'Liter', factor: 1 },
        { key: 'hr', label: 'Jam', factor: 1 },
    ];

    $: cost = Number(hpp || 0);
    $: overheadValue = overheadType === 'percent'
        ? Math.round(cost * Number(overhead || 0) / 100)
        : Number(overhead || 0);
    $: costWithOverhead = cost + overheadValue;
    $: priceBeforeTax = pricingMethod === 'markup'
        ? Math.round(costWithOverhead + (costWithOverhead * Number(markupPersen || 0) / 100))
        : Number(marginPersen) < 100
            ? Math.round(costWithOverhead / (1 - Number(marginPersen || 0) / 100))
            : 0;
    $: finalPrice = taxMode === 'inclusive'
        ? Math.round(priceBeforeTax * (1 + Number(taxRate || 0) / 100))
        : priceBeforeTax;
    $: profit = Math.round(finalPrice - cost - overheadValue);
    $: effectiveMargin = finalPrice > 0 ? Math.round((profit / finalPrice) * 100) : 0;
    $: discountedPrice = discountType === 'percent'
        ? Math.max(0, Math.round(finalPrice * (1 - Number(discountValue || 0) / 100)))
        : Math.max(0, finalPrice - Number(discountValue || 0));
    $: floorWarning = floorPrice > 0 && finalPrice < floorPrice;
    $: uomLabel = uoms.find(u => u.key === selectedUom)?.label || selectedUom;

    $: if (selectedProductId && selectedProductId !== lastSelectedProductId) {
        if (selectedProductId === 'custom') {
            selectedProduct = null;
            hpp = 0;
            compareAt = 0;
            floorPrice = 0;
        } else {
            selectedProduct = products.find(product => product.id === selectedProductId) || null;
            hpp = selectedProduct ? Number(selectedProduct.hargaBeli || 0) : 0;
            compareAt = selectedProduct ? Number(selectedProduct.hargaJual || 0) : 0;
            floorPrice = selectedProduct ? Math.max(0, Number(selectedProduct.hargaBeli || 0) * 1.05) : 0;
        }
        lastSelectedProductId = selectedProductId;
        selectedUom = 'pcs';
    }

    /** @param {string|number|null|undefined} value */
    function formatMoney(value) {
        const number = Number(value || 0);
        if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
        if (currency === 'EUR') return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(number);
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
    }

    function addChannel() {
        channelPrices = [...channelPrices, { channel: 'Channel Baru', price: 0 }];
    }

    function addCustomerGroup() {
        customerPrices = [...customerPrices, { group: 'Group Baru', price: 0 }];
    }

    function addTier() {
        tierPrices = [...tierPrices, { min: 1, max: 1, price: 0 }];
    }

    function addVariant() {
        variants = [...variants, { name: 'Varian Baru', adjust: 0 }];
    }
    function goBack() {
        if (typeof window !== 'undefined') {
            window.history.back();
        }
    }</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-sans">
    <div class="max-w-6xl mx-auto px-3 py-4">
        <div class="flex flex-col gap-3 items-start">
            <div class="flex-1 space-y-3">
                <div class="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700  p-3">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div class="space-y-3">
                            <button type="button" on:click={goBack} class="inline-flex items-center gap-2 rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200">
                                ← Kembali
                            </button>
                            <div>
                                <p class="text-xs uppercase text-slate-400 dark:text-slate-500">Pricing Center</p>
                                <h1 class="text-xl font-semibold text-slate-900 dark:text-white mt-2">Kalkulator Harga</h1>
                                <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 max-w-2xl">Semua perhitungan harga ada di satu halaman, tanpa tampilan yang berlebihan.</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">Unit</p>
                            <p class="text-sm font-bold text-slate-800 dark:text-slate-100">{unit.nama || 'Unit Bisnis'}</p>
                        </div>
                    </div>

                    <section class="space-y-3">
                        <div class="rounded-md border border-indigo-100 dark:border-indigo-800/50 bg-slate-100 dark:bg-slate-800/80 p-3">
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <h2 class="text-base font-black text-slate-900 dark:text-white">1. Kalkulasi Dasar & Struktur Harga</h2>
                                    <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Set harga jual berdasarkan HPP, markup/margin, pajak, dan biaya overhead.</p>
                                </div>
                                <span class="text-xs uppercase tracking-[0.3em] text-indigo-600 font-black">Core Pricing</span>
                            </div>

                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
                                <label class="block">
                                    <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Produk</span>
                                    <select bind:value={selectedProductId} class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-300">
                                        <option value="custom">-- Custom / Produk Baru --</option>
                                        {#each products as product}
                                            <option value={product.id}>{product.nama} - Rp {Number(product.hargaJual || 0).toLocaleString('id-ID')}</option>
                                        {/each}
                                    </select>
                                    {#if isCustomProduct}
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Pilih mode custom untuk mengisi HPP dan harga target secara manual.</p>
                                    {/if}
                                </label>

                                <label class="block">
                                    <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Harga Modal / HPP</span>
                                    <input type="number" bind:value={hpp} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                </label>

                                <label class="block">
                                    <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Satuan Produk</span>
                                    <select bind:value={selectedUom} class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-300">
                                        {#each uoms as u}
                                            <option value={u.key}>{u.label}</option>
                                        {/each}
                                    </select>
                                </label>
                            </div>

                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
                                <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                    <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Metode</p>
                                    <div class="mt-3 flex gap-2">
                                        <button type="button" on:click={() => pricingMethod = 'markup'} class="rounded-sm px-3 py-2 text-sm font-black transition {pricingMethod === 'markup' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300'}">Markup</button>
                                        <button type="button" on:click={() => pricingMethod = 'margin'} class="rounded-sm px-3 py-2 text-sm font-black transition {pricingMethod === 'margin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300'}">Margin</button>
                                    </div>
                                    {#if pricingMethod === 'markup'}
                                        <label class="block mt-4">
                                            <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Markup (%)</span>
                                            <input type="number" bind:value={markupPersen} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                        </label>
                                    {:else}
                                        <label class="block mt-4">
                                            <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Margin (%)</span>
                                            <input type="number" bind:value={marginPersen} min="0" max="99" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                        </label>
                                    {/if}
                                </div>

                                <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                    <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Biaya Tambahan</p>
                                    <div class="grid gap-3 mt-3">
                                        <label class="block">
                                            <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Tipe Biaya</span>
                                            <select bind:value={overheadType} class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm outline-none focus:border-indigo-300">
                                                <option value="percent">Persen (%)</option>
                                                <option value="fixed">Nominal</option>
                                            </select>
                                        </label>
                                        <label class="block">
                                            <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Biaya Overhead</span>
                                            <input type="number" bind:value={overhead} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-sm outline-none focus:border-indigo-300" />
                                        </label>
                                        <label class="block">
                                            <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">PPN</span>
                                            <div class="mt-2 flex gap-2">
                                                <select bind:value={taxMode} class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm outline-none focus:border-indigo-300 flex-1">
                                                    <option value="exclusive">Exclusive</option>
                                                    <option value="inclusive">Inclusive</option>
                                                </select>
                                                <input type="number" bind:value={taxRate} min="0" class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-sm outline-none focus:border-indigo-300 w-24" />
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                    <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Target Price</p>
                                    <div class="mt-3 space-y-3">
                                        <div class="rounded-sm bg-slate-50 dark:bg-slate-900 p-3">
                                            <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Harga Final</p>
                                            <p class="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatMoney(finalPrice)}</p>
                                            <p class="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Laba: {formatMoney(profit)} • Margin efektif: {effectiveMargin}%</p>
                                        </div>
                                        <div class="rounded-sm bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700">
                                            <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Harga Coret</p>
                                            <input type="number" bind:value={compareAt} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-300" placeholder="Harga normal" />
                                        </div>
                                        {#if floorWarning}
                                            <div class="rounded-sm bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 text-rose-700 text-sm font-bold">PERINGATAN: Harga final di bawah floor price.</div>
                                        {/if}
                                        <label class="block">
                                            <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Floor Price</span>
                                            <input type="number" bind:value={floorPrice} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-sm outline-none focus:border-indigo-300" placeholder="Harga minimum" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
                            <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                <h3 class="text-sm font-black text-slate-900 dark:text-white">Diskon & Strategi Penjualan</h3>
                                <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Kelola diskon, MOQ, dan harga compare-at.</p>
                                <div class="grid gap-3 mt-4">
                                    <label class="block">
                                        <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Tipe Diskon</span>
                                        <select bind:value={discountType} class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-300">
                                            <option value="percent">Persen (%)</option>
                                            <option value="nominal">Nominal Rp</option>
                                            <option value="bogo">Buy X Get Y</option>
                                        </select>
                                    </label>
                                    {#if discountType === 'bogo'}
                                        <div class="grid grid-cols-2 gap-2">
                                            <label class="block">
                                                <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Beli X</span>
                                                <input type="number" bind:value={buyX} min="1" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                            </label>
                                            <label class="block">
                                                <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Dapat Y</span>
                                                <input type="number" bind:value={getY} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                            </label>
                                        </div>
                                    {:else}
                                        <label class="block">
                                            <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Nilai Diskon</span>
                                            <input type="number" bind:value={discountValue} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                        </label>
                                    {/if}
                                    <label class="block">
                                        <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">MOQ</span>
                                        <input type="number" bind:value={moq} min="1" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                    </label>
                                    <label class="block">
                                        <span class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Minimum Order Value</span>
                                        <input type="number" bind:value={mov} min="0" class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                                    </label>
                                </div>
                                <div class="mt-4 rounded-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3">
                                    <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Harga setelah diskon</p>
                                    <p class="mt-2 text-xl font-black text-slate-900 dark:text-white">{formatMoney(discountedPrice)}</p>
                                    {#if discountType === 'bogo'}
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Beli {buyX} gratis {getY} untuk strategi promosi.</p>
                                    {:else}
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Diskon {discountType === 'percent' ? `${discountValue}%` : formatMoney(discountValue)}.</p>
                                    {/if}
                                </div>
                            </div>

                            <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                <div class="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 class="text-sm font-black text-slate-900 dark:text-white">Variasi & Product Flexibility</h3>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Harga varian, tier pricing, dan satuan produk.</p>
                                    </div>
                                    <button type="button" on:click={() => showAdvanced = !showAdvanced} class="text-xs font-semibold text-indigo-600">
                                        {showAdvanced ? 'Sembunyikan opsi lanjutan' : 'Tampilkan opsi lanjutan'}
                                    </button>
                                </div>
                                {#if showAdvanced}
                                    <div class="space-y-3 mt-4">
                                        <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                            <p class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">Unit Harga ({uomLabel})</p>
                                            <div class="grid grid-cols-2 gap-3">
                                                <label class="block">
                                                    <span class="text-[10px] uppercase text-slate-400 dark:text-slate-500">Konversi</span>
                                                    <select bind:value={selectedUom} class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-300">
                                                        {#each uoms as u}
                                                            <option value={u.key}>{u.label}</option>
                                                        {/each}
                                                    </select>
                                                </label>
                                            </div>
                                        </div>
                                        <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                            <div class="flex items-center justify-between mb-3">
                                                <p class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Harga Varian</p>
                                                <button type="button" on:click={addVariant} class="text-xs font-bold text-indigo-600">+ Tambah</button>
                                            </div>
                                            <div class="space-y-3">
                                                {#each variants as variant, index}
                                                    <div class="grid grid-cols-3 gap-2">
                                                        <input type="text" bind:value={variant.name} class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none" />
                                                        <div>
                                                            <span class="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Ajust</span>
                                                            <input type="number" bind:value={variant.adjust} class="mt-2 w-full rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none" />
                                                        </div>
                                                        <div class="flex items-end justify-end">
                                                            <span class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatMoney(finalPrice + Number(variant.adjust || 0))}</span>
                                                        </div>
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                        <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                            <div class="flex items-center justify-between mb-3">
                                                <p class="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Tier Pricing</p>
                                                <button type="button" on:click={addTier} class="text-xs font-bold text-indigo-600">+ Tambah</button>
                                            </div>
                                            <div class="space-y-3">
                                                {#each tierPrices as tier, ti}
                                                    <div class="grid grid-cols-3 gap-2 items-end">
                                                        <input type="number" bind:value={tier.min} min="1" class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none" placeholder="1" />
                                                        <input type="number" bind:value={tier.max} min={tier.min} class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none" placeholder="10" />
                                                        <input type="number" bind:value={tier.price} min="0" class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none" placeholder="Harga" />
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <aside class="w-full xl:w-[360px] space-y-3">
                <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Ringkasan Harga</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Final price, margin, diskon, dan floor price dalam satu tampilan ringkas.</p>
                    <div class="grid gap-3 mt-4">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Harga Final</p>
                                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(finalPrice)}</p>
                            </div>
                            <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Harga Diskon</p>
                                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(discountedPrice)}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Margin Efektif</p>
                                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{effectiveMargin}%</p>
                            </div>
                            <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Laba</p>
                                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(profit)}</p>
                            </div>
                        </div>
                        <div class="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Floor Price</p>
                            <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(floorPrice || 0)}</p>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </div>
</div>
