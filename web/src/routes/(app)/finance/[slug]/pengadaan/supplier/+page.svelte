<script>
	import { enhance } from '$app/forms';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import PesanForm from '$lib/components/pengadaan/PesanForm.svelte';
	import { rp } from '$lib/pengadaan';

	export let data;
	export let form;

	$: unit = data.unit;
	$: dasar = `/finance/${unit.slug}/pengadaan`;

	/** @type {any} */
	let modal = null;
	let cari = '';
	let sedangKirim = false;

	$: tersaring = data.suppliers.filter((s) => {
		const kata = cari.trim().toLowerCase();
		return !kata || [s.namaSupplier, s.contactName, s.phone, s.category].some((v) => String(v || '').toLowerCase().includes(kata));
	});

	const kosong = { id: 0, namaSupplier: '', contactName: '', phone: '', email: '', category: '', address: '', npwp: '', termPembayaran: 30 };

	function kirim(/** @type {string} */ konfirmasi = '') {
		return (/** @type {any} */ { cancel }) => {
			if (konfirmasi && !confirm(konfirmasi)) return cancel();
			sedangKirim = true;
			return async (/** @type {any} */ { result, update }) => {
				await update({ reset: false });
				sedangKirim = false;
				if (result.type === 'success') modal = null;
			};
		};
	}

	const kelasInput = 'w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none';
	const kelasLabel = 'block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1';
</script>

<svelte:head><title>Supplier | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Supplier" subtitle="Pemasok barang untuk unit ini" badge="PEMBELIAN" slug={unit.slug} {unit}>
	<svelte:fragment slot="actions">
		<button type="button" on:click={() => (modal = { ...kosong })} class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold">+ Tambah Supplier</button>
	</svelte:fragment>

	<PengadaanNav slug={unit.slug} />
	{#if !modal}<PesanForm {form} />{/if}

	<input type="search" bind:value={cari} aria-label="Cari supplier" placeholder="Cari nama, kontak, atau kategori" class="{kelasInput} mb-4 sm:max-w-sm" />

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
		<table class="w-full text-sm min-w-[760px]">
			<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
				<tr>
					<th class="py-2.5 px-4">Supplier</th>
					<th class="py-2.5 px-4">Kontak</th>
					<th class="py-2.5 px-4">Termin</th>
					<th class="py-2.5 px-4 text-right">Riwayat PO</th>
					<th class="py-2.5 px-4 text-right">Aksi</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
				{#each tersaring as s (s.id)}
					<tr class={s.isActive ? '' : 'opacity-60'}>
						<td class="py-2.5 px-4">
							<span class="font-bold text-slate-800 dark:text-slate-100">{s.namaSupplier}</span>
							{#if !s.isActive}<span class="ml-1 text-[11px] font-bold text-slate-500">Nonaktif</span>{/if}
							{#if s.category}<span class="block text-xs text-slate-400">{s.category}</span>{/if}
						</td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">
							{s.contactName || '-'}
							{#if s.phone}<span class="block text-xs text-slate-400">{s.phone}</span>{/if}
						</td>
						<td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">{s.termPembayaran ?? 30} hari</td>
						<td class="py-2.5 px-4 text-right">
							{#if s.jumlahPO > 0}
								<a href="{dasar}/po?supplier={s.id}" class="font-bold text-indigo-600">{s.jumlahPO} PO</a>
								<span class="block text-xs text-slate-400">{rp(s.nilaiPO)}</span>
							{:else}
								<span class="text-slate-400">-</span>
							{/if}
						</td>
						<td class="py-2.5 px-4">
							<div class="flex justify-end items-center gap-3 text-xs font-bold">
								<button type="button" class="text-indigo-600" on:click={() => (modal = { ...s })}>Ubah</button>
								<form method="POST" action="?/aktif" use:enhance={kirim()}>
									<input type="hidden" name="id" value={s.id} />
									<input type="hidden" name="aktif" value={s.isActive ? '0' : '1'} />
									<button class="text-slate-500">{s.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
								</form>
								{#if s.jumlahPO === 0}
									<form method="POST" action="?/hapus" use:enhance={kirim(`Hapus supplier ${s.namaSupplier}?`)}>
										<input type="hidden" name="id" value={s.id} />
										<button class="text-rose-600">Hapus</button>
									</form>
								{/if}
							</div>
						</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="py-12 text-center text-slate-400">{cari ? 'Tidak ada supplier yang cocok.' : 'Belum ada supplier. Tambahkan supplier pertama Anda.'}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</PageLayout>

{#if modal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" role="dialog" aria-modal="true" aria-labelledby="judulSupplier">
		<form method="POST" action="?/simpan" use:enhance={kirim()} class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
			<h2 id="judulSupplier" class="font-bold text-slate-800 dark:text-slate-100">{modal.id ? 'Ubah Supplier' : 'Tambah Supplier'}</h2>
			<PesanForm {form} />
			<input type="hidden" name="id" value={modal.id} />
			<div>
				<label for="namaSupplier" class={kelasLabel}>Nama supplier <span class="text-rose-500">*</span></label>
				<input id="namaSupplier" name="namaSupplier" required maxlength="150" value={modal.namaSupplier} class={kelasInput} />
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div><label for="contactName" class={kelasLabel}>Nama kontak</label><input id="contactName" name="contactName" maxlength="100" value={modal.contactName} class={kelasInput} /></div>
				<div><label for="phone" class={kelasLabel}>Telepon</label><input id="phone" name="phone" maxlength="30" value={modal.phone} class={kelasInput} /></div>
				<div><label for="email" class={kelasLabel}>Email</label><input id="email" type="email" name="email" maxlength="100" value={modal.email} class={kelasInput} /></div>
				<div><label for="category" class={kelasLabel}>Kategori</label><input id="category" name="category" maxlength="100" value={modal.category} placeholder="Contoh: Bahan baku" class={kelasInput} /></div>
				<div><label for="npwp" class={kelasLabel}>NPWP</label><input id="npwp" name="npwp" maxlength="30" value={modal.npwp} class={kelasInput} /></div>
				<div><label for="termPembayaran" class={kelasLabel}>Termin bayar (hari)</label><input id="termPembayaran" type="number" name="termPembayaran" min="0" max="365" value={modal.termPembayaran ?? 30} class={kelasInput} /></div>
			</div>
			<div><label for="address" class={kelasLabel}>Alamat</label><textarea id="address" name="address" rows="2" maxlength="300" value={modal.address} class="{kelasInput} resize-none"></textarea></div>
			<div class="flex justify-end gap-2">
				<button type="button" class="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300" on:click={() => (modal = null)}>Batal</button>
				<button class="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40" disabled={sedangKirim}>{sedangKirim ? 'Menyimpan...' : 'Simpan'}</button>
			</div>
		</form>
	</div>
{/if}
