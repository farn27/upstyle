<script>
  import { page } from '$app/stores';
  import SubNav from '$lib/components/SubNav.svelte';
  export let data;
  const { unit, error } = data;
  $: slug = $page.params.slug;
</script>

<div class="max-w-7xl mx-auto py-6 px-4 space-y-6">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <p class="text-[9px] uppercase tracking-[0.3em] text-indigo-600 font-black">CRM / Kontak / Tambah</p>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white">Tambah Kontak</h1>
      <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm">Buat kontak baru untuk unit bisnis {unit?.namaUnit || 'ini'}.</p>
    </div>
  </div>

  <SubNav {slug} />

  {#if error}
    <div class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
  {:else}
    <form method="post" class="space-y-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Nama</span>
          <input name="nama" required class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-indigo-500 focus:outline-none" />
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Telepon</span>
          <input name="telepon" class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-indigo-500 focus:outline-none" />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Email</span>
          <input name="email" type="email" class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-indigo-500 focus:outline-none" />
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Perusahaan</span>
          <input name="perusahaan" class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-indigo-500 focus:outline-none" />
        </label>
      </div>

      <label class="block">
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Stage</span>
        <select name="stage" class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-indigo-500 focus:outline-none">
          <option value="lead">Lead</option>
          <option value="prospek">Prospek</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </label>

      <button type="submit" class="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-indigo-700">Simpan Kontak</button>
    </form>
  {/if}
</div>
