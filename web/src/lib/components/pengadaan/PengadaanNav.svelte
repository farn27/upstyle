<script>
	import { page } from '$app/stores';

	export let slug = '';

	$: dasar = `/finance/${slug}/pengadaan`;
	$: menu = [
		{ label: 'Ringkasan', path: dasar, persis: true },
		{ label: 'Purchase Order', path: `${dasar}/po` },
		{ label: 'Supplier', path: `${dasar}/supplier` },
		{ label: 'Penerimaan', path: `${dasar}/penerimaan` },
		{ label: 'Tagihan', path: `${dasar}/tagihan` },
		{ label: 'Retur', path: `${dasar}/retur` },
		{ label: 'Saran Restock', path: `${dasar}/restock` },
		{ label: 'Laporan', path: `${dasar}/laporan` }
	];
	$: sekarang = $page.url.pathname;
</script>

<nav aria-label="Menu pengadaan" class="flex items-center gap-1 overflow-x-auto overflow-y-hidden mb-5 border-b border-slate-200 dark:border-slate-800">
	{#each menu as m}
		{@const aktif = m.persis ? sekarang === m.path : sekarang === m.path || sekarang.startsWith(m.path + '/')}
		<a
			href={m.path}
			aria-current={aktif ? 'page' : undefined}
			class="px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors
				{aktif
				? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
				: 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}"
		>
			{m.label}
		</a>
	{/each}
</nav>
