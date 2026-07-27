<script>
  import { page } from '$app/stores';
  import PageLayout from '$lib/components/PageLayout.svelte';

  export let data;
  const { unit, stats } = data;

  $: slug = $page.params.slug;
</script>

<PageLayout title="CRM untuk {unit?.namaUnit || 'Unit Bisnis'}" subtitle="Kelola kontak, pipeline, dan aktivitas yang tersambung ke unit bisnis ini." badge="CRM" slug={slug} unit={unit}>
  <div slot="actions" class="grid grid-cols-1 sm:grid-cols-3 gap-2">
    <a href={`/finance/${slug}/crm/kontak`} class="rounded-lg bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-wider text-center border border-transparent hover:border-slate-700 transition-all">Kontak</a>
    <a href={`/finance/${slug}/crm/pipeline`} class="rounded-lg bg-indigo-600 text-white px-4 py-2 text-xs font-black uppercase tracking-wider text-center border border-transparent hover:bg-indigo-700 transition-all">Pipeline</a>
    <a href={`/finance/${slug}/crm/aktivitas`} class="rounded-lg bg-slate-700 text-white px-4 py-2 text-xs font-black uppercase tracking-wider text-center border border-transparent hover:bg-slate-600 transition-all">Aktivitas</a>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <p class="text-[8px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 font-black mb-3">Kontak</p>
      <p class="text-4xl font-black text-slate-900 dark:text-white">{stats.contacts}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Kontak terkait unit bisnis ini</p>
    </div>
    <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <p class="text-[8px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 font-black mb-3">Deals</p>
      <p class="text-4xl font-black text-slate-900 dark:text-white">{stats.deals}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Nilai dan stage deal unit</p>
    </div>
    <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <p class="text-[8px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 font-black mb-3">Aktivitas</p>
      <p class="text-4xl font-black text-slate-900 dark:text-white">{stats.activities}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Interaksi terkini untuk unit</p>
    </div>
    <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <p class="text-[8px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 font-black mb-3">Task</p>
      <p class="text-4xl font-black text-slate-900 dark:text-white">{stats.tasks}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Task terbuka untuk unit bisnis</p>
    </div>
  </div>
</PageLayout>
