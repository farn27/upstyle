<script>
  import { page } from '$app/stores';
  import SubNav from '$lib/components/SubNav.svelte';
  export let data;
  const { unit, contacts } = data;
  $: slug = unit?.slug ?? $page.params.slug;
</script>

<div class="max-w-7xl mx-auto py-6 px-4 space-y-6">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">CRM / Kontak</p>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white">Kontak {unit?.namaUnit || 'Unit'}</h1>
      <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Daftar kontak yang terkait langsung dengan unit bisnis ini.</p>
    </div>
    <a href={`/finance/${slug}/crm/kontak/add`} class="rounded-lg bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-wider">+ Tambah Kontak</a>
  </div>

  <SubNav {slug} />

  <div class="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
    <table class="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
      <thead class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 dark:text-slate-500">
        <tr>
          <th class="px-4 py-3">Nama</th>
          <th class="px-4 py-3">Perusahaan</th>
          <th class="px-4 py-3">Telepon</th>
          <th class="px-4 py-3">Email</th>
          <th class="px-4 py-3">Stage</th>
        </tr>
      </thead>
      <tbody>
        {#if contacts.length === 0}
          <tr>
            <td colspan="5" class="px-4 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500">Belum ada kontak CRM untuk unit ini. Tambahkan kontak baru untuk memulai pipeline.</td>
          </tr>
        {:else}
          {#each contacts as kontak}
            <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition">
              <td class="px-4 py-4"><a href={`/finance/${slug}/crm/kontak/${kontak.id}`} class="font-bold text-slate-900 dark:text-white hover:text-indigo-600">{kontak.nama}</a></td>
              <td class="px-4 py-4">{kontak.perusahaan || '-'}</td>
              <td class="px-4 py-4">{kontak.telepon || '-'}</td>
              <td class="px-4 py-4">{kontak.email || '-'}</td>
              <td class="px-4 py-4 uppercase text-[11px] font-black text-slate-500 dark:text-slate-400 dark:text-slate-500">{kontak.stage || 'lead'}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
