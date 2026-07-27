<script>
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';

	export let data;
	export let form;

	const { unit, tahun, bulan, budgets, coaList, summary, realisasiPerBulan } = data;

	const bulanNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
	const bulanFull = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

	let showForm = false;
	let isSubmitting = false;

	const idr = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
	const pct = (n) => Math.round(n || 0) + '%';

	// Progress bar color
	function progressColor(pct) {
		if (pct >= 100) return 'bg-red-500';
		if (pct >= 80) return 'bg-amber-500';
		return 'bg-emerald-500';
	}
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8" in:fade>
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<p class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Master Data</p>
			<h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Budget & Target</h1>
			<p class="text-slate-400 text-sm mt-1">{unit.nama_unit} — Tahun {tahun}</p>
		</div>
		<div class="flex gap-3 items-center">
			<!-- Year filter -->
			<form method="GET">
				<select name="tahun" on:change={(e) => e.target.form.submit()}
					class="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold">
					{#each [tahun-1, tahun, tahun+1] as y}
						<option value={y} selected={y === tahun}>{y}</option>
					{/each}
				</select>
			</form>
			<button on:click={() => showForm = !showForm}
				class="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition">
				{showForm ? 'Tutup' : '+ Tambah Budget'}
			</button>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		{#each [
			{ label: 'Target Pendapatan', value: summary.budgetMasuk, sub: 'Bulan ini', color: 'emerald' },
			{ label: 'Realisasi Masuk', value: summary.totalMasuk, sub: 'Aktual', color: 'blue' },
			{ label: 'Target Pengeluaran', value: summary.budgetKeluar, sub: 'Bulan ini', color: 'amber' },
			{ label: 'Realisasi Keluar', value: summary.totalKeluar, sub: 'Aktual', color: 'red' }
		] as card}
			<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
				<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
				<p class="text-xl font-black text-slate-900 dark:text-white tracking-tight">{idr(card.value)}</p>
				<p class="text-[10px] font-bold text-slate-400 mt-1">{card.sub}</p>
			</div>
		{/each}
	</div>

	<!-- Add Budget Form -->
	{#if showForm}
		<div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6" transition:fade>
			<h3 class="font-black text-slate-800 dark:text-white mb-4 uppercase text-sm tracking-widest">Tambah / Update Budget</h3>
			{#if form?.message}
				<p class="mb-3 text-sm {form?.success ? 'text-emerald-600' : 'text-red-500'} font-medium">{form.message}</p>
			{/if}
			<form method="POST" action="?/saveBudget"
				use:enhance={() => { isSubmitting = true; return async ({ update }) => { isSubmitting = false; showForm = false; await update(); }; }}
				class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="col-span-2">
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Akun / Kategori</label>
					<select name="coaId" class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
						<option value="">— Pilih Akun (opsional) —</option>
						{#each coaList as coa}
							<option value={coa.id}>{coa.kode_akun} — {coa.nama_akun}</option>
						{/each}
					</select>
					<input type="text" name="coaLabel" placeholder="Atau ketik label manual..." required
						class="w-full mt-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"/>
				</div>
				<div>
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Bulan</label>
					<select name="bulan" class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
						<option value="0">Tahunan</option>
						{#each bulanNames.slice(1) as b, i}
							<option value={i+1} selected={i+1 === bulan}>{b}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tahun</label>
					<input type="number" name="tahun" value={tahun} min="2020" max="2099"
						class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"/>
				</div>
				<div class="col-span-2">
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nominal Target (Rp)</label>
					<input type="number" name="nominal" min="1" required placeholder="5000000"
						class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"/>
				</div>
				<div class="col-span-2">
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Keterangan</label>
					<input type="text" name="keterangan" placeholder="Opsional..."
						class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"/>
				</div>
				<div class="col-span-full flex justify-end">
					<button type="submit" disabled={isSubmitting}
						class="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-60">
						{isSubmitting ? 'Menyimpan...' : 'Simpan Budget'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Budget List -->
	{#if budgets.length === 0}
		<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-12 text-center">
			<p class="text-slate-400 font-medium">Belum ada budget yang diset untuk tahun {tahun}</p>
			<button on:click={() => showForm = true} class="mt-4 text-indigo-600 font-bold text-sm hover:underline">+ Tambah Budget Pertama</button>
		</div>
	{:else}
		<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
			<table class="w-full">
				<thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
					<tr>
						{#each ['Kategori / Akun', 'Bulan', 'Target', 'Realisasi', 'Progress', 'Selisih', ''] as th}
							<th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">{th}</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-50 dark:divide-slate-700">
					{#each budgets as b}
						<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
							<td class="p-4">
								<p class="text-sm font-bold text-slate-800 dark:text-white">{b.nama_akun || b.keterangan || 'Budget'}</p>
								{#if b.tipe_akun}<span class="text-[9px] font-bold text-slate-400 uppercase">{b.tipe_akun}</span>{/if}
							</td>
							<td class="p-4 text-sm font-bold text-slate-600 dark:text-slate-300">
								{b.bulan === 0 ? 'Tahunan' : bulanFull[b.bulan]}
							</td>
							<td class="p-4 text-sm font-mono font-bold text-slate-800 dark:text-white">{idr(b.nominal)}</td>
							<td class="p-4 text-sm font-mono font-bold text-slate-600 dark:text-slate-300">{idr(b.realisasi)}</td>
							<td class="p-4" style="min-width: 120px">
								<div class="flex items-center gap-2">
									<div class="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
										<div class="h-full rounded-full transition-all {progressColor(b.progress)}"
											style="width: {Math.min(b.progress, 100)}%"></div>
									</div>
									<span class="text-[10px] font-black {b.isOverBudget ? 'text-red-500' : 'text-slate-500'}">{pct(b.progress)}</span>
								</div>
							</td>
							<td class="p-4 text-sm font-mono font-bold {b.selisih >= 0 ? 'text-emerald-600' : 'text-red-500'}">
								{b.selisih >= 0 ? '+' : ''}{idr(b.selisih)}
							</td>
							<td class="p-4">
								<form method="POST" action="?/deleteBudget" use:enhance>
									<input type="hidden" name="id" value={b.id}/>
									<button type="submit" class="text-slate-300 hover:text-red-400 transition p-1">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
										</svg>
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
