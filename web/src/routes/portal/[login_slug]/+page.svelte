<script>
    import { onMount } from 'svelte';
    export let data;
    export let form;
    $: unit = data.unit;

    // (no client enhancement) using native form submit for reliable cookie handling
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-manrope">
    <div class="w-full max-w-sm">
        
        <div class="text-center mb-6 sm:mb-8">
            <h1 class="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">
                {unit.nama_unit}
            </h1>
            <p class="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">Staff Login Portal</p>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-6 sm:p-8 shadow-sm">
            <form method="POST" action="?/login" class="space-y-5">
                <div class="space-y-1">
                    <label for="portal-email" class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Kerja</label>
                    <input id="portal-email" name="email" type="email" required placeholder="nama@perusahaan.com" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-200 outline-none transition-all" />
                </div>

                <div class="space-y-1">
                    <label for="portal-password" class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Password</label>
                    <input id="portal-password" name="password" type="password" placeholder="••••••••" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-200 outline-none transition-all" />
                </div>

                {#if form?.message}
                    <div class="bg-rose-50 dark:bg-rose-950/30 text-rose-600 p-3 rounded-md text-[10px] font-bold text-center italic">
                        {form.message}
                    </div>
                {/if}

                <button type="submit" class="w-full bg-[#0f172a] text-white py-4 rounded-md text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 bg-black transition-all shadow-lg">
                    Masuk Ke Sistem
                </button>
            </form>
        </div>
        
        <p class="text-center mt-6 sm:mt-8 text-[9px] text-slate-300 font-bold uppercase tracking-widest">
            Bizgrow Human Resource System
        </p>
    </div>
</div>