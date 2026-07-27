<script>
  import { fade } from 'svelte/transition';
  export let data;

  $: ({ units, user } = data);
  $: entitasUtama = units.filter(u => !u.cabangDari);
  
  let kataKunci = "";
  $: entitasTerfilter = entitasUtama.filter(u => 
    u.namaUnit.toLowerCase().includes(kataKunci.toLowerCase())
  );

  let tampilModal = false;
  let indukTerpilih = null;
  let daftarCabang = [];

  function tanganiKlikUnit(unit, event) {
    const cabangDitemukan = units.filter(u => u.cabangDari === unit.id);
    if (cabangDitemukan.length > 0) {
      event.preventDefault(); 
      indukTerpilih = unit;
      daftarCabang = cabangDitemukan;
      tampilModal = true;
    }
  }
</script>

<div class="max-w-7xl mx-auto space-y-6 py-4 px-4 mt-6" in:fade>
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
    <div class="flex items-center gap-6">
      <div>
        <div class="flex items-center gap-2 mb-0.5">
          <div class="w-1 h-3 bg-indigo-600 rounded-full"></div>
          <h2 class="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">Sistem Penjualan</h2>
        </div>
        <p class="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Pilih Unit Bisnis</p>
      </div>
    </div>
  </div>

  <div class="flex items-center justify-between">
    <div class="hidden lg:flex items-center gap-8">
      <div class="flex flex-col">
        <span class="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unit Aktif</span>
        <p class="text-xs font-black text-slate-700 dark:text-slate-200 leading-none">{units.length} <span class="text-emerald-500 ml-0.5">●</span></p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <input 
        bind:value={kataKunci}
        type="text" 
        placeholder="CARI UNIT..." 
        class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-[9px] font-bold uppercase outline-none focus:bg-white dark:bg-slate-800 focus:border-indigo-500 w-60 h-10 transition-all"
      />
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
    {#each entitasTerfilter as unit}
      {@const punyaCabang = units.some(u => u.cabangDari === unit.id)}
      
      <a 
        id="unit-{unit.id}" 
        href={`/ecommerce/${unit.slug}/sales`} 
        on:click={(e) => tanganiKlikUnit(unit, e)}
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-4 transition-all flex flex-col justify-between relative group hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md"
      >
        <div class="space-y-4">
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center text-white font-black text-sm group-hover:bg-indigo-600 transition-colors">
              {unit.namaUnit.charAt(0).toUpperCase()}
            </div>
            <div class="text-right">
              <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter block">{unit.kategori || 'STANDAR'}</span>
              {#if punyaCabang}
                <span class="text-[7px] text-indigo-600 font-black uppercase tracking-tighter">Multi-Cabang</span>
              {/if}
            </div>
          </div>

          <div>
            <h3 class="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight group-hover:text-indigo-600 transition-colors truncate">
              {unit.namaUnit}
            </h3>
            <div class="flex items-center gap-1.5 mt-1">
              <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
              <p class="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none">Status: Aktif</p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
          <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID: #{unit.id}</span>
          <div class="flex items-center gap-1 text-slate-300 group-hover:text-indigo-600 transition-colors">
            <span class="text-[8px] font-black uppercase">Buka Sales</span>
            <svg class="w-3 h-3 transform group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path d="M9 5l7 7-7 7"/></svg>
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>

{#if tampilModal}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80" transition:fade={{duration: 70}}>
    <div class="bg-white dark:bg-slate-800 w-full max-w-sm rounded-md shadow-lg border border-slate-200 dark:border-slate-700">
      <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
        <p class="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{indukTerpilih.namaUnit}</p>
        <button on:click={() => tampilModal = false} class="text-slate-400 dark:text-slate-500 hover:text-rose-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="p-4 space-y-3">
        <div class="space-y-1">
          <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Akses Utama</p>
          <a href={`/ecommerce/${indukTerpilih.slug}/sales`} class="flex items-center justify-between p-3 bg-slate-900 text-white rounded-md hover:bg-black transition-colors">
            <span class="text-[10px] font-bold uppercase">Kantor Pusat</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
          </a>
        </div>
        
        <div class="pt-2">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cabang</span>
            <div class="h-[1px] flex-grow bg-slate-100 dark:bg-slate-800/80"></div>
          </div>

          <div class="max-h-[220px] overflow-y-auto space-y-1 pr-1 custom-scroll">
            {#each daftarCabang as cabang}
              <a href={`/ecommerce/${cabang.slug}/sales`} class="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all group">
                <span class="text-[10px] font-bold uppercase group-hover:text-indigo-600">{cabang.namaUnit}</span>
                <svg class="w-3 h-3 text-slate-300 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path d="M9 5l7 7-7 7"/></svg>
              </a>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .custom-scroll::-webkit-scrollbar { width: 3px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>
