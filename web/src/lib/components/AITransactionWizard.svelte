<script>
	import { tick } from 'svelte';
	import { fade, scale, slide } from 'svelte/transition';

	export let isOpen = false;
	export let selectedUnitSlug = '';
	export let selectedUnitName = '';
	/** @type {function|null} callback on success */
	export let onSuccess = null;

	// ─── Transaction Data (mirrors existing form exactly) ───────────────────────
	let trx = {
		kategori_trx: 'Masuk',
		kas_coa_id: '',
		coa_id: '',
		product_id: '',
		qty: 1,
		nominal: 0,
		keterangan: ''
	};

	// ─── Wizard State ───────────────────────────────────────────────────────────
	let step = 0; // 0-6
	let isSubmitting = false;
	let submitError = '';
	let loadError = '';

	// ─── Master Data ────────────────────────────────────────────────────────────
	let kasAccounts = [];
	let coaAccounts = [];
	let products = [];
	let isLoadingData = false;
	let dataLoaded = false;
	let hasCoa = true;

	// ─── Computed ───────────────────────────────────────────────────────────────
	$: filteredCoa = coaAccounts.filter(c =>
		trx.kategori_trx === 'Masuk'
			? ['PENDAPATAN', 'PENDAPATAN_LAINNYA'].includes(c.tipeAkun)
			: ['BEBAN_OPERASIONAL', 'BEBAN_LAINNYA', 'HPP'].includes(c.tipeAkun)
	);

	$: selectedProduct = trx.product_id
		? products.find(p => String(p.id) === trx.product_id)
		: null;

	$: isStokKurang = trx.kategori_trx === 'Masuk'
		&& selectedProduct
		&& trx.qty > (Number(selectedProduct.stok) || 0);

	$: canSubmit = trx.nominal > 0 && !!trx.kas_coa_id && !!trx.coa_id && !isStokKurang && !isSubmitting;

	// Auto-select first COA when filter changes
	$: if (filteredCoa.length > 0 && !trx.coa_id) {
		trx.coa_id = String(filteredCoa[0].id);
	}

	// Auto-calc nominal & keterangan from product
	$: if (selectedProduct && trx.qty > 0) {
		const harga = trx.kategori_trx === 'Masuk'
			? Number(selectedProduct.hargaJual || 0)
			: Number(selectedProduct.hargaBeli || 0);
		trx.nominal = harga * trx.qty;
		trx.keterangan = trx.kategori_trx === 'Masuk'
			? `PENJUALAN ${selectedProduct.nama.toUpperCase()} SEBANYAK ${trx.qty} PCS`
			: `PEMBELIAN / RESTOCK ${selectedProduct.nama.toUpperCase()} SEBANYAK ${trx.qty} PCS`;
	}

	// Load master data when opened
	$: if (isOpen && selectedUnitSlug && !dataLoaded && !isLoadingData) {
		loadMasterData();
	}

	// ─── Functions ──────────────────────────────────────────────────────────────
	async function loadMasterData() {
		isLoadingData = true;
		loadError = '';
		try {
			const res = await fetch(`/api/transaction/master-data?unit=${encodeURIComponent(selectedUnitSlug)}`);
			const data = await res.json();
			if (data.success) {
				kasAccounts = data.kasAccounts || [];
				coaAccounts = data.coaAccounts || [];
				products = data.products || [];
				hasCoa = data.hasCoa ?? true;
				dataLoaded = true;
				if (kasAccounts.length > 0) trx.kas_coa_id = String(kasAccounts[0].id);
			} else {
				loadError = data.message || 'Gagal memuat data';
			}
		} catch {
			loadError = 'Gagal memuat data. Periksa koneksi internet.';
		} finally {
			isLoadingData = false;
		}
	}

	function reset() {
		step = 0;
		isSubmitting = false;
		submitError = '';
		trx = {
			kategori_trx: 'Masuk',
			kas_coa_id: kasAccounts.length > 0 ? String(kasAccounts[0].id) : '',
			coa_id: '',
			product_id: '',
			qty: 1,
			nominal: 0,
			keterangan: ''
		};
	}

	function close() {
		isOpen = false;
		reset();
	}

	async function submit() {
		if (!canSubmit) return;
		isSubmitting = true;
		submitError = '';
		try {
			const fd = new FormData();
			fd.append('kategori_trx', trx.kategori_trx);
			fd.append('kas_coa_id', trx.kas_coa_id);
			fd.append('coa_id', trx.coa_id);
			if (trx.product_id) fd.append('product_id', trx.product_id);
			fd.append('qty', String(trx.qty));
			fd.append('nominal', String(trx.nominal));
			fd.append('keterangan', (trx.keterangan || '').toUpperCase());

			const res = await fetch(`/finance/${selectedUnitSlug}/entry?/addTransaction`, {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' }
			});

			if (res.ok) {
				if (onSuccess) onSuccess({ message: 'Transaksi berhasil disimpan!', data: trx });
				close();
			} else {
				const text = await res.text();
				// Try to extract message from SvelteKit action response
				try {
					const parsed = JSON.parse(text.replace(/^[0-9]+;/, ''));
					submitError = parsed?.data?.message || 'Gagal menyimpan transaksi';
				} catch {
					submitError = 'Gagal menyimpan transaksi. Coba lagi.';
				}
			}
		} catch {
			submitError = 'Koneksi gagal. Silakan coba lagi.';
		} finally {
			isSubmitting = false;
		}
	}

	function fmtRp(v) {
		return `Rp${Number(v || 0).toLocaleString('id-ID')}`;
	}

	const STEP_BAR = ['📊','💳','📂','🛒','💰','📝','✅'];
	const STEP_TITLE = [
		'Pilih Tipe Transaksi',
		'Pilih Metode Pembayaran',
		'Pilih Akun COA',
		'Pilih Produk (Opsional)',
		'Input Nominal & Qty',
		'Tambah Keterangan',
		'Konfirmasi & Simpan'
	];

	// Get display name of selected kas account
	$: selectedKasName = kasAccounts.find(k => String(k.id) === trx.kas_coa_id)?.namaAkun || 'Kas';
	$: selectedCoaName = filteredCoa.find(c => String(c.id) === trx.coa_id)?.namaAkun || '-';
