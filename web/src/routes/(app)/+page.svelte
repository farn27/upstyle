<script>
    import { fade, fly } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { 
        Building2, 
        Target, 
        Megaphone, 
        LifeBuoy, 
        ShoppingBag, 
        HelpCircle, 
        ArrowRight, 
        Sparkles,
        Clock,
        BookOpen,
        Terminal,
        Calendar,
        Play,
        ChevronRight
    } from 'lucide-svelte';
    
    export let data;

    $: ({ user, stats, subscription, devUpdates, taxCalendar, insights } = data);

    let currentTime = new Date();
    let isLoaded = false;

    onMount(() => {
        isLoaded = true;
        const interval = setInterval(() => currentTime = new Date(), 1000);
        return () => clearInterval(interval);
    });

    const otherDivisions = [
        { 
            name: 'Penjualan (CRM)', 
            desc: 'Kelola pipeline deal penjualan & CRM.',
            path: '/ecommerce/sales', 
            icon: Target,
            iconClass: 'from-violet-500 to-indigo-600 text-white shadow-indigo-500/20',
            bgClass: 'bg-white dark:bg-slate-900 border-slate-100 hover:border-indigo-200'
        },
        { 
            name: 'Pemasaran (Ads)', 
            desc: 'Analisis ads tracking & voucher campaign.',
            path: '/ecommerce/marketing', 
            icon: Megaphone,
            iconClass: 'from-pink-500 to-fuchsia-650 text-white shadow-fuchsia-500/20',
            bgClass: 'bg-white dark:bg-slate-900 border-slate-100 hover:border-fuchsia-200'
        },
        { 
            name: 'Layanan CS', 
            desc: 'Sistem komplain & resolusi SLA support.',
            path: '/ecommerce/layanan', 
            icon: LifeBuoy,
            iconClass: 'from-cyan-500 to-blue-600 text-white shadow-cyan-500/20',
            bgClass: 'bg-white dark:bg-slate-900 border-slate-100 hover:border-cyan-200'
        },
        { 
            name: 'E-Commerce Store', 
            desc: 'Katalog online & sinkronisasi Shopee/Tokopedia.',
            path: '/ecommerce', 
            icon: ShoppingBag,
            iconClass: 'from-amber-500 to-orange-600 text-white shadow-orange-500/20',
            bgClass: 'bg-white dark:bg-slate-900 border-slate-100 hover:border-amber-200'
        },
        { 
            name: '🗺️ Business Planning',
            desc: 'Wizard AI untuk rencana bisnis baru — seed semua modul otomatis.',
            path: '/finance/planning',
            icon: Sparkles,
            iconClass: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20',
            bgClass: 'bg-white dark:bg-slate-900 border-emerald-200 hover:border-emerald-400 ring-1 ring-emerald-100'
        },
    ];
</script>

