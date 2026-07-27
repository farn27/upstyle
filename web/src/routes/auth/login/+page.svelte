<script>
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    
    export let form;

    // Pesan dari URL params
    $: urlMsg = (() => {
        const p = $page.url.searchParams;
        if (p.get('verify') === 'success') return { type: 'success', text: 'Email berhasil diverifikasi! Silakan login.' };
        if (p.get('verify') === 'expired') return { type: 'error', text: 'Link verifikasi sudah kadaluarsa. Daftar ulang atau hubungi support.' };
        if (p.get('verify') === 'invalid') return { type: 'error', text: 'Link verifikasi tidak valid.' };
        if (p.get('reset') === 'success') return { type: 'success', text: 'Password berhasil direset. Silakan login dengan password baru.' };
        if (p.get('registered') === '1') return { type: 'info', text: 'Registrasi berhasil! Cek email kamu untuk verifikasi akun.' };
        return null;
    })();
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-slate-900 font-sans p-6">
    <div class="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
        <div class="text-center mb-8">
            <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-sm">B</div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Selamat Datang</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Masuk ke Dashboard Bizgrow</p>
        </div>

        {#if urlMsg}
            <div class="mb-4 p-3 rounded-xl text-sm font-medium
                {urlMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                 urlMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
                 'bg-blue-50 text-blue-700 border border-blue-200'}">
                {urlMsg.text}
            </div>
        {/if}

        <form action="?/login" method="POST" use:enhance class="space-y-4">
            <input name="username" type="text" placeholder="Username atau Email" required autocomplete="username"
                class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
            <div class="space-y-1">
                <input name="password" type="password" placeholder="Password" required autocomplete="current-password"
                    class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all">
                <div class="text-right">
                    <a href="/auth/forgot-password" class="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                        Lupa password?
                    </a>
                </div>
            </div>
            
            {#if form?.error} <p class="text-xs text-red-500 font-medium">{form.error}</p> {/if}
            
            <button class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-md transition-all">Masuk</button>
        </form>

        <div class="relative my-6 text-center">
            <span class="absolute inset-x-0 top-1/2 border-t border-slate-100 dark:border-slate-800 -z-10"></span>
            <span class="bg-white dark:bg-slate-800 px-3 text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wide">Atau</span>
        </div>

        <form action="?/google" method="POST">
            <button class="w-full border border-slate-200 dark:border-slate-700 py-2.5 rounded-md flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all font-semibold text-xs text-slate-600 dark:text-slate-300">
                <img src="https://www.svgrepo.com/show/355037/google.svg" class="w-4 h-4" alt="Google Logo">
                Masuk dengan Google
            </button>
        </form>
        <div class="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Belum punya akun? 
            <a href="/auth/register" class="font-bold text-slate-900 dark:text-white hover:underline">
                Daftar di sini
            </a>
        </div>
    </div>
</div>