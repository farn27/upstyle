<script>
    import { enhance } from '$app/forms';
    export let form;
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 font-sans">
    <div class="w-full max-w-sm bg-white dark:bg-slate-800 p-8 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="text-center mb-8">
            <div class="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-white font-bold mx-auto mb-3">B</div>
            <h1 class="text-lg font-bold text-slate-900 dark:text-white">Daftar Akun</h1>
        </div>

        <form method="POST" use:enhance class="space-y-4">
            <input name="username" type="text" placeholder="Username" required class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-slate-900 transition-all">
            <input name="email" type="email" placeholder="Email" required class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-slate-900 transition-all">
            <input name="password" type="password" placeholder="Password" required class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-slate-900 transition-all">
            <div>
    <label for="role-select" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Daftar Sebagai</label>
    <select id="role-select" name="role" class="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-slate-900">
        <option value="user">Pemilik Bisnis (User)</option>
        <option value="admin">Administrator</option>
    </select>
</div>
            {#if form?.message} <p class="text-xs text-red-500 font-medium">{form.message}</p> {/if}
            
            <button class="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md">DAFTAR SEKARANG</button>
        </form>

        <p class="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Sudah punya akun? <a href="../auth/login" class="text-slate-900 dark:text-white font-bold hover:underline">Login di sini</a>
        </p>
    </div>
</div>