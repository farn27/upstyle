<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import FormPO from '$lib/components/pengadaan/FormPO.svelte';

	export let data;
	export let form;

	$: unit = data.unit;
</script>

<svelte:head><title>Ubah {data.po.poNumber} | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Ubah {data.po.poNumber}" subtitle="Hanya PO berstatus draft yang bisa diubah" badge="PEMBELIAN" slug={unit.slug} {unit}>
	<PengadaanNav slug={unit.slug} />
	<FormPO
		suppliers={data.suppliers}
		products={data.products}
		awal={data.awal}
		{form}
		labelSimpan="Simpan Perubahan"
		batalHref="/finance/{unit.slug}/pengadaan/po/{data.po.id}"
	/>
</PageLayout>
