<script>
  import { page } from '$app/stores';
  import SubNav from '$lib/components/SubNav.svelte';
  export let data;
  const { unit } = data;
  $: slug = $page.params.slug;
</script>

<div class="max-w-7xl mx-auto py-6 px-4 space-y-6">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">CRM / Kampanye</p>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white">Kampanye {unit?.namaUnit || 'Unit'}</h1>
      <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Kelola kampanye promosi dan blast WA/Email untuk unit bisnis ini.</p>
    </div>
  </div>

  <SubNav {slug} />

  <div class="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
    <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500">Kampanye CRM dapat dihubungkan ke Inngest untuk scheduling, blast WA, dan follow-up otomatis.</p>
  </div>
</div>
