<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	export let data;
	export let form;

	$: slug = $page.params.slug;
	const bulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
	const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
</script>

<PageLayout title="Penggajian (Payroll)" subtitle="Periode {bulan[data.period.month]} {data.period.year}" {slug} unit={data.unit}>
	{#if form?.message}
		<div class="mb-4 rounded-lg border px-4 py-3 text-sm font-medium {form.success === false ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}">
			{form.message}
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
			<p class="text-xs text-slate-500 uppercase font-semibold">Total Karyawan</p>
			<p class="text-2xl font-bold text-slate-900 dark:text-white">{data.summary.total || 0}</p>
		</div>
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4">
			<p class="text-xs text-emerald-700 uppercase font-semibold">Sudah Dibayar</p>
			<p class="text-2xl font-bold text-emerald-800">{data.summary.paid_count || 0}</p>
		</div>
		<div class="rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 p-4">
			<p class="text-xs text-indigo-700 uppercase font-semibold">Total Gaji Bersih</p>
			<p class="text-xl font-bold text-indigo-900 font-mono">{rp(data.summary.total_net)}</p>
		</div>
	</div>

	<div class="flex flex-wrap gap-3 mb-6">
		<form method="POST" action="?/runPayroll" use:enhance>
			<button type="submit" class="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">Generate Payroll Bulan Ini</button>
		</form>
		<form method="POST" action="?/markPaid" use:enhance>
			<button type="submit" class="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition">Tandai Semua Lunas</button>
		</form>
	</div>

	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
		{#if !data.payrolls?.length}
			<EmptyState icon="users" title="Belum ada payroll" description="Klik Generate Payroll untuk membuat slip gaji bulan ini.">
				<a href="/finance/{slug}/hr" class="text-sm text-indigo-600 font-semibold hover:underline">Kembali ke HR →</a>
			</EmptyState>
		{:else}
			<table class="w-full text-sm">
				<thead class="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-semibold text-slate-500">
					<tr>
						<th class="px-4 py-3 text-left">Karyawan</th>
						<th class="px-4 py-3 text-right">Gaji Pokok</th>
						<th class="px-4 py-3 text-right">Bersih</th>
						<th class="px-4 py-3 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
					{#each data.payrolls as p}
						<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
							<td class="px-4 py-3">
								<p class="font-semibold">{p.full_name}</p>
								<p class="text-xs text-slate-500">{p.position || ''}</p>
							</td>
							<td class="px-4 py-3 text-right font-mono">{rp(p.basic_salary)}</td>
							<td class="px-4 py-3 text-right font-mono font-bold">{rp(p.net_salary)}</td>
							<td class="px-4 py-3 text-center">
								<span class="px-2 py-0.5 rounded-full text-xs font-semibold {p.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
									{p.payment_status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</PageLayout>
