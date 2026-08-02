<script>
  import "../../app.css";
  import { page } from '$app/stores';
  import { fade, fly } from 'svelte/transition';
  import { notifications, showRedDot, toastPesan } from '$lib/notifStore';
  import ChatAI from "$lib/components/ChatAI.svelte";
  import QuickNav from "$lib/components/QuickNav.svelte";
  import SidebarNav from "$lib/components/SidebarNav.svelte";
  import { onMount, onDestroy } from 'svelte';
  import { replaceState , goto } from '$app/navigation';
  import { invalidate } from '$app/navigation';
  import { initGlobalRealtime, cleanupRealtime } from '$lib/realtimeStore';
  import { navigating } from '$app/stores';
  export let data;

  
  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      const isDark = localStorage.getItem('upstyle_dark_mode') === 'true';
      if (isDark) document.documentElement.classList.add('dark');
    }
  });

  onDestroy(() => {
    cleanupRealtime();
  });

  // --- STATE UI ---
  let showNotif = false;
  let tampilkanDropdownUser = false;
  let isChatOpen = false;
  let isQuickNavOpen = false;
  let isSidebarOpen = false;

  // --- LOGIC NAVIGASI ---
  $: isPosSide = $page.url.pathname.includes('/pos'); 
  $: activeSlug = $page.params.slug || '';
  $: linkNavigasi = [
    { nama: "Beranda", href: "/", activePattern: "^/$" },
    { nama: "Operasional", href: activeSlug ? `/finance/${activeSlug}` : "/finance", activePattern: "^/finance" },
    { nama: "E-commerce", href: activeSlug ? `/ecommerce/${activeSlug}` : "/ecommerce", activePattern: "^/ecommerce" }
  ];

  // --- DATA USER ---
  $: username = data?.user?.username || ""; 
  $: inisial = username ? username.charAt(0).toUpperCase() : "?";
  $: userId = data?.user?.id || "";

  // --- INIT GLOBAL REALTIME ---
  // UnitId is often in layout data or page data. If not, we still initialize with slug.
  $: unitId = $page.data?.unit?.id || $page.data?.unitInfo?.id;
  $: if (typeof window !== 'undefined' && (unitId || activeSlug)) {
    // Only init Socket.io if we have a valid unitId for authentication
    if (unitId) {
      initGlobalRealtime(unitId, activeSlug, username, userId, 'session-token-placeholder');
    }
    // No fallback needed — polling is handled internally by initGlobalRealtime
  }

  // --- LOGIC NOTIFIKASI REAKTIF ---
  import { notifUpdate } from '$lib/realtimeStore';

  let riwayatData = [];
  $: {
    // Selalu sinkronisasi data dari server saat invalidateAll() dipanggil
    if ($page.data.riwayatGlobal) {
      // Pertahankan event realtime yang baru masuk belum ke-save di DB (jika ada)
      const serverIds = new Set($page.data.riwayatGlobal.map(r => r.id));
      const localOnly = riwayatData.filter(r => !serverIds.has(r.id));
      
      riwayatData = [...localOnly, ...$page.data.riwayatGlobal]
        .sort((a,b) => new Date(b.waktu) - new Date(a.waktu))
        .slice(0, 15);
    }
  }

  // Pantau update realtime dari Pusher
  $: if ($notifUpdate) {
    const isDuplicate = riwayatData.some(r => r.id === $notifUpdate.id);
    if (!isDuplicate) {
        riwayatData = [$notifUpdate, ...riwayatData].slice(0, 15);
        showRedDot.set(true);
    }
  }

  // Grouping data berdasarkan kategori
  $: groupedNotifs = riwayatData.reduce((acc, item) => {
    const kat = item.kategori || 'Sistem'; 
    if (!acc[kat]) acc[kat] = [];
    acc[kat].push(item);
    return acc;
  }, {});

  // Trigger titik merah jika ada data baru masuk (Tambah/Hapus/Update)
  // Kita bandingkan string JSON untuk mendeteksi perubahan isi, bukan cuma jumlah (length)
  let lastDataString = JSON.stringify(riwayatData);
  $: {
    if (JSON.stringify(riwayatData) !== lastDataString) {
      showRedDot.set(true);
      lastDataString = JSON.stringify(riwayatData);
    }
  }

  function handleNotifClick() {
    showNotif = !showNotif;
    if (showNotif) {
      showRedDot.set(false);
    }
  }

  // --- LOGIC TOAST (URL PARAMS) ---
  let pesanTerproses = '';

  $: {
    const pesanUrl = $page.url.searchParams.get('pesan');

    if (pesanUrl && pesanTerproses !== pesanUrl) {
      pesanTerproses = pesanUrl;
      
      toastPesan.set(pesanUrl);
      showRedDot.set(true);

      if (typeof window !== 'undefined') {
        const newUrl = new URL($page.url);
        newUrl.searchParams.delete('pesan');
        goto(newUrl.pathname, { replaceState: true, noScroll: true, keepFocus: true });
      }

      setTimeout(() => {
        toastPesan.set('');
      }, 3000);
    }
  }

</script>

