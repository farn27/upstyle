<script>
    import { enhance } from '$app/forms';
    import { slide, fade } from 'svelte/transition';
    import { onMount } from 'svelte';

    export let data;
    export let form;

    let profile = data.profile || {};
    let units = data.units || [];

    let activeTab = 'profile'; // 'profile', 'workspaces', 'preferences'
    let isSubmitting = false;

    // State untuk preferences
    let prefDarkMode = false;
    let prefWeeklyReport = true;
    let prefStockAlert = true;

    onMount(() => {
        // Load preferences from localStorage
        const savedDarkMode = localStorage.getItem('upstyle_dark_mode');
        const savedWeekly = localStorage.getItem('upstyle_weekly_report');
        const savedStock = localStorage.getItem('upstyle_stock_alert');
        
        if (savedDarkMode) prefDarkMode = savedDarkMode === 'true';
        if (savedWeekly) prefWeeklyReport = savedWeekly === 'true';
        if (savedStock) prefStockAlert = savedStock === 'true';

        // Apply dark mode class to html element if true
        if (prefDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    });

    // Save preferences
    function togglePreference(key, value) {
        localStorage.setItem(`upstyle_${key}`, value);
        if (key === 'dark_mode') {
            if (value) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }
    }

    // Untuk modal/form
    let showNewUnitForm = false;
    let editingUnitId = null;

    const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans min-h-screen text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/50 dark:bg-slate-900 dark:bg-slate-700/50">
    <div class="mb-6">
        <h1 class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Pengaturan Sistem</h1>
        <p class="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 text-sm font-medium">Kelola profil pribadi, unit bisnis, dan preferensi aplikasi Anda.</p>
    </div>

    <!-- HORIZONTAL TABS (BULLETPROOF LAYOUT) -->
    <div class="flex overflow-x-auto no-scrollbar gap-4 mb-8 border-b border-slate-200 dark:border-slate-700">
        <button on:click={() => activeTab = 'profile'} class="flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap {activeTab === 'profile' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Profil Akun
        </button>
        <button on:click={() => activeTab = 'workspaces'} class="flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap {activeTab === 'workspaces' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            Unit Bisnis
        </button>
        <button on:click={() => activeTab = 'preferences'} class="flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap {activeTab === 'preferences' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
            Tampilan & Sistem
        </button>
    </div>

    <!-- MAIN CONTENT AREA -->
    <div class="max-w-4xl mx-auto">
            
            <!-- TAB 1: PROFIL -->
            {#if activeTab === 'profile'}
                <div class="bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden" in:fade={{duration: 200}}>
                    <div class="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 dark:bg-slate-900 dark:bg-slate-700/50">
                        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100">Profil Personal</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Informasi akun utama Anda di sistem ERP.</p>
                    </div>
                    <form method="POST" action="?/updateProfile" class="p-8" use:enhance={() => { isSubmitting = true; return async ({ update }) => { isSubmitting = false; await update(); }; }}>
                        <div class="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                            <div class="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-3xl shrink-0 overflow-hidden border-2 border-white shadow-sm">
                                {#if profile.avatarUrl}
                                    <img src={profile.avatarUrl} alt="Avatar" class="w-full h-full object-cover" />
                                {:else}
                                    {profile.username ? profile.username.charAt(0).toUpperCase() : '?'}
                                {/if}
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">URL Foto Profil (Avatar)</label>
                                <input type="url" name="avatarUrl" value={profile.avatarUrl || ''} placeholder="https://contoh.com/foto.jpg" class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                        </div>

                        <div class="space-y-6 max-w-lg">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Nama Tampilan (Username)</label>
                                <input type="text" name="username" value={profile.username} class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" required />
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Alamat Email</label>
                                <input type="email" name="email" value={profile.email} class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" required />
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Role Akses</label>
                                <input type="text" value={profile.role?.toUpperCase()} disabled class="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 dark:text-slate-500 cursor-not-allowed font-black tracking-widest text-xs" />
                            </div>
                        </div>

                        <div class="mt-8 flex justify-between items-center">
                            {#if form?.success && !form?.passwordSuccess}
                                <p class="text-sm text-emerald-600 font-medium">{form.message}</p>
                            {:else if form?.message && !form?.passwordSuccess && !form?.passwordError}
                                <p class="text-sm text-red-500 font-medium">{form.message}</p>
                            {:else}
                                <div></div>
                            {/if}
                            <button type="submit" disabled={isSubmitting} class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-70 flex items-center gap-2">
                                {#if isSubmitting}
                                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Menyimpan...
                                {:else}
                                    Simpan Perubahan
                                {/if}
                            </button>
                        </div>
                    </form>

                    <!-- Change Password Section -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">
                        <div class="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h2 class="text-lg font-black text-slate-800 dark:text-slate-100">Keamanan Akun</h2>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Ubah password login kamu.</p>
                        </div>
                        <form method="POST" action="?/changePassword" class="p-8" use:enhance={() => { isSubmitting = true; return async ({ update }) => { isSubmitting = false; await update(); }; }}>
                            {#if form?.passwordSuccess}
                                <div class="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium">
                                    {form.message}
                                </div>
                            {/if}
                            {#if form?.passwordError}
                                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {form.passwordError}
                                </div>
                            {/if}
                            <div class="space-y-5 max-w-lg">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Password Lama</label>
                                    <input type="password" name="currentPassword" autocomplete="current-password" required placeholder="Masukkan password saat ini" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Password Baru</label>
                                    <input type="password" name="newPassword" autocomplete="new-password" required minlength="8" placeholder="Minimal 8 karakter" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Konfirmasi Password Baru</label>
                                    <input type="password" name="confirmPassword" autocomplete="new-password" required placeholder="Ulangi password baru" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
                                </div>
                            </div>
                            <div class="mt-6 flex justify-end">
                                <button type="submit" disabled={isSubmitting} class="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-700 transition-all disabled:opacity-70">
                                    Ubah Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            {/if}

            <!-- TAB 2: UNIT BISNIS -->
            {#if activeTab === 'workspaces'}
                <div class="space-y-6" in:fade={{duration: 200}}>
                    
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-black text-slate-800 dark:text-slate-100">Manajemen Bisnis / Cabang</h2>
                            <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Anda mengelola {units.length} unit bisnis.</p>
                        </div>
                        <button on:click={() => showNewUnitForm = !showNewUnitForm} class="px-5 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 dark:hover:bg-slate-600 transition-all flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                            {showNewUnitForm ? 'Batal' : 'Buat Baru'}
                        </button>
                    </div>

                    <!-- FORM BUAT BARU -->
                    {#if showNewUnitForm}
                        <div class="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 p-6 shadow-sm" transition:slide>
                            <h3 class="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-4">Daftarkan Bisnis Baru</h3>
                            <form method="POST" action="?/createUnit" class="grid grid-cols-1 md:grid-cols-2 gap-5" use:enhance={() => { isSubmitting = true; return async ({ update }) => { isSubmitting = false; showNewUnitForm = false; await update(); }; }}>
                                <div class="col-span-2 md:col-span-1">
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Nama Bisnis / Cabang</label>
                                    <input type="text" name="namaUnit" placeholder="Contoh: Toko Pusat Jakarta" class="w-full px-4 py-3 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" required />
                                </div>
                                <div class="col-span-2 md:col-span-1">
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Kategori Bisnis</label>
                                    <select name="kategori" class="w-full px-4 py-3 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" required>
                                        <option value="RETAIL">Retail / Toko</option>
                                        <option value="F&B">Food & Beverage</option>
                                        <option value="JASA">Jasa & Pelayanan</option>
                                        <option value="DISTRIBUTOR">Distributor / Grosir</option>
                                        <option value="ENTERPRISE">Lainnya / Enterprise</option>
                                    </select>
                                </div>
                                <div class="col-span-2 md:col-span-1">
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Modal Awal (Disetor)</label>
                                    <input type="number" name="modalAwal" placeholder="10000000" class="w-full px-4 py-3 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" required />
                                </div>
                                <div class="col-span-2 md:col-span-1">
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Telepon Cabang</label>
                                    <input type="tel" name="telepon" placeholder="08123456789" class="w-full px-4 py-3 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Alamat Cabang</label>
                                    <textarea name="alamat" rows="2" placeholder="Jl. Raya No. 123..." class="w-full px-4 py-3 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"></textarea>
                                </div>
                                <div class="col-span-2 flex justify-end mt-2">
                                    <button type="submit" disabled={isSubmitting} class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all">
                                        Simpan Bisnis Baru
                                    </button>
                                </div>
                            </form>
                        </div>
                    {/if}

                    <!-- LIST UNIT BISNIS -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {#each units as unit}
                            <div class="bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                                <!-- Dekorasi -->
                                <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                                
                                <div class="relative z-10">
                                    <div class="flex justify-between items-start mb-4">
                                        <div>
                                            <span class="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-widest rounded mb-2">{unit.kategori || 'BISNIS'}</span>
                                            <h3 class="text-xl font-black text-slate-800 dark:text-slate-100 line-clamp-1">{unit.namaUnit}</h3>
                                            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">slug: {unit.slug}</p>
                                        </div>
                                        <div class="w-10 h-10 bg-slate-100 dark:bg-slate-800/80 rounded-lg flex items-center justify-center font-black text-slate-400 dark:text-slate-500">
                                            {unit.namaUnit.charAt(0).toUpperCase()}
                                        </div>
                                    </div>

                                    {#if editingUnitId === unit.id}
                                        <!-- FORM EDIT UNIT -->
                                        <form method="POST" action="?/updateUnit" class="mt-4 p-4 bg-slate-50 dark:bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4" use:enhance={() => { isSubmitting = true; return async ({ update }) => { isSubmitting = false; editingUnitId = null; await update(); }; }}>
                                            <input type="hidden" name="id" value={unit.id} />
                                            <div>
                                                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Nama Bisnis</label>
                                                <input type="text" name="namaUnit" value={unit.namaUnit} class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500" required />
                                            </div>
                                            <div class="flex gap-3">
                                                <div class="flex-1">
                                                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Kategori</label>
                                                    <select name="kategori" value={unit.kategori} class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500" required>
                                                        <option value="RETAIL">Retail</option>
                                                        <option value="F&B">F&B</option>
                                                        <option value="JASA">Jasa</option>
                                                        <option value="DISTRIBUTOR">Distributor</option>
                                                        <option value="ENTERPRISE">Enterprise</option>
                                                    </select>
                                                </div>
                                                <div class="flex-1">
                                                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Modal Awal</label>
                                                    <input type="number" name="modalAwal" value={Number(unit.modalAwal || 0)} class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500" required />
                                                </div>
                                            </div>
                                            <div class="flex gap-3">
                                                <div class="flex-1">
                                                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Telepon</label>
                                                    <input type="tel" name="telepon" value={unit.telepon || ''} class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Alamat</label>
                                                <textarea name="alamat" rows="2" class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500">{unit.alamat || ''}</textarea>
                                            </div>
                                            <div class="flex gap-2 justify-end pt-2">
                                                <button type="button" on:click={() => editingUnitId = null} class="px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200">Batal</button>
                                                <button type="submit" disabled={isSubmitting} class="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-600 disabled:opacity-50">Simpan</button>
                                            </div>
                                        </form>
                                    {:else}
                                        <!-- INFO UNIT -->
                                        <div class="mt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs mb-1">
                                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                                {unit.telepon || 'Belum diatur'}
                                            </div>
                                            <div class="flex items-start gap-2 text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs line-clamp-2">
                                                <svg class="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                                {unit.alamat || 'Alamat belum diatur'}
                                            </div>
                                        </div>

                                        <div class="mt-4 grid grid-cols-2 gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                                            <div>
                                                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Status Portal</p>
                                                <p class="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
                                                </p>
                                            </div>
                                            <div>
                                                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Modal Disetor</p>
                                                <p class="text-sm font-bold text-slate-700 dark:text-slate-200">{formatIDR(unit.modalAwal)}</p>
                                            </div>
                                        </div>

                                        <div class="mt-5 flex items-center gap-3">
                                            <a href={`/finance/${unit.slug}`} class="flex-1 text-center py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow hover:bg-indigo-700 transition-colors">Masuk Dashboard</a>
                                            <button on:click={() => editingUnitId = unit.id} class="px-4 py-2 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:bg-slate-600/50 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white dark:text-white transition-colors">Edit</button>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>

                    {#if units.length === 0}
                        <div class="text-center py-20 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div class="w-20 h-20 bg-slate-50 dark:bg-slate-900 dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-4">
                                <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            </div>
                            <h3 class="text-lg font-black text-slate-700 dark:text-slate-200">Belum Ada Bisnis</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 max-w-sm mx-auto">Anda belum mendaftarkan unit bisnis apapun. Silakan buat unit bisnis pertama Anda untuk memulai pembukuan.</p>
                            <button on:click={() => showNewUnitForm = true} class="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700">Buat Unit Bisnis Sekarang</button>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- TAB 3: TAMPILAN -->
            {#if activeTab === 'preferences'}
                <div class="bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden" in:fade={{duration: 200}}>
                    <div class="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 dark:bg-slate-900 dark:bg-slate-700/50">
                        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100">Tampilan & Preferensi Sistem</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Personalisasi pengalaman menggunakan aplikasi ERP.</p>
                    </div>
                    <div class="p-8">
                        <!-- DARK MODE TOGGLE -->
                        <div class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-500 shadow-sm">
                                    {#if prefDarkMode}
                                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                                    {:else}
                                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                                    {/if}
                                </div>
                                <div>
                                    <h3 class="text-base font-black">Mode Gelap (Dark Mode)</h3>
                                    <p class="text-xs mt-1 opacity-80">Ubah tampilan menjadi gelap agar nyaman di malam hari.</p>
                                </div>
                            </div>
                            
                            <!-- Toggle Button -->
                            <button type="button" on:click={() => { prefDarkMode = !prefDarkMode; togglePreference('dark_mode', prefDarkMode); }} class="w-14 h-7 rounded-full relative transition-colors shadow-inner {prefDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}">
                                <div class="absolute top-1 w-5 h-5 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-full transition-all shadow-sm {prefDarkMode ? 'right-1' : 'left-1'}"></div>
                            </button>
                        </div>

                        <div class="mt-8 space-y-6 max-w-lg">
                            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Notifikasi Sistem</h4>
                            
                            <label class="flex items-center justify-between cursor-pointer group">
                                <div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">Laporan Mingguan via Email</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Terima rangkuman arus kas dan penjualan setiap hari Senin.</p>
                                </div>
                                <button type="button" on:click={() => { prefWeeklyReport = !prefWeeklyReport; togglePreference('weekly_report', prefWeeklyReport); }} class="w-12 h-6 rounded-full relative transition-colors shadow-inner {prefWeeklyReport ? 'bg-emerald-500' : 'bg-slate-300'}">
                                    <div class="absolute top-1 w-4 h-4 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-full transition-all shadow-sm {prefWeeklyReport ? 'right-1' : 'left-1'}"></div>
                                </button>
                            </label>
                            
                            <label class="flex items-center justify-between cursor-pointer group">
                                <div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">Peringatan Stok Menipis</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Notifikasi di dalam aplikasi jika stok barang &lt; 5.</p>
                                </div>
                                <button type="button" on:click={() => { prefStockAlert = !prefStockAlert; togglePreference('stock_alert', prefStockAlert); }} class="w-12 h-6 rounded-full relative transition-colors shadow-inner {prefStockAlert ? 'bg-emerald-500' : 'bg-slate-300'}">
                                    <div class="absolute top-1 w-4 h-4 bg-white dark:bg-slate-800 dark:bg-slate-900 dark:bg-slate-700 rounded-full transition-all shadow-sm {prefStockAlert ? 'right-1' : 'left-1'}"></div>
                                </button>
                            </label>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
