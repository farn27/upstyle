/**
 * Tabel lebar → kartu di layar HP (opsi umum untuk semua halaman aplikasi).
 *
 * Banyak halaman memakai <table> 6–9 kolom di dalam `overflow-x-auto`/`overflow-hidden`; di HP kolom
 * kanan terpotong (kadang tidak bisa digeser sama sekali). Action ini dipasang sekali di layout:
 * setiap tabel yang lebih lebar dari wadahnya di layar < 768px diberi kelas `tabel-kartu` dan setiap
 * sel diberi `data-label` dari judul kolomnya, lalu CSS (app.css) menampilkan tiap baris sebagai kartu.
 * Tabel yang muat, layar desktop, dan tabel bertanda `data-tabel-biasa` tidak disentuh.
 */
const BATAS = 767;

/** @param {HTMLTableElement} tabel */
function labeli(tabel) {
	const judul = [...tabel.querySelectorAll('thead th')].map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim());
	if (!judul.length) return false;
	for (const tr of tabel.querySelectorAll('tbody tr, tfoot tr')) {
		let kolom = 0;
		for (const td of /** @type {NodeListOf<HTMLTableCellElement>} */ (tr.querySelectorAll(':scope > td, :scope > th'))) {
			if (!td.hasAttribute('data-label')) td.setAttribute('data-label', td.colSpan > 1 ? '' : judul[kolom] || '');
			kolom += td.colSpan || 1;
		}
	}
	return true;
}

/** @param {HTMLElement} akar */
function periksa(akar) {
	const hp = window.innerWidth <= BATAS;
	for (const tabel of /** @type {NodeListOf<HTMLTableElement>} */ (akar.querySelectorAll('table'))) {
		if (tabel.hasAttribute('data-tabel-biasa') || tabel.closest('[data-tabel-biasa]')) continue;
		if (!hp) { tabel.classList.remove('tabel-kartu'); continue; }
		if (tabel.classList.contains('tabel-kartu')) { labeli(tabel); continue; }
		const wadah = tabel.parentElement;
		if (!wadah || tabel.offsetParent === null) continue; // tersembunyi (mis. hidden md:block)
		if (tabel.scrollWidth > wadah.clientWidth + 8 && labeli(tabel)) tabel.classList.add('tabel-kartu');
	}
}

/** @param {HTMLElement} node */
export function tabelHp(node) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let t;
	const jadwal = () => { clearTimeout(t); t = setTimeout(() => periksa(node), 120); };
	const amati = new MutationObserver(jadwal);
	amati.observe(node, { childList: true, subtree: true });
	window.addEventListener('resize', jadwal);
	jadwal();
	return {
		destroy() {
			clearTimeout(t);
			amati.disconnect();
			window.removeEventListener('resize', jadwal);
		}
	};
}