</script>

{#if isOpen}
<div class="fixed inset-0 z-[260] flex items-start justify-center p-3 pt-6 sm:pt-10 overflow-y-auto"
     on:click|self={close} role="dialog" aria-modal="true" aria-label="AI Input Transaksi"
     transition:fade={{ duration: 180 }}>

	<div class="absolute inset-0 bg-black/65 backdrop-blur-sm" on:click={close} role="presentation"></div>

	<div class="relative w-full max-w-md z-10 mb-6" transition:scale={{ start: 0.93, duration: 220 }}>
	<div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

		<!-- ── HEADER ──────────────────────────────────────────────────────────── -->
		<div class="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 px-5 py-4">
			<div class="flex items-start justify-between mb-4">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
						</svg>
					</div>
					<div>
						<p class="text-sm font-bold text-white leading-tight">AI Input Transaksi</p>
						<p class="text-[11px] text-indigo-200 mt-0.5 truncate max-w-[180px]">{selectedUnitName}</p>
					</div>
				</div>
				<button on:click={close}
					class="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors shrink-0">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
					</svg>
				</button>
			</div>

			<!-- Step progress bars -->
			<div class="flex gap-1 mb-2">
				{#each STEP_BAR as _, i}
				<div class="flex-1 h-1 rounded-full transition-all duration-400 {i <= step ? 'bg-white' : 'bg-white/25'}"></div>
				{/each}
			</div>
			<div class="flex items-center justify-between">
				<span class="text-[10px] text-indigo-200">Langkah {step + 1} / {STEP_BAR.length}</span>
				<span class="text-[11px] font-semibold text-white">{STEP_BAR[step]} {STEP_TITLE[step]}</span>
			</div>
		</div>

		<!-- ── BODY ────────────────────────────────────────────────────────────── -->
		<div class="px-5 py-4">

		{#if !hasCoa && dataLoaded}
		<!-- No COA warning -->
		<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
			<p class="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">⚠️ COA Belum Ada</p>
			<p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed mb-2">
				Setup Chart of Accounts terlebih dahulu di halaman Entri Transaksi.
			</p>
			<a href="/finance/{selectedUnitSlug}/entry" on:click={close}
				class="text-xs font-bold text-amber-800 dark:text-amber-200 underline">
				→ Buka Entri Transaksi
			</a>
		</div>

		{:else if isLoadingData}
		<!-- Loading -->
		<div class="flex flex-col items-center justify-center py-10 gap-3">
			<div class="w-8 h-8 border-[3px] border-indigo-100 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
			<p class="text-sm text-slate-500 dark:text-slate-400">Memuat data...</p>
		</div>

		{:else if loadError}
		<!-- Load Error -->
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
			<p class="text-sm text-red-700 dark:text-red-300 mb-2">{loadError}</p>
			<button on:click={() => { loadError = ''; dataLoaded = false; loadMasterData(); }}
				class="text-xs font-bold text-red-600 dark:text-red-400 hover:underline">↺ Coba lagi</button>
		</div>

		{:else}

		<!-- ── STEP 0: Kategori ──────────────────────────────────────────────── -->
		{#if step === 0}
		<div class="grid gap-3" transition:fade={{ duration: 120 }}>
			<button on:click={() => { trx.kategori_trx = 'Masuk'; trx.coa_id = ''; }}
				class="flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
				       {trx.kategori_trx === 'Masuk'
				         ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
				         : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'}">
				<div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
					</svg>
				</div>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-bold text-emerald-700 dark:text-emerald-400">MASUK (INCOME)</span>
						{#if trx.kategori_trx === 'Masuk'}<span class="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">✓</span>{/if}
					</div>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Penjualan, pendapatan jasa, pemasukan</p>
				</div>
			</button>

			<button on:click={() => { trx.kategori_trx = 'Keluar'; trx.coa_id = ''; }}
				class="flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
				       {trx.kategori_trx === 'Keluar'
				         ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
				         : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'}">
				<div class="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941"/>
					</svg>
				</div>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-bold text-rose-700 dark:text-rose-400">KELUAR (EXPENSE)</span>
						{#if trx.kategori_trx === 'Keluar'}<span class="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">✓</span>{/if}
					</div>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pembelian, biaya operasional, pengeluaran</p>
				</div>
			</button>
		</div>
		{/if}

		<!-- ── STEP 1: Metode Bayar ──────────────────────────────────────────── -->
		{#if step === 1}
		<div transition:fade={{ duration: 120 }}>
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
				Uangnya {trx.kategori_trx === 'Masuk' ? 'masuk ke' : 'keluar dari'} akun mana?
			</p>

			{#if kasAccounts.length === 0}
			<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
				<p class="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">⚠️ Belum ada akun kas/bank</p>
				<p class="text-xs text-amber-600 dark:text-amber-400 mb-2">Tambahkan akun kas/bank di halaman Entri Transaksi terlebih dahulu.</p>
				<a href="/finance/{selectedUnitSlug}/entry" on:click={close}
					class="text-xs font-bold text-amber-800 dark:text-amber-200 underline">→ Buka Entri Transaksi</a>
			</div>
			{:else}
			<div class="space-y-2 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
				{#each kasAccounts as kas}
				<button on:click={() => trx.kas_coa_id = String(kas.id)}
					class="w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
					       {trx.kas_coa_id === String(kas.id)
					         ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
					         : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}">
					<div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0
					            {trx.kas_coa_id === String(kas.id) ? 'bg-indigo-500' : 'bg-slate-100 dark:bg-slate-800'}">
						{kas.namaAkun.toLowerCase().includes('bank') || kas.namaAkun.toLowerCase().includes('transfer') ? '🏦' :
						 kas.namaAkun.toLowerCase().includes('qris') || kas.namaAkun.toLowerCase().includes('digital') ||
						 kas.namaAkun.toLowerCase().includes('gopay') || kas.namaAkun.toLowerCase().includes('ovo') ? '📱' : '💵'}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{kas.namaAkun}</p>
						<p class="text-[10px] text-slate-400">{kas.kodeAkun}</p>
					</div>
					{#if trx.kas_coa_id === String(kas.id)}
					<svg class="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
					</svg>
					{/if}
				</button>
				{/each}
			</div>

			<div class="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
				<p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
					📚 Jurnal: {trx.kategori_trx === 'Masuk'
						? `Debit ${selectedKasName} → Kredit Pendapatan`
						: `Debit Beban → Kredit ${selectedKasName}`}
				</p>
			</div>
			{/if}
		</div>
		{/if}

		<!-- ── STEP 2: Akun COA ──────────────────────────────────────────────── -->
		{#if step === 2}
		<div transition:fade={{ duration: 120 }}>
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
				{trx.kategori_trx === 'Masuk' ? '📈 Pilih akun pendapatan:' : '📉 Pilih akun beban:'}
			</p>

			{#if filteredCoa.length === 0}
			<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
				<p class="text-xs font-medium text-amber-700 dark:text-amber-300">
					Tidak ada akun COA untuk tipe {trx.kategori_trx}. Tambahkan via Master Data COA.
				</p>
			</div>
			{:else}
			<div class="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
				{#each filteredCoa as coa}
				<button on:click={() => trx.coa_id = String(coa.id)}
					class="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
					       {trx.coa_id === String(coa.id)
					         ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
					         : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'}">
					<div class="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0
					            {trx.coa_id === String(coa.id) ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">
						{coa.kodeAkun.split('-')[0]}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{coa.namaAkun}</p>
						<p class="text-[10px] text-slate-400">{coa.kodeAkun}</p>
					</div>
					{#if trx.coa_id === String(coa.id)}
					<svg class="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
					</svg>
					{/if}
				</button>
				{/each}
			</div>
			{/if}
		</div>
		{/if}

		<!-- ── STEP 3: Produk (Optional) ────────────────────────────────────── -->
		{#if step === 3}
		<div transition:fade={{ duration: 120 }}>
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Pilih produk untuk kalkulasi otomatis (opsional):</p>

			<div class="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 mb-3">
				<!-- No product option -->
				<button on:click={() => { trx.product_id = ''; trx.qty = 1; trx.nominal = 0; trx.keterangan = ''; }}
					class="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
					       {!trx.product_id
					         ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800'
					         : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}">
					<div class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm shrink-0">✏️</div>
					<div>
						<p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanpa Produk (Input Manual)</p>
						<p class="text-[10px] text-slate-400">Nominal diisi manual di langkah berikutnya</p>
					</div>
					{#if !trx.product_id}
					<svg class="w-3.5 h-3.5 text-slate-500 shrink-0 ml-auto" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
					</svg>
					{/if}
				</button>

				{#each products as p}
				<button on:click={() => { trx.product_id = String(p.id); trx.qty = 1; }}
					class="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
					       {trx.product_id === String(p.id)
					         ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
					         : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800'}">
					<div class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 text-sm">📦</div>
					<div class="flex-1 min-w-0">
						<p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nama}</p>
						<p class="text-[10px] text-slate-400">
							{trx.kategori_trx === 'Masuk' ? fmtRp(p.hargaJual) : fmtRp(p.hargaBeli)} · Stok: {p.stok ?? 0}
						</p>
					</div>
					{#if trx.product_id === String(p.id)}
					<svg class="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
					</svg>
					{/if}
				</button>
				{/each}
			</div>

			{#if selectedProduct}
			<div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-3">
				<p class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-2">🔢 Atur jumlah:</p>
				<div class="flex items-center gap-3">
					<button on:click={() => trx.qty = Math.max(1, trx.qty - 1)}
						class="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center">−</button>
					<input type="number" bind:value={trx.qty} min="1"
						class="flex-1 p-2 text-center text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
					<button on:click={() => trx.qty = trx.qty + 1}
						class="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center">+</button>
				</div>
				{#if isStokKurang}
				<p class="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-2">⚠️ Stok tidak cukup (tersedia: {selectedProduct.stok})</p>
				{:else}
				<p class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-semibold">= {fmtRp(trx.nominal)}</p>
				{/if}
			</div>
			{/if}
		</div>
		{/if}

		<!-- ── STEP 4: Nominal ───────────────────────────────────────────────── -->
		{#if step === 4}
		<div transition:fade={{ duration: 120 }}>
			{#if selectedProduct}
			<div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 mb-4">
				<p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">🔢 Kalkulasi otomatis dari produk:</p>
				<p class="text-xs text-slate-600 dark:text-slate-400">
					{selectedProduct.nama} × {trx.qty} = {fmtRp(trx.nominal)}
				</p>
			</div>
			{:else}
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Masukkan nominal transaksi:</p>

			<div class="mb-3">
				<label class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Jumlah / Qty</label>
				<input type="number" bind:value={trx.qty} min="1"
					class="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
			</div>
			{/if}

			<div>
				<label class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Total Nominal</label>
				<div class="relative">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">IDR</span>
					<input type="number" bind:value={trx.nominal} min="0" step="1000"
						readonly={!!selectedProduct}
						class="w-full pl-12 pr-3 py-3 text-lg font-black border border-slate-200 dark:border-slate-700 rounded-xl
						       {selectedProduct ? 'bg-slate-50 dark:bg-slate-900 text-slate-500' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white'}
						       focus:ring-2 focus:ring-indigo-500 outline-none"
						placeholder="0">
				</div>
				{#if trx.nominal > 0}
				<p class="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-2">{fmtRp(trx.nominal)}</p>
				{/if}
			</div>
		</div>
		{/if}

		<!-- ── STEP 5: Keterangan ────────────────────────────────────────────── -->
		{#if step === 5}
		<div transition:fade={{ duration: 120 }}>
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Tambahkan deskripsi/keterangan transaksi:</p>
			<textarea bind:value={trx.keterangan}
				class="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800
				       text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none uppercase"
				placeholder="Contoh: PENJUALAN KOPI AMERICANO 3 CUP..."></textarea>
			<p class="text-[10px] text-slate-400 mt-1">💡 Opsional — tapi membantu audit dan pelaporan transaksi.</p>
		</div>
		{/if}

		<!-- ── STEP 6: Konfirmasi ────────────────────────────────────────────── -->
		{#if step === 6}
		<div transition:fade={{ duration: 120 }}>
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Review data sebelum disimpan:</p>

			<div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
				<div class="flex justify-between items-center">
					<span class="text-[10px] text-slate-500 uppercase tracking-wider">Tipe</span>
					<span class="text-sm font-bold {trx.kategori_trx === 'Masuk' ? 'text-emerald-600' : 'text-rose-600'}">
						{trx.kategori_trx === 'Masuk' ? '📈 MASUK' : '📉 KELUAR'}
					</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-[10px] text-slate-500 uppercase tracking-wider">Metode Bayar</span>
					<span class="text-xs font-semibold text-slate-800 dark:text-white">{selectedKasName}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-[10px] text-slate-500 uppercase tracking-wider">Akun COA</span>
					<span class="text-xs font-semibold text-slate-800 dark:text-white">{selectedCoaName}</span>
				</div>
				{#if selectedProduct}
				<div class="flex justify-between items-center">
					<span class="text-[10px] text-slate-500 uppercase tracking-wider">Produk</span>
					<span class="text-xs font-semibold text-slate-800 dark:text-white">{selectedProduct.nama} × {trx.qty}</span>
				</div>
				{/if}
				<div class="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-3">
					<span class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Nominal</span>
					<span class="text-base font-black text-indigo-600 dark:text-indigo-400">{fmtRp(trx.nominal)}</span>
				</div>
				{#if trx.keterangan}
				<div>
					<span class="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Keterangan</span>
					<p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{trx.keterangan}</p>
				</div>
				{/if}
			</div>

			{#if submitError}
			<div class="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-2">
				<svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				<p class="text-xs font-medium text-red-700 dark:text-red-300">{submitError}</p>
			</div>
			{/if}
		</div>
		{/if}

		{/if}<!-- end hasCoa/loading/error else -->
		</div><!-- end body -->

		<!-- ── FOOTER ──────────────────────────────────────────────────────────── -->
		{#if hasCoa && !isLoadingData && !loadError}
		<div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3">
			{#if step === 0}
			<button on:click={close}
				class="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
				Batal
			</button>
			{:else}
			<button on:click={() => step--}
				class="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
				← Kembali
			</button>
			{/if}

			{#if step < 6}
			<button on:click={() => step++}
				disabled={step === 1 && kasAccounts.length === 0}
				class="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
				Lanjut →
			</button>
			{:else}
			<button on:click={submit}
				disabled={!canSubmit}
				class="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2
				       {canSubmit ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'}">
				{#if isSubmitting}
				<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
				<span>Menyimpan...</span>
				{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
				</svg>
				<span>Simpan & Catat Jurnal</span>
				{/if}
			</button>
			{/if}
		</div>
		{/if}

	</div>
	</div>
</div>
{/if}
