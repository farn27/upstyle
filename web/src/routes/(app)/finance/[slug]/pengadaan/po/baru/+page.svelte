<script>
	import PageLayout from '$lib/components/PageLayout.svelte';
	import PengadaanNav from '$lib/components/pengadaan/PengadaanNav.svelte';
	import FormPO from '$lib/components/pengadaan/FormPO.svelte';

	export let data;
	export let form;

	$: unit = data.unit;
</script>

<svelte:head><title>Buat PO | {unit.namaUnit}</title></svelte:head>

<PageLayout title="Buat Purchase Order" subtitle="Disimpan sebagai draft dulu, bisa ditinjau sebelum dikirim ke supplier" badge="PEMBELIAN" slug={unit.slug} {unit}>
	<PengadaanNav slug={unit.slug} />
	<FormPO suppliers={data.suppliers} products={data.products} awal={data.awal} {form} batalHref="/finance/{unit.slug}/pengadaan/po" />
</PageLayout>
