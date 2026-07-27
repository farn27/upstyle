<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  // Nangkep data unit dari server
  export let data;
  $: unit = data.unit;

  onMount(() => {
    if (window.lucide) window.lucide.createIcons();
  });
</script>

<div class="max-w-7xl mx-auto py-10 px-6 font-sans">
  
  <div class="flex justify-between items-center mb-10 pb-8 border-b border-slate-100">
    <div class="flex items-center gap-6">
      <a href="/finance" class="w-12 h-12 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all text-slate-400">
        <i data-lucide="arrow-left" class="w-5 h-5"></i>
      </a>
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">{unit.nama}</h1>
          <span class="px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase rounded-full tracking-widest">Active Entity</span>
        </div>
        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{unit.kategori} • Entity ID: {unit.id}</p>
      </div>
    </div>
    
    <div class="flex gap-3">
      <button class="bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">Generate Report</button>
      <button class="bg-slate-900 text-white px-6 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all">+ New Transaction</button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
    <div in:fly={{ y: 20, delay: 100 }} class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Liquidity</p>
      <p class="text-2xl font-black text-slate-900 tracking-tighter">
        {unit.mata_uang} {Number(unit.modal_awal).toLocaleString('id-ID')}
      </p>
    </div>
    
    <div in:fly={{ y: 20, delay: 200 }} class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm col-span-2">
      <div class="flex justify-between items-end mb-4">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue vs Target</p>
        <p class="text-xs font-bold text-slate-900 italic">Target: {unit.mata_uang} {Number(unit.target_omset).toLocaleString('id-ID')}</p>
      </div>
      <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div class="bg-blue-600 h-full w-[15%] rounded-full transition-all duration-1000"></div>
      </div>
      <div class="flex justify-between mt-3">
         <span class="text-[9px] font-bold text-blue-600 uppercase italic">On Track</span>
         <span class="text-[9px] font-bold text-slate-400 uppercase">15% Achieved</span>
      </div>
    </div>

    <div in:fly={{ y: 20, delay: 300 }} class="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl">
      <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 text-blue-400 italic">Est. Tax Liability ({unit.persen_pajak}%)</p>
      <p class="text-2xl font-black tracking-tighter italic text-blue-100">
        -{unit.mata_uang} {(unit.modal_awal * (unit.persen_pajak/100)).toLocaleString('id-ID')}
      </p>
    </div>
  </div>

  <div in:fade={{ delay: 400 }} class="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
    <div class="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
      <h4 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">General Ledger (Buku Besar)</h4>
      <div class="flex gap-2">
        <input type="text" placeholder="Search ledger..." class="bg-white border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold outline-none w-64 focus:border-blue-600 transition-all" />
      </div>
    </div>
    
    <table class="w-full text-left">
      <thead class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <tr>
          <th class="px-8 py-5">Timestamp</th>
          <th class="px-8 py-5">Description</th>
          <th class="px-8 py-5">Category</th>
          <th class="px-8 py-5 text-right">Debit / Credit</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase italic">Initial Deploy</td>
          <td class="px-8 py-6">
            <p class="text-xs font-black text-slate-900 uppercase tracking-tighter">Initial Equity Injection</p>
            <p class="text-[9px] text-slate-400 font-bold uppercase italic mt-1">Ref: {unit.id}</p>
          </td>
          <td class="px-8 py-6">
            <span class="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase">Equity</span>
          </td>
          <td class="px-8 py-6 text-right font-black text-sm text-blue-600">
            + {unit.mata_uang} {Number(unit.modal_awal).toLocaleString('id-ID')}
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="p-16 text-center">
       <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
         <i data-lucide="info" class="w-5 h-5"></i>
       </div>
       <p class="text-[10px] font-bold text-slate-300 uppercase italic tracking-widest">End of transaction record for this period</p>
    </div>
  </div>
</div>