<script>
    /** @type {{ hpp: number, hargaJual: number, onCalculate: (v: number) => void }} */
    let { hpp = 0, hargaJual = 0, onCalculate = () => {} } = $props();

    let open = $state(false);
    let metode = $state('markup');
    let markupPersen = $state(25);
    let marginPersen = $state(20);
    let hasil = $state(0);
    let laba = $state(0);

    $effect(() => {
        if (metode === 'markup' && hpp > 0 && markupPersen > 0) {
            hasil = Math.round(hpp + (hpp * markupPersen / 100));
            laba = hasil - hpp;
        } else if (metode === 'margin' && hpp > 0 && marginPersen > 0) {
            const denom = 1 - marginPersen / 100;
            hasil = denom > 0 ? Math.round(hpp / denom) : 0;
            laba = hasil - hpp;
        } else {
            hasil = 0;
            laba = 0;
        }
    });

    function terapkan() {
        if (hasil > 0) {
            onCalculate(hasil);
        }
        open = false;
    }

    function tutup() {
        open = false;
    }

    function fastMarkup(persen) {
        metode = 'markup';
        markupPersen = persen;
    }
</script>

<div class="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white overflow-hidden transition-all {open ? 'shadow-md' : 'shadow-sm'}">
    <button type="button" onclick={() => open = !open}
        class="w-full flex items-center gap-2.5 px-5 py-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 transition-all {open ? 'bg-indigo-100/30 border-b border-indigo-100 dark:border-indigo-800/50' : ''}">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">Rp</div>
        <div class="text-left">
            <p class="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Kalkulator Harga Jual</p>
            {#if !open}
                <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">Hitung otomatis markup / margin dari HPP</p>
            {/if}
        </div>
        <svg class="w-4 h-4 ml-auto text-indigo-400 transition-transform {open ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
    </button>

    {#if open}
        <div class="p-5 space-y-4">
            <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">HPP / Modal</span>
                <span class="text-sm font-black text-slate-900 dark:text-white">Rp {Number(hpp || 0).toLocaleString('id-ID')}</span>
            </div>

            <div class="flex gap-2">
                {#each ['markup', 'margin'] as m}
                    <button type="button" onclick={() => metode = m}
                        class="flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all {metode === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}">
                        {m === 'markup' ? 'Markup %' : 'Margin %'}
                    </button>
                {/each}
            {#if metode === 'markup'}
                <div>
                    <label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Cepat Pilih Markup</label>
                    <div class="flex gap-1.5 flex-wrap">
                        {#each [10, 15, 20, 25, 30, 40, 50, 75] as p}
                            <button type="button" onclick={() => fastMarkup(p)}
                                class="px-3 py-1.5 rounded-md text-xs font-bold border transition-all {markupPersen === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}">{p}%</button>
                        {/each}
                    </div>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Markup</label>
                        <span class="text-xs font-black text-indigo-600">{markupPersen}%</span>
                    </div>
                    <input type="range" min="0" max="200" bind:value={markupPersen} class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <div class="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 mt-0.5"><span>0%</span><span>200%</span></div>
                </div>
            {/if}

            {#if metode === 'margin'}
                <div>
                    <label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Cepat Pilih Margin</label>
                    <div class="flex gap-1.5 flex-wrap">
                        {#each [5, 10, 15, 20, 25, 30, 40, 50] as p}
                            <button type="button" onclick={() => { metode = 'margin'; marginPersen = p; }}
                                class="px-3 py-1.5 rounded-md text-xs font-bold border transition-all {marginPersen === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'}">{p}%</button>
                        {/each}
                    </div>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Margin</label>
                        <span class="text-xs font-black text-emerald-600">{marginPersen}%</span>
                    </div>
                    <input type="range" min="0" max="80" bind:value={marginPersen} class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                    <div class="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 mt-0.5"><span>0%</span><span>80%</span></div>
                </div>
            {/if}
            </div>

            <!-- Result Card -->
            <div class="p-4 rounded-xl {hasil > 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200' : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}">
                {#if hasil > 0}
                    <div class="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p class="text-[9px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Modal</p>
                            <p class="text-sm font-bold text-slate-700 dark:text-slate-200">Rp {hpp.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-emerald-600 uppercase">Laba</p>
                            <p class="text-sm font-bold text-emerald-600">Rp {laba.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-indigo-600 uppercase">Harga Jual</p>
                            <p class="text-base font-black text-indigo-700 dark:text-indigo-300">Rp {hasil.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div class="mt-2 flex justify-center">
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold {metode === 'markup' ? 'bg-indigo-100 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700'}">
                            {metode === 'markup' ? 'Markup' : 'Margin'} {metode === 'markup' ? markupPersen : marginPersen}%
                        </span>
                    </div>
                {:else}
                    <p class="text-xs text-slate-400 dark:text-slate-500 text-center py-2 font-medium">Masukkan <strong>HPP</strong> dan pilih <strong>persentase</strong> untuk melihat hasil</p>
                {/if}
            </div>

            <!-- Actions -->
            <div class="flex gap-2 justify-end pt-2">
                <button type="button" onclick={tutup}
                    class="px-5 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 rounded-lg transition-all">Batal</button>
                <button type="button" onclick={terapkan} disabled={hasil <= 0}
                    class="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                    Terapkan ke Harga Jual
                </button>
            </div>
        </div>
    {/if}
</div>
