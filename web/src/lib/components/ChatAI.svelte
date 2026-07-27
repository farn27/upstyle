<script>
	import { tick, onMount } from 'svelte';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	export let isOpen = false;
	export let userId = '';
	/** @type {string} — reserved for future role-based feature gating */
	export const role = '';

	const BUSINESS_PATTERN = /omzet|laba|rugi|kas|saldo|piutang|hutang|stok|produk|barang|karyawan|gaji|absen|pelanggan|deal|invoice|jurnal|kasir|penjualan|transaksi|supplier|aset|pajak|anggaran|gudang|coa|akun|opname|payroll|cuti|shift|crm|pos|restock|profit|pengeluaran|pemasukan|tutup.?buku|closing|cash.?flow|laporan|neraca|arus.?kas|buku.?besar|keuangan|bisnis|analisis|ringkasan|rekap|dead.?stock|follow.?up|pipeline|penyusutan|kontrak|kpi|slip|tunjangan|potongan|bpjs|absensi|purchase.?order|nilai.?aset|tarif|over.?budget|restock|saldo|modal|revenue|tagihan|total|voucher|kampanye|iklan|leads?|tiket|ticket|keluhan|toko.?online|marketplace|sales.?order|quotation|komisi|target.?sales/i;
	const GENERAL_PATTERN = /cara|bagaimana|di mana|dimana|apa itu|jelaskan|tutorial|bantuan|help|setting|setup|fitur|menu|aplikasi|export|import|cetak|print|download|integrasi|password|login|tips|strategi|rekomendasi|perbedaan|pengertian|definisi|apa perbedaan|double.?entry|chart of account|onboarding|panduan|petunjuk|langkah/i;

	// ─── Session & History Types ────────────────────────────────────────────────
	/**
	 * @typedef {{id:string, title:string, createdAt:number, updatedAt:number, messages:Array}} Session
	 */
	const STORAGE_KEY = () => `bizgrow_sessions_${userId || 'anon'}`;
	const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

	// ─── State ─────────────────────────────────────────────────────────────────
	let query = '';
	let isLoading = false;
	let isLoaded = false;
	let isExpanded = false;
	let showScrollBtn = false;
	let copiedIdx = -1;
	let showHistory = false; // sidebar history

	let pendingMessage = '';
	let showUnitPicker = false;
	let selectedUnitSlug = '';
	let selectedUnitName = '';
	let userClearedUnit = false;

	/** @type {Array} */
	let chatHistory = [];
	/** @type {string} active session ID */
	let activeSessionId = '';
	/** @type {Array<Session>} all sessions */
	let allSessions = [];

	let userUnits = [];
	let currentSuggestions = [];
	let instantResponse = false;
	let welcomeTab = 'bisnis';

	let chatContainer;
	let inputEl;

	// ─── Session Management ─────────────────────────────────────────────────────
	function genId() {
		return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
	}

	/** Buat judul otomatis dari pesan pertama user */
	function makeTitle(messages) {
		const first = messages.find(m => m.role === 'user')?.content ?? '';
		return first.length > 40 ? first.slice(0, 40) + '…' : first || 'Chat baru';
	}

	/** Load semua sesi dari localStorage, filter yang sudah expired */
	function loadAllSessions() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY());
			/** @type {Session[]} */
			const parsed = raw ? JSON.parse(raw) : [];
			const now = Date.now();
			// Hapus sesi > 30 hari
			allSessions = parsed.filter(s => (now - s.createdAt) < SESSION_TTL_MS);
			persistSessions();
		} catch { allSessions = []; }
	}

	function persistSessions() {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY(), JSON.stringify(allSessions));
	}

	/** Simpan sesi aktif ke dalam allSessions */
	function saveActiveSession() {
		if (!activeSessionId || chatHistory.length === 0) return;
		const idx = allSessions.findIndex(s => s.id === activeSessionId);
		const session = {
			id: activeSessionId,
			title: makeTitle(chatHistory),
			createdAt: allSessions[idx]?.createdAt ?? Date.now(),
			updatedAt: Date.now(),
			messages: chatHistory.slice(-80) // maks 80 pesan per sesi
		};
		if (idx >= 0) allSessions[idx] = session;
		else allSessions = [session, ...allSessions];
		allSessions = [...allSessions]; // trigger reactivity
		persistSessions();
	}

	/** Mulai sesi baru kosong */
	function newSession() {
		saveActiveSession(); // simpan sesi lama dulu
		activeSessionId = genId();
		chatHistory = [];
		currentSuggestions = [];
		showHistory = false;
		tick().then(() => inputEl?.focus());
	}

	/** Load sesi tertentu */
	function loadSession(session) {
		saveActiveSession(); // simpan sesi aktif sebelum ganti
		activeSessionId = session.id;
		chatHistory = session.messages ?? [];
		currentSuggestions = [];
		showHistory = false;
		scrollToBottom();
	}

	/** Hapus satu sesi */
	function deleteSession(id, e) {
		e.stopPropagation();
		allSessions = allSessions.filter(s => s.id !== id);
		persistSessions();
		if (id === activeSessionId) newSession();
	}

	/** Hapus semua sesi */
	function clearAllSessions() {
		if (!confirm('Hapus semua riwayat chat? Tindakan ini tidak bisa dibatalkan.')) return;
		allSessions = [];
		persistSessions();
		newSession();
	}

	/** Format tanggal/waktu untuk label sesi */
	function fmtSessionDate(ts) {
		const d = new Date(ts);
		const now = new Date();
		const diffDays = Math.floor((now - d) / 86400000);
		if (diffDays === 0) return 'Hari ini ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
		if (diffDays === 1) return 'Kemarin';
		if (diffDays < 7) return `${diffDays} hari lalu`;
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────
	onMount(() => {
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) instantResponse = true;
		loadAllSessions();
		// Lanjutkan sesi terakhir atau buat baru
		if (allSessions.length > 0) {
			const last = allSessions[0]; // sudah urut terbaru pertama
			activeSessionId = last.id;
			chatHistory = last.messages ?? [];
		} else {
			activeSessionId = genId();
		}
		isLoaded = true;
		scrollToBottom();

		const handleLink = (e) => {
			const a = e.target.closest?.('.ai-msg a');
			if (a) { e.preventDefault(); const h = a.getAttribute('href'); if (h) window.location.href = h; }
		};
		document.addEventListener('click', handleLink);
		return () => document.removeEventListener('click', handleLink);
	});

	// Auto-save sesi aktif saat chatHistory berubah
	$: if (browser && isLoaded && chatHistory.length > 0) {
		saveActiveSession();
	}

	// ─── Reactive ──────────────────────────────────────────────────────────────
	$: if (browser && userId && userUnits.length === 0) {
		fetch(`/api/units?userId=${userId}`)
			.then(r => r.json())
			.then(d => {
				if (d?.units) { userUnits = d.units; syncSlugFromPage(userUnits); }
			}).catch(() => {});
	}

	$: if (browser && userUnits.length > 0) {
		const slug = $page.params?.slug;
		if (slug && slug !== selectedUnitSlug) userClearedUnit = false;
		if (!userClearedUnit) syncSlugFromPage(userUnits);
	}

	function syncSlugFromPage(units) {
		const slug = $page.params?.slug;
		if (slug) {
			const match = units.find(u => u.slug === slug);
			if (match && match.slug !== selectedUnitSlug) {
				selectedUnitSlug = match.slug;
				selectedUnitName = match.nama_unit;
			}
		}
	}

	$: if (userId && !isLoaded && browser) { loadAllSessions(); isLoaded = true; }
	$: if (isOpen && browser) tick().then(() => inputEl?.focus());

	// ─── Helpers ───────────────────────────────────────────────────────────────
	function clearHistory() {
		if (confirm('Hapus chat sesi ini?')) {
			chatHistory = [];
			currentSuggestions = [];
			// Hapus dari allSessions
			allSessions = allSessions.filter(s => s.id !== activeSessionId);
			persistSessions();
			activeSessionId = genId(); // fresh session
		}
	}

	async function scrollToBottom() {
		await tick();
		chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
	}

	function handleScroll() {
		if (!chatContainer) return;
		showScrollBtn = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) > 80;
	}

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
	}

	function autoResize(node) {
		const resize = () => { node.style.height = 'auto'; node.style.height = Math.min(node.scrollHeight, 96) + 'px'; };
		node.addEventListener('input', resize);
		return { destroy: () => node.removeEventListener('input', resize) };
	}

	function fmtTime(ts) {
		if (!ts) return '';
		return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}

	async function copyMsg(text, idx) {
		await navigator.clipboard?.writeText(text).catch(() => {});
		copiedIdx = idx; setTimeout(() => copiedIdx = -1, 1500);
	}

	function sendSuggestion(text) {
		query = text;
		currentSuggestions = [];
		// Lewat handleSend agar logika unit picker tetap berlaku
		handleSend();
	}

	// Mode: apakah pertanyaan ini adalah panduan navigasi (tidak butuh unit)
	function isNavigationQuery(msg) {
		return GENERAL_PATTERN.test(msg) || /cara|langkah|tutorial|panduan|petunjuk/i.test(msg);
	}

	function clearUnit() {
		selectedUnitSlug = '';
		selectedUnitName = '';
		userClearedUnit = true; // prevent re-sync dari page
	}

	function selectUnit(slug, name) {
		selectedUnitSlug = slug; selectedUnitName = name;
		userClearedUnit = false; // reset flag
		showUnitPicker = false;
		if (pendingMessage) { const m = pendingMessage; pendingMessage = ''; sendChat(m); }
	}

	function cancelPicker() { showUnitPicker = false; pendingMessage = ''; }

	function handleSend() {
		const msg = query.trim();
		if (!msg || isLoading) return;

		// Tentukan apakah pesan ini butuh unit bisnis:
		// 1. Mengandung kata bisnis DAN bukan pertanyaan general/cara
		// 2. DAN belum ada unit terpilih
		// 3. DAN ada lebih dari 1 unit (jika hanya 1 unit, auto-pilih)
		const isBusiness = BUSINESS_PATTERN.test(msg);
		const isGeneral = GENERAL_PATTERN.test(msg);
		const needsUnit = isBusiness && !isGeneral;

		if (needsUnit && !selectedUnitSlug) {
			if (userUnits.length === 1) {
				// Hanya 1 unit → auto-pilih
				selectedUnitSlug = userUnits[0].slug;
				selectedUnitName = userUnits[0].nama_unit;
			} else if (userUnits.length > 1) {
				// Lebih dari 1 unit → tampilkan picker
				pendingMessage = msg; query = '';
				if (inputEl) inputEl.style.height = 'auto';
				showUnitPicker = true; return;
			}
			// Jika belum ada unit sama sekali (belum load), tetap lanjut
		}

		query = '';
		if (inputEl) inputEl.style.height = 'auto';
		sendChat(msg);
	}

	async function sendChat(msg) {
		chatHistory = [...chatHistory, { role: 'user', content: msg, ts: Date.now(), unitName: selectedUnitName || null }];
		await scrollToBottom();
		isLoading = true; currentSuggestions = [];

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: msg, userId, activeUnitSlug: selectedUnitSlug || null, history: chatHistory.slice(-20) })
			});
			if (!res.ok) throw new Error(`${res.status}`);
			const data = await res.json();
			const fullReply = data.reply || 'Maaf kak, terjadi kesalahan.';
			const chartData = data.chartData ?? null;
			chatHistory = [...chatHistory, { role: 'assistant', content: '', fullReply, chartData, ts: Date.now() }];
			const idx = chatHistory.length - 1;

			if (instantResponse) {
				chatHistory[idx].content = fullReply; chatHistory = [...chatHistory];
			} else {
				let cur = '';
				for (let i = 0; i < fullReply.length; i++) {
					cur += fullReply[i];
					if (i % 5 === 0 || i === fullReply.length - 1) {
						chatHistory[idx].content = cur; chatHistory = [...chatHistory];
						await tick();
						if (!showScrollBtn && chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
					}
					await new Promise(r => setTimeout(r, 5));
				}
			}

			currentSuggestions = data.suggestions?.length ? data.suggestions : ['Ringkasan keuangan', 'Bantuan fitur'];
			if (chatHistory.length > 40) chatHistory = chatHistory.slice(-40);
			await scrollToBottom();
		} catch {
			chatHistory = [...chatHistory, { role: 'assistant', content: 'Koneksi terputus. Coba lagi ya kak 🙏', ts: Date.now() }];
		} finally { isLoading = false; }
	}

	function formatAI(text) {
		if (!text) return '';
		return text
			.replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/```([\s\S]*?)```/g, '<pre class="ai-code"><code>$1</code></pre>')
			.replace(/`([^`]+)`/g, '<code class="ai-ic">$1</code>')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/^#{1,2} (.+)$/gm, '<p class="ai-h2">$1</p>')
			.replace(/^### (.+)$/gm, '<p class="ai-h3">$1</p>')
			.replace(/^- (.+)$/gm, '<li>$1</li>')
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
				url.startsWith('/')
					? `<a href="${url}" class="ai-action-btn">→ ${label}</a>`
					: `<a href="${url}" target="_blank" rel="noopener" class="ai-link">${label}</a>`
			);
	}

	async function renderChart(node, data) {
		if (!browser || !data) return;
		const { default: Chart } = await import('chart.js/auto');
		const dark = document.documentElement.classList.contains('dark');
		const tc = dark ? '#94a3b8' : '#64748b', gc = dark ? '#334155' : '#e2e8f0';
		data.options ??= {}; data.options.plugins ??= {};
		data.options.plugins.legend = { labels: { color: tc } };
		data.options.responsive = true;
		['x','y'].forEach(ax => { if (data.options.scales?.[ax]) {
			data.options.scales[ax].ticks = { color: tc };
			data.options.scales[ax].grid = { color: gc };
		}});
		const chart = new Chart(node, data);
		return { destroy: () => chart.destroy() };
	}

	let dragX = 0;
	let dragY = 0;
	let activeDrag = false;
	let initialX = 0;
	let initialY = 0;

	$: if (!isOpen) {
		dragX = 0;
		dragY = 0;
	}

	function startDrag(e) {
		if (e.button !== 0) return;
		if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('a')) return;
		activeDrag = true;
		initialX = e.clientX - dragX;
		initialY = e.clientY - dragY;
		window.addEventListener('mousemove', drag);
		window.addEventListener('mouseup', endDrag);
	}
	function drag(e) {
		if (!activeDrag) return;
		dragX = e.clientX - initialX;
		dragY = e.clientY - initialY;
	}
	function endDrag() {
		activeDrag = false;
		window.removeEventListener('mousemove', drag);
		window.removeEventListener('mouseup', endDrag);
	}

	function startDragTouch(e) {
		if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('a')) return;
		activeDrag = true;
		initialX = e.touches[0].clientX - dragX;
		initialY = e.touches[0].clientY - dragY;
		window.addEventListener('touchmove', dragTouch, { passive: false });
		window.addEventListener('touchend', endDragTouch);
	}
	function dragTouch(e) {
		if (!activeDrag) return;
		e.preventDefault();
		dragX = e.touches[0].clientX - initialX;
		dragY = e.touches[0].clientY - initialY;
	}
	function endDragTouch() {
		activeDrag = false;
		window.removeEventListener('touchmove', dragTouch);
		window.removeEventListener('touchend', endDragTouch);
	}
</script>

<!-- ROOT -->
<div class="fixed bottom-5 right-5 z-[200] select-none" role="region" aria-label="Chat AI Bizgrow">

{#if isOpen || showUnitPicker}
<div style="transform: translate({dragX}px, {dragY}px);" class="absolute bottom-0 right-0 z-50">

<!-- ══ UNIT PICKER (contextual modal) ══════════════════════════════════════ -->
{#if showUnitPicker}
<div class="absolute bottom-0 right-0 w-[320px] bg-white dark:bg-slate-900 rounded-2xl
            shadow-[0_20px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.55)]
            border border-slate-200 dark:border-slate-700 overflow-hidden z-[60]"
     transition:scale={{ start: 0.93, duration: 200 }}>
  <!-- header -->
  <div class="bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-3">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
        <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <div>
        <p class="text-[12px] font-bold text-white leading-none">Pilih Unit Bisnis</p>
        <p class="text-[9.5px] text-indigo-200 mt-0.5">Pertanyaan ini memerlukan data bisnis spesifik</p>
      </div>
    </div>
    <div class="bg-white/10 rounded-lg px-2.5 py-1.5">
      <p class="text-[10px] text-indigo-100 line-clamp-2 leading-relaxed">
        <span class="opacity-60">Pertanyaan: </span>"{pendingMessage}"
      </p>
    </div>
  </div>
  <!-- list -->
  <div class="p-2.5 space-y-1 max-h-[200px] overflow-y-auto scrollbar-hide">
    {#each userUnits as u}
    <button on:click={() => selectUnit(u.slug, u.nama_unit)}
      class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left
             hover:bg-indigo-50 dark:hover:bg-indigo-900/30 group transition-colors">
      <div class="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/60 rounded-lg flex items-center justify-center shrink-0 text-[12px]">🏢</div>
      <div class="flex-1 min-w-0">
        <p class="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate">{u.nama_unit}</p>
        <p class="text-[9.5px] text-slate-400">{u.kategori || 'Unit Bisnis'}</p>
      </div>
      <svg class="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
    {/each}
  </div>
  <!-- footer -->
  <div class="px-2.5 pb-2.5 flex gap-2">
    <button on:click={cancelPicker}
      class="flex-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800
             hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors">
      Batal
    </button>
    <button on:click={() => { showUnitPicker = false; userClearedUnit = false; const m = pendingMessage; pendingMessage = ''; sendChat(m); }}
      class="flex-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300
             bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700
             hover:bg-indigo-100 dark:hover:bg-indigo-800 px-3 py-2 rounded-xl transition-colors">
      Semua Unit
    </button>
  </div>
</div>
{/if}

<!-- ══ CHAT WINDOW ══════════════════════════════════════════════════════════ -->
{#if isOpen}
<div class="flex flex-col bg-white dark:bg-slate-900
            rounded-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden
            shadow-[0_20px_56px_rgba(0,0,0,0.16)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.5)]
            transition-all duration-300 origin-bottom-right"
  class:w-[370px]={!isExpanded} class:w-[520px]={isExpanded}
  style="height:min({isExpanded?660:540}px,calc(100vh - 96px));max-height:calc(100vh - 96px);"
  transition:scale={{ start: 0.92, duration: 220 }}>

  <!-- ── HEADER ─────────────────────────────────────────────────────────── -->
  <div on:mousedown={startDrag} on:touchstart={startDragTouch}
       class="shrink-0 flex items-center justify-between px-3.5 py-2.5
              bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900
              border-b border-slate-700/50 cursor-grab active:cursor-grabbing select-none">
    <!-- Left -->
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="relative shrink-0">
        <div class="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl
                    flex items-center justify-center shadow-md">
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-slate-900"></span>
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-[12.5px] font-bold text-white">Bizgrow AI</span>
          <span class="text-[7.5px] font-bold bg-indigo-500/25 text-indigo-300 px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-500/25">70B</span>
        </div>
        {#if selectedUnitName}
          <div class="flex items-center gap-1 mt-0.5">
            <span class="w-1 h-1 bg-emerald-400 rounded-full shrink-0"></span>
            <span class="text-[9.5px] text-emerald-400 font-semibold truncate max-w-[150px]">{selectedUnitName}</span>
            <button on:click={clearUnit} class="text-slate-500 hover:text-rose-400 transition-colors leading-none" title="Hapus filter">✕</button>
          </div>
        {:else}
          <span class="text-[9px] text-slate-500 mt-0.5 uppercase tracking-widest">Asisten ERP · Online</span>
        {/if}
      </div>
    </div>
    <!-- Right controls -->
    <div class="flex items-center gap-0.5 shrink-0">
      <!-- New chat -->
      <button on:click={newSession} title="Chat baru"
        class="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
      </button>
      <!-- History toggle — badge jumlah sesi -->
      <button on:click={() => showHistory = !showHistory}
        title="Riwayat chat"
        aria-pressed={showHistory}
        class="relative p-1.5 rounded-lg transition-colors
               {showHistory ? 'text-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800'}">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {#if allSessions.length > 0}
          <span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center leading-none">
            {allSessions.length > 9 ? '9+' : allSessions.length}
          </span>
        {/if}
      </button>
      <!-- Typing effect toggle -->
      <button on:click={() => instantResponse = !instantResponse} title="Toggle efek ketik"
        class="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if instantResponse}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" opacity=".3"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"/>
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          {/if}
        </svg>
      </button>
      <button on:click={() => isExpanded = !isExpanded} title={isExpanded?'Perkecil':'Perbesar'}
        class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if isExpanded}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9L4 4m0 0h5m-5 0v5M15 15l5 5m0 0h-5m5 0v-5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5"/>
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
          {/if}
        </svg>
      </button>
      {#if chatHistory.length > 0}
      <button on:click={clearHistory} title="Hapus sesi ini"
        class="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
      {/if}
      <button on:click={() => isOpen = false} title="Tutup"
        class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- ── HISTORY PANEL ──────────────────────────────────────────────────── -->
  {#if showHistory}
  <div class="flex-1 flex flex-col overflow-hidden" transition:slide={{ duration: 200, axis: 'y' }}>
    <!-- History header -->
    <div class="shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div>
        <p class="text-[12px] font-bold text-slate-800 dark:text-white">Riwayat Chat</p>
        <p class="text-[9.5px] text-slate-400 mt-0.5">{allSessions.length} sesi · otomatis hapus setelah 30 hari</p>
      </div>
      <div class="flex items-center gap-1.5">
        <!-- New chat shortcut -->
        <button on:click={newSession}
          class="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400
                 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800
                 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Chat Baru
        </button>
        {#if allSessions.length > 0}
        <button on:click={clearAllSessions}
          class="text-[9.5px] font-medium text-slate-400 hover:text-rose-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
          Hapus semua
        </button>
        {/if}
      </div>
    </div>

    <!-- Session list -->
    <div class="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
      {#if allSessions.length === 0}
        <!-- Empty state -->
        <div class="flex flex-col items-center justify-center h-full py-10 text-center">
          <div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <p class="text-[11.5px] font-semibold text-slate-600 dark:text-slate-400">Belum ada riwayat</p>
          <p class="text-[10px] text-slate-400 mt-1">Mulai chat pertama kamu</p>
          <button on:click={newSession}
            class="mt-4 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors">
            Mulai Chat
          </button>
        </div>
      {:else}
        {#each allSessions as session (session.id)}
        <div
          on:click={() => loadSession(session)}
          on:keydown={(e) => e.key === 'Enter' && loadSession(session)}
          role="button"
          tabindex="0"
          aria-label="Buka sesi: {session.title}"
          class="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left group transition-colors cursor-pointer
                 {session.id === activeSessionId
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800'
                   : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'}"
          transition:slide={{ duration: 150 }}
        >
          <!-- Active indicator -->
          <div class="shrink-0 mt-0.5">
            {#if session.id === activeSessionId}
              <div class="w-5 h-5 bg-indigo-500 rounded-lg flex items-center justify-center">
                <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
              </div>
            {:else}
              <div class="w-5 h-5 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                <svg class="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
              </div>
            {/if}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-[11.5px] font-semibold truncate
                       {session.id === activeSessionId ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}">
              {session.title}
            </p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[9px] text-slate-400">{fmtSessionDate(session.updatedAt)}</span>
              <span class="text-[9px] text-slate-300 dark:text-slate-600">·</span>
              <span class="text-[9px] text-slate-400">{session.messages?.length ?? 0} pesan</span>
              <!-- TTL indicator: kurang 3 hari lagi -->
              {#if (Date.now() - session.createdAt) > 27 * 86400000}
                <span class="text-[8.5px] text-amber-500 font-semibold">⚠ Mau hapus</span>
              {/if}
            </div>
            <!-- Preview pesan terakhir AI -->
            {#if session.messages?.length > 0}
              {@const lastAI = [...session.messages].reverse().find(m => m.role === 'assistant')}
              {#if lastAI}
                <p class="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1 leading-relaxed">
                  {lastAI.content?.replace(/<[^>]+>/g, '').slice(0, 60) || '…'}
                </p>
              {/if}
            {/if}
          </div>

          <!-- Delete button -->
          <button
            on:click={(e) => deleteSession(session.id, e)}
            title="Hapus sesi ini"
            class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg
                   hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-300 hover:text-rose-500 transition-colors">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        {/each}
      {/if}
    </div>

    <!-- Footer info -->
    <div class="shrink-0 px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
      <p class="text-[9px] text-slate-400 dark:text-slate-600 text-center">
        Riwayat tersimpan di browser ini · Otomatis hapus setelah 30 hari
      </p>
    </div>
  </div>
  {/if}

  <!-- ── MESSAGES AREA ──────────────────────────────────────────────────── -->
  {#if !showHistory}
  <div bind:this={chatContainer} on:scroll={handleScroll}
    class="flex-1 overflow-y-auto flex flex-col gap-2.5 px-3.5 py-3
           bg-slate-50/70 dark:bg-slate-900/80
           scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
    aria-live="polite">

    <!-- ══ WELCOME SCREEN ══════════════════════════════════════════════════ -->
    {#if chatHistory.length === 0 && !isLoading}
    <div class="flex flex-col h-full" transition:fade={{ duration: 180 }}>
      <!-- Hero compact -->
      <div class="flex items-center gap-3 px-1 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl
                    flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div>
          <p class="text-[13px] font-bold text-slate-800 dark:text-white leading-snug">Halo! Saya Bizgrow AI ✨</p>
          <p class="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
            Tanya soal keuangan, stok, HR, CRM, atau cara pakai fitur ERP.
          </p>
        </div>
      </div>

      <!-- Tab switcher -->
      <div class="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-3 shrink-0">
        {#each [['bisnis','📊 Bisnis'],['sales','💼 Penjualan'],['bantuan','🛠️ Cara Pakai'],['tips','💡 Tips']] as [t, lbl]}
        <button on:click={() => welcomeTab = t}
          class="flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-all
          {welcomeTab===t ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}">
          {lbl}
        </button>
        {/each}
      </div>

      <!-- Tab content -->
      <div class="flex-1 overflow-y-auto space-y-2.5 scrollbar-hide pb-1">

        {#if welcomeTab === 'bisnis'}
        <div class="wsec"><p class="wlbl">💰 Keuangan & Akuntansi</p><div class="wchips">
          {#each ['Omzet hari ini?','Analisis cash flow','Cek piutang overdue','Cek hutang jatuh tempo','Laba rugi bulan ini','Status tutup buku','Saldo kas & bank'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-blue">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🛒 Kasir & POS</p><div class="wchips">
          {#each ['Total penjualan kasir hari ini','Jam transaksi paling ramai','Metode bayar terpopuler','Order kasir terakhir'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-violet">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">📦 Stok & Inventori</p><div class="wchips">
          {#each ['Produk stok menipis','Analisis dead stock','Barang yang harus direstock','Status PO pending','Riwayat opname gudang'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-emerald">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">👥 HR & Payroll</p><div class="wchips">
          {#each ['Siapa yang absen hari ini?','Cuti pending approval','KPI karyawan terbaik','Karyawan kontrak mau habis','Rincian komponen gaji'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-rose">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🤝 CRM & Pelanggan</p><div class="wchips">
          {#each ['Deals CRM terbesar','Pelanggan perlu follow up','Pipeline yang stagnan','Aktivitas CRM terakhir'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-amber">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🏗️ Aset & Pajak</p><div class="wchips">
          {#each ['Total nilai aset tetap','Penyusutan terbesar','Tarif pajak aktif','Anggaran over-budget?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-slate">{p}</button>{/each}
        </div></div>

        {:else if welcomeTab === 'sales'}
        <div class="wsec"><p class="wlbl">💼 Pipeline & Deal</p><div class="wchips">
          {#each ['Deals terbesar yang open?','Pipeline yang stagnan?','Berapa deal closing bulan ini?','Quotation yang sudah dikirim?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-violet">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">📣 Pemasaran & Leads</p><div class="wchips">
          {#each ['Kampanye iklan aktif?','Berapa leads dari landing page?','ROAS iklan Meta vs Google?','Voucher yang paling banyak dipakai?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-rose">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🎧 Customer Service</p><div class="wchips">
          {#each ['Tiket urgent yang belum selesai?','Berapa tiket open saat ini?','Pelanggan yang sering komplain?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-blue">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🛍️ Toko Online</p><div class="wchips">
          {#each ['Order online yang belum dibayar?','Revenue toko online bulan ini?','Produk terlaris di toko online?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-amber">{p}</button>{/each}
        </div></div>

        {:else if welcomeTab === 'bantuan'}
        <!-- Banner info: cara pakai tidak butuh unit bisnis -->
        <div class="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2.5 mb-2.5">
          <svg class="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
            Panduan cara pakai tidak memerlukan pilih unit bisnis. AI akan memandu kamu step-by-step.
            {#if selectedUnitName}
              Link akan mengarah ke <strong>{selectedUnitName}</strong>.
            {:else}
              Jika butuh navigasi ke halaman tertentu, AI akan minta kamu pilih unit dulu.
            {/if}
          </p>
        </div>
        <div class="wsec"><p class="wlbl">🗺️ Navigasi Fitur</p><div class="wchips">
          {#each ['Di mana input transaksi?','Cara buat invoice piutang?','Di mana tambah karyawan?','Di mana lihat laporan keuangan?','Cara setup COA akuntansi?','Cara atur hak akses staff?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-blue">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">⚙️ Pengaturan & Integrasi</p><div class="wchips">
          {#each ['Cara setup WhatsApp?','Di mana seting kasir POS?','Cara integrasi payment gateway?','Di mana kelola produk?','Cara tambah unit bisnis baru?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-violet">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">📤 Export & Cetak</p><div class="wchips">
          {#each ['Cara export laporan ke PDF?','Cara export data ke Excel?','Di mana cetak slip gaji?','Cara kirim laporan via WhatsApp?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-emerald">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🔐 Akun & Keamanan</p><div class="wchips">
          {#each ['Cara ganti password?','Di mana kelola staff portal?','Cara setting role karyawan?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-rose">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">💼 Penjualan & Marketing</p><div class="wchips">
          {#each ['Cara buat pipeline deals?','Cara buat quotation?','Cara buat kampanye marketing?','Cara buat voucher diskon?','Cara buat landing page?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-violet">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🎧 CS & Toko Online</p><div class="wchips">
          {#each ['Cara buat tiket support?','Cara setup toko online?','Cara tambah integrasi Midtrans?','Cara aktifkan landing page?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-amber">{p}</button>{/each}
        </div></div>
        <!-- Panduan lengkap step by step -->
        <div class="wsec"><p class="wlbl">🎓 Panduan Lengkap Step-by-Step</p><div class="wchips">
          {#each ['Panduan mulai pakai Bizgrow dari nol','Cara setup unit bisnis pertama kali','Langkah input transaksi harian','Cara kelola stok produk lengkap','Panduan buat laporan keuangan'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-amber">{p}</button>{/each}
        </div></div>

        {:else if welcomeTab === 'tips'}
        <div class="wsec"><p class="wlbl">🚀 Produktivitas</p><div class="wchips">
          {#each ['Tips mempercepat input transaksi','Cara optimasi cashflow UMKM','Strategi manajemen stok efisien','Cara tingkatkan closing rate CRM'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-blue">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">📈 Analisis Bisnis</p><div class="wchips">
          {#each ['Cara baca laporan laba rugi','Apa itu gross margin?','Indikator bisnis penting UMKM','Cara proyeksi revenue'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-emerald">{p}</button>{/each}
        </div></div>
        <div class="wsec"><p class="wlbl">🧾 Akuntansi Dasar</p><div class="wchips">
          {#each ['Perbedaan piutang dan hutang?','Cara kerja double-entry?','Apa itu chart of accounts?','Kapan harus tutup buku?'] as p}
            <button on:click={() => sendSuggestion(p)} class="chip c-amber">{p}</button>{/each}
        </div></div>
        {/if}

      </div>
    </div>
    {/if}

    <!-- ══ MESSAGES ══════════════════════════════════════════════════════════ -->
    {#each chatHistory as chat, i (i)}
    <div class="flex gap-2 {chat.role==='user'?'flex-row-reverse':'flex-row'} items-end group"
         transition:fly={{ y: 12, duration: 260, delay: 20 }}>

      <!-- AI icon (compact) -->
      {#if chat.role === 'assistant'}
      <div class="shrink-0 w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60
                  flex items-center justify-center border border-indigo-200/40 dark:border-indigo-700/40
                  self-end mb-0.5 shadow-sm">
        <svg class="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      {/if}

      <div class="flex flex-col {chat.role==='user'?'items-end':'items-start'} max-w-[84%]">
        <!-- Unit badge on user message -->
        {#if chat.role==='user' && chat.unitName}
          <span class="text-[8.5px] text-indigo-400 font-semibold mb-0.5 flex items-center gap-1">
            <span class="w-1 h-1 bg-indigo-400 rounded-full"></span>{chat.unitName}
          </span>
        {/if}

        <!-- Bubble -->
        <div class="relative rounded-2xl text-[12.5px] leading-relaxed shadow-sm
          {chat.role==='user'
            ? 'bg-indigo-600 text-white rounded-br-none px-3 py-2'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-bl-none px-3 py-2.5'}">

          {#if chat.role==='user'}
            <span class="whitespace-pre-wrap">{chat.content}</span>
          {:else}
            <!-- Badge "Panduan" jika response navigasi tanpa unit -->
            {#if !chat.unitName && isNavigationQuery(chatHistory[i-1]?.content ?? '')}
              <div class="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700">
                <span class="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0"></span>
                <span class="text-[9px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Panduan Umum</span>
              </div>
            {/if}
            <div class="ai-msg">{@html formatAI(chat.content)}
              {#if !chat.content && !instantResponse}<span class="cursor-blink"></span>{/if}
            </div>
            {#if chat.chartData && (chat.content?.length > 5 || instantResponse)}
              <div class="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2" transition:fade>
                <canvas use:renderChart={chat.chartData}></canvas>
              </div>
            {/if}
          {/if}

          <!-- Copy btn -->
          <button on:click={() => copyMsg(chat.content, i)} aria-label="Salin"
            class="absolute {chat.role==='user'?'-left-2':'-right-2'} -top-2
                   opacity-0 group-hover:opacity-100 transition-opacity
                   w-5 h-5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600
                   rounded-md flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
            {#if copiedIdx===i}
              <svg class="w-2.5 h-2.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            {:else}
              <svg class="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            {/if}
          </button>
        </div>

        <!-- Timestamp -->
        {#if chat.ts}
          <span class="text-[8.5px] text-slate-400 dark:text-slate-600 mt-0.5 px-0.5
                        opacity-0 group-hover:opacity-100 transition-opacity">{fmtTime(chat.ts)}</span>
        {/if}
      </div>
    </div>
    {/each}

    <!-- Loading -->
    {#if isLoading}
    <div class="flex items-end gap-2" transition:fly={{ y: 8, duration: 180 }}>
      <div class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center border border-indigo-200/40 dark:border-indigo-700/40 shadow-sm shrink-0">
        <svg class="w-3 h-3 text-indigo-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
        <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
        <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
        <span class="text-[11px] text-slate-400 ml-1">Sedang berpikir…</span>
      </div>
    </div>
    {/if}
  </div><!-- end messages -->

  <!-- scroll-to-bottom pill -->
  {#if showScrollBtn && !showHistory}
  <button on:click={scrollToBottom} aria-label="Ke bawah"
    class="absolute bottom-[76px] left-1/2 -translate-x-1/2 z-10
           bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-3 py-1
           text-[10px] font-semibold shadow-lg flex items-center gap-1.5 transition-colors"
    transition:fade={{ duration: 120 }}>
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
    </svg>Pesan baru
  </button>
  {/if}

  <!-- ── SUGGESTIONS ────────────────────────────────────────────────────── -->
  {#if currentSuggestions.length > 0 && !isLoading && chatHistory.length > 0 && !showHistory}
  <div class="shrink-0 flex gap-1.5 overflow-x-auto px-3.5 py-2
              border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90
              backdrop-blur-sm scrollbar-hide" transition:fade>
    {#each currentSuggestions as s}
    <button on:click={() => sendSuggestion(s)}
      class="shrink-0 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300
             bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200/80 dark:border-indigo-700/50
             px-2.5 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800
             transition-colors whitespace-nowrap">{s}</button>
    {/each}
  </div>
  {/if}
  {/if}<!-- end {#if !showHistory} -->

  <!-- ── INPUT AREA ─────────────────────────────────────────────────────── -->
  <div class="shrink-0 px-3.5 pt-2.5 pb-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80">

    {#if showHistory}
      <!-- History mode: tombol aksi -->
      <div class="flex gap-2">
        <button on:click={() => showHistory = false}
          class="flex-1 flex items-center justify-center gap-2 text-[11.5px] font-semibold
                 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800
                 hover:bg-slate-200 dark:hover:bg-slate-700 py-2.5 rounded-xl transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Kembali ke Chat
        </button>
        <button on:click={newSession}
          class="flex-1 flex items-center justify-center gap-2 text-[11.5px] font-semibold
                 text-white bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Chat Baru
        </button>
      </div>
    {:else}
      <!-- Chat mode: input normal -->
      <!-- Unit context pill — only when unit selected AND has messages -->
      {#if selectedUnitName && chatHistory.length > 0}
      <div class="flex items-center gap-1.5 mb-2" transition:fade>
        <span class="text-[9px] text-slate-400 shrink-0">Konteks:</span>
        <span class="inline-flex items-center gap-1 text-[9.5px] font-semibold text-indigo-700 dark:text-indigo-300
                     bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700
                     px-2 py-0.5 rounded-full max-w-[140px] truncate">
          🏢 {selectedUnitName}
          <button on:click={clearUnit} class="shrink-0 text-indigo-300 hover:text-rose-400 transition-colors">✕</button>
        </span>
        {#if userUnits.length > 1}
          <button on:click={() => { pendingMessage = query || '…'; showUnitPicker = true; }}
            class="text-[9px] text-slate-400 hover:text-indigo-500 transition-colors underline shrink-0">
            ganti unit
          </button>
        {/if}
      </div>
      {/if}

      <form on:submit|preventDefault={handleSend} class="flex items-end gap-2">
        <textarea bind:this={inputEl} bind:value={query} on:keydown={handleKeydown} use:autoResize
          placeholder="Tanya apa saja… (Enter kirim, Shift+Enter baris baru)"
          rows="1" disabled={isLoading}
          class="flex-1 resize-none text-[12.5px] px-3 py-2.5 rounded-xl
                 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all
                 text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
                 min-h-[38px] max-h-[96px] leading-snug overflow-hidden"
        ></textarea>
        <button type="submit" disabled={isLoading || !query.trim()} aria-label="Kirim"
          class="shrink-0 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                 disabled:cursor-not-allowed text-white rounded-xl transition-all
                 flex items-center justify-center active:scale-95 shadow-sm shadow-indigo-600/25">
          {#if isLoading}
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" class="opacity-75"/>
            </svg>
          {:else}
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
          {/if}
        </button>
      </form>
    {/if}

    <p class="text-center text-[8px] text-slate-300 dark:text-slate-700 tracking-widest mt-1.5 uppercase select-none">
      Bizgrow AI · LLaMA 3.3 70B via Groq
    </p>
  </div>

</div>
{/if}
</div>
{/if}
<!-- ══ FAB ══════════════════════════════════════════════════════════════════ -->
{#if !isOpen}
<button type="button" on:click={() => isOpen = !isOpen}
  aria-label="Buka Chat AI" aria-expanded="false"
  class="relative w-12 h-12 rounded-full text-white flex items-center justify-center
         shadow-xl transition-all duration-200 group
         bg-indigo-600 hover:bg-indigo-700 hover:scale-105 shadow-indigo-600/35">
  <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
  </svg>
  {#if chatHistory.length > 0}
    <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"></span>
  {/if}
</button>
{/if}

</div>

<style>
  /* ── Welcome screen helpers ─────────────────────────────────────────── */
  :global(.wsec) { margin-bottom: 0; }
  :global(.wlbl) {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
    color: #94a3b8; margin-bottom: 5px;
  }
  :global(.dark .wlbl) { color: #475569; }
  :global(.wchips) { display: flex; flex-wrap: wrap; gap: 5px; }

  /* ── Chips ─────────────────────────────────────────────────────────── */
  :global(.chip) {
    font-size: 10px; font-weight: 600; padding: 4px 9px; border-radius: 9999px;
    border: 1px solid; cursor: pointer; white-space: nowrap;
    transition: all 0.12s ease; line-height: 1.4;
  }
  :global(.chip:hover) { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }

  :global(.c-blue)   { color:#3730a3; background:#eef2ff; border-color:#c7d2fe; }
  :global(.c-violet) { color:#5b21b6; background:#f5f3ff; border-color:#ddd6fe; }
  :global(.c-emerald){ color:#065f46; background:#ecfdf5; border-color:#a7f3d0; }
  :global(.c-rose)   { color:#9f1239; background:#fff1f2; border-color:#fecdd3; }
  :global(.c-amber)  { color:#92400e; background:#fffbeb; border-color:#fde68a; }
  :global(.c-slate)  { color:#334155; background:#f8fafc; border-color:#e2e8f0; }

  :global(.dark .c-blue)   { color:#a5b4fc; background:rgba(79,70,229,0.12); border-color:rgba(99,102,241,0.3); }
  :global(.dark .c-violet) { color:#c4b5fd; background:rgba(109,40,217,0.12); border-color:rgba(139,92,246,0.3); }
  :global(.dark .c-emerald){ color:#6ee7b7; background:rgba(16,185,129,0.1); border-color:rgba(52,211,153,0.3); }
  :global(.dark .c-rose)   { color:#fda4af; background:rgba(225,29,72,0.1); border-color:rgba(251,113,133,0.3); }
  :global(.dark .c-amber)  { color:#fcd34d; background:rgba(217,119,6,0.1); border-color:rgba(252,211,77,0.3); }
  :global(.dark .c-slate)  { color:#94a3b8; background:rgba(71,85,105,0.15); border-color:rgba(100,116,139,0.3); }

  /* ── AI message prose ───────────────────────────────────────────────── */
  :global(.ai-msg) { font-size: 12.5px; line-height: 1.65; word-break: break-word; }
  :global(.ai-msg li) { margin-left: 14px; list-style: disc; margin-bottom: 2px; }
  :global(.ai-msg strong) { font-weight: 700; color: #1e293b; }
  :global(.dark .ai-msg strong) { color: #f1f5f9; }
  :global(.ai-msg .ai-h2) {
    font-weight: 700; font-size: 12.5px; color: #1e293b;
    margin: 8px 0 4px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0;
  }
  :global(.dark .ai-msg .ai-h2) { color: #f1f5f9; border-bottom-color: #334155; }
  :global(.ai-msg .ai-h3) { font-weight: 700; font-size: 12px; color: #334155; margin: 6px 0 3px; }
  :global(.dark .ai-msg .ai-h3) { color: #cbd5e1; }
  :global(.ai-msg .ai-code) {
    background: #0f172a; color: #34d399; padding: 8px 10px; border-radius: 8px;
    font-size: 10.5px; overflow-x: auto; margin: 6px 0; border: 1px solid #1e293b;
  }
  :global(.ai-msg .ai-ic) {
    background: #eef2ff; color: #4338ca; padding: 1px 5px; border-radius: 4px;
    font-size: 10.5px; font-family: monospace; border: 1px solid #c7d2fe;
  }
  :global(.dark .ai-msg .ai-ic) { background: #1e1b4b; color: #a5b4fc; border-color: #3730a3; }
  :global(.ai-msg .ai-action-btn) {
    display: inline-flex; align-items: center; gap: 4px;
    background: #4f46e5; color: white !important; text-decoration: none !important;
    padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;
    margin: 4px 4px 0 0; transition: background 0.15s; line-height: 1;
  }
  :global(.ai-msg .ai-action-btn:hover) { background: #4338ca; }
  :global(.ai-msg .ai-link) {
    color: #4f46e5; text-decoration: none; border-bottom: 1px solid #c7d2fe;
    font-weight: 500; transition: opacity 0.15s;
  }
  :global(.dark .ai-msg .ai-link) { color: #a5b4fc; border-bottom-color: #3730a3; }

  /* ── Cursor blink ────────────────────────────────────────────────────── */
  :global(.cursor-blink) {
    display: inline-block; width: 6px; height: 13px;
    background: #6366f1; border-radius: 2px;
    animation: blink 1s step-end infinite; vertical-align: middle; margin-left: 2px;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* ── Scrollbar hide ─────────────────────────────────────────────────── */
  :global(.scrollbar-hide) { -ms-overflow-style:none; scrollbar-width:none; }
  :global(.scrollbar-hide::-webkit-scrollbar) { display:none; }

  /* ── Reduced motion ─────────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    :global(*),  :global(::before), :global(::after) {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
