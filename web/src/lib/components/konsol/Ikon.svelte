<script>
	/** Glif garis untuk tiap "stasiun" Ruang Kendali; bergerak halus saat aktif. */
	/** @type {{ nama: string, ukuran?: number, aktif?: boolean }} */
	let { nama, ukuran = 22, aktif = false } = $props();
</script>

<svg width={ukuran} height={ukuran} viewBox="0 0 24 24" class:aktif aria-hidden="true">
	{#if nama === 'orbit'}
		<circle cx="12" cy="12" r="3" />
		<ellipse cx="12" cy="12" rx="10" ry="4.5" class="o1" />
		<circle cx="21.5" cy="12" r="1.4" class="isi o1" />
	{:else if nama === 'denyut'}
		<path d="M2 12h4l2-6 4 12 3-9 2 3h5" class="tarik" />
	{:else if nama === 'neuron'}
		<circle cx="12" cy="12" r="2.6" />
		<circle cx="4.5" cy="6" r="1.6" /><circle cx="19.5" cy="6" r="1.6" /><circle cx="4.5" cy="18" r="1.6" /><circle cx="19.5" cy="18" r="1.6" />
		<path d="M10 10.5 5.8 7M14 10.5 18.2 7M10 13.5 5.8 17M14 13.5 18.2 17" class="nadi" />
	{:else if nama === 'tenant'}
		<circle cx="6" cy="7" r="2" /><circle cx="18" cy="6" r="1.5" /><circle cx="14" cy="17" r="2.4" /><circle cx="5" cy="17" r="1.3" />
		<path d="M7.8 7.6 16.5 6.4M6.9 8.8 13 15.2M7 16.8h4.6M17.2 7.4 15 14.8" class="nadi" />
	{:else if nama === 'riset'}
		<path d="M4 15 15 6l3 4-11 9z" />
		<path d="M10 17l-2 5M12 15.5l3 6.5" />
		<circle cx="19.5" cy="5" r="1" class="isi kelip" />
	{:else if nama === 'jejak'}
		<ellipse cx="7.5" cy="16" rx="2.6" ry="4" transform="rotate(-14 7.5 16)" />
		<circle cx="5.6" cy="10.4" r="0.9" class="isi" /><circle cx="8.4" cy="10" r="0.9" class="isi" />
		<g class="o2">
			<ellipse cx="16.5" cy="9" rx="2.6" ry="4" transform="rotate(14 16.5 9)" />
			<circle cx="15.6" cy="3.4" r="0.9" class="isi" /><circle cx="18.4" cy="3.8" r="0.9" class="isi" />
		</g>
	{/if}
</svg>

<style>
	svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		overflow: visible;
	}
	.isi {
		fill: currentColor;
		stroke: none;
	}
	.aktif .o1 {
		transform-origin: 12px 12px;
		animation: putar 3s linear infinite;
	}
	.aktif .tarik {
		stroke-dasharray: 40;
		animation: tarik 1.6s ease-in-out infinite;
	}
	.aktif .nadi {
		stroke-dasharray: 2 2;
		animation: alir 0.8s linear infinite;
	}
	.aktif .kelip {
		animation: kelip 1.2s ease-in-out infinite;
	}
	.aktif .o2 {
		animation: langkah 1.4s ease-in-out infinite;
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes tarik {
		from {
			stroke-dashoffset: 40;
		}
		to {
			stroke-dashoffset: -40;
		}
	}
	@keyframes alir {
		to {
			stroke-dashoffset: -4;
		}
	}
	@keyframes kelip {
		50% {
			opacity: 0.2;
		}
	}
	@keyframes langkah {
		50% {
			transform: translateY(-1.5px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.aktif * {
			animation: none !important;
		}
	}
</style>
