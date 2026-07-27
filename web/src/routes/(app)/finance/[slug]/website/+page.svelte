<script>
    import { enhance } from '$app/forms';
    import { toastPesan } from '$lib/notifStore';

    export let data;
    export let form;

    $: settings = data.settings ?? {};
    $: unit = data.unit;

    let selectedTheme = settings?.theme || 'modern';
    let selectedColor = settings.colorPrimary || '#6366F1';
    let domainSlug = settings.domainSlug || '';
    let heroTitle = settings.heroTitle || '';
    let heroSubtitle = settings.heroSubtitle || '';
    let aboutUs = settings.aboutUs || '';
    let contactPhone = settings.contactPhone || '';
    let contactEmail = settings.contactEmail || '';
    let contactAddress = settings.contactAddress || '';
    let isPublished = settings.isPublished ?? true;

    const colorPresets = [
        { name: 'Indigo', hex: '#6366F1' },
        { name: 'Rose', hex: '#F43F5E' },
        { name: 'Emerald', hex: '#10B981' },
        { name: 'Amber', hex: '#F59E0B' },
        { name: 'Violet', hex: '#8B5CF6' }
    ];

    let isSubmitting = false;

    // Toast alert on action results
    $: if (form) {
        if (form.success) {
            toastPesan.set(form.message || 'Berhasil menyimpan setelan lurd!');
            setTimeout(() => toastPesan.set(''), 3000);
        } else if (form.message) {
            toastPesan.set('⚠️ ' + form.message);
            setTimeout(() => toastPesan.set(''), 4000);
        }
    }
</script>

