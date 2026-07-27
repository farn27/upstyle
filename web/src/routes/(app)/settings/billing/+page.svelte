<script>
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';

	export let data;
	$: ({ user, plans, invoices, currentPlan } = data);

	// Midtrans Snap client key (public)
	const MIDTRANS_CLIENT_KEY = import.meta.env.PUBLIC_MIDTRANS_CLIENT_KEY;
	const MIDTRANS_SNAP_URL = import.meta.env.PUBLIC_MIDTRANS_SANDBOX === 'true'
		? 'https://app.sandbox.midtrans.com/snap/snap.js'
		: 'https://app.midtrans.com/snap/snap.js';

	let loadingPlan = '';
	let paymentMsg = '';
	let paymentMsgType = ''; // 'success' | 'error' | 'info'

	// Pesan dari redirect callback Midtrans
	$: {
		const status = $page.url.searchParams.get('status');
		if (status === 'success') { paymentMsg = 'Pembayaran berhasil! Paket kamu sudah diupgrade.'; paymentMsgType = 'success'; }
		else if (status === 'pending') { paymentMsg = 'Pembayaran sedang diproses. Halaman akan diperbarui otomatis.'; paymentMsgType = 'info'; }
		else if (status === 'error') { paymentMsg = 'Pembayaran gagal. Coba lagi atau hubungi support.'; paymentMsgType = 'error'; }
	}

	async function handleUpgrade(planId) {
		if (loadingPlan) return;
		loadingPlan = planId;
		paymentMsg = '';

		try {
			const res = await fetch('/api/payment/snap', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planId })
			});
			const result = await res.json();

			if (!result.success) {
				paymentMsg = result.message || 'Gagal memulai pembayaran';
				paymentMsgType = 'error';
				loadingPlan = '';
				return;
			}

			// Buka Midtrans Snap popup
			if (typeof window !== 'undefined' && window.snap) {
				window.snap.pay(result.data.token, {
					onSuccess: () => {
						paymentMsg = 'Pembayaran berhasil! Paket kamu sedang diupgrade...';
						paymentMsgType = 'success';
						setTimeout(() => window.location.reload(), 3000);
					},
					onPending: () => {
						paymentMsg = 'Pembayaran pending. Selesaikan pembayaran di halaman yang diarahkan.';
						paymentMsgType = 'info';
					},
					onError: () => {
						paymentMsg = 'Pembayaran gagal. Silakan coba lagi.';
						paymentMsgType = 'error';
					},
					onClose: () => {
						paymentMsg = 'Pembayaran dibatalkan.';
						paymentMsgType = 'info';
					}
				});
			} else {
				// Fallback: redirect ke Midtrans hosted payment
				window.location.href = result.data.redirect_url;
			}
		} catch (err) {
			paymentMsg = 'Terjadi kesalahan. Coba lagi.';
			paymentMsgType = 'error';
		} finally {
			loadingPlan = '';
		}
	}
</script>

