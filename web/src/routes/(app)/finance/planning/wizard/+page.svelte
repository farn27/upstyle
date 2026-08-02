<script>
  import { ALL_BUSINESS_CATEGORIES } from '$lib/businessCategories.js';
  import { Sparkles, Lightbulb, CheckCircle, AlertCircle, ChevronRight, Wand2, X } from 'lucide-svelte';

  let { data } = $props();
  const initialPlan = data.plan ?? {};
  const initialUnits = data.units ?? [];

  let currentStep = $state(initialPlan.currentStep || 1);
  let planId = $state(initialPlan.id || null);
  let isSaving = $state(false);
  let aiLoading = $state(false);
  let applyLoading = $state(false);
  let applyResult = $state(null);
  let showApplyModal = $state(false);
  let selectedUnitId = $state('');
  const TOTAL_STEPS = 7;

  let form = $state({
    namaBisnis: initialPlan.namaBisnis || '',
    kategori: initialPlan.kategori || '',
    deskripsi: initialPlan.deskripsi || '',
    visi: initialPlan.visi || '',
    misi: initialPlan.misi || '',
    targetPasar: initialPlan.targetPasar || '',
    problemSolving: initialPlan.problemSolving || '',
    targetUsia: initialPlan.targetUsia || '',
    targetLokasi: initialPlan.targetLokasi || '',
    nilaiUtama: initialPlan.nilaiUtama || '',
    keunggulan: initialPlan.keunggulan || '',
    kompetitorUtama: initialPlan.kompetitorUtama || '',
    modelPendapatan: initialPlan.modelPendapatan || 'JUAL_PRODUK',
    estimasiHarga: initialPlan.estimasiHarga || '',
    estimasiVolumePerBulan: initialPlan.estimasiVolumePerBulan || '',
    modalAwal: initialPlan.modalAwal || '',
    biayaOperasionalPerBulan: initialPlan.biayaOperasionalPerBulan || '',
    channelPenjualan: initialPlan.channelPenjualan || [],
    platformOnline: initialPlan.platformOnline || [],
    canvasJson: initialPlan.canvasJson || null,
    aiSummary: initialPlan.aiSummary || '',
  });

  let proyeksiRevenue = $derived((Number(form.estimasiHarga)||0) * (Number(form.estimasiVolumePerBulan)||0));
  let breakEven = $derived(proyeksiRevenue > 0 ? Math.ceil((Number(form.modalAwal)||0) / proyeksiRevenue) : 0);
  let roiEstimasi = $derived(Number(form.modalAwal) > 0 ? (((proyeksiRevenue-(Number(form.biayaOperasionalPerBulan)||0))*12)/Number(form.modalAwal)*100).toFixed(1) : 0);

  const stepTitles = ['','💡 Identitas Bisnis','👥 Target Pasar','⭐ Proposisi Nilai','💰 Model Pendapatan','📊 Modal & Proyeksi','📣 Channel Penjualan','🗺️ Business Canvas'];
  const stepDesc = ['','Siapa kamu dan apa yang kamu tawarkan?','Siapa yang akan membeli dari kamu?','Apa yang membuat bisnismu berbeda?','Bagaimana cara kamu menghasilkan uang?','Berapa modal yang dibutuhkan?','Bagaimana cara kamu menjangkau pelanggan?','Ringkasan rencana bisnismu'];

  const categoryGroups = $derived(() => {
    const g = {};
    for (const c of ALL_BUSINESS_CATEGORIES) { if (!g[c.group]) g[c.group] = []; g[c.group].push(c); }
    return g;
  });

  async function save(status = null) {
    isSaving = true;
    const payload = { ...form, currentStep, proyeksiRevenuePerBulan: proyeksiRevenue, breakEvenPoint: breakEven, roiEstimasi, ...(status ? { status } : {}) };
    if (planId) payload.id = planId;
    const res = await fetch('/api/app/business-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.success && !planId) planId = json.data.id;
    isSaving = false;
    return json.success;
  }

  let aiSuggestions = $state([]);
  let aiHintField = $state('');

  async function askAI(field, mode = 'hint') {
    aiLoading = true; aiSuggestions = []; aiHintField = field;
    const res = await fetch('/api/app/business-plan/ai-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: currentStep, field, kategori: form.kategori, context: form, mode }) });
    const d = await res.json();
    const raw = d?.data?.result || '';
    aiSuggestions = raw.split('\n').map(l => l.replace(/^[-•*\d.]\s*/, '').trim()).filter(l => l.length > 5).slice(0, 5);
    aiLoading = false;
  }

  function applySuggestion(text) {
    if (aiHintField && aiHintField in form) {
      const cur = form[aiHintField];
      form[aiHintField] = cur ? cur + (cur.endsWith('.') ? ' ' : '. ') + text : text;
    }
    aiSuggestions = []; aiHintField = '';
  }

  async function nextStep() {
    if (currentStep === 1 && (!form.namaBisnis || !form.kategori)) { alert('Nama bisnis dan kategori wajib diisi'); return; }
    if (currentStep === 5 && !form.modalAwal) { alert('Modal awal wajib diisi'); return; }
    await save();
    if (currentStep < TOTAL_STEPS) { currentStep++; aiSuggestions = []; aiHintField = ''; }
    if (currentStep === TOTAL_STEPS) generateCanvas();
  }

  async function prevStep() {
    if (currentStep > 1) { currentStep--; aiSuggestions = []; aiHintField = ''; }
  }

  async function generateCanvas() {
    if (form.canvasJson) return;
    aiLoading = true;
    const res = await fetch('/api/app/business-plan/ai-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 7, field: 'canvas', kategori: form.kategori, context: form, mode: 'canvas' }) });
    const json = await res.json();
    if (json.success) {
      try {
        const m = json.data.result.match(/\{[\s\S]*\}/);
        if (m) { form.canvasJson = JSON.parse(m[0]); form.aiSummary = form.canvasJson.executive_summary || ''; await save('COMPLETE'); }
      } catch { form.aiSummary = json.data.result; }
    }
    aiLoading = false;
  }

  async function applyPlan() {
    if (!planId) { const ok = await save('COMPLETE'); if (!ok || !planId) { applyResult = { success: false, message: 'Gagal menyimpan. Coba lagi.' }; return; } }
    applyLoading = true;
    const res = await fetch('/api/app/business-plan/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, unitId: selectedUnitId ? Number(selectedUnitId) : null }) });
    const json = await res.json();
    applyResult = json; applyLoading = false;
    if (json.success) showApplyModal = false;
  }

  function toggleChannel(val, arr) {
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
  }
</script>

<svelte:head><title>Wizard Bisnis — Bizgrow</title></svelte:head>

<div class="max-w-6xl mx-auto px-4 py-8">

  <a href="/finance/planning" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">← Kembali</a>

  <!-- Progress -->
  <div class="mb-6">
    <div class="flex justify-between text-xs text-gray-500 mb-2">
      <span>Langkah {currentStep} dari {TOTAL_STEPS}</span>
      <span>{Math.round((currentStep/TOTAL_STEPS)*100)}% selesai</span>
    </div>
    <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style="width:{(currentStep/TOTAL_STEPS)*100}%"></div>
    </div>
    <div class="flex justify-between mt-2">
      {#each Array(TOTAL_STEPS) as _, i}
        <button onclick={() => { if (i+1 < currentStep) currentStep = i+1; }}
          class="w-6 h-6 rounded-full text-xs font-bold transition-all {i+1<currentStep?'bg-blue-600 text-white':i+1===currentStep?'bg-blue-600 text-white ring-4 ring-blue-100':'bg-gray-200 text-gray-400'}">{i+1}</button>
      {/each}
    </div>
  </div>

  <!-- 2-column layout -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

    <!-- LEFT: Form (2/3) -->
    <div class="lg:col-span-2">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <!-- Step header -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 class="text-lg font-bold text-white">{stepTitles[currentStep]}</h2>
          <p class="text-blue-100 text-sm">{stepDesc[currentStep]}</p>
        </div>

        <div class="p-6 space-y-5">

          <!-- STEP 1 -->
          {#if currentStep === 1}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nama Bisnis <span class="text-red-500">*</span></label>
              <input bind:value={form.namaBisnis} type="text" placeholder="Contoh: Warung Makan Bu Sari" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kategori Bisnis <span class="text-red-500">*</span></label>
              <select bind:value={form.kategori} class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="">-- Pilih kategori --</option>
                {#each Object.entries(categoryGroups()) as [group, cats]}
                  <optgroup label={group}>{#each cats as cat}<option value={cat.value}>{cat.label}</option>{/each}</optgroup>
                {/each}
              </select>
            </div>
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm font-medium text-gray-700">Deskripsi Singkat</label>
                <button onclick={() => askAI('deskripsi')} class="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg font-semibold transition"><Wand2 class="w-3 h-3"/> Bantu saya</button>
              </div>
              <textarea bind:value={form.deskripsi} rows="3" placeholder="Ceritakan produk/jasa yang kamu jual..." class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-sm font-medium text-gray-700">Visi Bisnis</label>
                  <button onclick={() => askAI('visi')} class="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg font-semibold transition"><Sparkles class="w-3 h-3"/> Contoh</button>
                </div>
                <textarea bind:value={form.visi} rows="2" placeholder="Menjadi bisnis favorit..." class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Misi Bisnis</label>
                <textarea bind:value={form.misi} rows="2" placeholder="Menyajikan layanan terbaik..." class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"></textarea>
              </div>
            </div>

          <!-- STEP 2 -->
          {:else if currentStep === 2}
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm font-medium text-gray-700">Siapa Target Pelanggan Utama?</label>
                <button onclick={() => askAI('targetPasar')} class="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg font-semibold transition"><Wand2 class="w-3 h-3"/> Bantu saya</button>
              </div>
              <textarea bind:value={form.targetPasar} rows="3" placeholder="Contoh: Ibu rumah tangga 25-45 tahun..." class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
            </div>
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm font-medium text-gray-700">Problem yang Diselesaikan</label>
                <button onclick={() => askAI('problemSolving')} class="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg font-semibold transition"><Lightbulb class="w-3 h-3"/> Contoh</button>
              </div>
              <textarea bind:value={form.problemSolving} rows="2" placeholder="Pelanggan kesulitan menemukan..." class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rentang Usia Target</label>
                <input bind:value={form.targetUsia} type="text" placeholder="Contoh: 20-40 tahun" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Area / Lokasi</label>
                <input bind:value={form.targetLokasi} type="text" placeholder="Contoh: Jakarta Selatan" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
              </div>
            </div>

          <!-- STEP 3 -->
          {:else if currentStep === 3}
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm font-medium text-gray-700">Nilai Utama yang Ditawarkan</label>
                <button onclick={() => askAI('nilaiUtama')} class="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg font-semibold transition"><Wand2 class="w-3 h-3"/> Bantu saya</button>
              </div>
              <textarea bind:value={form.nilaiUtama} rows="3" placeholder="Makanan rumahan harga warung, bebas MSG..." class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Keunggulan vs Kompetitor</label>
              <textarea bind:value={form.keunggulan} rows="2" placeholder="Lebih murah 20%, lokasi strategis..." class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kompetitor Utama</label>
              <input bind:value={form.kompetitorUtama} type="text" placeholder="Warung Pak Joko, GoFood" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
            </div>
            <button onclick={() => askAI('step3','validate')} class="w-full py-2.5 border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition">
              <CheckCircle class="w-4 h-4"/> Minta AI Review Step Ini
            </button>

          <!-- STEP 4 -->
          {:else if currentStep === 4}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Model Pendapatan</label>
              <div class="grid grid-cols-2 gap-2">
                {#each [{ v:'JUAL_PRODUK',l:'🛍️ Jual Produk Fisik'},{ v:'JUAL_JASA',l:'🔧 Jual Jasa'},{ v:'LANGGANAN',l:'🔄 Subscription'},{ v:'KOMISI',l:'💼 Komisi'},{ v:'IKLAN',l:'📢 Iklan'},{ v:'CAMPURAN',l:'🔀 Campuran'}] as m}
                  <button onclick={() => form.modelPendapatan = m.v} class="p-3 rounded-xl border text-sm font-medium text-left transition {form.modelPendapatan===m.v?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}">{m.l}</button>
                {/each}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Estimasi Harga Jual (Rp)</label>
                <input bind:value={form.estimasiHarga} type="number" placeholder="25000" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
                <p class="text-xs text-gray-400 mt-1">Per unit/transaksi</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Estimasi Volume / Bulan</label>
                <input bind:value={form.estimasiVolumePerBulan} type="number" placeholder="300" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
              </div>
            </div>
            {#if proyeksiRevenue > 0}
              <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                <div class="text-sm font-semibold text-green-800 mb-1">📈 Proyeksi Pendapatan</div>
                <div class="text-2xl font-bold text-green-700">Rp {proyeksiRevenue.toLocaleString('id-ID')}<span class="text-base font-normal text-green-600">/bulan</span></div>
              </div>
            {/if}

          <!-- STEP 5 -->
          {:else if currentStep === 5}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Modal Awal (Rp) <span class="text-red-500">*</span></label>
                <input bind:value={form.modalAwal} type="number" placeholder="10000000" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Biaya Operasional / Bulan</label>
                <input bind:value={form.biayaOperasionalPerBulan} type="number" placeholder="5000000" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
              </div>
            </div>
            {#if Number(form.modalAwal) > 0}
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-blue-50 rounded-xl p-4 text-center"><div class="text-xs text-blue-600 font-medium mb-1">Revenue/Bln</div><div class="text-lg font-bold text-blue-700">Rp {proyeksiRevenue.toLocaleString('id-ID')}</div></div>
                <div class="bg-orange-50 rounded-xl p-4 text-center"><div class="text-xs text-orange-600 font-medium mb-1">Break Even</div><div class="text-lg font-bold text-orange-700">{breakEven} Bln</div></div>
                <div class="bg-green-50 rounded-xl p-4 text-center"><div class="text-xs text-green-600 font-medium mb-1">ROI/Tahun</div><div class="text-lg font-bold text-green-700">{roiEstimasi}%</div></div>
              </div>
            {/if}

          <!-- STEP 6 -->
          {:else if currentStep === 6}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Channel Penjualan</label>
              <div class="grid grid-cols-3 gap-2">
                {#each [{ v:'offline',l:'🏪 Toko Offline'},{ v:'online',l:'💻 Website/Online'},{ v:'marketplace',l:'🛒 Marketplace'},{ v:'whatsapp',l:'📱 WhatsApp'},{ v:'delivery',l:'🛵 Ojol Delivery'},{ v:'reseller',l:'👥 Reseller'}] as c}
                  <button onclick={() => toggleChannel(c.v, form.channelPenjualan)} class="p-3 rounded-xl border text-sm font-medium transition {form.channelPenjualan.includes(c.v)?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}">{c.l}</button>
                {/each}
              </div>
            </div>
            {#if form.channelPenjualan.includes('marketplace') || form.channelPenjualan.includes('online')}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Platform Online</label>
                <div class="grid grid-cols-3 gap-2">
                  {#each ['Shopee','Tokopedia','Instagram','TikTok Shop','Lazada','Website Sendiri'] as p}
                    <button onclick={() => toggleChannel(p, form.platformOnline)} class="p-2 rounded-lg border text-xs font-medium transition {form.platformOnline.includes(p)?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}">{p}</button>
                  {/each}
                </div>
              </div>
            {/if}

          <!-- STEP 7 -->
          {:else if currentStep === 7}
            {#if aiLoading}
              <div class="text-center py-12">
                <div class="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-gray-500">AI sedang membuat Business Model Canvas...</p>
              </div>
            {:else if form.canvasJson}
              <div class="space-y-4">
                {#if form.aiSummary}
                  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div class="text-sm font-semibold text-blue-800 mb-1">📋 Executive Summary</div>
                    <p class="text-sm text-blue-700">{form.aiSummary}</p>
                  </div>
                {/if}
                <div class="grid grid-cols-2 gap-3 text-sm">
                  {#each [{ k:'value_proposition',l:'⭐ Value Proposition'},{ k:'customer_segments',l:'👥 Customers'},{ k:'channels',l:'📣 Channels'},{ k:'revenue_streams',l:'💰 Revenue'},{ k:'key_resources',l:'🔑 Resources'},{ k:'key_activities',l:'⚡ Activities'},{ k:'key_partners',l:'🤝 Partners'},{ k:'cost_structure',l:'📊 Costs'}] as item}
                    <div class="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <div class="text-xs font-semibold text-gray-500 mb-1">{item.l}</div>
                      <p class="text-gray-700 text-xs">{form.canvasJson[item.k] || '-'}</p>
                    </div>
                  {/each}
                </div>
                {#if applyResult?.success}
                  <div class="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 text-center">
                    <div class="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><CheckCircle class="w-7 h-7 text-emerald-600"/></div>
                    <div class="font-black text-emerald-800 text-base mb-1">Berhasil Diterapkan! 🎉</div>
                    <div class="text-sm text-emerald-600 mb-4">{applyResult.data?.totalRecords||0} data berhasil di-generate</div>
                    <div class="flex gap-3">
                      <a href="/finance" class="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition flex items-center justify-center gap-2"><ChevronRight class="w-4 h-4"/> Buka Dashboard</a>
                      <a href="/finance/planning" class="flex-1 py-2.5 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition text-center">Lihat Plan</a>
                    </div>
                  </div>
                {:else if applyResult && !applyResult.success}
                  <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle class="w-4 h-4 shrink-0"/>{applyResult.message}</div>
                {:else}
                  <button onclick={async () => { await save('COMPLETE'); showApplyModal = true; }} class="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-black hover:from-emerald-600 hover:to-teal-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-200">
                    <Sparkles class="w-4 h-4"/> Terapkan Business Plan Ini
                  </button>
                {/if}
              </div>
            {:else}
              <div class="text-center py-8">
                <button onclick={generateCanvas} class="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2 mx-auto">
                  <Sparkles class="w-4 h-4"/> Generate Business Canvas
                </button>
              </div>
            {/if}
          {/if}
        </div>

        <!-- Navigation -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <button onclick={prevStep} disabled={currentStep===1} class="px-5 py-2 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">← Sebelumnya</button>
          <button onclick={() => save()} class="text-sm text-gray-500 hover:text-gray-700 {isSaving?'opacity-50':''}">{isSaving?'Menyimpan...':'💾 Simpan Draft'}</button>
          {#if currentStep < TOTAL_STEPS}
            <button onclick={nextStep} class="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">Selanjutnya →</button>
          {:else}
            <span class="text-sm text-gray-400">Langkah terakhir</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- RIGHT: AI Sidebar (1/3, sticky) -->
    <div class="lg:col-span-1">
      <div class="sticky top-24 space-y-4">

        <!-- Idle: step guide -->
        {#if !aiLoading && aiSuggestions.length === 0}
          <div class="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 text-white">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center"><Sparkles class="w-4 h-4 text-indigo-300"/></div>
              <div><div class="text-xs font-black uppercase tracking-wider">Bizgrow AI</div><div class="text-[10px] text-indigo-300">Asisten perencanaan bisnis</div></div>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed mb-4">Klik <span class="text-indigo-300 font-bold">"Bantu saya"</span> di setiap field untuk saran relevan.</p>
            <div class="space-y-1.5">
              {#each [{s:1,l:'Identitas & Kategori'},{s:2,l:'Target Pasar'},{s:3,l:'Proposisi Nilai'},{s:4,l:'Model Pendapatan'},{s:5,l:'Modal & Proyeksi'},{s:6,l:'Channel Penjualan'},{s:7,l:'Business Canvas'}] as g}
                <div class="flex items-center gap-2 text-[11px] {g.s===currentStep?'text-white font-bold':'text-slate-500'}">
                  <div class="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black {g.s<currentStep?'bg-emerald-500 text-white':g.s===currentStep?'bg-indigo-400 text-white ring-2 ring-indigo-300':'bg-white/10 text-slate-500'}">{g.s<currentStep?'✓':g.s}</div>
                  {g.l}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Loading skeleton -->
        {#if aiLoading && currentStep !== 7}
          <div class="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center animate-pulse"><Sparkles class="w-4 h-4 text-white"/></div>
              <div><div class="text-xs font-black text-slate-700 uppercase tracking-wider">AI sedang menganalisis</div>
                <div class="flex gap-1 mt-1">{#each [0,1,2] as i}<div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay:{i*150}ms"></div>{/each}</div>
              </div>
            </div>
            <div class="space-y-2">{#each [1,2,3] as _}<div class="h-9 bg-indigo-100 rounded-xl animate-pulse"></div>{/each}</div>
          </div>
        {/if}

        <!-- Suggestions panel -->
        {#if aiSuggestions.length > 0}
          {@const isValidate = aiHintField === 'step3' || aiHintField === 'validate'}
          <div class="border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/50 rounded-2xl overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-indigo-100 bg-white/60">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  {#if isValidate}<CheckCircle class="w-3.5 h-3.5 text-white"/>{:else}<Wand2 class="w-3.5 h-3.5 text-white"/>{/if}
                </div>
                <div>
                  <span class="text-xs font-black text-slate-800 uppercase tracking-wider">{isValidate?'Review AI':'Saran AI'}</span>
                  {#if !isValidate}<div class="text-[10px] text-indigo-500 font-semibold">klik untuk isi otomatis</div>{/if}
                </div>
              </div>
              <button onclick={() => {aiSuggestions=[];aiHintField='';}} class="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"><X class="w-3.5 h-3.5"/></button>
            </div>
            <div class="p-3 flex flex-col gap-2">
              {#each aiSuggestions as suggestion, i}
                {#if isValidate}
                  <div class="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 {i===0?'bg-green-100':'bg-amber-100'}">
                      {#if i===0}<CheckCircle class="w-3 h-3 text-green-600"/>{:else}<Lightbulb class="w-3 h-3 text-amber-600"/>{/if}
                    </div>
                    <p class="text-xs text-slate-700 leading-relaxed">{suggestion}</p>
                  </div>
                {:else}
                  <button onclick={() => applySuggestion(suggestion)} class="group flex items-center gap-2.5 w-full text-left p-3 bg-white hover:bg-indigo-600 rounded-xl border border-indigo-100 hover:border-indigo-600 shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
                    <div class="w-5 h-5 rounded-lg bg-indigo-50 group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"><ChevronRight class="w-3 h-3 text-indigo-500 group-hover:text-white transition-colors"/></div>
                    <span class="text-xs text-slate-700 group-hover:text-white font-medium leading-snug transition-colors flex-1">{suggestion}</span>
                  </button>
                {/if}
              {/each}
            </div>
            {#if !isValidate}<div class="px-4 pb-3"><p class="text-[10px] text-indigo-400 font-medium">💡 Klik untuk isi otomatis. Edit sesuai kebutuhan.</p></div>{/if}
          </div>
        {/if}

        <!-- Contextual tip -->
        {#if !aiLoading && aiSuggestions.length === 0 && currentStep <= 6}
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div class="flex items-center gap-2 mb-2"><Lightbulb class="w-4 h-4 text-amber-500"/><span class="text-xs font-black text-amber-700 uppercase tracking-wider">Tips</span></div>
            <p class="text-xs text-amber-700 leading-relaxed">
              {#if currentStep===1}Pilih kategori yang tepat — ini menentukan template produk, COA, dan karyawan yang di-generate.
              {:else if currentStep===2}Semakin spesifik target pasar, semakin tajam strategi bisnis.
              {:else if currentStep===3}Tulis keunggulan yang konkret dan terukur.
              {:else if currentStep===4}Isi estimasi harga dan volume untuk melihat proyeksi revenue otomatis.
              {:else if currentStep===5}Isi modal awal untuk kalkulasi break-even dan ROI real-time.
              {:else}Pilih semua channel yang relevan — bisa lebih dari satu.{/if}
            </p>
          </div>
        {/if}

      </div>
    </div>

  </div>
</div>

<!-- Apply Modal -->
{#if showApplyModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
      <div class="bg-gradient-to-r from-emerald-500 to-teal-600 p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Sparkles class="w-5 h-5 text-white"/></div>
          <div><h3 class="text-base font-black text-white">Terapkan Business Plan</h3><p class="text-emerald-100 text-xs mt-0.5">Seed semua modul dari template bisnis</p></div>
        </div>
      </div>
      <div class="p-5 space-y-4 overflow-y-auto flex-1">
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Yang akan di-generate:</div>
          <div class="grid grid-cols-2 gap-1.5">
            {#each ['Produk & Inventori','Chart of Accounts','Karyawan template','Supplier template','Kategori produk','Tarif pajak','ABC kategori','Unit bisnis'] as item}
              <div class="flex items-center gap-1.5 text-xs text-slate-600"><CheckCircle class="w-3 h-3 text-emerald-500 shrink-0"/>{item}</div>
            {/each}
          </div>
        </div>
        <div>
          <div class="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Pilih Unit Bisnis:</div>
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition {!selectedUnitId?'border-emerald-500 bg-emerald-50':'border-slate-200 hover:border-emerald-300'}">
              <input type="radio" bind:group={selectedUnitId} value="" class="accent-emerald-600"/>
              <div><div class="text-sm font-bold text-slate-800">✨ Buat Unit Bisnis Baru</div><div class="text-xs text-slate-400 mt-0.5">"{form.namaBisnis}"</div></div>
            </label>
            {#each initialUnits.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i) as unit}
              <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition {selectedUnitId===String(unit.id)?'border-emerald-500 bg-emerald-50':'border-slate-200 hover:border-emerald-300'}">
                <input type="radio" bind:group={selectedUnitId} value={String(unit.id)} class="accent-emerald-600"/>
                <div><div class="text-sm font-bold text-slate-800">🏢 {unit.namaUnit}</div><div class="text-xs text-slate-400 mt-0.5">Tambahkan ke unit ini</div></div>
              </label>
            {/each}
          </div>
        </div>
        <div class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle class="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
          <p class="text-xs text-amber-700">Data yang sudah ada tidak akan dihapus. Template hanya ditambahkan sebagai data awal.</p>
        </div>
        {#if applyResult && !applyResult.success}
          <div class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3"><AlertCircle class="w-4 h-4 text-red-500 shrink-0"/><p class="text-xs text-red-700">{applyResult.message}</p></div>
        {/if}
        <div class="flex gap-3 pt-1">
          <button onclick={() => showApplyModal=false} class="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition text-sm">Batal</button>
          <button onclick={applyPlan} disabled={applyLoading} class="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-black hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-100">
            {#if applyLoading}<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Memproses...{:else}<Sparkles class="w-4 h-4"/>Terapkan Sekarang{/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
