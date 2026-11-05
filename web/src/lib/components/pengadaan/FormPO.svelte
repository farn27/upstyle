<script>
	import { enhance } from '$app/forms';
	import { hitungTotalPO, rp } from '$lib/pengadaan';
	import PesanForm from './PesanForm.svelte';

	/** @type {{ id: number, namaSupplier: string, termPembayaran?: number }[]} */
	export let suppliers = [];
	/** @type {{ id: string, nama: string, sku?: string, hargaBeli: string, stok: number }[]} */
	export let products = [];
	export let form = null;
	export let batalHref = '';
	export let labelSimpan = 'Simpan sebagai Draft';
	/** Nilai awal saat mengubah draft atau dari saran restock */
	export let awal = {};

	let items = (awal.items || []).map((i) => ({ ...i }));
	let supplierId = awal.supplierId ?? '';
	let expectedDate = awal.expectedDate ?? '';
	let notes = awal.notes ?? '';
	let diskon = Number(awal.diskon || 0);
	let ongkir = Number(awal.ongkir || 0);
	let ppnPersen = Number(awal.ppnPersen || 0);

	let cari = '';
	let pilihProduk = '';
	let sedangKirim = false;

	$: produkTersaring = products.filter((p) => {
		if (items.some((i) => i.productId === p.id)) return false;
		const kata = cari.trim().toLowerCase();
		return !kata || p.nama.toLowerCase().includes(kata) || String(p.sku || '').toLowerCase().includes(kata);
	});
	$: hitung = hitungTotalPO(items, { diskon, ongkir, ppnPersen });
	$: itemsData = JSON.stringify(items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })));

	function tambah() {
		const p = products.find((x) => x.id === pilihProduk);
		if (!p) return;
		items = [...items, { productId: p.id, nama: p.nama, sku: p.sku, qty: 1, unitPrice: Number(p.hargaBeli || 0) }];
		pilihProduk = '';
		cari = '';
	}

	function hapus(productId) {
		items = items.filter((i) => i.productId !== productId);
	}

	const kelasInput = 'w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none';
	const kelasLabel = 'block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1';
</script>

<PesanForm {form} />

<form
	method="POST"
	action="?/simpan"
	use:enhance={() => {
		sedangKirim = true;
		return async ({ update }) => {
			await update({ reset: false });
			sedangKirim = false;
		};
	}}
