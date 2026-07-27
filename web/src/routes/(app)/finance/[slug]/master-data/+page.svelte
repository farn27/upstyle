<script>
    import { page } from '$app/stores';
    import { fade, fly } from 'svelte/transition';
    import PageLayout from '$lib/components/PageLayout.svelte';

    export let data;
    $: slug = $page.params.slug;
    $: unit = data.unit || {};

    $: modules = [
        {
            title: 'Bagan Akun (COA)',
            desc: 'Daftar perkiraan akuntansi, saldo normal debit/kredit, dan kategori laporan keuangan.',
            href: `/finance/${slug}/master-data/coa`,
            icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
            badge: 'Penting',
            color: 'from-indigo-500 to-blue-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
        },
        {
            title: 'Aset Tetap (Fixed Assets)',
            desc: 'Pencatatan aset operasional, nilai perolehan, masa manfaat, dan kalkulasi otomatis akumulasi penyusutan.',
            href: `/finance/${slug}/master-data/aset`,
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
            badge: 'Penyusutan',
            color: 'from-emerald-500 to-teal-600 bg-emerald-50 text-emerald-600'
        },
        {
            title: 'Kontak AR/AP',
            desc: 'Kelola supplier dan customer yang terintegrasi dengan tagihan hutang & piutang usaha.',
            href: `/finance/${slug}/master-data/kontak`,
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            badge: 'Hutang / Piutang',
            color: 'from-amber-500 to-orange-600 bg-amber-50 text-amber-600'
        },
        {
            title: 'Pengaturan Pajak',
            desc: 'Konfigurasi tarif PPN, PPh, atau pajak kustom yang akan diterapkan pada modul pos dan transaksi.',
            href: `/finance/${slug}/master-data/pajak`,
            icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
            badge: 'Pajak',
            color: 'from-rose-500 to-pink-600 bg-rose-50 dark:bg-rose-950/30 text-rose-600'
        },
        {
            title: 'Budgeting & Anggaran',
            desc: 'Tetapkan rencana pengeluaran atau target budget per akun beban untuk memantau efisiensi biaya.',
            href: `/finance/${slug}/master-data/budgeting`,
            icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1-18 0 9 9 0 0-18 0z',
            badge: 'Kombinasi',
            color: 'from-violet-500 to-purple-600 bg-violet-50 text-violet-600'
        },
        {
            title: 'Tutup Buku (Period Closing)',
            desc: 'Kunci transaksi pada bulan tertentu untuk mencegah perubahan data laporan keuangan yang sudah diaudit.',
            href: `/finance/${slug}/master-data/tutup-buku`,
            icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
            badge: 'Terkunci',
            color: 'from-slate-600 to-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
        }
    ];
</script>

<svelte:head>
    <title>Master Data Keuangan — {unit.namaUnit || slug}</title>
</svelte:head>

<PageLayout title="Pusat Master Data Akuntansi" subtitle="Kelola data dasar akuntansi, konfigurasi pajak, aset, dan batas tutup buku." badge="Master Data" slug={slug} unit={unit}>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each modules as mod, i}
                <div in:fly="{{ y: 20, delay: i * 50 }}" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-xl hover:border-slate-200 dark:border-slate-700/60 transition-all duration-300 group">
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 group-hover:bg-indigo-50 dark:bg-indigo-900/30 group-hover:text-indigo-600 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={mod.icon}/>
                                </svg>
                            </div>
                            <span class="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:bg-indigo-900/30 group-hover:border-indigo-100 dark:border-indigo-800/50 group-hover:text-indigo-500 transition-all">
                                {mod.badge}
                            </span>
                        </div>

                        <div>
                            <h3 class="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{mod.title}</h3>
                            <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{mod.desc}</p>
                        </div>
                    </div>

                    <div class="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-end">
                        <a href={mod.href} class="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors">
                            Buka Modul
                            <span class="group-hover:translate-x-1 transition-transform">→</span>
                        </a>
                    </div>
                </div>
            {/each}
        </div>
</PageLayout>
