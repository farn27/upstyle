<script>
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import SvelteMarkdown from 'svelte-markdown';
	import { onMount } from 'svelte';

	export let data;

	const slug = $page.params.slug;
	const unit = data?.unit;

	let analysis = '';
	let loading = false;
	let question = '';
	let error = '';
	let laporan = '';
	let loadingLaporan = false;
	let lapPeriode = 'hari_ini';

	async function loadAnalysis() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai-advisor', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ unitId: unit?.id, question })
			});
			const data = await res.json();
			if (data.success) {
				analysis = data.data.analysis;
			} else {
				error = data.message || 'Gagal menganalisis';
			}
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function generateLaporan() {
		loadingLaporan = true;
		laporan = '';
		try {
			const res = await fetch('/api/laporan-wa', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ unitId: unit?.id, periode: lapPeriode })
			});
			const d = await res.json();
			if (d.success) laporan = d.data.teks;
			else error = d.message;
		} catch (e) {
			error = e.message;
		} finally {
			loadingLaporan = false;
		}
	}

	function copyLaporan() {
		navigator.clipboard.writeText(laporan);
	}

	onMount(() => { loadAnalysis(); });
</script>

<svelte:head><title>AI Financial Advisor — {unit?.nama_unit || 'Upstyle'}</title></svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8" in:fade>
	<!-- Header -->
	<div>
		<p class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Kecerdasan Buatan</p>
		<h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">AI Financial Advisor</h1>
		<p class="text-slate-400 text-sm mt-1">Analisis mendalam keuangan {unit?.nama_unit} berbasis data nyata 3 bulan terakhir</p>
	</div>

	<!-- AI Analysis Card -->
	<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
		<div class="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
					<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
					</svg>
				</div>
				<div>
					<h2 class="text-sm font-black text-slate-800 dark:text-white uppercase">Analisis AI</h2>
					<p class="text-[10px] text-slate-400">Model: Groq llama-3.3-70b-versatile</p>
				</div>
			</div>
			<button on:click={() => loadAnalysis()}
				disabled={loading}
				class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-60">
				{loading ? '🤖 Menganalisis...' : '🔄 Refresh'}
			</button>
		</div>

		<!-- Question input -->
		<div class="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
			<div class="flex gap-2">
				<input bind:value={question} type="text"
					placeholder="Tanya sesuatu... misal: 'Kenapa pengeluaran bulan ini tinggi?'"
					class="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
					on:keydown={(e) => e.key === 'Enter' && loadAnalysis()}/>
				<button on:click={() => loadAnalysis()} disabled={loading}
					class="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition disabled:opacity-60">
					Tanya
				</button>
			</div>
		</div>

		<!-- Analysis output -->
		<div class="p-6">
			{#if loading}
				<div class="flex items-center gap-3 py-8 text-center justify-center">
					<div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
					<p class="text-slate-400 text-sm">AI sedang menganalisis data keuangan kamu...</p>
				</div>
			{:else if error}
				<div class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>
			{:else if analysis}
				<div class="prose prose-slate dark:prose-invert max-w-none text-sm">
					<SvelteMarkdown source={analysis} />
				</div>
			{:else}
				<p class="text-slate-400 text-sm text-center py-8">Klik "Refresh" untuk mulai analisis</p>
			{/if}
		</div>
	</div>

	<!-- Laporan WA Generator -->
	<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
		<div class="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
			<div class="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
				<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
			</div>
			<div>
				<h2 class="text-sm font-black text-slate-800 dark:text-white uppercase">Laporan WA</h2>
				<p class="text-[10px] text-slate-400">Generate ringkasan keuangan siap kirim ke WhatsApp</p>
			</div>
		</div>

		<div class="p-5">
			<div class="flex gap-3 mb-4">
				<select bind:value={lapPeriode}
					class="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold">
					<option value="hari_ini">Hari Ini</option>
					<option value="kemarin">Kemarin</option>
					<option value="minggu_ini">Minggu Ini</option>
					<option value="bulan_ini">Bulan Ini</option>
				</select>
				<button on:click={generateLaporan} disabled={loadingLaporan}
					class="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition disabled:opacity-60">
					{loadingLaporan ? 'Generating...' : '📊 Generate Laporan'}
				</button>
			</div>

			{#if laporan}
				<div class="relative">
					<pre class="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono leading-relaxed border border-slate-100 dark:border-slate-700">{laporan}</pre>
					<button on:click={copyLaporan}
						class="absolute top-3 right-3 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition shadow-sm">
						📋 Copy
					</button>
				</div>
				<p class="text-xs text-slate-400 mt-2">Copy teks di atas dan kirim ke WA owner / group bisnis kamu</p>
			{/if}
		</div>
	</div>
</div>
