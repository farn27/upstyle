<script>
    import { enhance } from '$app/forms';
    export let form;

    let showPassword = false;
    let password = '';
    let loading = false;

    // ─── Email validation state ───────────────────────────────────────────────
    let emailValue = '';
    let emailStatus = 'idle'; // 'idle' | 'checking' | 'valid' | 'invalid'
    let emailMessage = '';
    let emailTimer = null;

    function onEmailInput(e) {
        emailValue = e.target.value.trim();
        emailStatus = 'idle';
        emailMessage = '';
        clearTimeout(emailTimer);

        if (!emailValue || !emailValue.includes('@')) return;

        // Debounce 600ms setelah user berhenti mengetik
        emailTimer = setTimeout(() => checkEmail(emailValue), 600);
    }

    async function onEmailBlur() {
        clearTimeout(emailTimer);
        if (emailValue && emailValue.includes('@') && emailStatus === 'idle') {
            await checkEmail(emailValue);
        }
    }

    async function checkEmail(email) {
        emailStatus = 'checking';
        try {
            const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
            const data = await res.json();
            emailStatus = data.valid ? 'valid' : 'invalid';
            emailMessage = data.message || '';
            // Kalau email sudah terdaftar, simpan flag untuk redirect ke login
            emailTaken = data.taken || false;
        } catch {
            emailStatus = 'idle';
            emailTaken = false;
        }
    }

    let emailTaken = false;
    $: emailIsBlocking = emailStatus === 'invalid';

    // ─── Password strength ────────────────────────────────────────────────────
    $: strength = (() => {
        if (password.length === 0) return 0;
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        return s;
    })();

    const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];
    const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-slate-900 font-sans p-6">
    <div class="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">

        <div class="text-center mb-8">
            <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-sm">B</div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Buat Akun</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Daftar gratis, mulai kelola bisnis kamu</p>
        </div>

        <form
            method="POST"
            use:enhance={() => {
                loading = true;
                return async ({ update }) => { loading = false; await update(); };
            }}
            class="space-y-4"
        >
            <div>
                <label for="reg-username" class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Username</label>
                <input
                    id="reg-username"
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    required
                    autocomplete="username"
                    value={form?.username ?? ''}
                    class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
            </div>

            <div>
                <label for="reg-email" class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                <div class="relative">
                    <input
                        id="reg-email"
                        name="email"
                        type="email"
                        placeholder="nama@email.com"
                        required
                        autocomplete="email"
                        value={form?.email ?? ''}
                        on:input={onEmailInput}
                        on:blur={onEmailBlur}
                        class="w-full px-4 py-3 pr-10 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm outline-none transition-all
                            {emailStatus === 'valid'   ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' :
                             emailStatus === 'invalid' ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' :
                             'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'}"
                    >
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {#if emailStatus === 'checking'}
                            <svg class="w-4 h-4 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 0v4a8 8 0 00-8 8H0z"/></svg>
                        {:else if emailStatus === 'valid'}
                            <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        {:else if emailStatus === 'invalid'}
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        {/if}
                    </span>
                </div>
                {#if emailMessage}
                    <p class="mt-1 text-xs {emailStatus === 'valid' ? 'text-emerald-600' : 'text-red-500'}">
                        {emailMessage}
                        {#if emailTaken}
                            — <a href="/auth/login" class="underline font-semibold">Login sekarang</a>
                        {/if}
                    </p>
                {/if}
            </div>

            <div>
                <label for="reg-password" class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
                <div class="relative">
                    <input
                        id="reg-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter"
                        required
                        autocomplete="new-password"
                        bind:value={password}
                        class="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    >
                    <button
                        type="button"
                        on:click={() => showPassword = !showPassword}
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Toggle password"
                    >
                        {#if showPassword}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/></svg>
                        {:else}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        {/if}
                    </button>
                </div>

                {#if password.length > 0}
                    <div class="mt-2 space-y-1">
                        <div class="flex gap-1">
                            {#each [1,2,3,4] as i}
                                <div class="h-1 flex-1 rounded-full transition-all {strength >= i ? strengthColor[strength] : 'bg-slate-200 dark:bg-slate-700'}"></div>
                            {/each}
                        </div>
                        <p class="text-xs text-slate-400">{strengthLabel[strength]}</p>
                    </div>
                {/if}
            </div>

            {#if form?.message}
                <p class="text-xs text-red-500 font-medium">{form.message}</p>
            {/if}

            <button
                type="submit"
                disabled={loading || emailIsBlocking}
                class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
                {#if loading}
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 0v4a8 8 0 00-8 8H0z"/></svg>
                    Mendaftarkan...
                {:else}
                    Daftar Sekarang
                {/if}
            </button>
        </form>

        <div class="relative my-5 text-center">
            <span class="absolute inset-x-0 top-1/2 border-t border-slate-100 dark:border-slate-700 -z-10"></span>
            <span class="bg-white dark:bg-slate-800 px-3 text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wide">Atau</span>
        </div>

        <!-- Google Register — pakai action yang sama dengan login -->
        <form action="/auth/login?/google" method="POST">
            <button class="w-full border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-semibold text-xs text-slate-600 dark:text-slate-300">
                <img src="https://www.svgrepo.com/show/355037/google.svg" class="w-4 h-4" alt="Google">
                Daftar dengan Google
            </button>
        </form>

        <p class="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
            Sudah punya akun?
            <a href="/auth/login" class="font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors">Login di sini</a>
        </p>
    </div>
</div>
