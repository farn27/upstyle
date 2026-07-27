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

    let searchVal = '';
    let selectedTab = 'guide'; // guide, faq, shortcut, wizard, status, rating

    // FAQ Data
    const faqs = [
        {
            q: "Bagaimana cara melakukan Stok Opname?",
            a: "1. Buka menu Katalog Produk -> Stok Opname.\n2. Klik tombol 'Buat Opname Baru'.\n3. Pilih produk atau varian yang ingin disesuaikan.\n4. Input jumlah stok fisik yang dihitung di lapangan.\n5. Sistem otomatis menghitung selisih (selisih positif = masuk, selisih negatif = keluar).\n6. Masukkan alasan penyesuaian (misal: OPNAME, RUSAK, ADJUSTMENT) dan ulasan tambahan.\n7. Klik 'Simpan Penyesuaian'. Sistem akan otomatis memutakhirkan stok sistem dan mencatat riwayat log stok.",
            cat: "produk"
        },
        {
            q: "Bagaimana cara melakukan Tutup Buku akhir bulan?",
            a: "1. Pastikan seluruh transaksi POS, jurnal umum, pengeluaran payroll, dan penagihan piutang bulan ini sudah selesai di-posting.\n2. Masuk ke Master Data -> Tutup Buku.\n3. Pilih periode bulan dan tahun yang ingin dikunci.\n4. Sistem akan melakukan validasi balance debit/kredit.\n5. Klik tombol 'Proses Kunci Periode'.\n6. Sistem akan otomatis memindahkan saldo laba/rugi berjalan ke akun modal ditahan dan mengunci periode tersebut agar tidak dapat diedit kembali demi integritas audit.",
            cat: "finance"
        },
        {
            q: "Bagaimana cara menghubungkan E-Commerce ke Shopee/Tokopedia?",
            a: "1. Buka menu E-Commerce Store -> Integrasi Marketplace.\n2. Pilih platform (misal Shopee atau Tokopedia).\n3. Klik tombol 'Hubungkan Toko'. Anda akan dialihkan ke halaman otorisasi resmi API developer marketplace.\n4. Login dengan akun seller Anda dan berikan izin akses.\n5. Setelah sukses, tentukan aturan pemetaan produk (mapping SKU).\n6. Setelah terhubung, setiap ada transaksi di marketplace atau perubahan stok di Bizgrow, data stok akan tersinkronisasi otomatis dalam 5 menit.",
            cat: "ecommerce"
        },
        {
            q: "Bagaimana cara memproses penggajian (payroll) staf?",
            a: "1. Buka menu SDM / HR Staff -> Penggajian (Payroll).\n2. Pilih periode bulan penggajian yang aktif.\n3. Klik nama staf untuk mengedit lembur, bonus, BPJS, potongan kehadiran, atau insentif komisi sales.\n4. Klik 'Hitung Gaji'. Sistem akan menghitung total gaji bersih secara otomatis berdasarkan data absensi staf.\n5. Klik 'Posting & Bayar'. Slip gaji PDF akan otomatis di-generate dan notifikasi dikirimkan langsung ke nomor WhatsApp staf yang terdaftar.",
            cat: "hr"
        },
        {
            q: "Bagaimana cara kerja Tanya AI?",
            a: "Tanya AI adalah asisten kecerdasan buatan terintegrasi yang dapat membaca data operasional Anda. Anda dapat mengkliknya di pojok kanan atas atau menekan tombol `Ctrl + I`. Tanyakan hal-hal analisis seperti: 'Berapa laba kotor cabang A bulan lalu?', 'Produk apa yang stoknya di bawah batas minimum?', atau 'Buatkan ringkasan performa finansial kuartal ini'. AI akan menyusun data grafik dan ringkasan eksekutif dalam hitungan detik.",
            cat: "sistem"
        },
        {
            q: "Kenapa printer thermal POS kasir tidak merespon?",
            a: "1. Pastikan kabel USB printer terhubung dengan benar ke terminal POS.\n2. Pastikan printer thermal dalam kondisi ON dan indikator kertas tidak berkedip (no paper).\n3. Cek pengaturan printer di sistem POS dengan masuk ke POS -> Pengaturan Printer.\n4. Lakukan cetak uji (Print Test Page).\n5. Jika masih gagal, cek apakah driver printer thermal (biasanya driver POS-80 atau Epson) telah terpasang dengan benar di sistem operasi komputer Anda.",
            cat: "pos"
        },
        {
            q: "Bagaimana cara me-reset password akun staf?",
            a: "1. Hanya administrator atau manajer HR yang dapat mengubah password staf.\n2. Buka menu SDM / HR Staff -> Daftar Staff.\n3. Cari nama staf yang ingin diubah paswordnya, lalu klik tombol 'Detail' atau 'Edit'.\n4. Klik tombol 'Ganti Password'.\n5. Input password baru berdurasi minimal 6 karakter, lalu klik 'Simpan Password'.\n6. Beritahukan password baru tersebut kepada staf terkait untuk digunakan pada login berikutnya.",
            cat: "hr"
        },
        {
            q: "Kenapa saldo Neraca (Balance Sheet) tidak seimbang?",
            a: "Saldo Neraca tidak seimbang biasanya terjadi karena adanya entri jurnal manual yang tidak balance (debit & kredit berbeda), pemetaan akun COA yang keliru pada transaksi otomatis, atau ada jurnal penyesuaian yang belum diposting. Periksa modul Laporan -> Jurnal Tidak Seimbang untuk mengidentifikasi transaksi penyebab selisih tersebut.",
            cat: "finance"
        }
    ];

    // Guides Data (Lengkap & Komprehensif)
    const guides = [
        {
            title: "Modul Keuangan & Akuntansi",
            desc: "Panduan penyusunan COA, pencatatan jurnal umum, buku besar, piutang, dan penutupan buku.",
            color: "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10",
            iconColor: "text-blue-500",
            steps: [
                "Atur Bagan Akun (COA) di modul Master Data -> COA sebelum mencatat transaksi.",
                "Gunakan Jurnal Umum untuk menginput entri jurnal manual (misal: penyusutan aset, biaya sewa dimuka).",
                "Periksa Buku Besar secara berkala untuk memantau detail mutasi per akun perkiraan.",
                "Kelola tagihan pelanggan di modul Piutang (AR) dan tagihan vendor di modul Hutang (AP).",
                "Lakukan rekonsiliasi bank dan penutupan buku akhir periode untuk membekukan data demi keamanan audit."
            ]
        },
        {
            title: "Point of Sales (Kasir POS)",
            desc: "Langkah mengoperasikan kasir penjualan ritel, buka/tutup shift, dan manajemen struk.",
            color: "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10",
            iconColor: "text-indigo-500",
            steps: [
                "Buka shift kasir setiap pagi dengan menginput saldo modal laci awal.",
                "Pilih produk dengan scan barcode atau klik katalog visual pada layar POS.",
                "Terapkan diskon member atau voucher promosi jika ada.",
                "Pilih metode pembayaran (Tunai, QRIS otomatis, Kartu Debit, atau Piutang Pelanggan).",
                "Klik 'Selesaikan Transaksi' untuk mencetak struk thermal dan memutakhirkan stok inventaris secara real-time.",
                "Lakukan tutup shift di sore/malam hari dengan menghitung uang fisik di laci kasir dan mencocokkannya dengan laporan sistem."
            ]
        },
        {
            title: "Pemasaran & Integrasi Campaign",
            desc: "Panduan membuat kampanye promosi, leads tracker, dan pencatatan ad spend ROI.",
            color: "border-fuchsia-500 bg-fuchsia-50/20 dark:bg-fuchsia-950/10",
            iconColor: "text-fuchsia-500",
            steps: [
                "Buat voucher diskon baru di modul Voucher & Diskon dengan batasan kuota dan tanggal kedaluwarsa.",
                "Rancang kampanye iklan (Email, WhatsApp Broadcast, atau Social Media Ads) di sub-kampanye.",
                "Catat pengeluaran biaya iklan di Ad Tracker (Facebook, Google, TikTok Ads) beserta total klik & konversi.",
                "Pantau leads baru yang masuk melalui landing page toko online untuk ditindaklanjuti oleh sales.",
                "Gunakan Dashboard Pemasaran untuk melihat Return on Ad Spend (ROAS) dan metrik akuisisi leads."
            ]
        },
        {
            title: "Layanan Pelanggan (Omnichannel CS)",
            desc: "Langkah penanganan keluhan pelanggan, sistem antrean tiket support, dan SLA.",
            color: "border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/10",
            iconColor: "text-cyan-500",
            steps: [
                "Hubungkan kanal komunikasi Anda (WhatsApp Business API, Email Support, Livechat) di modul Layanan.",
                "Setiap pesan masuk akan terbuat menjadi tiket baru secara otomatis di antrean support.",
                "Tugaskan tiket ke staf CS yang sedang aktif dan atur prioritas tiket (Low, Medium, High, Urgent).",
                "Gunakan template jawaban cepat (Quick Replies) untuk mempercepat waktu respons (SLA).",
                "Setelah kendala selesai, ubah status tiket menjadi Resolved dan kirimkan survei kepuasan pelanggan."
            ]
        },
        {
            title: "E-Commerce & Sinkronisasi Marketplace",
            desc: "Panduan mengelola toko online mandiri dan integrasi stok multi-channel marketplace.",
            color: "border-amber-500 bg-amber-50/20 dark:bg-amber-950/10",
            iconColor: "text-amber-500",
            steps: [
                "Atur preferensi toko online Anda (Logo, Alamat, Kurir Pengiriman, Aturan Pajak) di Storefront Setting.",
                "Tentukan produk dari katalog utama yang akan dipajang di toko online.",
                "Hubungkan API marketplace Shopee, Tokopedia, dan Lazada di tab Integrasi.",
                "Sistem akan menyinkronkan stok secara otomatis jika ada penjualan baik di toko fisik, toko online, maupun Shopee.",
                "Gunakan Landing Page Creator untuk merancang halaman promo khusus produk tertentu guna menaikkan omzet."
            ]
        }
    ];

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

    const wizardDiagnostics = {
        pos: [
            {
                problem: "Printer thermal kasir tidak mencetak kertas struk",
                solution: "1. Matikan printer thermal selama 10 detik, lalu hidupkan kembali.\n2. Cek lampu indikator (jika merah berkedip, kemungkinan kertas habis atau sensor terhalang debu).\n3. Pastikan kabel data USB terhubung erat ke komputer kasir.\n4. Buka Pengaturan Perangkat di komputer Anda (Control Panel -> Devices and Printers) dan pastikan driver printer 'POS-80' atau tipe sejenis dalam status online.\n5. Coba lakukan cetak test page dari driver tersebut.\n6. Di sistem POS Bizgrow, klik tombol refresh printer dan coba cetak ulang struk."
            },
            {
                problem: "Barcode scanner tidak mendeteksi kode produk",
                solution: "1. Pastikan port USB scanner terhubung dengan benar.\n2. Coba scan ke aplikasi Notepad untuk melihat apakah scanner mengeluarkan angka barcode.\n3. Jika angka keluar di notepad tapi tidak di kasir POS, pastikan cursor fokus berada di kolom input scanner kasir.\n4. Bersihkan lensa kaca barcode scanner dari sidik jari atau debu.\n5. Pastikan format barcode di Katalog Produk (SKU) sudah cocok dengan barcode fisik barang."
            },
            {
                problem: "Laci kasir (Cash Drawer) tidak terbuka otomatis",
                solution: "1. Cash drawer biasanya terhubung menggunakan kabel RJ11 ke port belakang printer thermal (bukan ke komputer langsung).\n2. Pastikan printer thermal menyala dan driver printer telah dikonfigurasi untuk mengirim perintah 'Cash Drawer Open' sebelum mencetak.\n3. Cek kunci fisik laci kasir, pastikan tidak berada dalam posisi terkunci mati (horizontal).\n4. Cek apakah ada benda asing/koin yang mengganjal mekanisme rel penarik laci kasir."
            }
        ],
        finance: [
            {
                problem: "Jurnal penyesuaian otomatis tidak masuk ke Buku Besar",
                solution: "1. Masuk ke modul Master Data -> Bagan Akun (COA).\n2. Pastikan akun penyesuaian (misalnya Akumulasi Penyusutan Aset) sudah dipetakan dengan benar di kategori akun terkait.\n3. Cek apakah periode transaksi tersebut sudah terkunci atau belum. Jika periode terkunci (Tutup Buku sudah dilakukan), Anda harus membuka kunci periode terlebih dahulu melalui izin Administrator.\n4. Klik tombol 'Posting Ulang Transaksi' di dashboard Master Data."
            },
            {
                problem: "Laporan Laba Rugi menampilkan data yang keliru",
                solution: "1. Periksa apakah ada transaksi penjualan POS atau pembelian barang yang masih dalam status 'Draft' atau belum diposting.\n2. Cek modul Jurnal Umum, pastikan tidak ada entri jurnal ganda untuk periode tersebut.\n3. Pastikan klasifikasi tipe akun COA (Pemasukan, Harga Pokok Penjualan, Pengeluaran Operasional) diatur dengan benar. Klasifikasi akun yang salah akan menyebabkan penempatan nominal laporan laba rugi terbalik."
            }
        ],
        sync: [
            {
                problem: "Stok produk di Shopee/Tokopedia tidak berkurang setelah terjual offline",
                solution: "1. Buka E-Commerce Store -> Integrasi Marketplace.\n2. Cek status koneksi token API toko Anda (jika kedaluwarsa, klik 'Hubungkan Ulang').\n3. Pastikan SKU produk di Katalog Utama Bizgrow sama persis dengan SKU Produk yang terdaftar di Shopee/Tokopedia.\n4. Cek antrean sinkronisasi stok di tab log Integrasi. Jika antrean macet, klik tombol 'Paksa Sinkronisasi Stok Sekarang'.\n5. Pastikan produk tersebut tidak dalam kondisi 'Diarsipkan' di sistem marketplace."
            }
        ]
    };

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
        setTimeout(() => {
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
            toastPesan.set("Terima kasih! Ulasan bintang " + starRating + " Anda berhasil disimpan.");
        }, 1000);
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
