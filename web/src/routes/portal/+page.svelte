<script>
    import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-16">
    <div class="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center shadow-sm">
        <div class="mb-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">
            Portal Karyawan Privat
        </div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Portal ini hanya dipakai untuk akses karyawan yang terikat ke unit bisnis tertentu.</h1>
        <p class="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Jika Anda belum membuat link portal untuk unit bisnis, buka halaman HR atau pengaturan bisnis untuk mengaktifkannya. Portal tidak akan terbuka untuk pengguna lain.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/" class="rounded-full border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900">Kembali ke Beranda</a>
            <a href="/finance" class="rounded-full bg-slate-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800">Buka Dashboard</a>
        </div>
    </div>
</div>