<div class="px-4 md:px-8 max-w-7xl mx-auto space-y-8 pb-20 pt-6 font-sans text-slate-800 dark:text-slate-100 transition-opacity duration-500" class:opacity-0={!isLoaded}>
    
    <!-- Ultra-Sleek Modern Welcome Banner -->
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="space-y-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                <Sparkles class="w-3.5 h-3.5 text-indigo-550 animate-pulse" />
                Bizgrow Workspace OS
            </span>
            <div class="flex items-center gap-2 mt-1">
                <h1 class="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                    Selamat Malam, {user?.username || 'Kocakgeming'}.
                </h1>
                
                <!-- Waving hand SVG animation (Clean & smooth loop) -->
                <svg class="w-7 h-7 animate-wave origin-[70%_70%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 10.5c0-.83-.67-1.5-1.5-1.5h-3.25V7.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v-1.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4.25L9.3 8.35a1.5 1.5 0 10-2.12 2.12l4.82 4.82v4.21h7.5V13.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V12c0-.83-.67-1.5-1.5-1.5z" fill="#facc15" stroke="#eab308" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
            </div>
            <p class="text-xs text-slate-450 dark:text-slate-500 font-semibold italic">Selamat datang di sistem manajemen pusat komando unit usaha Anda.</p>
        </div>

        <!-- Clock Widget -->
        <div class="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 px-4 py-2.5 rounded-xl shrink-0 shadow-sm">
            <Clock class="w-4 h-4 text-indigo-500 animate-pulse" />
            <div class="text-left font-mono">
                <p class="text-sm font-black text-slate-800 dark:text-white leading-none">
                    {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 leading-none">
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
            </div>
        </div>
    </div>

    <!-- MAIN DIVISION NAVIGATION -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Premium Featured division: Keuangan & POS (Left - 60% Width) -->
        <div class="lg:col-span-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-6 md:p-8 flex flex-col justify-between min-h-[320px] shadow-lg border border-slate-850 relative overflow-hidden group" in:fly={{ y: 20, duration: 500 }}>
            <!-- Background Image with clean overlay -->
            <img src="/images/promo_banner.jpg" alt="POS Promo" class="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen scale-100 group-hover:scale-[1.02] transition-transform duration-700 z-0" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20 z-0"></div>

            <div class="relative z-10 flex justify-between items-start w-full">
                <span class="px-2.5 py-0.5 bg-white/10 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-300">
                    Divisi Utama
                </span>
                <span class="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Operational
                </span>
            </div>

            <div class="relative z-10 space-y-3 mt-8">
                <h2 class="text-lg md:text-xl font-black uppercase tracking-tight italic">KEUANGAN & POS KASIR</h2>
                <p class="text-xs text-slate-300 leading-relaxed font-semibold max-w-md">
                    Modul utama untuk memantau arus keuangan, rekap penjualan kasir POS, mengelola data stok barang, dan memproses laporan laba rugi bulanan.
                </p>
                <div class="pt-2 flex gap-3">
                    <a href="/finance" class="inline-flex items-center gap-2 px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md">
                        Masuk Divisi
                        <ArrowRight class="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>

        <!-- 4 Division Micro-Cards (Right - 40% Width) -->
        <div class="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {#each otherDivisions as item, idx}
                <a 
                    href={item.path}
                    class="p-5 {item.bgClass} border rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group flex flex-col justify-between relative overflow-hidden"
                    in:fly={{ y: 20, duration: 500, delay: idx * 50 }}
                >
                    <!-- Glowing Icon Circle Badge -->
                    <div class="p-2.5 bg-gradient-to-tr {item.iconClass} rounded-xl w-fit shadow-md">
                        <svelte:component this={item.icon} class="w-5 h-5" />
                    </div>
                    
                    <div class="space-y-1.5 mt-8 relative z-10">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                {item.name}
                            </h4>
                            <ChevronRight class="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p class="text-[10px] text-slate-500 dark:text-slate-450 font-semibold leading-normal">{item.desc}</p>
                    </div>
                </a>
            {/each}
        </div>

    </div>

    <!-- MIDDLE ROW: DEV HUB & TAX DEADLINES -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Dev Updates Changelog (7 Cols) -->
        <div class="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4" in:fly={{ y: 20, duration: 500, delay: 100 }}>
            <div class="flex justify-between items-center border-b pb-3 border-slate-50 dark:border-slate-850">
                <h3 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Terminal class="w-4 h-4 text-indigo-500 animate-pulse" />
                    Developer Hub & Updates Terbaru
                </h3>
                <span class="text-[9px] font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">v2.6.4</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                {#each devUpdates as update}
                    <div class="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between hover:border-indigo-150 transition-colors">
                        <div>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider {update.tag === 'NEW' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : update.tag === 'UPDATE' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}">
                                <span class="w-1 h-1 rounded-full {update.tag === 'NEW' ? 'bg-emerald-500' : update.tag === 'UPDATE' ? 'bg-indigo-500' : 'bg-amber-500'} animate-pulse"></span>
                                {update.tag}
                            </span>
                            <h4 class="text-[11px] font-black text-slate-800 dark:text-white uppercase mt-3 leading-snug">{update.title}</h4>
                        </div>
                        <p class="text-[10px] text-slate-500 dark:text-slate-450 leading-relaxed mt-2 font-semibold">{update.desc}</p>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Kalender Deadline Pajak & Keuangan (5 Cols) -->
        <div class="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4" in:fly={{ y: 20, duration: 500, delay: 150 }}>
            <h3 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <Calendar class="w-4 h-4 text-indigo-500" />
                Kalender Deadline Keuangan
            </h3>
            
            <div class="space-y-2.5">
                {#each taxCalendar as item}
                    <div class="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                        <span class="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 text-[9px] font-mono font-black rounded border border-indigo-150/40 shrink-0">{item.tgl}</span>
                        <p class="text-[10px] font-bold text-slate-700 dark:text-slate-350 truncate">{item.hal}</p>
                    </div>
                {/each}
            </div>
        </div>

    </div>

    <!-- BOTTOM ROW: BIZGROW ACADEMY & CAMPAIGN POSTER -->
    <div class="space-y-4 pt-2">
        <div class="flex justify-between items-center border-b pb-3 border-slate-150 dark:border-slate-800">
            <h3 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen class="w-4.5 h-4.5 text-indigo-500" />
                Bizgrow Academy
            </h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            <!-- Dynamic Campaign Poster Card (5 Cols) -->
            <div class="md:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-white min-h-[220px] flex flex-col justify-end p-5 shadow-sm group" in:fly={{ y: 20, duration: 500, delay: 100 }}>
                <img src="/images/marketing_campaign.jpg" alt="Campaign Banner" class="absolute inset-0 w-full h-full object-cover opacity-45 mix-blend-screen scale-100 group-hover:scale-[1.02] transition-transform duration-700" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20 z-0"></div>
                
                <div class="relative z-10 space-y-1.5">
                    <span class="px-2 py-0.5 bg-indigo-600 border border-indigo-500 text-[8px] font-black uppercase tracking-widest text-white rounded w-fit">
                        Marketing Poster
                    </span>
                    <h4 class="text-xs font-black uppercase tracking-tight">Desain Kampanye Iklan</h4>
                    <p class="text-[10px] text-slate-350 leading-relaxed font-semibold">Tingkatkan omset e-commerce dengan otomasi target audiens ads pelanggan.</p>
                </div>
            </div>

            <!-- Academy Video Details (7 Cols) -->
            <div class="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4" in:fly={{ y: 20, duration: 500, delay: 200 }}>
                {#each insights as post, idx}
                    <div class="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div class="h-32 overflow-hidden relative bg-slate-250">
                            <!-- Visual cards zoom hover effect -->
                            <img 
                                src={idx === 0 ? '/images/promo_banner.jpg' : '/images/marketing_campaign.jpg'} 
                                alt="Post" 
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                            <div class="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span class="p-2.5 bg-white/20 backdrop-blur rounded-full text-white transform scale-90 group-hover:scale-100 transition-all duration-300">
                                    <Play class="w-4 h-4 fill-white" />
                                </span>
                            </div>
                        </div>
                        <div class="p-4 space-y-1">
                            <span class="text-[8px] font-black bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider">{post.kategori}</span>
                            <h4 class="text-xs font-black text-slate-800 dark:text-white leading-snug uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{post.judul}</h4>
                        </div>
                    </div>
                {/each}
            </div>

        </div>
    </div>

    <!-- Bottom Help Banner -->
    <a 
        href="/help" 
        class="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all flex items-center justify-between group shadow-sm hover:border-indigo-100"
    >
        <div class="flex items-center gap-3">
            <div class="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-455 rounded-xl">
                <HelpCircle class="w-4.5 h-4.5" />
            </div>
            <div>
                <h4 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Butuh Bantuan Sistem Bizgrow?</h4>
                <p class="text-[10px] text-slate-500 dark:text-slate-455 font-semibold">Tanya Asisten AI, troubleshoot konektivitas printer/barcode, dan ulasan sistem.</p>
            </div>
        </div>
        <ChevronRight class="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-all" />
    </a>

</div>

<style>
    :global(body) { 
        background-color: #f8fafc; 
    }
    
    @keyframes wave {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(15deg); }
    }
    
    .animate-wave {
        animation: wave 1.5s ease-in-out infinite;
    }
</style>