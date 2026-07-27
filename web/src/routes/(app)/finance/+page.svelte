<script>
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { 
    Search, 
    Plus, 
    ChevronRight, 
    X,
    Building2,
    Activity,
    ShoppingBag,
    HelpCircle,
    Building,
    Layers,
    ExternalLink,
    Laptop,
    Briefcase
  } from 'lucide-svelte';
  
  export let data;

  $: ({ units, statsGlobal, user } = data);
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

  $: idSorotan = $page.url.searchParams.get('sorot');

  onMount(() => {
    if (idSorotan) {
      const elemen = document.getElementById(`unit-${idSorotan}`);
      if (elemen) {
        setTimeout(() => {
          elemen.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('sorot');
        window.history.replaceState({}, '', url);
      }, 3000);
    }
  });

  function getUnitIcon(category) {
    const cat = (category || '').toUpperCase();
    if (cat.includes('HEALTH') || cat.includes('KLINIK') || cat.includes('MEDIS')) {
      return Activity;
    }
    if (cat.includes('TECH') || cat.includes('MEDIA') || cat.includes('DEV') || cat.includes('ONLINE')) {
      return Laptop;
    }
    if (cat.includes('RETAIL') || cat.includes('KASIR') || cat.includes('TOKO') || cat.includes('MART')) {
      return ShoppingBag;
    }
    if (cat.includes('FINANCE') || cat.includes('INVEST')) {
      return Briefcase;
    }
    return Building;
  }
</script>

<div class="max-w-7xl mx-auto space-y-4 py-3 px-4 md:px-8 mt-2 font-sans text-slate-800 dark:text-slate-100">
  
  <!-- Ultra-Compact Single-Row Header (Vercel Style) -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-150 dark:border-slate-800/80">
    <!-- Left side: Title & dynamic tags inline -->
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Struktur Bisnis</h1>
      
      <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[9px] font-black uppercase tracking-wider text-slate-450 shrink-0">
        {units.length} Unit
      </span>
      
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 rounded text-[8px] font-bold text-emerald-650 dark:text-emerald-400 uppercase shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Optimal
      </span>
    </div>

    <!-- Right side: Search & Add actions inline -->
    <div class="flex items-center gap-2 w-full md:w-auto">
      <div class="relative flex-1 md:flex-initial">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input 
          bind:value={kataKunci}
          type="text" 
          placeholder="Cari..." 
          class="w-full md:w-44 pl-8 pr-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-lg text-xs font-semibold focus:outline-none focus:border-slate-900 focus:bg-white transition-all uppercase placeholder:normal-case placeholder:font-medium h-8"
        />
      </div>
      
      <a href="/finance/create" class="bg-slate-900 hover:bg-black text-white px-3.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm h-8 shrink-0">
        <Plus class="w-3.5 h-3.5" />
        <span>Unit Baru</span>
      </a>
    </div>
  </div>

  <!-- Business Units Grid (Instantly pulled up close to header) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
    {#each entitasTerfilter as unit}
      {@const punyaCabang = units.some(u => u.cabangDari === unit.id)}
      
      <a 
        id="unit-{unit.id}" 
        href={`/finance/${unit.slug}`} 
        on:click={(e) => tanganiKlikUnit(unit, e)}
        class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4.5 transition-all flex flex-col justify-between relative group hover:border-slate-350 hover:shadow-sm hover:-translate-y-0.5 {idSorotan == unit.id ? 'animate-flash-biru' : ''}"
      >
        <div class="space-y-3.5">
          <div class="flex justify-between items-start">
            <!-- Modern Slate Icon Box -->
            <div class="w-8 h-8 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-350 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
              <svelte:component this={getUnitIcon(unit.kategori)} class="w-4 h-4" />
            </div>
            
            <div class="text-right space-y-1">
              <span class="text-[8px] font-mono font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block leading-none">
                {unit.kategori || 'STANDAR'}
              </span>
              {#if punyaCabang}
                <span class="inline-block px-1.5 py-0.5 bg-slate-50 dark:bg-slate-955 text-slate-500 dark:text-slate-400 rounded text-[7px] font-black uppercase tracking-wider border border-slate-200/60 leading-none">
                  Cabang
                </span>
              {/if}
            </div>
          </div>

          <div>
            <h3 class="text-xs font-black text-slate-850 dark:text-white uppercase tracking-tight group-hover:text-slate-900 transition-colors truncate">
              {unit.namaUnit}
            </h3>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p class="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">Aktif</p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-2 border-t border-slate-50 dark:border-slate-850 flex justify-between items-center">
          <span class="text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">ID: #{unit.idCustom || unit.id}</span>
          <div class="flex items-center gap-0.5 text-slate-400 group-hover:text-slate-800 transition-colors">
            <span class="text-[8px] font-black uppercase tracking-widest">Masuk</span>
            <ChevronRight class="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>

<!-- Modal (Branch selection popup) -->
{#if tampilModal}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" transition:fade={{duration: 100}}> 
    <div class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-xl border border-slate-150 dark:border-slate-800 overflow-hidden">
        
        <div class="p-4 border-b border-slate-50 dark:border-slate-855 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
            <div class="space-y-0.5">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Akses Cabang</span>
                <p class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{indukTerpilih.namaUnit}</p>
            </div>
            <button on:click={() => tampilModal = false} class="p-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-450 hover:text-rose-600 hover:border-rose-200 transition-all">
                <X class="w-4 h-4" />
            </button>
        </div>

        <div class="p-5 space-y-4">
            <div class="space-y-1.5">
                <p class="text-[8px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">Akses Utama</p>
                <a href={`/finance/${indukTerpilih.slug}`} class="flex items-center justify-between p-3 bg-slate-900 hover:bg-black text-white rounded-lg shadow transition-all group">
                    <span class="text-[10px] font-black uppercase tracking-wider">Kantor Pusat</span>
                    <ExternalLink class="w-3.5 h-3.5 text-white" />
                </a>
            </div>
            
            <div class="pt-1.5 space-y-2">
                <div class="flex items-center gap-2">
                    <span class="text-[8px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1"><Layers class="w-3.5 h-3.5" /> Daftar Cabang</span>
                    <div class="h-[1px] flex-grow bg-slate-100 dark:bg-slate-800"></div>
                </div>

                <div class="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scroll">
                    {#each daftarCabang as cabang}
                        <a href={`/finance/${cabang.slug}`} class="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/80 rounded-lg text-slate-700 dark:text-slate-200 hover:border-slate-350 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-900 transition-all group">
                            <span class="text-[10px] font-black uppercase tracking-wider group-hover:text-slate-900">{cabang.namaUnit}</span>
                            <ChevronRight class="w-4 h-4 text-slate-350 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                        </a>
                    {/each}
                </div>
            </div>
        </div>
        
        <div class="p-3.5 bg-slate-50 dark:bg-slate-955 border-t border-slate-50 dark:border-slate-850 text-center">
            <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest tracking-[0.2em]">ERP BIZGROW SYSTEM</p>
        </div>
    </div>
  </div>
{/if}

<style>
  .custom-scroll::-webkit-scrollbar { width: 3px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

  @keyframes flash-biru {
    0% { 
        background-color: rgba(59, 130, 246, 0.2); 
        border-color: #3b82f6;
    }
    100% { 
        background-color: white; 
        border-color: #f1f5f9;
    }
  }

  .animate-flash-biru {
    animation: flash-biru 3s ease-out forwards;
  }
</style>