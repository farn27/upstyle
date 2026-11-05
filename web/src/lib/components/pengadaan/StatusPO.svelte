<script>
	import { STATUS_PO } from '$lib/pengadaan';

	export let status = 'DRAFT';

	$: info = STATUS_PO[status] || { label: status, warna: 'bg-slate-100 text-slate-700' };
</script>

<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap {info.warna}">{info.label}</span>
