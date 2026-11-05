<script>
	import { hitungTotalPO, rp, STATUS_PO, tgl } from '$lib/pengadaan';

	export let data;

	$: po = data.po;
	$: k = data.supplier?.detail || {};
	$: total = hitungTotalPO(data.items.map((i) => ({ qty: i.qtyOrdered, unitPrice: i.unitPrice })), po);
</script>

<svelte:head><title>{po.poNumber}</title></svelte:head>

<div class="cetak">
	<button type="button" class="tombol" on:click={() => window.print()}>Cetak</button>

	<header>
		<div>
			<h1>PURCHASE ORDER</h1>
			<p class="nomor">{po.poNumber}</p>
			{#if po.status === 'DRAFT' || po.status === 'CANCELLED'}<p class="peringatan">{STATUS_PO[po.status].label.toUpperCase()}</p>{/if}
		</div>
		<div class="kanan">
			<strong>{data.unit.namaUnit}</strong>
			<p>Tanggal: {tgl(po.createdAt)}</p>
			<p>Perkiraan datang: {tgl(po.expectedDate)}</p>
		</div>
	</header>

	<section>
		<h2>Kepada</h2>
		<strong>{data.supplier?.namaSupplier || '-'}</strong>
		{#if k.contactName}<p>{k.contactName}</p>{/if}
		{#if k.address}<p>{k.address}</p>{/if}
		{#if k.phone}<p>{k.phone}</p>{/if}
		{#if k.email}<p>{k.email}</p>{/if}
	</section>

	<table>
		<thead>
			<tr><th>No</th><th>Barang</th><th class="angka">Jumlah</th><th class="angka">Harga</th><th class="angka">Subtotal</th></tr>
		</thead>
		<tbody>
			{#each data.items as item, i}
				<tr>
					<td>{i + 1}</td>
					<td>{item.namaProduk || item.productId}{item.sku ? ` (${item.sku})` : ''}</td>
					<td class="angka">{item.qtyOrdered}</td>
					<td class="angka">{rp(item.unitPrice)}</td>
					<td class="angka">{rp(item.totalPrice)}</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr><td colspan="4" class="angka">Subtotal</td><td class="angka">{rp(total.subtotal)}</td></tr>
			{#if total.diskon > 0}<tr><td colspan="4" class="angka">Diskon</td><td class="angka">-{rp(total.diskon)}</td></tr>{/if}
			{#if total.ongkir > 0}<tr><td colspan="4" class="angka">Ongkos kirim</td><td class="angka">{rp(total.ongkir)}</td></tr>{/if}
			{#if total.ppn > 0}<tr><td colspan="4" class="angka">PPN {Number(po.ppnPersen)}%</td><td class="angka">{rp(total.ppn)}</td></tr>{/if}
			<tr class="total"><td colspan="4" class="angka">Total</td><td class="angka">{rp(po.totalAmount)}</td></tr>
		</tfoot>
	</table>

	{#if po.notes}<section><h2>Catatan</h2><p class="catatan">{po.notes}</p></section>{/if}

	<div class="ttd"><div>Disetujui oleh,<span></span></div></div>
</div>

<style>
	.cetak { max-width: 800px; margin: 0 auto; padding: 32px; background: #fff; color: #111; font-size: 14px; min-height: 100vh; }
	.tombol { padding: 8px 16px; background: #4f46e5; color: #fff; border-radius: 8px; font-weight: 700; margin-bottom: 24px; }
	header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
	h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.04em; }
	h2 { font-size: 12px; font-weight: 700; color: #555; margin-bottom: 4px; }
	.nomor { font-family: monospace; }
	.peringatan { color: #be123c; font-weight: 700; margin-top: 4px; }
	.kanan { text-align: right; }
	section { margin-bottom: 20px; }
	.catatan { white-space: pre-line; }
	table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
	th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
	th { font-size: 12px; background: #f4f4f5; }
	.angka { text-align: right; white-space: nowrap; }
	tfoot td { border-bottom: none; padding: 4px 8px; }
	.total td { font-weight: 800; font-size: 16px; border-top: 2px solid #111; padding-top: 8px; }
	.ttd { display: flex; justify-content: flex-end; margin-top: 48px; }
	.ttd div { width: 200px; text-align: center; }
	.ttd span { display: block; border-bottom: 1px solid #111; height: 70px; }
	/* Hanya dokumen yang tercetak: header aplikasi & tombol chat dari layout disembunyikan */
	@media print {
		:global(body *) { visibility: hidden; }
		.cetak, .cetak :global(*) { visibility: visible; }
		.cetak { position: absolute; left: 0; top: 0; width: 100%; max-width: none; padding: 0; min-height: 0; }
		.tombol { display: none; }
	}
</style>
