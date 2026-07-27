<script>
	/**
	 * Barcode Scanner Component
	 * Pakai kamera browser (MediaDevices API) + BarcodeDetector API (Chrome/Edge)
	 * Fallback: manual input field
	 */
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let active = false;

	let videoEl;
	let stream = null;
	let detector = null;
	let scanning = false;
	let manualInput = '';
	let error = '';
	let supported = false;
	let scanInterval = null;

	onMount(async () => {
		supported = 'BarcodeDetector' in window;
	});

	onDestroy(() => {
		stopCamera();
	});

	$: if (active) startCamera();
	$: if (!active) stopCamera();

	async function startCamera() {
		error = '';
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
			});
			if (videoEl) {
				videoEl.srcObject = stream;
				await videoEl.play();
			}

			if (supported) {
				detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'] });
				scanning = true;
				startScanning();
			}
		} catch (err) {
			if (err.name === 'NotAllowedError') {
				error = 'Izin kamera ditolak. Aktifkan kamera di pengaturan browser.';
			} else if (err.name === 'NotFoundError') {
				error = 'Kamera tidak ditemukan di perangkat ini.';
			} else {
				error = 'Gagal akses kamera: ' + err.message;
			}
		}
	}

	function stopCamera() {
		scanning = false;
		if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
		if (stream) {
			stream.getTracks().forEach((t) => t.stop());
			stream = null;
		}
	}

	function startScanning() {
		scanInterval = setInterval(async () => {
			if (!scanning || !videoEl || videoEl.readyState < 2) return;
			try {
				const barcodes = await detector.detect(videoEl);
				if (barcodes.length > 0) {
					const code = barcodes[0].rawValue;
					dispatch('scan', { barcode: code });
					// Flash feedback
					scanning = false;
					setTimeout(() => { scanning = true; }, 1500); // debounce 1.5s
				}
			} catch { /* silent */ }
		}, 300);
	}

	function submitManual() {
		if (manualInput.trim()) {
			dispatch('scan', { barcode: manualInput.trim() });
			manualInput = '';
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') submitManual();
	}
</script>

{#if active}
	<div class="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
		<!-- Header -->
		<div class="absolute top-4 left-4 right-4 flex items-center justify-between">
			<h3 class="text-white font-black text-sm uppercase tracking-widest">Scan Barcode</h3>
			<button on:click={() => dispatch('close')}
				class="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>

		<!-- Camera View -->
		<div class="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-slate-800 mb-4">
			<!-- svelte-ignore a11y-media-has-caption -->
			<video bind:this={videoEl} autoplay playsinline muted class="w-full h-full object-cover"></video>

			<!-- Scan overlay -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="w-48 h-48 border-2 border-white/60 rounded-xl relative">
					<!-- Corner decorations -->
					<div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
					<div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
					<div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
					<div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
					<!-- Scan line animation -->
					{#if scanning}
						<div class="absolute left-0 right-0 h-0.5 bg-blue-400/80 animate-bounce top-1/2"></div>
					{/if}
				</div>
			</div>

			{#if error}
				<div class="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
					<p class="text-red-300 text-sm text-center font-medium">{error}</p>
				</div>
			{/if}

			{#if !supported && !error}
				<div class="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
					<p class="text-yellow-300 text-xs text-center">Browser ini tidak mendukung BarcodeDetector API. Gunakan input manual di bawah.</p>
				</div>
			{/if}
		</div>

		<p class="text-white/50 text-xs mb-4 text-center">
			Arahkan kamera ke barcode produk<br/>
			<span class="text-white/30">(EAN-13, EAN-8, Code 128, QR)</span>
		</p>

		<!-- Manual Input Fallback -->
		<div class="w-full max-w-sm">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={manualInput}
					on:keydown={handleKeydown}
					placeholder="Input barcode manual..."
					class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
					autocomplete="off"
				/>
				<button on:click={submitManual}
					class="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition">
					OK
				</button>
			</div>
		</div>
	</div>
{/if}
