<script>
  import { goto } from '$app/navigation';
  import { ALL_BUSINESS_CATEGORIES } from '$lib/businessCategories.js';

  let { data } = $props();
  let plans = $state(data.plans || []);
  let isCreating = $state(false);

  async function deletePlan(id) {
    if (!confirm('Hapus plan ini?')) return;
    await fetch(`/api/app/business-plan?id=${id}`, { method: 'DELETE' });
    plans = plans.filter(p => p.id !== id);
  }

  const statusColor = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    COMPLETE: 'bg-blue-100 text-blue-800',
    APPLIED: 'bg-green-100 text-green-800',
  };

  const statusLabel = { DRAFT: 'Draft', COMPLETE: 'Selesai', APPLIED: 'Diterapkan' };
</script>

<svelte:head><title>Business Planning — Bizgrow</title></svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">

  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">🗺️ Business Planning</h1>
      <p class="text-gray-500 mt-1">Rencanakan bisnis dari nol dengan panduan step-by-step + AI</p>
    </div>
    <a href="/finance/planning/wizard"
      class="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition">
      <span>+</span> Buat Rencana Baru
    </a>
  </div>

  <!-- Info card -->
  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-8 grid grid-cols-3 gap-4">
    <div class="text-center">
      <div class="text-2xl font-bold text-blue-600">7</div>
      <div class="text-sm text-gray-600">Langkah Wizard</div>
    </div>
    <div class="text-center border-x border-blue-200">
      <div class="text-2xl font-bold text-blue-600">40+</div>
      <div class="text-sm text-gray-600">Template Bisnis</div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-blue-600">8</div>
      <div class="text-sm text-gray-600">Modul Di-seed Otomatis</div>
    </div>
  </div>

  <!-- List plans -->
  {#if plans.length === 0}
    <div class="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
      <div class="text-5xl mb-4">💡</div>
      <h3 class="text-lg font-semibold text-gray-700">Belum ada rencana bisnis</h3>
      <p class="text-gray-500 mt-1 mb-5">Mulai dari sini — buat rencana bisnis pertama kamu</p>
      <a href="/finance/planning/wizard"
        class="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
        Mulai Sekarang
      </a>
    </div>
  {:else}
    <div class="grid gap-4">
      {#each plans as plan}
        <div class="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🏢</div>
            <div>
              <div class="font-semibold text-gray-900">{plan.namaBisnis}</div>
              <div class="text-sm text-gray-500 mt-0.5">{plan.kategori} • Step {plan.currentStep}/7</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold px-3 py-1 rounded-full {statusColor[plan.status] || 'bg-gray-100 text-gray-600'}">
              {statusLabel[plan.status] || plan.status}
            </span>
            <!-- Progress bar -->
            <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full transition-all"
                style="width: {(plan.currentStep / 7) * 100}%"></div>
            </div>
            <div class="flex gap-2">
              {#if !plan.isSeeded}
                <a href="/finance/planning/wizard?id={plan.id}"
                  class="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition">
                  {plan.status === 'COMPLETE' ? 'Terapkan' : 'Lanjutkan'}
                </a>
              {:else}
                <span class="text-sm text-green-600 font-medium px-3 py-1.5">✅ Diterapkan</span>
              {/if}
              <button onclick={() => deletePlan(plan.id)}
                class="text-sm text-red-500 hover:text-red-700 px-2 py-1.5 transition">🗑️</button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