>
	<input type="hidden" name="itemsData" value={itemsData} />
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
		<div class="lg:col-span-2 space-y-5">
			<section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
				<h2 class="font-bold text-slate-800 dark:text-slate-100">Informasi Pesanan</h2>
				{#if suppliers.length === 0}
					<p class="text-sm text-amber-700 dark:text-amber-300">
						Belum ada supplier aktif. <a class="underline font-bold" href="../supplier">Tambah supplier dulu</a>.
					</p>
				{/if}
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="supplierId" class={kelasLabel}>Supplier <span class="text-rose-500">*</span></label>
						<select id="supplierId" name="supplierId" required bind:value={supplierId} class={kelasInput}>
							<option value="">Pilih supplier</option>
							{#each suppliers as s}
								<option value={s.id}>{s.namaSupplier}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="expectedDate" class={kelasLabel}>Perkiraan barang datang</label>
						<input id="expectedDate" type="date" name="expectedDate" bind:value={expectedDate} class={kelasInput} />
					</div>
				</div>
				<div>
					<label for="notes" class={kelasLabel}>Catatan untuk supplier</label>
					<textarea id="notes" name="notes" rows="2" bind:value={notes} class="{kelasInput} resize-none"></textarea>
				</div>
			</section>

			<section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
				<h2 class="font-bold text-slate-800 dark:text-slate-100">Daftar Barang</h2>
				<div class="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2 items-end">
					<div>
						<label for="cariProduk" class={kelasLabel}>Cari produk</label>
						<input id="cariProduk" type="search" bind:value={cari} placeholder="Nama atau SKU" class={kelasInput} />
					</div>
					<div>
						<label for="pilihProduk" class={kelasLabel}>Produk</label>
						<select id="pilihProduk" bind:value={pilihProduk} class={kelasInput}>
							<option value="">Pilih produk ({produkTersaring.length})</option>
							{#each produkTersaring as p}
								<option value={p.id}>{p.nama}{p.sku ? ` (${p.sku})` : ''} · stok {p.stok ?? 0}</option>
							{/each}
						</select>
					</div>
					<button type="button" on:click={tambah} disabled={!pilihProduk} class="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm rounded-lg disabled:opacity-40">
						Tambah
					</button>
				</div>

				<div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
					<table class="w-full text-sm min-w-[560px]">
						<thead class="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 text-left">
							<tr>
								<th class="py-2 px-3">Produk</th>
								<th class="py-2 px-3 w-24">Jumlah</th>
								<th class="py-2 px-3 w-40">Harga Satuan</th>
								<th class="py-2 px-3 text-right">Subtotal</th>
								<th class="py-2 px-3 w-10"><span class="sr-only">Hapus</span></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
							{#each items as item (item.productId)}
								<tr>
									<td class="py-2 px-3 font-medium text-slate-800 dark:text-slate-100">
										{item.nama}
										{#if item.sku}<span class="block text-xs font-normal text-slate-400">{item.sku}</span>{/if}
									</td>
									<td class="py-2 px-3">
										<input type="number" aria-label="Jumlah {item.nama}" min="1" step="1" required bind:value={item.qty} class="{kelasInput} text-center" />
									</td>
									<td class="py-2 px-3">
										<input type="number" aria-label="Harga {item.nama}" min="0" step="any" required bind:value={item.unitPrice} class={kelasInput} />
									</td>
									<td class="py-2 px-3 text-right font-mono whitespace-nowrap">{rp(Number(item.qty || 0) * Number(item.unitPrice || 0))}</td>
									<td class="py-2 px-3 text-center">
										<button type="button" aria-label="Hapus {item.nama}" on:click={() => hapus(item.productId)} class="text-slate-400 hover:text-rose-600 font-bold">✕</button>
									</td>
								</tr>
							{:else}
								<tr><td colspan="5" class="py-8 text-center text-slate-400">Belum ada barang. Pilih produk di atas.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>

		<aside class="space-y-5">
			<section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 lg:sticky lg:top-28">
				<h2 class="font-bold text-slate-800 dark:text-slate-100">Ringkasan</h2>
				<div>
					<label for="diskon" class={kelasLabel}>Diskon (Rp)</label>
					<input id="diskon" type="number" name="diskon" min="0" step="any" bind:value={diskon} class={kelasInput} />
				</div>
				<div>
					<label for="ongkir" class={kelasLabel}>Ongkos kirim (Rp)</label>
					<input id="ongkir" type="number" name="ongkir" min="0" step="any" bind:value={ongkir} class={kelasInput} />
				</div>
				<div>
					<label for="ppnPersen" class={kelasLabel}>PPN (%)</label>
					<input id="ppnPersen" type="number" name="ppnPersen" min="0" max="100" step="any" bind:value={ppnPersen} class={kelasInput} />
				</div>
				<dl class="text-sm space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-700">
					<div class="flex justify-between"><dt class="text-slate-500">Subtotal</dt><dd class="font-mono">{rp(hitung.subtotal)}</dd></div>
					<div class="flex justify-between"><dt class="text-slate-500">Diskon</dt><dd class="font-mono">-{rp(hitung.diskon)}</dd></div>
					<div class="flex justify-between"><dt class="text-slate-500">Ongkos kirim</dt><dd class="font-mono">{rp(hitung.ongkir)}</dd></div>
					<div class="flex justify-between"><dt class="text-slate-500">PPN</dt><dd class="font-mono">{rp(hitung.ppn)}</dd></div>
					<div class="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-base text-slate-900 dark:text-white">
						<dt>Total</dt><dd class="font-mono">{rp(hitung.total)}</dd>
					</div>
				</dl>
				<button type="submit" disabled={items.length === 0 || sedangKirim} class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg disabled:opacity-40">
					{sedangKirim ? 'Menyimpan...' : labelSimpan}
				</button>
				<a href={batalHref} class="block text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">Batal</a>
			</section>
		</aside>
	</div>
</form>
