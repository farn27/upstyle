<script>
    import { fade } from 'svelte/transition';
    import { goto } from '$app/navigation';
    export let data;

    let unit = {};
    let employees = [];
    let totalEmployees = 0;
    let totalSalary = 0;

    $: if (data) {
        unit = data.unit || {};
        employees = data.employees || [];
        totalEmployees = data.totalEmployees || 0;
        totalSalary = data.totalSalary || 0;
    }

    const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    const financeLink = (path) => {
        if (!unit?.slug) return '#';
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `/finance/${unit.slug}/${cleanPath}`;
    };
</script>

<div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 dark:text-slate-300 pb-20" in:fade>
    <div class="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <header class="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <div>
                <h1 class="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic leading-none mb-1">
                    HR Portal
                </h1>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-bold">
                    {unit?.nama_unit}
                </p>
            </div>
            <div class="flex items-center gap-3">
                <a href={financeLink('hr')} class="bg-indigo-600 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-all">
                    HR Full Access
                </a>
                <a href={`/portal/${unit?.login_slug}/dashboard`} class="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                    Back to Dashboard
                </a>
            </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-slate-800 p-6 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Karyawan</p>
                <p class="text-2xl text-slate-800 dark:text-slate-100 font-light tracking-tighter tabular-nums italic">{totalEmployees}</p>
            </div>
            <div class="bg-white dark:bg-slate-800 p-6 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Gaji Bulanan</p>
                <p class="text-2xl text-emerald-600 font-light tracking-tighter tabular-nums italic">{formatIDR(totalSalary)}</p>
            </div>
            <div class="bg-white dark:bg-slate-800 p-6 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Rata-rata Gaji</p>
                <p class="text-2xl text-indigo-600 font-light tracking-tighter tabular-nums italic">{formatIDR(totalEmployees > 0 ? totalSalary / totalEmployees : 0)}</p>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm overflow-hidden">
            <div class="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center px-8">
                <h3 class="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Daftar Karyawan Aktif</h3>
                <a href={financeLink('hr')} class="text-[10px] font-black text-indigo-600 hover:underline italic">Kelola Full →</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th class="px-8 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nama</th>
                            <th class="px-8 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Jabatan</th>
                            <th class="px-8 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Divisi</th>
                            <th class="px-8 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Level</th>
                            <th class="px-8 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Gaji</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                        {#each employees as emp (emp.id)}
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group text-[11px]">
                                <td class="px-8 py-4 uppercase font-bold text-slate-700 dark:text-slate-200">
                                    {emp.full_name}
                                </td>
                                <td class="px-8 py-4 text-slate-600 dark:text-slate-300 font-medium">{emp.position}</td>
                                <td class="px-8 py-4 text-slate-600 dark:text-slate-300 font-medium">{emp.division || '-'}</td>
                                <td class="px-8 py-4">
                                    <span class="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {emp.job_grade}
                                    </span>
                                </td>
                                <td class="px-8 py-4 text-right font-black italic text-sm text-emerald-600">
                                    {formatIDR(emp.salary)}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
