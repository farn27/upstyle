<script>
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	let loading = false;
</script>

<svelte:head>
	<title>Reset Password — Upstyle</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<a href="/" class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
				Upstyle
			</a>
			<p class="text-slate-400 text-sm mt-1">Buat password baru</p>
		</div>

		<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
			{#if !data.valid}
				<!-- Invalid token -->
				<div class="text-center space-y-4">
					<div class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
						<svg class="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<h2 class="text-lg font-bold text-slate-900 dark:text-white">Link Tidak Valid</h2>
					<p class="text-slate-500 text-sm">{data.message}</p>
					<a href="/auth/forgot-password" class="inline-block text-sm text-indigo-600 font-semibold hover:underline">
						Minta link reset baru
					</a>
				</div>
			{:else}
				<h2 class="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter">
					Password Baru
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
					<input type="hidden" name="token" value={data.token || form?.token || ''} />

					<div>
						<label for="password" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
							Password Baru
						</label>
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="new-password"
							required
							minlength="8"
							placeholder="Minimal 8 karakter"
							class="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
						/>
					</div>

					<div>
						<label for="confirm_password" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
							Konfirmasi Password
						</label>
						<input
							id="confirm_password"
							name="confirm_password"
							type="password"
							autocomplete="new-password"
							required
							placeholder="Ulangi password baru"
							class="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-indigo-600 transition disabled:opacity-60"
					>
						{loading ? 'Menyimpan...' : 'Simpan Password Baru'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
