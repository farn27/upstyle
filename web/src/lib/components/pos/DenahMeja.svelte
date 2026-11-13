<script>
	/**
	 * Denah meja & daftar bill terbuka di kasir.
	 * Meja kosong → mulai pesanan untuk meja itu. Meja terisi → buka bill-nya (tambah pesanan / bayar).
	 */
	import { onMount } from 'svelte';

	/**
	 * @type {{ pengaturan: any, bill: any[], billAktifId?: number | null, onPilihMeja: (kode: string) => void, onBukaBill: (b: any) => void,
	 *   onBillBaru: (nama: string) => void, onMuatUlang: () => Promise<void> | void, onTutup: () => void }}
	 */
	let { pengaturan, bill, billAktifId = null, onPilihMeja, onBukaBill, onBillBaru, onMuatUlang, onTutup } = $props();

	const area = $derived([...new Set(pengaturan.meja.daftar.map((/** @type {any} */ m) => m.area))]);
	let areaPilih = $state('semua');
	let namaBaru = $state('');
	let sekarang = $state(Date.now());
	let memuat = $state(false);

	const billPerMeja = $derived(new Map(bill.filter((b) => b.meja).map((b) => [String(b.meja).toLowerCase(), b])));
	const billTanpaMeja = $derived(bill.filter((b) => !b.meja));
	const mejaTampil = $derived(pengaturan.meja.daftar.filter((/** @type {any} */ m) => areaPilih === 'semua' || m.area === areaPilih));
	const terisi = $derived(pengaturan.meja.daftar.filter((/** @type {any} */ m) => billPerMeja.has(String(m.kode).toLowerCase())).length);
	const rp = (/** @type {number} */ n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
	const durasi = (/** @type {string} */ w) => {
		const m = Math.max(0, Math.floor((sekarang - Date.parse(String(w).replace(' ', 'T') + '+07:00')) / 60000));
		return m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} j ${m % 60} mnt`;
	};

	async function muatUlang() {
		memuat = true;
		await onMuatUlang();
		memuat = false;
	}

	onMount(() => {
		const t = setInterval(() => (sekarang = Date.now()), 30000);
		const k = (/** @type {KeyboardEvent} */ e) => e.key === 'Escape' && onTutup();
		window.addEventListener('keydown', k);
		muatUlang();
		return () => {
			clearInterval(t);
			window.removeEventListener('keydown', k);
		};
	});
</script>

<div class="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4" role="presentation" onclick={(e) => e.target === e.currentTarget && onTutup()}>
	<div class="denah w-full sm:max-w-3xl max-h-[92dvh] overflow-hidden flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="judul-denah">
		<header class="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
			<div>
				<h2 id="judul-denah" class="text-lg font-black text-slate-900 dark:text-white">{pengaturan.meja.aktif ? 'Denah meja' : `${pengaturan.labelBill} terbuka`}</h2>
				<p class="text-xs text-slate-500">
					{#if pengaturan.meja.aktif}{terisi} dari {pengaturan.meja.daftar.length} meja terisi · {/if}{bill.length} bill belum dibayar
				</p>
			</div>
			<div class="flex gap-2">
				<button type="button" class="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300" onclick={muatUlang} disabled={memuat}>{memuat ? 'Memuat…' : 'Muat ulang'}</button>
				<button type="button" class="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg" aria-label="Tutup" onclick={onTutup}>×</button>
			</div>
		</header>

		<div class="overflow-y-auto px-5 py-4 space-y-5">
			{#if pengaturan.meja.aktif}
				{#if area.length > 1}
					<div class="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Area">
						{#each ['semua', ...area] as a (a)}
							<button type="button" role="tab" aria-selected={areaPilih === a} onclick={() => (areaPilih = String(a))}
								class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap {areaPilih === a ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">
								{a === 'semua' ? 'Semua' : a}
							</button>
						{/each}
					</div>
				{/if}
				<div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
					{#each mejaTampil as m (m.kode)}
						{@const b = billPerMeja.get(String(m.kode).toLowerCase())}
						<button type="button" onclick={() => (b ? onBukaBill(b) : onPilihMeja(m.kode))}
							class="meja {b ? 'terisi' : 'kosong'} {b && b.id === billAktifId ? 'aktif' : ''}"
							aria-label={b ? `Meja ${m.kode}, terisi, ${rp(b.subtotal)}` : `Meja ${m.kode}, kosong`}>
							<span class="nomor">{m.kode}</span>
							{#if b}
								<span class="nilai">{rp(b.subtotal)}</span>
								<span class="waktu">{durasi(b.dibukaPada)}</span>
								{#if b.belumDikirim > 0}<span class="lencana" title="Belum dikirim ke dapur">{b.belumDikirim}</span>{/if}
							{:else}
								<span class="waktu">{m.kursi} kursi</span>
							{/if}
						</button>
					{/each}
				</div>
				<div class="flex flex-wrap gap-4 text-[11px] text-slate-500">
					<span class="flex items-center gap-1.5"><i class="titik kosong"></i> Kosong</span>
					<span class="flex items-center gap-1.5"><i class="titik terisi"></i> Terisi (belum bayar)</span>
					<span class="flex items-center gap-1.5"><i class="titik lencana-kecil"></i> Pesanan belum dikirim ke dapur</span>
				</div>
			{/if}

			<section>
				<h3 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{pengaturan.meja.aktif ? 'Bill tanpa meja' : `Daftar ${pengaturan.labelBill.toLowerCase()}`}</h3>
				{#if billTanpaMeja.length}
					<div class="grid sm:grid-cols-2 gap-2">
						{#each billTanpaMeja as b (b.id)}
							<button type="button" onclick={() => onBukaBill(b)}
								class="flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left {b.id === billAktifId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
								<span class="min-w-0">
									<span class="block font-bold text-sm text-slate-900 dark:text-white truncate">{b.nama || b.kode}</span>
									<span class="block text-[11px] text-slate-500">{b.items.length} item · {durasi(b.dibukaPada)}{b.belumDikirim ? ` · ${b.belumDikirim} belum dikirim` : ''}</span>
								</span>
								<span class="font-black text-sm text-amber-600 shrink-0">{rp(b.subtotal)}</span>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-xs text-slate-400">Belum ada.</p>
				{/if}
				<form class="mt-3 flex gap-2" onsubmit={(e) => { e.preventDefault(); if (namaBaru.trim()) { onBillBaru(namaBaru.trim()); namaBaru = ''; } }}>
					<input type="text" bind:value={namaBaru} maxlength="100" aria-label="Nama bill baru"
						placeholder={pengaturan.labelBill === 'Kendaraan' ? 'Plat nomor / nama pelanggan' : 'Nama tamu (bawa pulang, pesan antar)'}
						class="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
					<button type="submit" disabled={!namaBaru.trim()} class="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-bold disabled:opacity-40">+ Bill baru</button>
				</form>
			</section>
		</div>
	</div>
</div>

<style>
	.denah {
		animation: naik 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
	}
	.meja {
		position: relative;
		aspect-ratio: 1;
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		border: 2px dashed rgb(203 213 225);
		background: #fff;
		transition: transform 0.15s, box-shadow 0.15s;
	}
	.meja:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 18px rgb(15 23 42 / 0.08);
	}
	.meja.kosong .nomor {
		color: rgb(71 85 105);
	}
	.meja.terisi {
		border: 2px solid rgb(245 158 11);
		background: rgb(255 251 235);
	}
	.meja.aktif {
		outline: 3px solid rgb(37 99 235);
		outline-offset: 2px;
	}
	:global(.dark) .meja {
		background: rgb(30 41 59);
		border-color: rgb(71 85 105);
	}
	:global(.dark) .meja.terisi {
		background: rgb(69 26 3 / 0.5);
		border-color: rgb(245 158 11);
	}
	:global(.dark) .meja.kosong .nomor {
		color: rgb(203 213 225);
	}
	.nomor {
		font-size: 1.35rem;
		font-weight: 900;
		color: rgb(146 64 14);
		line-height: 1;
	}
	:global(.dark) .meja.terisi .nomor {
		color: rgb(253 230 138);
	}
	.nilai {
		font-size: 0.7rem;
		font-weight: 800;
		color: rgb(180 83 9);
	}
	:global(.dark) .nilai {
		color: rgb(252 211 77);
	}
	.waktu {
		font-size: 0.62rem;
		color: rgb(100 116 139);
	}
	.lencana {
		position: absolute;
		top: -0.4rem;
		right: -0.4rem;
		min-width: 1.35rem;
		height: 1.35rem;
		padding: 0 0.3rem;
		border-radius: 999px;
		background: rgb(220 38 38);
		color: #fff;
		font-size: 0.65rem;
		font-weight: 900;
		display: grid;
		place-items: center;
	}
	.titik {
		display: inline-block;
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 0.2rem;
	}
	.titik.kosong {
		border: 2px dashed rgb(148 163 184);
	}
	.titik.terisi {
		background: rgb(254 243 199);
		border: 2px solid rgb(245 158 11);
	}
	.titik.lencana-kecil {
		border-radius: 999px;
		background: rgb(220 38 38);
	}
	@keyframes naik {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.denah {
			animation: none;
		}
		.meja:hover {
			transform: none;
		}
	}
</style>