<svelte:head>
	<title>Billing — Upstyle</title>
	<!-- Midtrans Snap.js -->
	{#if MIDTRANS_CLIENT_KEY}
		<script
			src={MIDTRANS_SNAP_URL}
			data-client-key={MIDTRANS_CLIENT_KEY}
		></script>
	{/if}
</svelte:head>

<div class="px-8 max-w-6xl mx-auto space-y-10 bg-[#fcfcfc] pb-20 font-sans" in:fade>

	<div class="pt-10 border-b border-slate-100 dark:border-slate-800 pb-8 space-y-1 italic">
		<p class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Account Settings</p>
		<h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Subscription</h1>
	</div>

	<!-- Alert messages -->
	{#if paymentMsg}
		<div class="p-4 rounded-lg text-sm font-medium
			{paymentMsgType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
			 paymentMsgType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
			 'bg-blue-50 text-blue-700 border border-blue-200'}">
			{paymentMsg}
		</div>
	{/if}

	<!-- Current Plan Card -->
	<div class="bg-slate-900 rounded-md p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl italic">
		<div class="flex items-center gap-6">
			<div class="w-12 h-12 bg-white/10 rounded-md flex items-center justify-center border border-white/10">
				<span class="text-xl font-black">{user?.role?.charAt(0).toUpperCase() || 'U'}</span>
			</div>
			<div class="space-y-0.5">
				<p class="text-[9px] font-black uppercase tracking-widest opacity-60">Status Langganan</p>
				<div class="flex items-center gap-3">
					<h2 class="text-2xl font-black tracking-tighter uppercase leading-none">{currentPlan?.name || user?.role || 'User'}</h2>
					<span class="px-2 py-0.5 bg-emerald-500 text-[8px] font-black rounded uppercase tracking-widest text-white">Active</span>
				</div>
			</div>
		</div>

		<div class="flex flex-col md:flex-row items-center gap-6">
			<div class="text-center md:text-right space-y-0.5">
				<p class="text-[9px] font-black uppercase tracking-widest opacity-60 italic">Penggunaan</p>
				<p class="text-xs font-bold text-indigo-400 leading-none">
					{currentPlan?.unitsUsed ?? 0}/{currentPlan?.unitLimit ?? 3} unit ·
					{currentPlan?.storageUsed ?? 0}GB/{currentPlan?.storageLimit ?? 2}GB
				</p>
			</div>
		</div>
	</div>

	<!-- Plans Grid -->
	<div class="space-y-8 pt-4">
		<h3 class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic text-center">Tingkatkan Kapasitas Bisnis</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 italic">
			{#each plans as plan}
				<div class="bg-white dark:bg-slate-800 border {plan.isCurrent ? 'border-indigo-500 ring-2 ring-indigo-50 dark:ring-indigo-900/30' : 'border-slate-100 dark:border-slate-700'} p-8 rounded-md shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
					<div class="space-y-5">
						<div class="flex justify-between items-start">
							<h4 class="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{plan.name}</h4>
							{#if plan.isCurrent}
								<span class="text-[8px] font-black bg-indigo-600 text-white px-2 py-1 rounded uppercase tracking-widest">Aktif</span>
							{/if}
						</div>
						<p class="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">
							{plan.price}<span class="text-[10px] text-slate-400 dark:text-slate-500 ml-1">/ BLN</span>
						</p>
						<ul class="space-y-3 pt-5 border-t border-slate-50 dark:border-slate-700">
							{#each plan.features as feature}
								<li class="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
									<span class="text-indigo-500">✔</span> {feature}
								</li>
							{/each}
						</ul>
					</div>

					{#if !plan.isCurrent && plan.id !== 'free'}
						<button
							on:click={() => handleUpgrade(plan.id)}
							disabled={loadingPlan === plan.id}
							class="mt-8 w-full py-3.5 bg-slate-900 text-white rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{loadingPlan === plan.id ? 'Memproses...' : 'Upgrade Sekarang'}
						</button>
					{:else if plan.isCurrent}
						<button disabled class="mt-8 w-full py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-300 rounded-md text-[9px] font-black uppercase tracking-widest cursor-default">
							Paket Saat Ini
						</button>
					{:else}
						<button disabled class="mt-8 w-full py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-md text-[9px] font-black uppercase tracking-widest cursor-default">
							Paket Gratis
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Invoice History -->
	<div class="space-y-6 italic pb-10">
		<h3 class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Riwayat Pembayaran</h3>
		<div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
			<table class="w-full text-left">
				<thead class="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
					<tr>
						<th class="p-5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Order ID</th>
						<th class="p-5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Paket</th>
						<th class="p-5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-50 dark:divide-slate-700">
					{#if invoices.length === 0}
						<tr>
							<td colspan="3" class="p-8 text-center text-[11px] text-slate-400 font-medium">
								Belum ada riwayat pembayaran
							</td>
						</tr>
					{:else}
						{#each invoices as inv}
							<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
								<td class="p-5">
									<p class="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.id}</p>
									<p class="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{inv.date} — {inv.amount}</p>
								</td>
								<td class="p-5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">{inv.plan}</td>
								<td class="p-5 text-right">
									<span class="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase tracking-widest">{inv.status}</span>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	:global(body) { background-color: #fcfcfc; }
</style>
