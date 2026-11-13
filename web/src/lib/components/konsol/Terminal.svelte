<script>
	/** Umpan log bergaya terminal; baris baru masuk dengan efek ketik. */
	/** @type {{ baris: { id: number, waktu: string, level: string, sumber: string, pesan: string, status?: number | null }[], kosong?: string }} */
	let { baris = [], kosong = 'Tidak ada galat. Sistem tenang ✦' } = $props();
	let filter = $state('semua');
	const tampil = $derived(baris.filter((b) => filter === 'semua' || b.level === filter));
	const LEVEL = /** @type {const} */ (['semua', 'error', 'warn']);
</script>

<div class="term">
	<div class="kepala">
		<span class="lampu"><i></i><i></i><i></i></span>
		<span class="judul">log_sistem — tail -f</span>
		<span class="saring">
			{#each LEVEL as l (l)}
				<button type="button" class:aktif={filter === l} onclick={() => (filter = l)}>{l}</button>
			{/each}
		</span>
	</div>
	<div class="isi">
		{#each tampil as b, i (b.id)}
			<div class={`baris ${b.level}`} style={`animation-delay:${Math.min(i, 20) * 45}ms`}>
				<span class="w">{String(b.waktu).slice(5, 16)}</span>
				<span class="lv">{b.level.toUpperCase()}</span>
				<span class="src">{b.sumber}{b.status ? `:${b.status}` : ''}</span>
				<span class="msg">{b.pesan}</span>
			</div>
		{:else}
			<div class="kosong">{kosong}</div>
		{/each}
		<div class="kursor">▍</div>
	</div>
</div>

<style>
	.term {
		background: rgba(3, 6, 14, 0.85);
		border: 1px solid rgba(140, 170, 255, 0.14);
		border-radius: 12px;
		overflow: hidden;
		font: 11.5px/1.55 var(--f-mono, monospace);
	}
	.kepala {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		background: rgba(140, 170, 255, 0.06);
		border-bottom: 1px solid rgba(140, 170, 255, 0.1);
		color: #8a96b8;
	}
	.lampu {
		display: flex;
		gap: 5px;
	}
	.lampu i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #ff6b8a;
	}
	.lampu i:nth-child(2) {
		background: #ffc65c;
	}
	.lampu i:nth-child(3) {
		background: #7dffa1;
	}
	.judul {
		flex: 1;
	}
	.saring {
		display: flex;
		gap: 4px;
	}
	.saring button {
		background: none;
		border: 1px solid rgba(140, 170, 255, 0.18);
		color: #8a96b8;
		border-radius: 6px;
		padding: 1px 8px;
		font: inherit;
		cursor: pointer;
	}
	.saring button.aktif {
		color: #05070f;
		background: #3ef0d0;
		border-color: #3ef0d0;
	}
	.isi {
		max-height: 330px;
		overflow: auto;
		padding: 8px 12px;
	}
	.baris {
		display: grid;
		grid-template-columns: 92px 46px 90px 1fr;
		gap: 8px;
		white-space: nowrap;
		animation: ketik 0.4s steps(12) both;
	}
	.w {
		color: #5b6688;
	}
	.lv {
		font-weight: 700;
	}
	.error .lv {
		color: #ff6b8a;
	}
	.warn .lv {
		color: #ffc65c;
	}
	.info .lv {
		color: #5aa8ff;
	}
	.src {
		color: #9b8cff;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.msg {
		color: #d5ddf7;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.kosong {
		color: #7dffa1;
		padding: 18px 0;
	}
	.kursor {
		color: #3ef0d0;
		animation: kedip 1s steps(1) infinite;
	}
	@keyframes ketik {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	@keyframes kedip {
		50% {
			opacity: 0;
		}
	}
	@media (max-width: 640px) {
		.baris {
			grid-template-columns: 72px 44px 1fr;
		}
		.src {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.baris,
		.kursor {
			animation: none;
		}
	}
</style>
