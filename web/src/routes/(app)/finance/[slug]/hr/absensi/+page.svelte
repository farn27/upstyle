<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	export let data;
	export let form;

	$: slug = $page.params.slug;
</script>

<PageLayout title="Kehadiran & Absensi" subtitle="Catat check-in dan check-out karyawan" {slug} unit={data.unit}>
	{#if form?.message}
		<div class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{form.message}</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
			<h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Check-in / Check-out</h2>
			<form method="POST" action="?/checkIn" use:enhance class="space-y-3">
				<select name="employee_id" required class="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
					<option value="">Pilih karyawan...</option>
					{#each data.employees as emp}
						<option value={emp.id}>{emp.full_name} — {emp.position || emp.role}</option>
					{/each}
				</select>
				<button type="submit" class="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
					Toggle Check-in/out
				</button>
			</form>
			<p class="text-xs text-slate-500 mt-3">Jika karyawan belum check-out, tombol akan mencatat check-out.</p>
		</div>

		<div class="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
			<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
				<h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Riwayat Absensi</h2>
			</div>
			{#if !data.attendance?.length}
				<EmptyState icon="users" title="Belum ada absensi" description="Catat check-in pertama untuk karyawan unit ini." />
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-semibold text-slate-500">
							<tr>
								<th class="px-4 py-3 text-left">Karyawan</th>
								<th class="px-4 py-3">Check-in</th>
								<th class="px-4 py-3">Check-out</th>
								<th class="px-4 py-3 text-center">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
							{#each data.attendance as row}
								<tr>
									<td class="px-4 py-3 font-medium">{row.full_name}</td>
									<td class="px-4 py-3 text-slate-600">{row.check_in ? new Date(row.check_in).toLocaleString('id-ID') : '-'}</td>
									<td class="px-4 py-3 text-slate-600">{row.check_out ? new Date(row.check_out).toLocaleString('id-ID') : '—'}</td>
									<td class="px-4 py-3 text-center">
										<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{row.status || 'present'}</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</PageLayout>
