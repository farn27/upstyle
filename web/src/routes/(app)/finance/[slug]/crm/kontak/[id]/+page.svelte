<script>
  import { page } from '$app/stores';
  import SubNav from '$lib/components/SubNav.svelte';
  export let data;
  const { unit, kontak, aktivitas } = data;
  $: slug = $page.params.slug;
</script>

<div class="max-w-7xl mx-auto py-6 px-4 space-y-6">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">CRM / Kontak</p>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white">Detail Kontak</h1>
      <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Informasi kontak dan aktivitas untuk lead/pelanggan unit ini.</p>
    </div>
    <a href={`/finance/${slug}/crm/kontak`} class="rounded-lg bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-wider">Kembali ke Kontak</a>
  </div>

  <SubNav {slug} />

  {#if kontak}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 font-black mb-3">Informasi Kontak</p>
        <p class="text-sm font-bold text-slate-900 dark:text-white">{kontak.nama}</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">{kontak.perusahaan || 'Perusahaan pribadi'}</p>
        <div class="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div><span class="font-bold">Telepon:</span> {kontak.telepon || '-'}</div>
          <div><span class="font-bold">Email:</span> {kontak.email || '-'}</div>
          <div><span class="font-bold">Stage:</span> {kontak.stage || 'lead'}</div>
          <div><span class="font-bold">Sumber:</span> {kontak.sumber || 'Manual'}</div>
        </div>
      </div>

      <div class="xl:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p class="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 font-black mb-3">Riwayat Aktivitas</p>
        {#if aktivitas.length === 0}
          <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500">Belum ada aktivitas terdaftar untuk kontak ini.</p>
        {:else}
          <div class="space-y-4">
            {#each aktivitas as log}
              <div class="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-[0.08em]">{log.tipe}</p>
                  <p class="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{new Date(log.tanggal).toLocaleString('id-ID')}</p>
                </div>
                <p class="mt-2 text-sm text-slate-700 dark:text-slate-200">{log.catatan || 'Tidak ada catatan tambahan.'}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500">Kontak tidak ditemukan atau Anda tidak memiliki akses.</p>
    </div>
  {/if}
</div>