<div class="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-700 dark:text-slate-200 selection:bg-indigo-500/30">
  {#if !isPosSide}
  <nav class="sticky top-0 z-[100] bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 print:hidden">
    <div class="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
      
      <div class="flex items-center gap-6">
        <button on:click={() => isSidebarOpen = true} aria-label="Buka navigasi sidebar" class="p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="/" class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">B</div>
          <span class="text-base font-bold tracking-tight text-slate-900 dark:text-white">Bizgrow</span>
        </a>

        <button 
          on:click={() => isQuickNavOpen = true}
          class="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 font-medium transition cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span class="hidden sm:inline">Cari...</span>
          <span class="hidden sm:inline bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-xs font-mono leading-none">Ctrl+K</span>
        </button>

        <div class="hidden md:flex items-center gap-1">
          {#each linkNavigasi as link}
            <a 
              href={link.href} 
              class="px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-all { new RegExp(link.activePattern).test($page.url.pathname) ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800' }"
            >
              {link.nama}
            </a>
          {/each}

          <button 
            on:click={() => isChatOpen = !isChatOpen}
            class="hidden sm:flex px-4 py-2 rounded-lg text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:bg-indigo-900/30 transition-all items-center gap-2"
          >
            <div class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </div>
            TANYA AI
          </button>
        </div>
      </div>

   <div class="flex items-center gap-5">



<div class="relative">
    <button on:click={handleNotifClick} aria-label="Buka notifikasi" class="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 relative">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    
    {#if $showRedDot}
        <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
    {/if}
</button>

    {#if showNotif}
    <div 
        class="fixed inset-0 z-40 bg-transparent" 
        role="button"
        tabindex="-1"
        aria-label="Tutup notifikasi"
        on:click={() => showNotif = false}
        on:keydown={(e) => e.key === 'Escape' && (showNotif = false)}>
    </div>
        <div
        class="absolute right-0 sm:right-0 bg-white dark:bg-slate-800 w-80 sm:w-80 z-50 shadow-2xl transition-all"
        transition:fade={{duration: 100}}>
            <div class="bg-white dark:bg-slate-800  border border-slate-100 dark:border-slate-800 flex flex-col ">
                <div class="p-y-1 px-3 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
                    <div class="flex items-center p-2 gap-2">
                        <div class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                        <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notifikasi Terbaru</h3>
                    </div>
                </div>

 <div class="p-2 space-y-4 overflow-y-auto max-h-[400px]">
    {#each Object.entries(groupedNotifs) as [kategori, items]}
        <div class="space-y-1">
            <h4 class="px-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">{kategori}</h4>
            
            {#each items as log}
                <a 
                    href={log.link || '#'} 
                    on:click={() => showNotif = false}
                    class="flex items-start gap-3 p-2.5 rounded-md hover:bg-indigo-50/50 dark:bg-indigo-900/50 transition-all border border-transparent hover:border-indigo-100 dark:border-indigo-800/50 group"
                >
                    <div class="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform"></div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-slate-600 dark:text-slate-300 leading-snug">{log.pesan}</p>
                        <span class="text-xs text-slate-400 dark:text-slate-500">
                            {new Date(log.waktu).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </a>
            {/each}
        </div>
    {/each}
</div>
                
                <a href="/notification" class="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p class="text-xs text-indigo-600 font-semibold uppercase tracking-wide text-center">Tampilkan semua</p>
                </a>
            </div>
        </div>
    {/if}
</div>

  <div class="relative">
    <button 
      on:click={() => tampilkanDropdownUser = !tampilkanDropdownUser} 
      class="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors"
    >
      <div class="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-xs">
        {inisial}
      </div>
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:block">
        {username}
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>

    {#if tampilkanDropdownUser}
      <div 
        in:fly={{ y: 10, duration: 200 }} 
        class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-xl  z-[110]"
      >
        <div class="px-4 py-3 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Masuk sebagai</p>
          <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{username}</p>
        </div>
        
        <div class="p-1">
          <a href="/settings" class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pengaturan
          </a>
          <a href="/help" on:click={() => tampilkanDropdownUser = false} class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pusat Bantuan
          </a>
          
<form action="/auth/logout" method="POST">
            <button type="submit" class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar Akun
            </button>
          </form>
        </div>
      </div>
    {/if}
  </div>
</div>
    </div>
  </nav>
  {/if}

<main class="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
    <slot />
  </main>
</div>

{#if data && data.user}
    <ChatAI 
        bind:isOpen={isChatOpen}
        dashboardData={data.allData}
        userId={userId}  /> 
    <QuickNav bind:isOpen={isQuickNavOpen} />
    <SidebarNav bind:isOpen={isSidebarOpen} />
{/if}

{#if $toastPesan}
  <div class="fixed inset-0 flex items-end justify-center pb-12 z-[999] pointer-events-none">
    <div 
      in:fly={{ y: 50, duration: 300 }} 
      out:fade 
      class="pointer-events-auto bg-slate-900 text-white px-6 py-3 rounded-md shadow-2xl flex items-center gap-3"
    >
      <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      <span class="text-sm font-medium">{$toastPesan}</span>
    </div>
  </div>
{/if}
{#if $navigating}
    <div class="fixed top-0 left-0 w-full h-1 bg-indigo-600 z-[9999] animate-pulse"></div>
{/if}