<div class="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mb-10 font-sans text-slate-700 dark:text-slate-200">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 mb-6">
        <div>
            <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Website Builder Instan</h1>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase tracking-widest">Pemasaran & Toko Online Publik</p>
        </div>
        <div>
            <a 
                href="/w/{domainSlug}" 
                target="_blank"
                class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800 transition-all flex items-center gap-2"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Kunjungi Website Publik
            </a>
        </div>
    </div>

    <!-- Analytics Dashboard Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
                <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kunjungan Unik</span>
                <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">1,240 <span class="text-xs text-emerald-500 font-bold">+12%</span></p>
            </div>
            <div class="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
                <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Produk Dilihat</span>
                <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">4,580 <span class="text-xs text-emerald-500 font-bold">+8%</span></p>
            </div>
            <div class="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
                <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Klik WhatsApp</span>
                <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">342 <span class="text-xs text-emerald-500 font-bold">+24%</span></p>
            </div>
            <div class="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.64 1.97 14.168 1.94 11.535 1.94c-5.442 0-9.868 4.374-9.872 9.803-.001 1.73.46 3.418 1.336 4.908l-.997 3.639 3.755-.984zm13.125-6.732c-.328-.164-1.945-.96-2.245-1.07-.3-.109-.519-.164-.737.164-.219.329-.848 1.07-.1.329 1.15.547 2.062.902 2.825.164.763.164 1.63-.437 1.849-.765.219-.327.219-.607.109-.771-.109-.164-.437-.328-.765-.492zm-7.625-3.238c-.219-.328-.437-.656-.656-.984a.42.42 0 00-.317-.184c-.164 0-.328.164-.328.328 0 .164 1.64 2.625 2.187 3.44.11.164.219.273.328.328.219.109.437 0 .656-.219.656-.656 1.968-2.625 2.515-3.44.11-.164.11-.328 0-.492-.109-.164-.328-.328-.547-.328a.42.42 0 00-.317.184c-.219.328-.437.656-.656.984z"/>
                </svg>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- LEFT: Settings Form -->
        <div class="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest border-b border-slate-50 dark:border-slate-700 pb-3 mb-6">Konfigurasi Toko Online</h3>

            <form 
                method="POST" 
                action="?/updateSettings" 
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ update }) => {
                        isSubmitting = false;
                        await update();
                    };
                }}
                class="space-y-6 text-sm"
            >
                <!-- Domain Slug -->
                <div>
                    <label for="domainSlug" class="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Subdomain Toko lurd</label>
                    <div class="flex">
                        <span class="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-400 font-mono">/w/</span>
                        <input 
                            type="text" 
                            id="domainSlug" 
                            name="domainSlug" 
                            bind:value={domainSlug}
                            class="flex-1 min-w-0 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all font-mono"
                            placeholder="warung-berkah"
                            required
                        />
                    </div>
                    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Akan diakses publik melalui: <code>http://localhost:5173/w/{domainSlug || '[slug]'}</code></p>
                </div>

                <!-- Theme & Color Primary -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label for="theme" class="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Pilihan Tema</label>
                        <select 
                            id="theme" 
                            name="theme" 
                            bind:value={selectedTheme}
                            class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all"
                        >
                            <option value="modern">Modern Clean</option>
                            <option value="classic">Classic Elegant</option>
                            <option value="retro">Retro Vintage</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Warna Utama</label>
                        <input type="hidden" name="colorPrimary" value={selectedColor} />
                        <div class="flex items-center gap-3">
                            {#each colorPresets as preset}
                                <button 
                                    type="button" 
                                    on:click={() => selectedColor = preset.hex}
                                    class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shadow-sm cursor-pointer"
                                    style="background-color: {preset.hex}; border-color: {selectedColor === preset.hex ? '#1e293b' : 'transparent'}"
                                    title={preset.name}
                                ></button>
                            {img => img}
                            {/each}
                            <!-- Custom Color Picker Circle -->
                            <input 
                                type="color" 
                                bind:value={selectedColor} 
                                class="w-8 h-8 rounded-full border border-slate-200 bg-transparent p-0 cursor-pointer overflow-hidden shadow-sm" 
                            />
                        </div>
                    </div>
                </div>

                <!-- Hero Section Copy -->
                <div class="space-y-4">
                    <div>
                        <label for="heroTitle" class="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Judul Utama Landing Page (Hero Title)</label>
                        <input 
                            type="text" 
                            id="heroTitle" 
                            name="heroTitle" 
                            bind:value={heroTitle}
                            class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all"
                            placeholder="Selamat Datang lurd!"
                            required
                        />
                    </div>

                    <div>
                        <label for="heroSubtitle" class="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Subjudul Landing Page (Hero Subtitle)</label>
                        <textarea 
                            id="heroSubtitle" 
                            name="heroSubtitle" 
                            bind:value={heroSubtitle}
                            rows="2"
                            class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all resize-none"
                            placeholder="Tuliskan slogan toko atau promosi berjalan di sini..."
                            required
                        ></textarea>
                    </div>
                </div>

                <!-- About Us Section -->
                <div>
                    <label for="aboutUs" class="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Deskripsi Toko (About Us)</label>
                    <textarea 
                        id="aboutUs" 
                        name="aboutUs" 
                        bind:value={aboutUs}
                        rows="3"
                        class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all resize-none"
                        placeholder="Profil singkat, sejarah toko, komitmen produk..."
                    ></textarea>
                </div>

                <!-- Contact & Social Details -->
                <div class="border-t border-slate-50 dark:border-slate-700 pt-6 space-y-4">
                    <h4 class="font-bold text-slate-800 dark:text-white mb-2">Informasi Kontak & Detail Lokasi</h4>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="contactPhone" class="block font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp Admin</label>
                            <input 
                                type="text" 
                                id="contactPhone" 
                                name="contactPhone" 
                                bind:value={contactPhone}
                                class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all"
                                placeholder="08123456789"
                                required
                            />
                        </div>

                        <div>
                            <label for="contactEmail" class="block font-bold text-slate-500 dark:text-slate-400 mb-1">Email Toko</label>
                            <input 
                                type="email" 
                                id="contactEmail" 
                                name="contactEmail" 
                                bind:value={contactEmail}
                                class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all"
                                placeholder="admin@warungku.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label for="contactAddress" class="block font-bold text-slate-500 dark:text-slate-400 mb-1">Alamat Kantor/Gudang Utama</label>
                        <textarea 
                            id="contactAddress" 
                            name="contactAddress" 
                            bind:value={contactAddress}
                            rows="2"
                            class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-all resize-none"
                            placeholder="Jl. Merdeka No. 123..."
                        ></textarea>
                    </div>
                </div>

                <!-- Publish Status Switch -->
                <div class="flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-6">
                    <div>
                        <span class="font-bold text-slate-800 dark:text-white block">Status Publikasi Website</span>
                        <span class="text-xs text-slate-400">Aktifkan untuk memperbolehkan pembeli mengakses katalog</span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="isPublished" value="true" bind:checked={isPublished} class="sr-only peer" />
                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <!-- Submit Button -->
                <div class="flex justify-end gap-3 pt-6 border-t border-slate-50 dark:border-slate-700">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {#if isSubmitting}
                            <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Menyimpan...
                        {:else}
                            Simpan Perubahan Setelan
                        {/if}
                    </button>
                </div>
            </form>
        </div>

        <!-- RIGHT: Live Preview Frame -->
        <div class="lg:col-span-5 sticky top-24">
            <h3 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Live Preview Website</h3>
            <div class="w-full bg-slate-900 rounded-3xl p-3 border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col aspect-[9/16]">
                <!-- Phone Notch -->
                <div class="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-full z-20"></div>
                
                <!-- Phone Inner Web Content -->
                <div class="flex-1 bg-white rounded-2xl overflow-y-auto no-scrollbar pt-6 flex flex-col justify-between text-slate-800 text-[10px]">
                    <div>
                        <!-- Header -->
                        <div class="px-3 py-2.5 border-b border-slate-100 flex justify-between items-center bg-white">
                            <span class="font-bold text-slate-900">{unit.namaUnit}</span>
                            <span class="px-2 py-0.5 rounded text-[8px] font-bold text-white" style="background-color: {selectedColor}">Pesan</span>
                        </div>

                        <!-- Hero Preview -->
                        <div class="px-4 py-8 bg-slate-50 border-b border-slate-100 text-center relative overflow-hidden">
                            <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient({selectedColor} 1px, transparent 1px); background-size: 10px 10px;"></div>
                            <h4 class="text-sm font-black text-slate-950 leading-tight mb-2 tracking-tight">{heroTitle || `Selamat Datang di ${unit.namaUnit}`}</h4>
                            <p class="text-[9px] text-slate-500 leading-snug">{heroSubtitle || 'Temukan produk pilihan kami.'}</p>
                        </div>

                        <!-- Catalog Filter List -->
                        <div class="p-3">
                            <span class="font-bold text-slate-900 mb-2 block text-[9px] uppercase tracking-wider">Katalog Produk</span>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                    <div class="h-20 bg-slate-100 flex items-center justify-center text-slate-300">
                                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                    </div>
                                    <div class="p-2 flex flex-col justify-between flex-1">
                                        <span class="font-bold text-slate-800 truncate">Contoh Produk A</span>
                                        <span class="font-black text-slate-950 mt-1">Rp 15.000</span>
                                        <button type="button" class="w-full text-center text-white py-1 rounded-md text-[8px] font-bold mt-2 shadow-sm" style="background-color: {selectedColor}">Beli (WA)</button>
                                    </div>
                                </div>

                                <div class="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                    <div class="h-20 bg-slate-100 flex items-center justify-center text-slate-300">
                                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                    </div>
                                    <div class="p-2 flex flex-col justify-between flex-1">
                                        <span class="font-bold text-slate-800 truncate">Contoh Produk B</span>
                                        <span class="font-black text-slate-950 mt-1">Rp 75.000</span>
                                        <button type="button" class="w-full text-center text-white py-1 rounded-md text-[8px] font-bold mt-2 shadow-sm" style="background-color: {selectedColor}">Beli (WA)</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- About Preview -->
                        <div class="p-4 bg-white border-t border-slate-100">
                            <span class="font-bold text-slate-900 block mb-2 text-[9px] uppercase tracking-wider">Tentang Kami</span>
                            <p class="text-[9px] text-slate-500 leading-relaxed">{aboutUs || 'Profil singkat unit bisnis kami.'}</p>
                        </div>
                    </div>

                    <!-- Footer Preview -->
                    <div class="p-4 bg-slate-900 text-slate-500 border-t border-slate-800 flex flex-col gap-2">
                        <span class="text-white font-bold">{unit.namaUnit}</span>
                        <span>Alamat: {contactAddress || 'Alamat Toko'}</span>
                        <span>Powered by Bizgrow ERP</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
