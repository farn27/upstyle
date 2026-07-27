<script>
	import { enhance } from '$app/forms';
	export let form;

	let loading = false;
</script>

<svelte:head>
	<title>Lupa Password — Upstyle</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Logo -->
		<div class="text-center mb-8">
			<a href="/" class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
				Upstyle
			</a>
			<p class="text-slate-400 text-sm mt-1">Reset password akun kamu</p>
		</div>

		<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
			{#if form?.success}
				<!-- Success state -->
				<div class="text-center space-y-4">
					<div class="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
						<svg class="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</div>
					<h2 class="text-lg font-bold text-slate-900 dark:text-white">Cek Inbox Kamu</h2>
					<p class="text-slate-500 text-sm">{form.message}</p>
					<a href="/auth/login" class="inline-block text-sm text-indigo-600 font-semibold hover:underline mt-2">
						← Kembali ke Login
					</a>
				</div>
			{:else}
				<h2 class="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter">
					Lupa Password
				</h2>

				{#if form?.message}
					<div class="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
						{form.message}
					</div>
				{/if}

				<form
					method="POST"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
					class="space-y-5"
				>
					<div>
						<label for="email" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							placeholder="email@contoh.com"
							class="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-indigo-600 transition disabled:opacity-60"
					>
						{loading ? 'Mengirim...' : 'Kirim Link Reset'}
					</button>
				</form>

				<p class="text-center text-sm text-slate-400 mt-6">
					Ingat password?
					<a href="/auth/login" class="text-indigo-600 font-semibold hover:underline">Login</a>
				</p>
			{/if}
		</div>
	</div>
</div>
