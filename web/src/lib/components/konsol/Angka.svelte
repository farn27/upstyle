<script>
	/** Angka yang "berhitung naik" saat berubah. */
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { gerakMinimal } from './util.js';

	/** @type {{ nilai: number | null | undefined, format?: (n: number) => string }} */
	let { nilai, format = (n) => Math.round(n).toLocaleString('id-ID') } = $props();

	const t = new Tween(0, { duration: gerakMinimal() ? 0 : 1100, easing: cubicOut });
	$effect(() => {
		if (nilai != null && Number.isFinite(nilai)) t.target = nilai;
	});
</script>

<span class="angka">{nilai == null ? '–' : format(t.current)}</span>

<style>
	.angka {
		font-variant-numeric: tabular-nums;
	}
</style>
