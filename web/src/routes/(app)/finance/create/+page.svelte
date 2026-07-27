    <script>
        import { enhance } from '$app/forms';
        export let data;
        let isCabang = false;
        let selectedIndukId = '';
        let step = 1; // State untuk step wizard
        let selectedKategori = '';
        let namaUnit = '';
        
        // Smart Category Detection
        let autoSelected = false;
        $: if (namaUnit && !autoSelected) {
            const nameLower = namaUnit.toLowerCase();
            const keywordMap = {
                'FNB_RESTO': ['resto', 'makan', 'warung', 'eatry', 'eatery', 'bistro', 'diner', 'kitchen', 'ayam', 'bakso', 'mie'],
                'FNB_COFFEE': ['cafe', 'kopi', 'coffee', 'roastery', 'kafe', 'espresso'],
                'FNB_CATERING': ['catering', 'katering', 'tumpeng', 'box'],
                'RETAIL_MINIMARKET': ['mart', 'toko', 'kelontong', 'mini market', 'minimarket'],
                'RETAIL_FASHION': ['baju', 'fashion', 'boutique', 'butik', 'apparel', 'outfit', 'store', 'thrift', 'hijab'],
                'LAYANAN_BENGKEL': ['bengkel', 'motor', 'mobil', 'service', 'reparasi', 'otomotif', 'garage'],
                'LAYANAN_LAUNDRY': ['laundry', 'cuci', 'dry clean', 'setrika'],
                'LAYANAN_SALON': ['salon', 'barber', 'pangkas', 'hair', 'beauty', 'spa'],
                'LAYANAN_CARWASH': ['carwash', 'car wash', 'steam', 'cuci mobil', 'cuci motor'],
                'HEALTH_CLINIC': ['klinik', 'sehat', 'medika', 'hospital', 'dokter', 'gigi'],
                'HEALTH_APOTEK': ['apotek', 'farma', 'pharmacy'],
                'TECH_SOFTWARE': ['tech', 'software', 'app', 'digital', 'code', 'dev'],
                'JASA_KREATIF': ['design', 'kreatif', 'studio', 'foto', 'photo', 'production', 'art'],
                'PROPERTI_AGEN': ['property', 'properti', 'estate', 'realty'],
                'PROPERTI_KONTRAKTOR': ['kontraktor', 'pemborong', 'build', 'konstruksi', 'pt', 'cv']
            };

            for (const [category, keywords] of Object.entries(keywordMap)) {
                if (keywords.some(kw => nameLower.includes(kw))) {
                    selectedKategori = category;
                    break;
                }
            }
        }
        
        // Reset autoSelected flag if user manually changes category
        function handleKategoriChange() {
            if (namaUnit) autoSelected = true;
        }

        $: existingUnits = Array.isArray(data?.existingUnits) ? data.existingUnits : [];
        // loading state for form submit
        let isSubmitting = false;
        const enhanceOptions = () => {
            isSubmitting = true;
            return async ({ update }) => {
                await update();
                isSubmitting = false;
            };
        };

        function nextStep() {
            // Validate current step
            const form = document.getElementById('unitForm');
            if (!form) return;
            
            const requiredInputs = form.querySelectorAll('[required]');
            let isValid = true;
            
            for (const input of requiredInputs) {
                // Hanya validasi input yang sedang tampil di layar
                if (input.offsetParent !== null) {
                    if (!input.checkValidity()) {
                        input.reportValidity();
                        isValid = false;
                        break;
                    }
                }
            }
            if (isValid) step++;
        }
    </script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 ">
    <div class="mb-8">
        <a href="/finance" class="group inline-flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white dark:text-white transition-colors">
            <span class="group-hover:-translate-x-1 transition-transform">←</span> Kembali ke Manajemen Bisnis
        </a>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div class="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div>
                <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {isCabang ? 'Pendaftaran Cabang' : 'Pendaftaran Unit Bisnis'}
                </h1>
                <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                    {isCabang 
                        ? 'Daftarkan cabang baru untuk memperluas jangkauan operasional bisnis Anda.' 
                        : 'Mulai entitas bisnis baru dengan melengkapi data profil utama di bawah ini.'}
                </p>
            </div>

            <div class="p-5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-bold text-slate-800 dark:text-slate-100">Jenis Entitas</p>
                        <p class="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold mt-0.5">Toggle untuk cabang</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button 
                            type="button"
                            class="relative w-14 h-7 rounded-full bg-slate-200 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            class:bg-indigo-600={isCabang}
                            on:click={() => isCabang = !isCabang}
                        >
                            <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 shadow-md transform transition-transform duration-300"
                                  class:translate-x-7={isCabang}></span>
                        </button>
                    </div>
                </div>
                
                {#if isCabang && existingUnits.length === 0}
                    <div class="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 rounded-md">
                        <p class="text-xs text-rose-600 font-medium">
                            ⚠️ Belum ada unit utama terdaftar.
                        </p>
                        <button 
                            type="button"
                            class="mt-2 w-full py-2 bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest"
                            on:click={() => isCabang = false}
                        >
                            Daftar Unit Utama
                        </button>
                    </div>
                {/if}
            </div>
        </div>

        <div class="lg:col-span-8">
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm overflow-hidden">
                <div class="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div class="flex items-center gap-4">
                        <div class="flex gap-2">
                            <div class="h-2 w-8 rounded-full transition-all {step >= 1 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}"></div>
                            <div class="h-2 w-8 rounded-full transition-all {step >= 2 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}"></div>
                            <div class="h-2 w-8 rounded-full transition-all {step >= 3 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}"></div>
                        </div>
                        <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Langkah {step} dari 3
                        </h3>
                    </div>
                    <span class="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        Wajib diisi (*)
                    </span>
                </div>
                
                <form id="unitForm" method="POST" use:enhance={enhanceOptions} class="p-6 sm:p-10 space-y-8">
                    
                    {#if isCabang && existingUnits.length > 0}
                        <div class="p-6 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-md space-y-3 {step === 1 ? 'block' : 'hidden'}">
                            <label class="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest block">
                                Cabang Dari Unit Induk *
                            </label>
                            <select 
                                name="cabang_dari" 
                                class="w-full border border-indigo-200 p-3.5 rounded-md text-sm outline-none bg-white dark:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                required={isCabang}
                                bind:value={selectedIndukId}
                            >
                                <option value="" disabled selected>Cari unit induk...</option>
                                {#each existingUnits as unit}
                                    <option value={unit.id}>{unit.nama_unit} — ({unit.kategori})</option>
                                {/each}
                            </select>
                            <input type="hidden" name="is_cabang" value="true" />
                            <div class="flex items-center gap-2 text-indigo-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p class="text-[11px] font-medium">Kategori akan otomatis mengikuti unit induk</p>
                            </div>
                        </div>
                    {:else if isCabang}
                        <input type="hidden" name="is_cabang" value="false" />
                        <input type="hidden" name="cabang_dari" value="" />
                    {/if}

                    <!-- STEP 1: Profil Dasar -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" class:hidden={step !== 1}>
                        <div class="md:col-span-2">
                            <h2 class="text-xl font-black text-slate-800 dark:text-slate-100 mb-4">1. Profil Utama Bisnis</h2>
                        </div>
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                                Nama {isCabang ? 'Cabang' : 'Unit Bisnis'} *
                            </label>
                            <input 
                                name="nama_unit" 
                                type="text" 
                                bind:value={namaUnit}
                                on:input={() => { autoSelected = false; }}
                                placeholder={isCabang ? 'Contoh: Cabang Depok' : 'Contoh: PT Maju Bersama'} 
                                class="w-full border border-slate-200 dark:border-slate-700 p-3.5 rounded-md text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white dark:bg-slate-900" 
                                required 
                            />
                        </div>

                        {#if !isCabang}
                            <div class="md:col-span-2">
                                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                                    Kategori Bisnis *
                                </label>
                                <select 
                                    name={selectedKategori === 'CUSTOM' ? 'kategori_pilihan' : 'kategori'}
                                    bind:value={selectedKategori}
                                    on:change={handleKategoriChange}
                                    class="w-full border border-slate-200 dark:border-slate-700 p-3.5 rounded-md text-sm outline-none bg-white dark:bg-slate-900 focus:border-indigo-500 transition-all"
                                    required={selectedKategori !== 'CUSTOM'}
                                >
                                    <option value="" disabled selected>Pilih Kategori Bisnis...</option>
                                    
                                    <optgroup label="Makanan & Minuman (F&B)">
                                        <option value="FNB_RESTO">Restoran & Cafe</option>
                                        <option value="FNB_COFFEE">Kedai Kopi / Coffee Shop</option>
                                        <option value="FNB_FASTFOOD">Makanan Cepat Saji (Fast Food)</option>
                                        <option value="FNB_CATERING">Katering & Event</option>
                                        <option value="FNB_PRODUKSI">Produksi Makanan / Pabrik F&B</option>
                                    </optgroup>
                                    
                                    <optgroup label="Perdagangan & Retail">
                                        <option value="RETAIL_MINIMARKET">Minimarket & Kelontong</option>
                                        <option value="RETAIL_FASHION">Fashion, Pakaian & Aksesoris</option>
                                        <option value="RETAIL_ELEKTRONIK">Elektronik & Gadget</option>
                                        <option value="RETAIL_ATK">Alat Tulis & Kantor (ATK)</option>
                                        <option value="RETAIL_KOSMETIK">Kosmetik & Kecantikan</option>
                                        <option value="RETAIL_OTOMOTIF">Suku Cadang & Aksesoris Kendaraan</option>
                                        <option value="RETAIL_GROSIR">Grosir / Distributor Utama</option>
                                    </optgroup>
                                    
                                    <optgroup label="Jasa Profesional & Kesehatan">
                                        <option value="HEALTH_CLINIC">Klinik, Praktek Dokter & Rumah Sakit</option>
                                        <option value="HEALTH_APOTEK">Apotek & Farmasi</option>
                                        <option value="JASA_HUKUM">Jasa Hukum & Notaris</option>
                                        <option value="JASA_AKUNTAN">Akuntan & Konsultan Pajak</option>
                                        <option value="JASA_KREATIF">Desain, Fotografi & Kreatif</option>
                                        <option value="JASA_EO">Event Organizer (EO)</option>
                                    </optgroup>
                                    
                                    <optgroup label="Layanan Harian & Perawatan">
                                        <option value="LAYANAN_LAUNDRY">Laundry & Dry Cleaning</option>
                                        <option value="LAYANAN_SALON">Salon, Barbershop & Spa</option>
                                        <option value="LAYANAN_CARWASH">Cuci Mobil & Motor (Car Wash)</option>
                                        <option value="LAYANAN_CLEANING">Jasa Kebersihan / Cleaning Service</option>
                                        <option value="LAYANAN_BENGKEL">Bengkel & Reparasi Kendaraan</option>
                                    </optgroup>
                                    
                                    <optgroup label="Properti & Konstruksi">
                                        <option value="PROPERTI_AGEN">Agen Properti / Broker</option>
                                        <option value="PROPERTI_KONTRAKTOR">Kontraktor & Pemborong</option>
                                        <option value="PROPERTI_INTERIOR">Jasa Desain Interior</option>
                                    </optgroup>
                                    
                                    <optgroup label="Pendidikan & Pelatihan">
                                        <option value="EDUKASI_SEKOLAH">Sekolah & Institusi Pendidikan</option>
                                        <option value="EDUKASI_BIMBEL">Bimbingan Belajar (Bimbel)</option>
                                        <option value="EDUKASI_KURSUS">Kursus Keterampilan / Pelatihan</option>
                                    </optgroup>
                                    
                                    <optgroup label="Teknologi & Digital">
                                        <option value="TECH_SOFTWARE">Software House & Custom Dev</option>
                                        <option value="TECH_AGENCY">Digital Agency / Marketing</option>
                                        <option value="TECH_SAAS">SaaS (Software as a Service)</option>
                                    </optgroup>
                                    
                                    <option value="CUSTOM">➕ Lainnya (Isi Sendiri...)</option>
                                </select>

                                {#if selectedKategori === 'CUSTOM'}
                                    <div class="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label class="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">
                                            Masukkan Kategori Baru *
                                        </label>
                                        <input 
                                            name="kategori" 
                                            type="text" 
                                            placeholder="Contoh: Pet Shop / Klinik Hewan" 
                                            class="w-full border border-indigo-200 dark:border-indigo-800 p-3.5 rounded-md text-sm outline-none bg-indigo-50/30 dark:bg-indigo-900/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            required 
                                        />
                                    </div>
                                {/if}
                            </div>
                        {:else}
                            <input type="hidden" name="kategori" value="SAME_AS_PARENT" />
                        {/if}
                    </div>

                    <!-- STEP 2: Kontak & Alamat -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" class:hidden={step !== 2}>
                        <div class="md:col-span-2">
                            <h2 class="text-xl font-black text-slate-800 dark:text-slate-100 mb-4">2. Informasi Kontak & Lokasi</h2>
                        </div>
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                                Alamat Lengkap *
                            </label>
                            <textarea 
                                name="alamat" 
                                placeholder="Jl. Raya No. 1..."
                                rows="3"
                                class="w-full border border-slate-200 dark:border-slate-700 p-3.5 rounded-md text-sm outline-none focus:border-indigo-500 transition-all resize-none bg-white dark:bg-slate-900"
                                required
                            ></textarea>
                        </div>

                        <div>
                            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                                Telepon Bisnis
                            </label>
                            <input 
                                name="telepon" 
                                type="tel" 
                                placeholder="0812..."
                                class="w-full border border-slate-200 dark:border-slate-700 p-3.5 rounded-md text-sm outline-none focus:border-indigo-500 transition-all bg-white dark:bg-slate-900"
                            />
                        </div>
                        
                        <div>
                            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                                Email Bisnis
                            </label>
                            <input 
                                name="email" 
                                type="email" 
                                placeholder="admin@bisnis.com"
                                class="w-full border border-slate-200 dark:border-slate-700 p-3.5 rounded-md text-sm outline-none focus:border-indigo-500 transition-all bg-white dark:bg-slate-900"
                            />
                        </div>
                    </div>

                    <!-- STEP 3: Finansial -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" class:hidden={step !== 3}>
                        <div class="md:col-span-2">
                            <h2 class="text-xl font-black text-slate-800 dark:text-slate-100 mb-4">3. Setup Finansial Awal</h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Tentukan modal dasar Anda. Akun COA (Chart of Accounts) standar akan dibuat otomatis.</p>
                        </div>
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                                Modal Awal {isCabang ? '(Opsional)' : '*'}
                            </label>
                            <div class="relative group">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-bold border-r border-slate-200 dark:border-slate-700 pr-3">Rp</span>
                                <input 
                                    name="modal_awal" 
                                    type="number" 
                                    placeholder="0"
                                    min="0"
                                    class="w-full border border-slate-200 dark:border-slate-700 py-3.5 pl-14 pr-4 rounded-md text-sm outline-none focus:border-indigo-500 transition-all font-bold bg-white dark:bg-slate-900"
                                    required={!isCabang} 
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Navigation Buttons -->
                    <div class="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        {#if step > 1}
                            <button 
                                type="button" 
                                class="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                on:click={() => step--}
                            >
                                Kembali
                            </button>
                        {:else}
                            <div></div>
                        {/if}

                        {#if step < 3}
                            <button 
                                type="button" 
                                class="px-8 py-3 bg-indigo-600 text-white rounded-md font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                                on:click={nextStep}
                            >
                                Lanjut
                            </button>
                        {:else}
                            <button 
                                type="submit" 
                                class="px-8 py-3 bg-slate-900 text-white rounded-md font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all disabled:bg-slate-200 disabled:cursor-not-allowed"
                                disabled={(isCabang && existingUnits.length === 0) || isSubmitting}
                            >
                                {isSubmitting ? 'Memproses...' : (isCabang ? 'Konfirmasi Cabang Baru' : 'Daftarkan Unit Sekarang')}
                            </button>
                        {/if}
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>