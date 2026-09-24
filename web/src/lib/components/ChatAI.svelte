<script>
	import { tick, onMount } from 'svelte';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import AITransactionWizard from '$lib/components/AITransactionWizard.svelte';

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

	// ─── AI Transaction Wizard ─────────────────────────────────────────────────
	let showTransactionWizard = false;

	// ─── Quick Actions (Aksi Cepat) ────────────────────────────────────────────
	let showQuickActions = false;

	const QUICK_ACTIONS = [
		{
			id: 'input_transaksi',
			label: 'Input Transaksi',
			icon: '💳',
			desc: 'Catat pemasukan atau pengeluaran',
			color: 'indigo',
			requiresUnit: true,
			mode: 'wizard'   // buka AITransactionWizard, TANPA AI
		},
		{
			id: 'input_produk',
			label: 'Tambah Produk',
			icon: '📦',
			desc: 'Daftarkan produk baru ke katalog',
			color: 'emerald',
			requiresUnit: true,
			mode: 'link',
			linkFn: (slug) => `/finance/${slug}/produk`
		},
		{
			id: 'input_piutang',
			label: 'Tambah Piutang',
			icon: '🧾',
			desc: 'Catat tagihan ke pelanggan',
			color: 'amber',
			requiresUnit: true,
			mode: 'link',
			linkFn: (slug) => `/finance/${slug}/piutang`
		},
		{
			id: 'input_hutang',
			label: 'Tambah Hutang',
			icon: '📋',
			desc: 'Catat tagihan dari supplier',
			color: 'rose',
			requiresUnit: true,
			mode: 'link',
			linkFn: (slug) => `/finance/${slug}/hutang`
		},
		{
			id: 'input_karyawan',
			label: 'Tambah Karyawan',
			icon: '👤',
			desc: 'Daftarkan karyawan baru ke HR',
			color: 'violet',
			requiresUnit: false,
			mode: 'link',
			linkFn: () => `/hr`
		},
		{
			id: 'input_jurnal',
			label: 'Input Jurnal Umum',
			icon: '📒',
			desc: 'Buat entri jurnal akuntansi',
			color: 'blue',
			requiresUnit: true,
			mode: 'link',
			linkFn: (slug) => `/finance/${slug}/jurnal-umum`
		},
	];

	/** Svelte action: tutup panel ketika klik di luar elemen */
	function clickOutside(node, callback) {
		const handle = (e) => { if (!node.contains(e.target)) callback(); };
		document.addEventListener('mousedown', handle, true);
		return { destroy: () => document.removeEventListener('mousedown', handle, true) };
	}

	function startQuickAction(action) {
		showQuickActions = false;

		const doAction = () => {
			if (action.mode === 'wizard') {
				showTransactionWizard = true;
			} else if (action.mode === 'link') {
				const url = action.linkFn?.(selectedUnitSlug);
				if (url) window.location.href = url;
			}
		};

		if (action.requiresUnit && !selectedUnitSlug) {
			if (userUnits.length === 1) {
				selectedUnitSlug = userUnits[0].slug;
				selectedUnitName = userUnits[0].nama_unit;
				doAction();
			} else if (userUnits.length > 1) {
				pendingMessage = '__QUICKACTION__' + action.id;
				showUnitPicker = true;
			}
		} else {
			doAction();
		}
	}

	// ─── Master Data for NL Confirmation Card ──────────────────────────────────
	/** Master data kas & COA untuk confirmation card NL input */
	let nlMasterData = { kasAccounts: [], coaAccounts: [], loaded: false, loading: false };

	async function loadNLMasterData() {
		if (!selectedUnitSlug || nlMasterData.loaded || nlMasterData.loading) return;
		nlMasterData = { ...nlMasterData, loading: true };
		try {
			const res = await fetch(`/api/transaction/master-data?unit=${encodeURIComponent(selectedUnitSlug)}`);
			const data = await res.json();
			if (data.success) {
				nlMasterData = {
					kasAccounts: data.kasAccounts || [],
					coaAccounts: data.coaAccounts || [],
					loaded: true,
					loading: false
				};
			} else {
				nlMasterData = { ...nlMasterData, loading: false };
			}
		} catch {
			nlMasterData = { ...nlMasterData, loading: false };
		}
	}

	/** State konfirmasi NL per-message (key: msg index) */
	let nlConfirm = {}; // { [msgIdx]: { kas_coa_id, coa_id, tanggal, metode, isSaving } }

	function initNLConfirm(idx, trxData) {
		if (nlConfirm[idx]) return;
		const defaultKas = nlMasterData.kasAccounts[0]?.id ? String(nlMasterData.kasAccounts[0].id) : '';
		const kategori = trxData.kategori;
		const coaTypes = kategori === 'Masuk'
			? ['PENDAPATAN', 'PENDAPATAN_LAINNYA']
			: ['BEBAN_OPERASIONAL', 'BEBAN_LAINNYA', 'HPP'];
		const firstCoa = nlMasterData.coaAccounts.find(c => coaTypes.includes(c.tipeAkun));
		nlConfirm = {
			...nlConfirm,
			[idx]: {
				kas_coa_id: defaultKas,
				coa_id: firstCoa ? String(firstCoa.id) : '',
				tanggal: trxData.tanggal || new Date().toISOString().split('T')[0],
				metode: trxData.metode || 'Tunai',
				isSaving: false,
				error: ''
			}
		};
	}

	function getFilteredCoa(kategori) {
		const types = kategori === 'Masuk'
			? ['PENDAPATAN', 'PENDAPATAN_LAINNYA']
			: ['BEBAN_OPERASIONAL', 'BEBAN_LAINNYA', 'HPP'];
		return nlMasterData.coaAccounts.filter(c => types.includes(c.tipeAkun));
	}

	async function saveTransactionFull(msgIdx, trxIdx, trxData) {
		const key = `${msgIdx}-${trxIdx}`;
		const conf = nlConfirm[key];
		if (!conf || !selectedUnitSlug || conf.isSaving) return;
		if (!conf.kas_coa_id || !conf.coa_id) {
			nlConfirm = { ...nlConfirm, [key]: { ...conf, error: 'Pilih akun kas dan COA terlebih dahulu.' } };
			return;
		}
		nlConfirm = { ...nlConfirm, [key]: { ...conf, isSaving: true, error: '' } };
		try {
			const fd = new FormData();
			fd.append('kategori_trx', trxData.kategori);
			fd.append('kas_coa_id', conf.kas_coa_id);
			fd.append('coa_id', conf.coa_id);
			fd.append('nominal', String(trxData.nominal));
			fd.append('keterangan', (trxData.keterangan || '').toUpperCase());
			fd.append('qty', '1');

			const res = await fetch(`/finance/${selectedUnitSlug}/entry?/addTransaction`, {
				method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' }
			});
			if (res.ok) {
				// Tandai transaksi spesifik ini sukses
				nlConfirm = { ...nlConfirm, [key]: { ...conf, isSaving: false, success: true } };
				currentSuggestions = ['Input transaksi lain', 'Lihat ringkasan keuangan'];
				scrollToBottom();
			} else {
				nlConfirm = { ...nlConfirm, [key]: { ...conf, isSaving: false, error: 'Gagal menyimpan. Coba lagi.' } };
			}
		} catch {
			nlConfirm = { ...nlConfirm, [key]: { ...conf, isSaving: false, error: 'Koneksi gagal.' } };
		}
	}

	// ─── File Upload ───────────────────────────────────────────────────────────
	let fileInput;
	let showFileUploadModal = false;
	let uploadedFile = null;
	let uploadResult = null;
	let isUploadingFile = false;
	let uploadError = '';
	let isDraggingFile = false;

	// ─── Transaction Preview ───────────────────────────────────────────────────
	let isSavingTransaction = false;


	// ─── Detail Modal ──────────────────────────────────────────────────────────
	/** @type {string|null} */
	let modalContent = null;
	/** @type {any} */
	let modalChartData = null;
	let modalCopied = false;

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

	/** Deteksi apakah jawaban AI "kompleks" → perlu auto-expand & tombol detail */
	function isComplexReply(text) {
		if (!text) return false;
		return text.length > 400 ||
			text.includes('|---') ||
			text.includes(':::metric') ||
			text.includes(':::grid') ||
			text.includes(':::steps') ||
			(text.match(/\n/g) || []).length > 8;
	}

	function openModal(reply, chartData) {
		modalContent = reply;
		modalChartData = chartData ?? null;
		modalCopied = false;
	}

	function closeModal() {
		modalContent = null;
		modalChartData = null;
	}

	async function copyModal() {
		await navigator.clipboard?.writeText(modalContent || '').catch(() => {});
		modalCopied = true;
		setTimeout(() => modalCopied = false, 1500);
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
		if (pendingMessage === '__WIZARD__') {
			pendingMessage = '';
			showTransactionWizard = true;
		} else if (pendingMessage.startsWith('__QUICKACTION__')) {
			const actionId = pendingMessage.replace('__QUICKACTION__', '');
			pendingMessage = '';
			const action = QUICK_ACTIONS.find(a => a.id === actionId);
			if (action) {
				if (action.mode === 'wizard') {
					showTransactionWizard = true;
				} else if (action.mode === 'link') {
					const url = action.linkFn?.(selectedUnitSlug);
					if (url) window.location.href = url;
				}
			}
		} else if (pendingMessage) {
			const m = pendingMessage;
			pendingMessage = '';
			sendChat(m);
		}
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

			// Handle transaction preview response — show card, skip typewriter
			if (data.transactionPreviews) {
				const fp = data.reply || '';
				chatHistory = [...chatHistory, {
					role: 'assistant', content: fp, fullReply: fp,
					transactionPreviews: data.transactionPreviews, ts: Date.now()
				}];
				currentSuggestions = data.suggestions || [];
				await scrollToBottom();
				isLoading = false;
				return;
			}

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
			// Auto-expand widget jika jawaban kompleks
			if (isComplexReply(fullReply) && !isExpanded) {
				isExpanded = true;
			}
			await scrollToBottom();
		} catch {
			chatHistory = [...chatHistory, { role: 'assistant', content: 'Koneksi terputus. Coba lagi ya kak 🙏', ts: Date.now() }];
		} finally { isLoading = false; }
	}

	// ─── Transaction Wizard Handlers ───────────────────────────────────────────
	function openTransactionWizard() {
		if (!selectedUnitSlug) {
			// Need a unit selected first
			if (userUnits.length === 1) {
				selectedUnitSlug = userUnits[0].slug;
				selectedUnitName = userUnits[0].nama_unit;
			} else if (userUnits.length > 1) {
				pendingMessage = '__WIZARD__';
				showUnitPicker = true;
				return;
			}
		}
		showTransactionWizard = true;
	}

	function handleTransactionSuccess(detail) {
		showTransactionWizard = false;
		// Add success message to chat
		const successMsg = `✅ Transaksi berhasil disimpan melalui AI Wizard!\n\n**Detail:**\n- Tipe: ${detail.data?.kategori_trx || '-'}\n- Nominal: Rp${Number(detail.data?.nominal || 0).toLocaleString('id-ID')}\n- Keterangan: ${detail.data?.keterangan || '-'}`;
		chatHistory = [...chatHistory, {
			role: 'assistant',
			content: successMsg,
			fullReply: successMsg,
			ts: Date.now()
		}];
		scrollToBottom();
	}

	// ─── Save Transaction from NL Preview ─────────────────────────────────────
	async function saveTransaction(trxData) {
		if (!selectedUnitSlug || !trxData || isSavingTransaction) return;
		isSavingTransaction = true;
		try {
			const fd = new FormData();
			fd.append('tglTrx', trxData.tanggal);
			fd.append('kategoriTrx', trxData.kategori);
			fd.append('nominal', String(trxData.nominal));
			fd.append('keterangan', trxData.keterangan);
			fd.append('metodeBayar', trxData.metode || 'Tunai');

			const res = await fetch(`/finance/${selectedUnitSlug}/entry?/simpanTrx`, {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const resultText = await res.text();
			const ok = res.ok && (resultText.includes('"success":true') || res.status === 200);

			const msg = ok
				? `✅ **Transaksi berhasil disimpan!**\n\n${trxData.kategori === 'Masuk' ? '💰' : '💸'} **${trxData.kategori}:** Rp${Number(trxData.nominal).toLocaleString('id-ID')}\n📝 ${trxData.keterangan}`
				: `❌ Gagal menyimpan transaksi. Coba input manual via [Halaman Entry](/finance/${selectedUnitSlug}/entry) ya kak.`;

			chatHistory = [...chatHistory, { role: 'assistant', content: msg, fullReply: msg, ts: Date.now() }];
			currentSuggestions = ok
				? ['Input transaksi lain', 'Lihat ringkasan keuangan']
				: ['Coba lagi', 'Input manual'];
			await scrollToBottom();
		} catch {
			const msg = `❌ Koneksi gagal. Coba input manual via [Halaman Entry](/finance/${selectedUnitSlug}/entry).`;
			chatHistory = [...chatHistory, { role: 'assistant', content: msg, fullReply: msg, ts: Date.now() }];
		} finally {
			isSavingTransaction = false;
		}
	}

	// ─── File Upload Handlers ──────────────────────────────────────────────────
	function triggerFileUpload() {
		fileInput?.click();
	}

	function handleFileSelect(e) {
		const file = e.target.files?.[0];
		if (file) openFileUpload(file);
		// Reset input to allow same file re-selection
		e.target.value = '';
	}

	function openFileUpload(file) {
		uploadedFile = file;
		uploadResult = null;
		uploadError = '';
		showFileUploadModal = true;
	}

	function closeFileUpload() {
		showFileUploadModal = false;
		uploadedFile = null;
		uploadResult = null;
		uploadError = '';
		isDraggingFile = false;
	}

	async function processUploadedFile() {
		if (!uploadedFile || isUploadingFile) return;
		isUploadingFile = true;
		uploadError = '';

		try {
			const fd = new FormData();
			fd.append('file', uploadedFile);
			if (selectedUnitSlug) fd.append('unit', selectedUnitSlug);

			const res = await fetch('/api/chat/upload', { method: 'POST', body: fd });
			const data = await res.json();

			if (data.success) {
				uploadResult = data;
				// Auto-compose chat message summarizing the file content
				let summary = '';
				if (data.fileType === 'csv') {
					summary = `📂 **File CSV diunggah:** ${data.fileName}\n\n${data.data?.summary || ''}\n\nSaya menemukan ${data.data?.transactions?.length || 0} transaksi valid. Ketik pertanyaan untuk menganalisis data ini, atau gunakan tombol Input Transaksi untuk input satu per satu.`;
				} else if (data.fileType === 'image') {
					summary = `🖼️ **Gambar diunggah:** ${data.fileName}\n\n${data.data?.message || ''}\n\n${data.data?.suggestion || ''}`;
				} else {
					summary = `📄 **File diunggah:** ${data.fileName}\n\n${data.data?.message || ''}`;
				}

				// Add to chat
				chatHistory = [...chatHistory, {
					role: 'assistant',
					content: summary,
					fullReply: summary,
					ts: Date.now()
				}];
				scrollToBottom();
				closeFileUpload();
			} else {
				uploadError = data.message || 'Gagal memproses file';
			}
		} catch {
			uploadError = 'Koneksi gagal. Silakan coba lagi.';
		} finally {
			isUploadingFile = false;
		}
	}

	function handleDragOver(e) {
		e.preventDefault();
		isDraggingFile = true;
	}

	function handleDragLeave() {
		isDraggingFile = false;
	}

	function handleDrop(e) {
		e.preventDefault();
		isDraggingFile = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) openFileUpload(file);
	}

	function fmtBytes(bytes) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatAI(text) {
		if (!text) return '';

		// 1. Escape HTML (but preserve &lt; etc from existing escapes)
		let out = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

		// 2. Fenced code blocks (protect them from further processing)
		const codeBlocks = [];
		out = out.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
			const idx = codeBlocks.length;
			codeBlocks.push(`<pre class="ai-code"><code>${code.trim()}</code></pre>`);
			return `\x00CODE${idx}\x00`;
		});

		// 3. Inline code
		out = out.replace(/`([^`]+)`/g, '<code class="ai-ic">$1</code>');

		// 4. Markdown tables — line-by-line parser (robust against multi-column separators)
		const tableLines = out.split('\n');
		const tableOut = [];
		let i = 0;
		while (i < tableLines.length) {
			const line = tableLines[i];
			// Detect separator row: line is all |, -, :, spaces — e.g. |---|---|---|
			const isSep = (l) => /^\|[-| :\t]+\|[ \t]*$/.test(l.trim());
			// Detect table row: starts and ends with |
			const isRow = (l) => /^\|.+\|[ \t]*$/.test(l.trim());

			// Look ahead: current line is a table row AND next line is a separator
			if (isRow(line) && i + 1 < tableLines.length && isSep(tableLines[i + 1])) {
				// Collect the full table block
				const headerLine = line;
				// skip separator line (i+1)
				let j = i + 2;
				const bodyLines = [];
				while (j < tableLines.length && isRow(tableLines[j])) {
					bodyLines.push(tableLines[j]);
					j++;
				}

				const parseRow = (r) =>
					r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

				const headers = parseRow(headerLine);
				const thCells = headers.map(h => `<th>${h}</th>`).join('');
				const tbodyRows = bodyLines.map(r => {
					const cells = parseRow(r);
					return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
				}).join('');

				tableOut.push(`<div class="ai-table-wrap"><table class="ai-table"><thead><tr>${thCells}</tr></thead><tbody>${tbodyRows}</tbody></table></div>`);
				i = j; // skip past the entire table block
			} else {
				tableOut.push(line);
				i++;
			}
		}
		out = tableOut.join('\n');

		// 4b. Custom rich components — :::type{...}::: syntax
		// METRIC card: :::metric{label:"Label",value:"Rp1.000.000",trend:"+12%",color:"green"}:::
		out = out.replace(/:::metric\{([^}]+)\}:::/g, (_, attrs) => {
			const get = (k) => { const m = attrs.match(new RegExp(k + ':\\s*"([^"]*)"')); return m ? m[1] : ''; };
			const label = get('label'); const value = get('value');
			const trend = get('trend'); const color = get('color') || 'indigo';
			const colorMap = {
				green:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badge: '#dcfce7', badgeText: '#166534' },
				red:    { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', badge: '#ffe4e6', badgeText: '#9f1239' },
				indigo: { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca', badge: '#e0e7ff', badgeText: '#3730a3' },
				amber:  { bg: '#fffbeb', border: '#fde68a', text: '#b45309', badge: '#fef3c7', badgeText: '#92400e' },
				blue:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#dbeafe', badgeText: '#1e40af' },
			};
			const c = colorMap[color] || colorMap.indigo;
			const trendHtml = trend ? `<span style="background:${c.badge};color:${c.badgeText};font-size:9px;font-weight:700;padding:2px 6px;border-radius:9999px;margin-left:6px;">${trend}</span>` : '';
			return `<div class="ai-metric-card" style="background:${c.bg};border-color:${c.border};">
				<div class="ai-metric-label">${label}</div>
				<div class="ai-metric-value" style="color:${c.text};">${value}${trendHtml}</div>
			</div>`;
		});

		// ALERT box: :::alert{type:"warning",title:"Judul",msg:"Pesan"}:::
		out = out.replace(/:::alert\{([^}]+)\}:::/g, (_, attrs) => {
			const get = (k) => { const m = attrs.match(new RegExp(k + ':\\s*"([^"]*)"')); return m ? m[1] : ''; };
			const type = get('type') || 'info';
			const title = get('title'); const msg = get('msg');
			const icons = { warning: '⚠️', info: 'ℹ️', success: '✅', danger: '🚨' };
			const typeClass = `ai-alert-${type}`;
			return `<div class="ai-alert ${typeClass}"><span class="ai-alert-icon">${icons[type] || 'ℹ️'}</span><div class="ai-alert-body">${title ? `<strong>${title}</strong><br>` : ''}${msg}</div></div>`;
		});

		// BADGE: :::badge{text:"LUNAS",color:"green"}:::
		out = out.replace(/:::badge\{([^}]+)\}:::/g, (_, attrs) => {
			const get = (k) => { const m = attrs.match(new RegExp(k + ':\\s*"([^"]*)"')); return m ? m[1] : ''; };
			const text = get('text'); const color = get('color') || 'indigo';
			return `<span class="ai-badge ai-badge-${color}">${text}</span>`;
		});

		// PROGRESS bar: :::progress{label:"Target",value:75,color:"indigo"}:::
		out = out.replace(/:::progress\{([^}]+)\}:::/g, (_, attrs) => {
			const getStr = (k) => { const m = attrs.match(new RegExp(k + ':\\s*"([^"]*)"')); return m ? m[1] : ''; };
			const getNum = (k) => { const m = attrs.match(new RegExp(k + ':\\s*(\\d+)')); return m ? Number(m[1]) : 0; };
			const label = getStr('label'); const value = Math.min(100, Math.max(0, getNum('value')));
			const color = getStr('color') || 'indigo';
			const colorMap = { indigo: '#6366f1', green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6' };
			const barColor = colorMap[color] || colorMap.indigo;
			return `<div class="ai-progress-wrap">
				<div class="ai-progress-header"><span class="ai-progress-label">${label}</span><span class="ai-progress-pct" style="color:${barColor};">${value}%</span></div>
				<div class="ai-progress-track"><div class="ai-progress-bar" style="width:${value}%;background:${barColor};"></div></div>
			</div>`;
		});

		// GRID cards: :::grid:::  ...items...  :::endgrid:::
		// Each item line: - **Title**: Description
		out = out.replace(/:::grid:::\n([\s\S]*?):::endgrid:::/g, (_, content) => {
			const items = content.trim().split('\n').filter(l => l.trim().startsWith('-'));
			const cards = items.map(item => {
				const clean = item.replace(/^-\s*/, '');
				const match = clean.match(/^\*\*(.+?)\*\*[:\s]*(.*)/);
				if (match) return `<div class="ai-grid-card"><div class="ai-grid-card-title">${match[1]}</div><div class="ai-grid-card-desc">${match[2]}</div></div>`;
				return `<div class="ai-grid-card"><div class="ai-grid-card-desc">${clean}</div></div>`;
			}).join('');
			return `<div class="ai-grid">${cards}</div>`;
		});

		// STEPS: :::steps:::  ...numbered items...  :::endsteps:::
		out = out.replace(/:::steps:::\n([\s\S]*?):::endsteps:::/g, (_, content) => {
			const items = content.trim().split('\n').filter(Boolean);
			const steps = items.map((item, idx) => {
				const clean = item.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '');
				return `<div class="ai-step"><div class="ai-step-num">${idx + 1}</div><div class="ai-step-text">${clean}</div></div>`;
			}).join('');
			return `<div class="ai-steps">${steps}</div>`;
		});

		// 5. Horizontal rule
		out = out.replace(/^---+$/gm, '<hr class="ai-hr">');

		// 6. Blockquote (> text)
		out = out.replace(/^&gt; (.+)$/gm, '<div class="ai-callout">$1</div>');

		// 7. Bold + italic
		out = out.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
		out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');

		// 8. Headings
		out = out.replace(/^#{1,2} (.+)$/gm, '<p class="ai-h2">$1</p>');
		out = out.replace(/^### (.+)$/gm, '<p class="ai-h3">$1</p>');
		out = out.replace(/^#### (.+)$/gm, '<p class="ai-h4">$1</p>');

		// 9. Links
		out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
			url.startsWith('/')
				? `<a href="${url}" class="ai-action-btn">→ ${label}</a>`
				: `<a href="${url}" target="_blank" rel="noopener" class="ai-link">${label}</a>`
		);

		// 10. Lists — collect consecutive bullet/numbered lines and wrap in ul/ol
		// Unordered lists (- item or * item)
		out = out.replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
			const items = block.trim().split('\n')
				.filter(Boolean)
				.map(l => `<li>${l.replace(/^[-*] /, '')}</li>`)
				.join('');
			return `<ul>${items}</ul>`;
		});

		// Ordered lists (1. item, 2. item, ...)
		out = out.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
			const items = block.trim().split('\n')
				.filter(Boolean)
				.map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`)
				.join('');
			return `<ol>${items}</ol>`;
		});

		// 11. Restore code blocks
		out = out.replace(/\x00CODE(\d+)\x00/g, (_, idx) => codeBlocks[Number(idx)]);

		return out;
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
            <div class="ai-msg">
              {#if chat.fullReply && chat.content === chat.fullReply}
                {@html formatAI(chat.fullReply)}
              {:else}
                <span class="ai-typing-plain">{chat.content}</span>{#if !chat.content && !instantResponse}<span class="cursor-blink"></span>{/if}
              {/if}
            </div>
            {#if chat.chartData && (chat.content?.length > 5 || instantResponse)}
              <div class="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2" transition:fade>
                <canvas use:renderChart={chat.chartData}></canvas>
              </div>
            {/if}
            <!-- Tombol Lihat Selengkapnya untuk jawaban kompleks -->
            {#if chat.fullReply && chat.content === chat.fullReply && isComplexReply(chat.fullReply)}
              <button
                on:click={() => openModal(chat.fullReply, chat.chartData)}
                class="mt-2.5 flex items-center justify-center gap-1.5 w-full
                       text-[10px] font-semibold text-indigo-600 dark:text-indigo-400
                       bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700
                       px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800
                       transition-colors"
                transition:fade={{ duration: 150 }}>
                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                </svg>
                Lihat Selengkapnya
              </button>
            {/if}
            {#if chat.transactionPreviews && chat.transactionPreviews.length > 0}
            <!-- Load master data when this card appears -->
            {#if !nlMasterData.loaded && !nlMasterData.loading}
              {loadNLMasterData()}
            {/if}
            <div class="space-y-4">
            {#each chat.transactionPreviews as trx, j}
            {@const key = `${i}-${j}`}
            {@const isIn = trx.kategori === 'Masuk'}
            {#if !nlConfirm[key] && nlMasterData.loaded}
              {initNLConfirm(key, trx)}
              <span class="hidden"></span>
            {/if}

            {#if nlConfirm[key]?.success}
              <div class="mt-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all">
                <p class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">✅ Transaksi tersimpan!</p>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1 font-medium">{isIn ? '💰 Pemasukan' : '💸 Pengeluaran'}: Rp{Number(trx.nominal).toLocaleString('id-ID')}<br>{trx.keterangan}</p>
              </div>
            {:else}
            <div class="mt-3 rounded-xl overflow-hidden border
                         {isIn ? 'border-emerald-200 dark:border-emerald-700/50' : 'border-rose-200 dark:border-rose-700/50'}"
                 transition:fade={{ duration: 200 }}>

              <!-- Card Header -->
              <div class="flex items-center justify-between px-3 py-2
                          {isIn ? 'bg-emerald-600' : 'bg-rose-600'}">
                <div class="flex items-center gap-2">
                  <span class="text-base">{isIn ? '💰' : '💸'}</span>
                  <div>
                    <p class="text-[10px] font-bold text-white leading-none">{isIn ? 'Pemasukan Terdeteksi' : 'Pengeluaran Terdeteksi'}</p>
                    <p class="text-[9px] text-white/70 mt-0.5">Lengkapi field di bawah lalu simpan</p>
                  </div>
                </div>
                <span class="text-[11px] font-black text-white">Rp{Number(trx.nominal).toLocaleString('id-ID')}</span>
              </div>

              <div class="bg-white dark:bg-slate-900 p-3 space-y-2.5">

                <!-- Field yang sudah diketahui (read-only) -->
                <div class="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div class="bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5">
                    <p class="text-slate-400 text-[8.5px] font-semibold uppercase tracking-wide">Nominal</p>
                    <p class="font-bold text-slate-800 dark:text-white mt-0.5">Rp{Number(trx.nominal).toLocaleString('id-ID')}</p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5">
                    <p class="text-slate-400 text-[8.5px] font-semibold uppercase tracking-wide">Tipe</p>
                    <p class="font-bold mt-0.5 {isIn ? 'text-emerald-600' : 'text-rose-600'}">{trx.kategori}</p>
                  </div>
                </div>
                <div class="bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-[10px]">
                  <p class="text-slate-400 text-[8.5px] font-semibold uppercase tracking-wide">Keterangan</p>
                  <p class="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{trx.keterangan}</p>
                </div>

                <!-- Divider: Field yang perlu dilengkapi -->
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-px bg-slate-100 dark:bg-slate-700"></div>
                  <span class="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Lengkapi data berikut</span>
                  <div class="flex-1 h-px bg-slate-100 dark:bg-slate-700"></div>
                </div>

                {#if nlMasterData.loading}
                  <!-- Loading state -->
                  <div class="flex items-center gap-2 py-2">
                    <div class="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shrink-0"></div>
                    <p class="text-[10px] text-slate-400">Memuat akun COA & Kas...</p>
                  </div>
                {:else if nlConfirm[key]}
                  {@const conf = nlConfirm[key]}
                  {@const filteredCoa = getFilteredCoa(trx.kategori)}

                  <!-- Tanggal -->
                  <div>
                    <label class="block text-[9px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">📅 Tanggal</label>
                    <input type="date" value={conf.tanggal}
                      on:change={(e) => nlConfirm = { ...nlConfirm, [key]: { ...conf, tanggal: e.target.value } }}
                      class="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600
                             bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                             focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
                    >
                  </div>

                  <!-- Metode Bayar -->
                  <div>
                    <label class="block text-[9px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">💳 Metode Pembayaran</label>
                    <div class="flex gap-1.5 flex-wrap">
                      {#each ['Tunai', 'Transfer', 'QRIS', 'Kartu Debit'] as m}
                        <button on:click={() => nlConfirm = { ...nlConfirm, [key]: { ...conf, metode: m } }}
                          class="text-[9.5px] font-semibold px-2 py-1 rounded-lg border transition-colors
                                 {conf.metode === m
                                   ? 'bg-indigo-600 text-white border-indigo-600'
                                   : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400'}">
                          {m}
                        </button>
                      {/each}
                    </div>
                  </div>

                  <!-- Akun Kas (Metode Bayar) -->
                  {#if nlMasterData.kasAccounts.length > 0}
                  <div>
                    <label class="block text-[9px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">🏦 Akun Kas / Bank</label>
                    <select value={conf.kas_coa_id}
                      on:change={(e) => nlConfirm = { ...nlConfirm, [key]: { ...conf, kas_coa_id: e.target.value } }}
                      class="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600
                             bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                             focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400">
                      <option value="">-- Pilih akun kas --</option>
                      {#each nlMasterData.kasAccounts as kas}
                        <option value={String(kas.id)}>{kas.namaAkun} {kas.kodeAkun ? `(${kas.kodeAkun})` : ''}</option>
                      {/each}
                    </select>
                  </div>
                  {/if}

                  <!-- Akun COA -->
                  <div>
                    <label class="block text-[9px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">📂 Akun COA {isIn ? '(Pendapatan)' : '(Beban)'}</label>
                    {#if filteredCoa.length > 0}
                      <select value={conf.coa_id}
                        on:change={(e) => nlConfirm = { ...nlConfirm, [key]: { ...conf, coa_id: e.target.value } }}
                        class="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600
                               bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                               focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400">
                        <option value="">-- Pilih akun COA --</option>
                        {#each filteredCoa as coa}
                          <option value={String(coa.id)}>{coa.namaAkun} {coa.kodeAkun ? `(${coa.kodeAkun})` : ''}</option>
                        {/each}
                      </select>
                    {:else}
                      <p class="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-2 rounded-lg border border-amber-200 dark:border-amber-700">
                        ⚠️ Belum ada akun COA untuk {isIn ? 'pendapatan' : 'beban'}.
                        <a href="/finance/{selectedUnitSlug}/entry" class="font-bold underline">Setup COA →</a>
                      </p>
                    {/if}
                  </div>

                  <!-- Error -->
                  {#if conf.error}
                    <p class="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-700">
                      ⚠️ {conf.error}
                    </p>
                  {/if}

                  {#if !selectedUnitSlug}
                    <p class="text-[10px] text-amber-600 dark:text-amber-400">⚠️ Pilih unit bisnis dulu.</p>
                  {/if}

                  <!-- Simpan Button -->
                  <button
                    on:click={() => saveTransactionFull(i, j, trx)}
                    disabled={conf.isSaving || !selectedUnitSlug || !conf.kas_coa_id || !conf.coa_id}
                    class="w-full py-2 px-3 rounded-lg text-[10.5px] font-bold uppercase tracking-wide
                           {isIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                           text-white transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-1.5"
                  >
                    {#if conf.isSaving}
                      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" class="opacity-75"/>
                      </svg>
                      Menyimpan...
                    {:else}
                      💾 Simpan Transaksi
                    {/if}
                  </button>

                {:else if !nlMasterData.loaded}
                  <!-- Master data belum dimuat -->
                  <button on:click={loadNLMasterData}
                    class="w-full text-[10px] font-semibold text-indigo-600 dark:text-indigo-400
                           bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700
                           py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                    ↺ Muat data akun COA & Kas
                  </button>
                {/if}
              </div>
            </div>
            {/if}
            {/each}
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

      <!-- ⚡ Action Buttons Row (Aksi Cepat) -->
      <div class="relative flex items-center gap-1.5 mb-2">

        <!-- ⚡ AKSI CEPAT BUTTON -->
        <button
          id="quick-action-btn"
          on:click={() => showQuickActions = !showQuickActions}
          title="Aksi Cepat: input transaksi, produk, piutang, dan lainnya"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0
                 {showQuickActions
                   ? 'bg-indigo-600 text-white border border-indigo-600 shadow-md shadow-indigo-500/20'
                   : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-800'}"
        >
          <svg class="w-3 h-3 shrink-0 transition-transform {showQuickActions ? 'rotate-45' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span>Aksi Cepat</span>
          {#if !showQuickActions}
            <svg class="w-2.5 h-2.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
            </svg>
          {/if}
        </button>

        <!-- Upload File Button -->
        <button on:click={triggerFileUpload}
          title="Upload CSV atau gambar untuk AI processing"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors shrink-0
                 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800
                 border border-slate-200 dark:border-slate-700
                 hover:bg-slate-200 dark:hover:bg-slate-700">
          <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
          <span class="hidden sm:inline">Upload File</span>
          <span class="sm:hidden">File</span>
        </button>

        <!-- Hidden file input -->
        <input
          bind:this={fileInput}
          type="file"
          accept=".csv,.txt,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
          class="hidden"
          on:change={handleFileSelect}
        >

        <!-- ⚡ QUICK ACTIONS POPUP PANEL -->
        {#if showQuickActions}
        <div
          class="absolute bottom-full left-0 mb-2 w-[268px] z-50
                 bg-white dark:bg-slate-900 rounded-2xl
                 border border-slate-200 dark:border-slate-700
                 shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.55)]
                 overflow-hidden"
          transition:scale={{ start: 0.93, duration: 160, opacity: 0 }}
          use:clickOutside={() => showQuickActions = false}
        >
          <!-- Panel Header -->
          <div class="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-3.5 py-3">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <p class="text-[12px] font-bold text-white leading-none">Aksi Cepat</p>
            </div>
            <p class="text-[9.5px] text-indigo-200 leading-relaxed">
              Pilih aksi di bawah — AI akan memandu kamu step by step dan minta konfirmasi sebelum menyimpan.
            </p>
          </div>

          <!-- Action Grid -->
          <div class="p-2 grid grid-cols-2 gap-1.5">
            {#each QUICK_ACTIONS as action}
            {@const colorMap = {
              indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800/60', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
              emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800/60', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
              amber: { bg: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-100 dark:border-amber-800/60', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
              rose: { bg: 'bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 border-rose-100 dark:border-rose-800/60', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
              violet: { bg: 'bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border-violet-100 dark:border-violet-800/60', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
              blue: { bg: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-800/60', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
            }}
            <button
              on:click={() => startQuickAction(action)}
              class="flex flex-col items-start gap-1 p-2.5 rounded-xl border transition-all text-left group
                     {colorMap[action.color].bg}"
            >
              <div class="flex items-center gap-1.5 w-full">
                <span class="text-[15px] leading-none">{action.icon}</span>
                <span class="text-[10px] font-bold {colorMap[action.color].text} leading-tight flex-1">{action.label}</span>
                <svg class="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity {colorMap[action.color].text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
              <p class="text-[9px] opacity-60 {colorMap[action.color].text} leading-snug">{action.desc}</p>
            </button>
            {/each}
          </div>

          <!-- Footer Hint -->
          <div class="px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
            <div class="flex items-start gap-1.5">
              <svg class="w-3 h-3 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-[9px] text-slate-400 leading-relaxed">
                Atau ketik langsung, contoh:
                <button on:click={() => { showQuickActions = false; query = 'beli gula 25rb'; }} class="font-semibold text-indigo-500 hover:underline">"beli gula 25rb"</button>
              </p>
            </div>
          </div>
        </div>
        {/if}
      </div>


      <!-- Chat Input Form -->
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

<!-- ══ DETAIL MODAL ═══════════════════════════════════════════════════════ -->
{#if modalContent}
<div class="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6"
     on:click|self={closeModal}
     role="dialog" aria-modal="true" aria-label="Detail jawaban AI"
     transition:fade={{ duration: 200 }}>
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" on:click={closeModal} role="presentation"></div>

  <!-- Modal box -->
  <div class="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
              border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col z-10"
       style="max-height: min(92vh, 820px);"
       transition:scale={{ start: 0.95, duration: 200 }}>

    <!-- Modal header -->
    <div class="shrink-0 flex items-center justify-between px-5 py-3.5
                bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900
                border-b border-slate-700/50">
      <div class="flex items-center gap-2.5">
        <div class="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg
                    flex items-center justify-center shadow-sm">
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div>
          <span class="text-[13px] font-bold text-white">Bizgrow AI</span>
          <span class="text-[9px] text-slate-400 ml-2 uppercase tracking-widest">Detail Jawaban</span>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button on:click={copyModal}
          class="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-colors
                 {modalCopied
                   ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                   : 'text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700'}">
          {#if modalCopied}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>Tersalin
          {:else}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>Salin
          {/if}
        </button>
        <button on:click={closeModal} aria-label="Tutup"
          class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Modal scrollable content -->
    <div class="flex-1 overflow-y-auto px-6 py-5
                scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
      <div class="ai-msg ai-modal-content">{@html formatAI(modalContent)}</div>
      {#if modalChartData}
        <div class="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700
                    bg-white dark:bg-slate-900 p-3">
          <canvas use:renderChart={modalChartData}></canvas>
        </div>
      {/if}
    </div>

    <!-- Modal footer -->
    <div class="shrink-0 flex items-center justify-between px-5 py-3
                border-t border-slate-100 dark:border-slate-800
                bg-slate-50/60 dark:bg-slate-900/60">
      <p class="text-[9px] text-slate-400 uppercase tracking-widest select-none">
        Bizgrow AI · LLaMA 3.3 70B via Groq
      </p>
      <button on:click={closeModal}
        class="text-[11px] font-semibold px-4 py-1.5 rounded-xl border transition-colors
               text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800
               border-slate-200 dark:border-slate-700
               hover:bg-slate-100 dark:hover:bg-slate-700">
        Tutup
      </button>
    </div>
  </div>
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

<!-- ══ AI TRANSACTION WIZARD ═══════════════════════════════════════════════ -->
<AITransactionWizard
  bind:isOpen={showTransactionWizard}
  selectedUnitSlug={selectedUnitSlug}
  selectedUnitName={selectedUnitName}
  onSuccess={handleTransactionSuccess}
/>

<!-- ══ FILE UPLOAD MODAL ════════════════════════════════════════════════════ -->
{#if showFileUploadModal}
<div class="fixed inset-0 z-[270] flex items-center justify-center p-4"
     on:click|self={closeFileUpload}
     role="dialog" aria-modal="true" aria-label="Upload File"
     transition:fade={{ duration: 180 }}>

  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" on:click={closeFileUpload} role="presentation"></div>

  <div class="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10"
       transition:scale={{ start: 0.93, duration: 220 }}>

    <!-- Header -->
    <div class="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
        </div>
        <span class="text-sm font-bold text-white">Upload File ke AI</span>
      </div>
      <button on:click={closeFileUpload}
        class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="p-5">
      {#if uploadedFile && !uploadResult}
      <!-- File Preview -->
      <div class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 flex items-center gap-3">
        <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-xl shrink-0">
          {uploadedFile.name.endsWith('.csv') ? '📊' :
           uploadedFile.type.startsWith('image/') ? '🖼️' : '📄'}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{uploadedFile.name}</p>
          <p class="text-xs text-slate-400">{fmtBytes(uploadedFile.size)} · {uploadedFile.type || 'Unknown type'}</p>
        </div>
      </div>

      <!-- Supported types info -->
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
        <p class="text-[10px] font-semibold text-blue-700 dark:text-blue-300 mb-1">📋 Format yang didukung:</p>
        <ul class="text-[10px] text-blue-600 dark:text-blue-400 space-y-0.5">
          <li>• <strong>CSV</strong> — Import transaksi bulk (max 100 baris)</li>
          <li>• <strong>Gambar (JPG, PNG)</strong> — Upload struk/nota</li>
          <li>• <strong>TXT</strong> — File teks untuk dianalisis AI</li>
        </ul>
      </div>

      {#if uploadError}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 flex items-center gap-2">
        <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs font-medium text-red-700 dark:text-red-300">{uploadError}</p>
      </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex gap-2">
        <button on:click={closeFileUpload}
          class="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          Batal
        </button>
        <button on:click={processUploadedFile} disabled={isUploadingFile}
          class="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2">
          {#if isUploadingFile}
          <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Memproses...</span>
          {:else}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <span>Proses dengan AI</span>
          {/if}
        </button>
      </div>

      {:else if !uploadedFile}
      <!-- Drop Zone -->
      <div
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        class="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
               {isDraggingFile
                 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                 : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600'}"
        role="button"
        tabindex="0"
        aria-label="Drop zone untuk upload file"
        on:click={triggerFileUpload}
        on:keydown={(e) => e.key === 'Enter' && triggerFileUpload()}
      >
        <div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {isDraggingFile ? 'Lepaskan file di sini' : 'Drag & drop file atau klik untuk pilih'}
        </p>
        <p class="text-xs text-slate-400">CSV, gambar (JPG, PNG), atau file teks · Maks 5MB</p>
      </div>
      {/if}
    </div>
  </div>
</div>
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

  /* ── Table ──────────────────────────────────────────────────────────── */
  :global(.ai-msg .ai-table-wrap) {
    overflow-x: auto; margin: 8px 0; border-radius: 10px;
    border: 1px solid #e2e8f0; -webkit-overflow-scrolling: touch;
  }
  :global(.dark .ai-msg .ai-table-wrap) { border-color: #334155; }
  :global(.ai-msg .ai-table) {
    width: 100%; border-collapse: collapse; font-size: 11.5px;
    min-width: 280px;
  }
  :global(.ai-msg .ai-table thead tr) {
    background: #f1f5f9;
  }
  :global(.dark .ai-msg .ai-table thead tr) { background: #1e293b; }
  :global(.ai-msg .ai-table th) {
    padding: 7px 10px; text-align: left; font-weight: 700;
    color: #334155; font-size: 10.5px; text-transform: uppercase;
    letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }
  :global(.dark .ai-msg .ai-table th) { color: #94a3b8; border-bottom-color: #334155; }
  :global(.ai-msg .ai-table td) {
    padding: 6px 10px; vertical-align: top;
    border-bottom: 1px solid #f1f5f9; color: #475569;
    line-height: 1.5;
  }
  :global(.dark .ai-msg .ai-table td) { border-bottom-color: #1e293b; color: #94a3b8; }
  :global(.ai-msg .ai-table tbody tr:last-child td) { border-bottom: none; }
  :global(.ai-msg .ai-table tbody tr:hover td) { background: #f8fafc; }
  :global(.dark .ai-msg .ai-table tbody tr:hover td) { background: #0f172a; }

  /* ── Lists ──────────────────────────────────────────────────────────── */
  :global(.ai-msg ul) { margin: 6px 0; padding-left: 0; list-style: none; }
  :global(.ai-msg ul li) {
    position: relative; padding-left: 14px; margin-bottom: 3px;
    list-style: none;
  }
  :global(.ai-msg ul li::before) {
    content: '•'; position: absolute; left: 2px;
    color: #6366f1; font-weight: 700;
  }
  :global(.ai-msg ol) { margin: 6px 0; padding-left: 18px; }
  :global(.ai-msg ol li) { margin-bottom: 3px; list-style: decimal; }

  /* ── Callout / Blockquote ───────────────────────────────────────────── */
  :global(.ai-msg .ai-callout) {
    background: #eff6ff; border-left: 3px solid #6366f1;
    padding: 6px 10px; border-radius: 0 8px 8px 0;
    font-size: 11.5px; color: #3730a3; margin: 6px 0;
  }
  :global(.dark .ai-msg .ai-callout) {
    background: rgba(99,102,241,0.08); border-left-color: #818cf8;
    color: #a5b4fc;
  }

  /* ── Horizontal rule ───────────────────────────────────────────────── */
  :global(.ai-msg .ai-hr) {
    border: none; border-top: 1px solid #e2e8f0; margin: 8px 0;
  }
  :global(.dark .ai-msg .ai-hr) { border-top-color: #334155; }

  /* ── h4 ─────────────────────────────────────────────────────────────── */
  :global(.ai-msg .ai-h4) { font-weight: 600; font-size: 11.5px; color: #475569; margin: 4px 0 2px; }
  :global(.dark .ai-msg .ai-h4) { color: #94a3b8; }

  /* ── Metric Card ────────────────────────────────────────────────────── */
  :global(.ai-msg .ai-metric-card) {
    border: 1px solid; border-radius: 10px; padding: 10px 12px;
    margin: 6px 0; display: inline-flex; flex-direction: column; gap: 2px;
    min-width: 120px; max-width: 100%;
  }
  :global(.ai-msg .ai-metric-label) {
    font-size: 9.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #64748b;
  }
  :global(.dark .ai-msg .ai-metric-label) { color: #94a3b8; }
  :global(.ai-msg .ai-metric-value) {
    font-size: 18px; font-weight: 800; line-height: 1.2;
    display: flex; align-items: center; gap: 4px;
  }

  /* ── Alert Box ──────────────────────────────────────────────────────── */
  :global(.ai-msg .ai-alert) {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; border-radius: 10px; margin: 6px 0;
    border: 1px solid; font-size: 11.5px; line-height: 1.5;
  }
  :global(.ai-msg .ai-alert-icon) { font-size: 13px; line-height: 1.4; shrink: 0; }
  :global(.ai-msg .ai-alert-body) { flex: 1; }
  :global(.ai-msg .ai-alert-info)    { background:#eff6ff; border-color:#bfdbfe; color:#1e40af; }
  :global(.ai-msg .ai-alert-warning) { background:#fffbeb; border-color:#fde68a; color:#92400e; }
  :global(.ai-msg .ai-alert-success) { background:#f0fdf4; border-color:#bbf7d0; color:#15803d; }
  :global(.ai-msg .ai-alert-danger)  { background:#fff1f2; border-color:#fecdd3; color:#9f1239; }
  :global(.dark .ai-msg .ai-alert-info)    { background:rgba(59,130,246,0.08); border-color:rgba(59,130,246,0.3); color:#93c5fd; }
  :global(.dark .ai-msg .ai-alert-warning) { background:rgba(245,158,11,0.08); border-color:rgba(245,158,11,0.3); color:#fcd34d; }
  :global(.dark .ai-msg .ai-alert-success) { background:rgba(34,197,94,0.08);  border-color:rgba(34,197,94,0.3);  color:#86efac; }
  :global(.dark .ai-msg .ai-alert-danger)  { background:rgba(239,68,68,0.08);  border-color:rgba(239,68,68,0.3);  color:#fca5a5; }

  /* ── Badge ──────────────────────────────────────────────────────────── */
  :global(.ai-msg .ai-badge) {
    display: inline-flex; align-items: center; font-size: 9px; font-weight: 800;
    padding: 2px 7px; border-radius: 9999px; text-transform: uppercase;
    letter-spacing: 0.05em; border: 1px solid;
  }
  :global(.ai-msg .ai-badge-green)  { background:#dcfce7; color:#15803d; border-color:#bbf7d0; }
  :global(.ai-msg .ai-badge-red)    { background:#ffe4e6; color:#be123c; border-color:#fecdd3; }
  :global(.ai-msg .ai-badge-amber)  { background:#fef3c7; color:#b45309; border-color:#fde68a; }
  :global(.ai-msg .ai-badge-indigo) { background:#e0e7ff; color:#4338ca; border-color:#c7d2fe; }
  :global(.ai-msg .ai-badge-blue)   { background:#dbeafe; color:#1d4ed8; border-color:#bfdbfe; }
  :global(.ai-msg .ai-badge-slate)  { background:#f1f5f9; color:#475569; border-color:#e2e8f0; }
  :global(.dark .ai-msg .ai-badge-green)  { background:rgba(34,197,94,0.12);  color:#86efac; border-color:rgba(34,197,94,0.3);  }
  :global(.dark .ai-msg .ai-badge-red)    { background:rgba(239,68,68,0.12);  color:#fca5a5; border-color:rgba(239,68,68,0.3);  }
  :global(.dark .ai-msg .ai-badge-amber)  { background:rgba(245,158,11,0.12); color:#fcd34d; border-color:rgba(245,158,11,0.3); }
  :global(.dark .ai-msg .ai-badge-indigo) { background:rgba(99,102,241,0.12); color:#a5b4fc; border-color:rgba(99,102,241,0.3); }
  :global(.dark .ai-msg .ai-badge-blue)   { background:rgba(59,130,246,0.12); color:#93c5fd; border-color:rgba(59,130,246,0.3); }
  :global(.dark .ai-msg .ai-badge-slate)  { background:rgba(71,85,105,0.15);  color:#94a3b8; border-color:rgba(100,116,139,0.3); }

  /* ── Progress Bar ───────────────────────────────────────────────────── */
  :global(.ai-msg .ai-progress-wrap) { margin: 6px 0; }
  :global(.ai-msg .ai-progress-header) {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;
  }
  :global(.ai-msg .ai-progress-label) { font-size: 11px; font-weight: 600; color: #475569; }
  :global(.dark .ai-msg .ai-progress-label) { color: #94a3b8; }
  :global(.ai-msg .ai-progress-pct) { font-size: 11px; font-weight: 800; }
  :global(.ai-msg .ai-progress-track) {
    height: 7px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;
  }
  :global(.dark .ai-msg .ai-progress-track) { background: #334155; }
  :global(.ai-msg .ai-progress-bar) {
    height: 100%; border-radius: 9999px; transition: width 0.6s ease;
  }

  /* ── Grid Cards ─────────────────────────────────────────────────────── */
  :global(.ai-msg .ai-grid) {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin: 6px 0;
  }
  :global(.ai-msg .ai-grid-card) {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
    padding: 8px 10px;
  }
  :global(.dark .ai-msg .ai-grid-card) { background: #1e293b; border-color: #334155; }
  :global(.ai-msg .ai-grid-card-title) {
    font-size: 10.5px; font-weight: 700; color: #1e293b; margin-bottom: 2px;
  }
  :global(.dark .ai-msg .ai-grid-card-title) { color: #f1f5f9; }
  :global(.ai-msg .ai-grid-card-desc) { font-size: 10.5px; color: #64748b; line-height: 1.5; }
  :global(.dark .ai-msg .ai-grid-card-desc) { color: #94a3b8; }

  /* ── Steps ──────────────────────────────────────────────────────────── */
  :global(.ai-msg .ai-steps) { margin: 6px 0; display: flex; flex-direction: column; gap: 6px; }
  :global(.ai-msg .ai-step) {
    display: flex; align-items: flex-start; gap: 8px;
  }
  :global(.ai-msg .ai-step-num) {
    width: 20px; height: 20px; border-radius: 9999px; background: #6366f1;
    color: white; font-size: 10px; font-weight: 800; display: flex;
    align-items: center; justify-content: center; shrink: 0; flex-shrink: 0;
    margin-top: 1px;
  }
  :global(.ai-msg .ai-step-text) { font-size: 11.5px; color: #475569; line-height: 1.5; padding-top: 2px; }
  :global(.dark .ai-msg .ai-step-text) { color: #94a3b8; }

  /* ── Detail Modal content ───────────────────────────────────────────── */
  :global(.ai-modal-content) { font-size: 13.5px !important; line-height: 1.75 !important; }
  :global(.ai-modal-content .ai-table) { font-size: 12.5px !important; }
  :global(.ai-modal-content .ai-h2) { font-size: 14.5px !important; margin: 12px 0 6px !important; }
  :global(.ai-modal-content .ai-h3) { font-size: 13.5px !important; }
  :global(.ai-modal-content .ai-metric-value) { font-size: 22px !important; }
  :global(.ai-modal-content .ai-grid) { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important; gap: 8px !important; }
  :global(.ai-modal-content .ai-table td) { padding: 8px 12px !important; font-size: 12px !important; }
  :global(.ai-modal-content .ai-table th) { padding: 9px 12px !important; font-size: 11px !important; }
  :global(.ai-modal-content ul li, .ai-modal-content ol li) { margin-bottom: 5px !important; font-size: 13px !important; }
  :global(.ai-modal-content .ai-action-btn) { font-size: 12px !important; padding: 7px 14px !important; }

  /* ── Typing plain text (before render completes) ───────────────────── */
  :global(.ai-msg .ai-typing-plain) {
    white-space: pre-wrap; font-size: 12.5px; line-height: 1.65;
    color: inherit; word-break: break-word;
  }

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
