<script>
	/** Ilustrasi satelit melayang — untuk keadaan kosong / memuat. */
	/** @type {{ teks?: string, kecil?: boolean }} */
	let { teks = 'Menunggu sinyal…', kecil = false } = $props();
</script>

<div class="satelit" class:kecil>
	<svg viewBox="0 0 200 140" aria-hidden="true">
		<defs>
			<linearGradient id="sat-panel" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#5aa8ff" />
				<stop offset="100%" stop-color="#9b8cff" />
			</linearGradient>
		</defs>
		<g class="gelombang">
			<path d="M128 40 q14 -14 28 0" />
			<path d="M122 32 q20 -22 40 0" />
			<path d="M116 24 q26 -30 52 0" />
		</g>
		<g class="badan-sat">
			<rect x="30" y="58" width="44" height="22" rx="3" fill="url(#sat-panel)" opacity="0.85" />
			<path d="M41 58v22M52 58v22M63 58v22" stroke="#0b1226" stroke-width="1.5" />
			<rect x="126" y="58" width="44" height="22" rx="3" fill="url(#sat-panel)" opacity="0.85" />
			<path d="M137 58v22M148 58v22M159 58v22" stroke="#0b1226" stroke-width="1.5" />
			<path d="M74 69h16M110 69h16" stroke="#8a96b8" stroke-width="2" />
			<rect x="88" y="54" width="24" height="30" rx="6" fill="#10183a" stroke="#3ef0d0" stroke-width="1.5" />
			<circle cx="100" cy="64" r="4" fill="#3ef0d0" class="led" />
			<path d="M100 54 v-10" stroke="#8a96b8" stroke-width="1.5" />
			<circle cx="100" cy="42" r="3" fill="#ffc65c" />
		</g>
	</svg>
	<p>{teks}</p>
</div>

<style>
	.satelit {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 28px 0;
		color: #8a96b8;
		font-size: 13px;
	}
	.satelit.kecil {
		padding: 10px 0;
	}
	svg {
		width: 180px;
	}
	.kecil svg {
		width: 110px;
	}
	.badan-sat {
		animation: melayang 5s ease-in-out infinite;
		transform-origin: 100px 70px;
	}
	.gelombang path {
		fill: none;
		stroke: #3ef0d0;
		stroke-width: 1.5;
		stroke-linecap: round;
		opacity: 0;
		animation: pancar 2.4s ease-out infinite;
	}
	.gelombang path:nth-child(2) {
		animation-delay: 0.4s;
	}
	.gelombang path:nth-child(3) {
		animation-delay: 0.8s;
	}
	.led {
		animation: kedip 1.4s ease-in-out infinite;
	}
	p {
		margin: 0;
	}
	@keyframes melayang {
		50% {
			transform: translateY(-6px) rotate(-3deg);
		}
	}
	@keyframes pancar {
		0% {
			opacity: 0;
		}
		30% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes kedip {
		50% {
			opacity: 0.3;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.badan-sat,
		.gelombang path,
		.led {
			animation: none;
			opacity: 1;
		}
	}
</style>
