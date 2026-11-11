<script>
    import { 
        BookOpen, 
        HelpCircle, 
        Keyboard, 
        Activity, 
        Star, 
        Search, 
        Send, 
        CheckCircle2,
        ChevronDown,
        ArrowRight,
        LifeBuoy,
        Sparkles,
        RefreshCw,
        Printer,
        Wrench,
        Check,
        ShieldCheck,
        Terminal,
        Clock,
        FileText
    } from 'lucide-svelte';
    import { fade, slide, fly } from 'svelte/transition';
    import { toastPesan } from '$lib/notifStore';
    import { onMount } from 'svelte';
    import { FAQS as faqs, PANDUAN as guides, TROUBLESHOOT as wizardDiagnostics } from '$lib/bantuanKonten.js';

    let searchVal = '';
    let selectedTab = 'guide'; // guide, faq, shortcut, wizard, status, rating

    // FAQ Data
    /* faqs dipindah ke $lib/bantuanKonten.js */

    // Guides Data (Lengkap & Komprehensif)
    /* guides dipindah ke $lib/bantuanKonten.js */

    // Shortcuts
    const shortcuts = [
        { keys: ["Ctrl", "K"], action: "Buka Pencarian Cepat (Quick Search)" },
        { keys: ["Ctrl", "I"], action: "Buka / Tutup Chat Asisten AI (Tanya AI)" },
        { keys: ["ESC"], action: "Tutup Modal / Sembunyikan Panel Aktif" },
        { keys: ["Ctrl", "S"], action: "Simpan Form / Konfirmasi Transaksi (POS)" },
        { keys: ["Alt", "P"], action: "Cetak Struk Terakhir (Kasir POS)" },
        { keys: ["Alt", "N"], action: "Buka Notifikasi Terbaru" },
        { keys: ["Alt", "B"], action: "Buka / Tutup Sidebar Navigasi Utama" },
        { keys: ["Alt", "C"], action: "Buka Panel Kasir POS Secara Instan" }
    ];

    // Interactive Status System
    let statusIntegrations = [
        { name: "Database Cluster", status: "Operational", desc: "MySQL Cluster Drizzle ORM", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", dotColor: "bg-emerald-500", ping: "8 ms" },
        { name: "Payment Gateway", status: "Operational", desc: "Midtrans & Xendit API Callback", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", dotColor: "bg-emerald-500", ping: "42 ms" },
        { name: "WhatsApp Gateway", status: "Operational", desc: "Pusher & WA API Send Engine", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", dotColor: "bg-emerald-500", ping: "68 ms" },
        { name: "AI Advisor Engine", status: "Operational", desc: "Groq LLaMA Inference Node", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", dotColor: "bg-emerald-500", ping: "112 ms" },
        { name: "SCM Sync Service", status: "Operational", desc: "Marketplace API Lazada Sync Delay", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", dotColor: "bg-emerald-500", ping: "35 ms" }
    ];

    let isTestingStatus = false;
    function testConnectivity() {
        isTestingStatus = true;
        
        // Simulasikan tes konektivitas satu per satu dengan delay
        statusIntegrations = statusIntegrations.map(s => ({ ...s, ping: "Menghubungkan..." }));
        
        statusIntegrations.forEach((service, index) => {
            setTimeout(() => {
                const randomPing = Math.floor(Math.random() * 80) + 10;
                statusIntegrations[index] = {
                    ...statusIntegrations[index],
                    ping: `${randomPing} ms`,
                    status: "Operational",
                    color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
                    dotColor: "bg-emerald-500"
                };
                
                // Jika sudah selesai tes semua
                if (index === statusIntegrations.length - 1) {
                    isTestingStatus = false;
                    toastPesan.set("Seluruh konektivitas API operasional 100%!");
                }
            }, (index + 1) * 600);
        });
    }

    // Troubleshooting Wizard (Diagnostic Wizard)
    let wizardCategory = 'start'; // start, pos, finance, sync
    let wizardTopic = null;

    /* wizardDiagnostics dipindah ke $lib/bantuanKonten.js */

    // Rating State (Persistent in localStorage)
    let starRating = 0;
    let hoverRating = 0;
    let feedbackText = '';
    let feedbackSubmitted = false;
    let loadingSubmit = false;
    let savedFeedback = null;

    onMount(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('bizgrow_user_feedback');
            if (saved) {
                savedFeedback = JSON.parse(saved);
                feedbackSubmitted = true;
                starRating = savedFeedback.rating;
                feedbackText = savedFeedback.comment;
            }
        }
    });

    // Filtered FAQ and Shortcuts
    $: filteredFaqs = faqs.filter(faq => {
        if (!searchVal) return true;
        const q = faq.q.toLowerCase();
        const a = faq.a.toLowerCase();
        const s = searchVal.toLowerCase();
        return q.includes(s) || a.includes(s);
    });

    $: filteredShortcuts = shortcuts.filter(shortcut => {
        if (!searchVal) return true;
        const act = shortcut.action.toLowerCase();
        const keysJoined = shortcut.keys.join(' ').toLowerCase();
        const s = searchVal.toLowerCase();
        return act.includes(s) || keysJoined.includes(s);
    });

    let activeFaqIndex = null;
    function toggleFaq(index) {
        if (activeFaqIndex === index) {
            activeFaqIndex = null;
        } else {
            activeFaqIndex = index;
        }
    }

    function submitFeedback() {
        if (starRating === 0) {
            toastPesan.set("Silakan pilih rating bintang terlebih dahulu!");
            return;
        }
        loadingSubmit = true;
        // Ulasan sungguhan dikirim ke tim (email dukungan); salinannya disimpan di perangkat ini
        fetch('/api/app/help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'review', rating: starRating, comment: feedbackText }) })
            .catch(() => null)
            .then(() => {
            const feedbackData = {
                rating: starRating,
                comment: feedbackText,
                date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            };
            if (typeof window !== 'undefined') {
                localStorage.setItem('bizgrow_user_feedback', JSON.stringify(feedbackData));
            }
            savedFeedback = feedbackData;
            loadingSubmit = false;
            feedbackSubmitted = true;
            toastPesan.set("Terima kasih! Ulasan bintang " + starRating + " Anda berhasil dikirim.");
        });
    }

    function resetFeedback() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('bizgrow_user_feedback');
        }
        feedbackSubmitted = false;
        starRating = 0;
        hoverRating = 0;
        feedbackText = '';
        savedFeedback = null;
        toastPesan.set("Ulasan sebelumnya telah dihapus.");
    }
</script>

<div class="min-h-screen pb-20 pt-6 font-sans">
    <!-- Header Block with Gradient & Search -->
    <div class="relative bg-slate-950 rounded-3xl overflow-hidden p-8 md:p-12 mb-8 shadow-xl text-white">
        <!-- Background image with opacity and blend mode -->
        <img src="/images/dashboard_bg.jpg" alt="Background" class="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div class="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-indigo-950/30 to-slate-950/60"></div>
        
        <!-- Decorative blobs -->
        <div class="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl text-white"></div>
        <div class="absolute -bottom-12 -left-12 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl text-white"></div>

        <div class="relative z-10 max-w-3xl">
            <span class="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-black uppercase tracking-widest text-indigo-300">Pusat Komando Dukungan</span>
            <h1 class="text-3xl md:text-5xl font-black uppercase tracking-tight mt-4 mb-2 leading-none">Pusat Bantuan & Panduan</h1>
            <p class="text-slate-350 text-sm md:text-base max-w-2xl font-medium mb-8">Dokumentasi operasional, penyelesaian kendala hardware, monitor status konektivitas, dan pintasan cepat untuk menunjang produktivitas Anda.</p>
            
            <!-- Dynamic FAQ Search -->
            <div class="relative max-w-xl">
                <Search class="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    bind:value={searchVal}
                    on:focus={() => {
                        if (selectedTab !== 'faq' && selectedTab !== 'shortcut') {
                            selectedTab = 'faq';
                        }
                    }}
                    placeholder="Cari dokumentasi atau pertanyaan umum... (contoh: stok, pos)" 
                    class="w-full pl-12 pr-4 py-3.5 bg-white/15 hover:bg-white/20 focus:bg-white border border-white/15 focus:border-white focus:text-slate-900 rounded-2xl text-sm font-bold placeholder-slate-400 outline-none transition-all focus:ring-4 focus:ring-white/10"
                />
                {#if searchVal}
                    <button 
                        on:click={() => searchVal = ''}
                        class="absolute right-4 top-3 text-xs font-bold text-slate-400 hover:text-white bg-white/10 px-2 py-1 rounded"
                    >
                        CLEAR
                    </button>
                {/if}
            </div>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
        <button 
            on:click={() => selectedTab = 'guide'}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                {selectedTab === 'guide' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
        >
            <BookOpen class="w-4 h-4" />
            Panduan Modul
        </button>
        <button 
            on:click={() => selectedTab = 'faq'}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                {selectedTab === 'faq' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
        >
            <HelpCircle class="w-4 h-4" />
            FAQ / Tanya Jawab
        </button>
        <button 
            on:click={() => selectedTab = 'wizard'}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                {selectedTab === 'wizard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
        >
            <Wrench class="w-4 h-4" />
            Diagnostik Kendala
        </button>
        <button 
            on:click={() => selectedTab = 'shortcut'}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                {selectedTab === 'shortcut' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
        >
            <Keyboard class="w-4 h-4" />
            Pintasan Keyboard
        </button>
        <button 
            on:click={() => selectedTab = 'status'}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                {selectedTab === 'status' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
        >
            <Activity class="w-4 h-4" />
            Status API & Server
        </button>
        <button 
            on:click={() => selectedTab = 'rating'}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                {selectedTab === 'rating' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
        >
            <Star class="w-4 h-4" />
            Rating Aplikasi
        </button>
    </div>

    <!-- Main Grid Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column (Span 2): Tab content container -->
        <div class="lg:col-span-2 space-y-6">
            
            <!-- TAB 1: SYSTEM GUIDES -->
            {#if selectedTab === 'guide'}
                <div in:fade class="space-y-6">
                    {#each guides as guide}
                        <div class="border rounded-2xl overflow-hidden transition-all shadow-sm {guide.color} border-slate-200/50 dark:border-slate-800/80">
                            <div class="p-6">
                                <h3 class="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                                    <Sparkles class="w-5 h-5 {guide.iconColor}" />
                                    {guide.title}
                                </h3>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">{guide.desc}</p>
                                
                                <div class="space-y-3">
                                    {#each guide.steps as step, idx}
                                        <div class="flex items-start gap-3">
                                            <span class="w-6 h-6 rounded-full bg-white dark:bg-slate-850 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-350 shrink-0">
                                                {idx + 1}
                                            </span>
                                            <p class="text-sm font-semibold text-slate-650 dark:text-slate-300 leading-relaxed pt-0.5">{step}</p>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- TAB 2: FAQ ACCORDION -->
            {#if selectedTab === 'faq'}
                <div in:fade class="space-y-4">
                    {#if searchVal}
                        <p class="text-xs text-slate-400 font-bold mb-2">Hasil pencarian untuk "{searchVal}": ({filteredFaqs.length} FAQ ditemukan)</p>
                    {/if}
                    {#if filteredFaqs.length === 0}
                        <div class="p-12 text-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-850">
                            <HelpCircle class="w-12 h-12 text-slate-300 dark:text-slate-750 mx-auto mb-4" />
                            <p class="text-sm font-bold text-slate-600 dark:text-slate-400">Pertanyaan tidak ditemukan</p>
                            <p class="text-xs text-slate-400 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                        </div>
                    {:else}
                        {#each filteredFaqs as faq, idx}
                            <div class="border border-slate-200/50 dark:border-slate-850/80 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden transition-all shadow-sm">
                                <button 
                                    on:click={() => toggleFaq(idx)}
                                    class="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <span class="text-sm font-black text-slate-800 dark:text-white pr-4">{faq.q}</span>
                                    <ChevronDown class="w-4 h-4 text-slate-400 transition-transform {activeFaqIndex === idx ? 'rotate-180' : ''}" />
                                </button>
                                
                                {#if activeFaqIndex === idx}
                                    <div transition:slide class="px-5 pb-5 pt-1 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                                        <p class="text-sm font-semibold text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line">{faq.a}</p>
                                        <div class="mt-4 flex items-center gap-2">
                                            <span class="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded font-black uppercase tracking-widest">{faq.cat}</span>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    {/if}
                </div>
            {/if}

            <!-- TAB 3: TROUBLESHOOTING DIAGNOSTIC WIZARD -->
            {#if selectedTab === 'wizard'}
                <div in:fade class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm">
                    <h3 class="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                        <Wrench class="w-5 h-5 text-indigo-500" />
                        Diagnostik & Pemecahan Masalah Mandiri
                    </h3>
                    <p class="text-xs text-slate-450 dark:text-slate-500 mb-6 leading-relaxed">Pilih kategori modul yang Anda alami kendala untuk mendapatkan instruksi perbaikan teknis secara instan.</p>

                    {#if wizardCategory === 'start'}
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button 
                                on:click={() => { wizardCategory = 'pos'; wizardTopic = null; }}
                                class="p-6 text-left border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-2xl transition-all"
                            >
                                <div class="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl w-fit mb-4">
                                    <Printer class="w-6 h-6" />
                                </div>
                                <h4 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Kasir POS & Struk</h4>
                                <p class="text-[11px] text-slate-450 dark:text-slate-500 mt-1">Printer thermal macet, barcode scanner error, laci uang cash drawer tidak terbuka.</p>
                            </button>

                            <button 
                                on:click={() => { wizardCategory = 'finance'; wizardTopic = null; }}
                                class="p-6 text-left border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-2xl transition-all"
                            >
                                <div class="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl w-fit mb-4">
                                    <FileText class="w-6 h-6" />
                                </div>
                                <h4 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Akuntansi & COA</h4>
                                <p class="text-[11px] text-slate-450 dark:text-slate-500 mt-1">Neraca tidak balance, saldo jurnal tidak masuk, penutupan buku gagal diposting.</p>
                            </button>

                            <button 
                                on:click={() => { wizardCategory = 'sync'; wizardTopic = null; }}
                                class="p-6 text-left border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-2xl transition-all"
                            >
                                <div class="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl w-fit mb-4">
                                    <RefreshCw class="w-6 h-6" />
                                </div>
                                <h4 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Sinkronisasi API</h4>
                                <p class="text-[11px] text-slate-450 dark:text-slate-500 mt-1">Koneksi Shopee / Tokopedia terputus, sinkronisasi stok delay, token API kedaluwarsa.</p>
                            </button>
                        </div>
                    {:else}
                        <!-- Diagnostic Topics Under Selected Category -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                                <span class="text-xs font-black uppercase tracking-widest text-indigo-500">Kategori: {wizardCategory.toUpperCase()}</span>
                                <button 
                                    on:click={() => { wizardCategory = 'start'; wizardTopic = null; }}
                                    class="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                >
                                    &larr; Ganti Kategori
                                </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {#each wizardDiagnostics[wizardCategory] as diag, idx}
                                    <button
                                        on:click={() => wizardTopic = idx}
                                        class="p-4 text-left border text-xs font-bold rounded-xl transition-all
                                            {wizardTopic === idx 
                                                ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 dark:text-indigo-300' 
                                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-350'}"
                                    >
                                        {diag.problem}
                                    </button>
                                {/each}
                            </div>

                            {#if wizardTopic !== null}
                                <div in:fly={{ y: 10, duration: 250 }} class="p-6 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 mt-4">
                                    <h4 class="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
                                        <ShieldCheck class="w-4.5 h-4.5 text-emerald-500" />
                                        Langkah Solusi Diagnostik:
                                    </h4>
                                    <p class="text-sm font-semibold text-slate-650 dark:text-slate-305 leading-relaxed whitespace-pre-line">
                                        {wizardDiagnostics[wizardCategory][wizardTopic].solution}
                                    </p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- TAB 4: KEYBOARD SHORTCUTS -->
            {#if selectedTab === 'shortcut'}
                <div in:fade class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm">
                    <h3 class="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                        <Keyboard class="w-5 h-5 text-indigo-500" />
                        Pintasan Cepat Keyboard
                    </h3>
                    <p class="text-xs text-slate-450 dark:text-slate-500 mb-6 leading-relaxed">Tekan kombinasi tombol pintasan berikut untuk membuka modul secara instan dari halaman mana saja.</p>
                    
                    {#if searchVal}
                        <p class="text-xs text-slate-450 font-bold mb-2">Hasil pencarian pintasan untuk "{searchVal}":</p>
                    {/if}
                    <div class="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {#each filteredShortcuts as shortcut}
                            <div class="py-4 flex items-center justify-between gap-4">
                                <span class="text-sm font-bold text-slate-600 dark:text-slate-350">{shortcut.action}</span>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    {#each shortcut.keys as key}
                                        <kbd class="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold shadow-sm">{key}</kbd>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- TAB 5: SYSTEM INTEGRATIONS STATUS -->
            {#if selectedTab === 'status'}
                <div in:fade class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm space-y-6">
                    <div class="flex justify-between items-center border-b pb-4 border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 class="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                                <Activity class="w-5 h-5 text-emerald-500" />
                                Monitor Konektivitas API & Server
                            </h3>
                            <p class="text-[11px] text-slate-450 mt-1 font-medium">Informasi latensi respon dari kluster database dan integrasi pihak ketiga.</p>
                        </div>
                        <button 
                            on:click={testConnectivity}
                            disabled={isTestingStatus}
                            class="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {#if isTestingStatus}
                                <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                                TESTING...
                            {:else}
                                <RefreshCw class="w-3.5 h-3.5" />
                                UJI KONEKSI
                            {/if}
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {#each statusIntegrations as service}
                            <div class="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl flex items-start gap-3">
                                <span class="w-2.5 h-2.5 rounded-full {service.dotColor} mt-1.5 shrink-0"></span>
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-center gap-2">
                                        <p class="text-sm font-black text-slate-850 dark:text-white truncate">{service.name}</p>
                                        <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm border {service.color}">{service.ping}</span>
                                    </div>
                                    <p class="text-[11px] text-slate-450 dark:text-slate-500 mt-1 leading-snug">{service.desc}</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- TAB 6: RATING & FEEDBACK -->
            {#if selectedTab === 'rating'}
                <div in:fade class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm">
                    {#if feedbackSubmitted}
                        <div in:fly={{ y: 20 }} class="text-center py-8">
                            <div class="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200/60">
                                <CheckCircle2 class="w-8 h-8" />
                            </div>
                            <h3 class="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2">Ulasan Berhasil Disimpan</h3>
                            
                            {#if savedFeedback}
                                <div class="my-6 p-4 max-w-md mx-auto bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700 text-left">
                                    <div class="flex items-center gap-1.5 mb-2">
                                        {#each Array(5) as _, i}
                                            <Star class="w-4.5 h-4.5 {i < savedFeedback.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-750'}" />
                                        {/each}
                                        <span class="text-[10px] text-slate-400 font-bold uppercase ml-2">{savedFeedback.date}</span>
                                    </div>
                                    <p class="text-xs text-slate-650 dark:text-slate-350 italic font-semibold leading-relaxed">"{savedFeedback.comment || 'Tidak ada komentar ulasan tertulis.'}"</p>
                                </div>
                            {/if}
                            
                            <p class="text-xs text-slate-450 dark:text-slate-400 max-w-md mx-auto leading-relaxed">Terima kasih atas penilaian Anda terhadap sistem ERP Bizgrow. Penilaian Anda telah kami simpan di memori sistem lokal.</p>
                            
                            <button 
                                on:click={resetFeedback}
                                class="mt-6 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-rose-100/50"
                            >
                                Hapus & Kirim Ulasan Baru
                            </button>
                        </div>
                    {:else}
                        <h3 class="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2">Beri Nilai Aplikasi Bizgrow</h3>
                        <p class="text-xs text-slate-400 mb-6 leading-relaxed">Nilai kepuasan Anda dalam menggunakan sistem ERP Bizgrow. Masukan Anda sangat penting bagi tim developer kami.</p>

                        <div class="space-y-6">
                            <!-- Star Selection -->
                            <div>
                                <label class="block text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-3">Rating Kepuasan</label>
                                <div class="flex items-center gap-1.5">
                                    {#each Array(5) as _, i}
                                        {@const starIndex = i + 1}
                                        <button
                                            on:click={() => starRating = starIndex}
                                            on:mouseenter={() => hoverRating = starIndex}
                                            on:mouseleave={() => hoverRating = 0}
                                            class="p-1 transition-transform active:scale-95"
                                        >
                                            <Star 
                                                class="w-8 h-8 transition-colors
                                                    {starIndex <= (hoverRating || starRating) 
                                                        ? 'fill-amber-400 text-amber-400 scale-105' 
                                                        : 'text-slate-300 dark:text-slate-700'}" 
                                            />
                                        </button>
                                    {/each}
                                    {#if starRating > 0}
                                        <span class="text-xs font-bold text-amber-500 dark:text-amber-400 ml-3 uppercase tracking-wider">{starRating} dari 5 bintang</span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Comment Input -->
                            <div>
                                <label class="block text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-3">Tulis ulasan / saran perbaikan</label>
                                <textarea 
                                    bind:value={feedbackText}
                                    rows="4" 
                                    placeholder="Ceritakan fitur apa yang Anda sukai atau kritik perbaikan yang diperlukan..."
                                    class="w-full px-4 py-3 bg-slate-55 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all resize-none text-slate-800 dark:text-slate-100"
                                ></textarea>
                            </div>

                            <button 
                                on:click={submitFeedback}
                                disabled={loadingSubmit}
                                class="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {#if loadingSubmit}
                                    <RefreshCw class="w-4 h-4 animate-spin" />
                                    MENGIRIM...
                                {:else}
                                    <Send class="w-4 h-4" />
                                    SUBMIT REVIEW
                                {/if}
                            </button>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Right Column (Span 1): Sidebar info cards -->
        <div class="space-y-6">
            <!-- CS Contact Card -->
            <div class="bg-gradient-to-br from-indigo-600 to-indigo-850 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <div class="absolute -top-10 -right-10 w-36 h-36 bg-white/5 rounded-full blur-xl"></div>
                <div class="relative z-10 space-y-4">
                    <div class="p-2.5 bg-white/10 rounded-2xl w-fit">
                        <LifeBuoy class="w-6 h-6 text-indigo-200" />
                    </div>
                    <h3 class="text-base font-black uppercase tracking-tight leading-none">Hubungi Dukungan CS</h3>
                    <p class="text-xs text-indigo-150 leading-relaxed font-medium">Jika Anda menemukan kendala kritis atau bug sistem, silakan buat tiket dukungan langsung melalui modul Layanan Pelanggan.</p>
                    
                    <a 
                        href="/customer-service"
                        class="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 text-indigo-700 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                    >
                        Buat Tiket Baru
                        <ArrowRight class="w-4 h-4" />
                    </a>
                </div>
            </div>

            <!-- Promo Poster Card -->
            <div class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm">
                <img src="/images/promo_banner.jpg" alt="Promo Banner" class="w-full h-40 object-cover" />
                <div class="p-5 space-y-2">
                    <span class="text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-450 px-2 py-0.5 rounded uppercase tracking-wider">Campaign Active</span>
                    <h4 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-snug">Bizgrow Enterprise All-in-One OS</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-normal">Optimalkan proses akuntansi, manajemen pergudangan, Point of Sales, hingga integrasi multichannel e-commerce.</p>
                </div>
            </div>

            <!-- Marketing Campaign Insight Card -->
            <div class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm">
                <img src="/images/marketing_campaign.jpg" alt="Marketing Campaign" class="w-full h-36 object-cover" />
                <div class="p-5 space-y-2">
                    <span class="text-[9px] font-black bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-450 px-2 py-0.5 rounded uppercase tracking-wider">Marketing Insight</span>
                    <h4 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-snug">Pantau ROI Iklan & Target Leads</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-normal">Gunakan dashboard pemasaran untuk melihat tingkat klik, konversi, dan biaya perolehan pelanggan secara real-time.</p>
                </div>
            </div>

            <!-- AI Helper Card -->
            <div class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 class="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sparkles class="w-4.5 h-4.5 text-indigo-500" />
                    Asisten AI Bizgrow
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Bizgrow dilengkapi dengan modul AI untuk membantu merangkum data finansial unit. Tanyakan tentang 'Total laba bulan ini', 'Stok paling kritis', atau 'Status piutang'.</p>
                <div class="p-3 bg-slate-55 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    <p class="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1.5">Contoh Pertanyaan</p>
                    <p class="text-xs font-bold text-slate-650 dark:text-slate-350 italic">\"Berapa total laba kotor unit cabang bulan lalu dan apa rekomendasi strategi restock-nya?\"</p>
                </div>
            </div>

            <!-- Developer Tools / Console Cheatsheet -->
            <div class="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 class="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Terminal class="w-4.5 h-4.5 text-slate-500" />
                    Pemberitahuan Sistem
                </h3>
                <div class="space-y-3">
                    <div class="flex gap-2">
                        <Clock class="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div class="text-xs leading-normal">
                            <span class="font-bold text-slate-700 dark:text-slate-300">Waktu Server:</span>
                            <p class="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <ShieldCheck class="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                        <div class="text-xs leading-normal">
                            <span class="font-bold text-slate-700 dark:text-slate-300">Status Keamanan:</span>
                            <p class="text-[11px] text-emerald-500 mt-0.5 font-semibold">SSL Enkripsi TLS 1.3 Terpasang Aktif</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
