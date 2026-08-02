<script>
  /**
   * QR Scanner component — pakai kamera device untuk scan barcode/QR
   * Usage: <QRScanner onResult={(text) => console.log(text)} />
   */
  import { onMount, onDestroy } from 'svelte';
  import { ScanLine, X, Camera } from 'lucide-svelte';

  let { onResult, onError, placeholder = 'Arahkan kamera ke QR Code atau barcode' } = $props();

  let videoEl = $state(null);
  let isScanning = $state(false);
  let isLoading = $state(false);
  let errorMsg = $state('');
  let stopFn = null;

  async function startScan() {
    if (!videoEl) return;
    isLoading = true;
    errorMsg = '';
    try {
      const { startQRScanner } = await import('$lib/qrcode.js');
      const { stop } = await startQRScanner(videoEl, (result) => {
        onResult?.(result);
        // Opsional: stop setelah scan pertama
        // stopScan();
      });
      stopFn = stop;
      isScanning = true;
    } catch (err) {
      errorMsg = 'Tidak bisa akses kamera: ' + err.message;
      onError?.(err);
    }
    isLoading = false;
  }

  function stopScan() {
    stopFn?.();
    stopFn = null;
    isScanning = false;
  }

  onDestroy(() => stopScan());
</script>

<div class="flex flex-col items-center gap-3">
  <!-- Video preview -->
  <div class="relative w-full max-w-xs aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 {isScanning ? 'border-blue-500' : 'border-slate-700'}">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={videoEl} autoplay playsinline muted
      class="w-full h-full object-cover {isScanning ? 'opacity-100' : 'opacity-0'}">
    </video>

    <!-- Overlay saat tidak scanning -->
    {#if !isScanning}
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <Camera class="w-12 h-12 text-slate-500" />
        <span class="text-xs text-slate-400 text-center px-4">{placeholder}</span>
      </div>
    {/if}

    <!-- Scan animation overlay -->
    {#if isScanning}
      <div class="absolute inset-0 pointer-events-none">
        <!-- Corner markers -->
        <div class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-lg"></div>
        <div class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-lg"></div>
        <div class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-lg"></div>
        <div class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-lg"></div>
        <!-- Scan line -->
        <div class="absolute left-4 right-4 h-0.5 bg-blue-400/70 animate-scan-line top-1/2"></div>
      </div>
    {/if}

    <!-- Loading -->
    {#if isLoading}
      <div class="absolute inset-0 flex items-center justify-center bg-slate-900/80">
        <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {/if}
  </div>

  {#if errorMsg}
    <p class="text-xs text-red-500 text-center">{errorMsg}</p>
  {/if}

  <!-- Controls -->
  <div class="flex gap-2">
    {#if !isScanning}
      <button onclick={startScan} disabled={isLoading}
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
        <ScanLine class="w-4 h-4" />
        {isLoading ? 'Memuat...' : 'Mulai Scan'}
      </button>
    {:else}
      <button onclick={stopScan}
        class="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">
        <X class="w-4 h-4" />
        Stop
      </button>
    {/if}
  </div>
</div>

<style>
  @keyframes scan-line {
    0% { transform: translateY(-60px); }
    50% { transform: translateY(60px); }
    100% { transform: translateY(-60px); }
  }
  .animate-scan-line {
    animation: scan-line 2s ease-in-out infinite;
  }
</style>
