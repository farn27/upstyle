<script>
	/**
	 * Halaman tamu (landing page) di "/" — versi sinematik bertema gelap.
	 * Semua gambar & video berasal dari sistem asli (web + aplikasi Android) dengan data contoh.
	 * Motion: aurora bergerak, judul muncul per kata, perangkat miring 3D mengikuti kursor, kartu notifikasi
	 * melayang, kalimat yang "menyala" saat digulir, cerita bertahap dengan layar menempel (sticky), marquee
	 * modul, angka menghitung naik, sorotan cahaya mengikuti kursor, deret HP bergeser mengikuti scroll.
	 * Semua animasi dimatikan bila pengguna memilih "kurangi gerakan".
	 */
	import { onMount, onDestroy } from 'svelte';

	const tahun = new Date().getFullYear();
	let kurangiGerak = false;

	// ── reveal saat masuk layar ────────────────────────────────────────────────
	/** @param {HTMLElement} node @param {{ jeda?: number }} [opsi] */
	function muncul(node, opsi = {}) {
		node.classList.add('lp-reveal');
		if (opsi.jeda) node.style.transitionDelay = `${opsi.jeda}ms`;
		if (typeof IntersectionObserver === 'undefined') { node.classList.add('lp-tampil'); return {}; }
		const io = new IntersectionObserver(
			(es) => es.forEach((e) => { if (e.isIntersecting) { node.classList.add('lp-tampil'); io.disconnect(); } }),
			{ threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	// ── angka menghitung naik ─────────────────────────────────────────────────
	/** @param {HTMLElement} node @param {number} target */
	function hitung(node, target) {
		const io = new IntersectionObserver(([e]) => {
			if (!e.isIntersecting) return;
			io.disconnect();
			if (kurangiGerak) { node.textContent = String(target); return; }
			const mulai = performance.now();
			const langkahHitung = (/** @type {number} */ t) => {
				const p = Math.min(1, (t - mulai) / 1400);
				node.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
				if (p < 1) requestAnimationFrame(langkahHitung);
			};
			requestAnimationFrame(langkahHitung);
		}, { threshold: 0.6 });
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	// ── sorotan cahaya mengikuti kursor (kartu) ────────────────────────────────
	/** @param {HTMLElement} node */
	function sorot(node) {
		const gerak = (/** @type {PointerEvent} */ e) => {
			for (const k of /** @type {NodeListOf<HTMLElement>} */ (node.querySelectorAll('.lp-sorot'))) {
				const r = k.getBoundingClientRect();
				k.style.setProperty('--mx', `${e.clientX - r.left}px`);
				k.style.setProperty('--my', `${e.clientY - r.top}px`);
			}
		};
		node.addEventListener('pointermove', gerak);
		return { destroy: () => node.removeEventListener('pointermove', gerak) };
	}

	let menuTerbuka = false;
	let sudahGulir = false;

	// hero: miring 3D mengikuti kursor + parallax scroll
	let rx = 10, ry = 0, heroScroll = 0;
	/** @param {PointerEvent} e */
	function geserKursor(e) {
		if (kurangiGerak || e.pointerType === 'touch') return;
		const x = e.clientX / window.innerWidth - 0.5;
		const y = e.clientY / window.innerHeight - 0.5;
		ry = x * 10;
		rx = 6 - y * 6;
	}

	// video
	/** @type {HTMLVideoElement} */ let videoWeb;
	/** @type {HTMLVideoElement} */ let videoHp;
	let videoJalan = true;
	function aturVideo() {
		videoJalan = !videoJalan;
		for (const v of [videoWeb, videoHp]) { if (!v) continue; if (videoJalan) v.play().catch(() => {}); else v.pause(); }
	}

	// kalimat yang menyala per kata
	const kalimat = 'Satu sistem untuk menjual, mencatat, dan memahami bisnis Anda — dari kasir di depan sampai laporan di tangan pemilik.';
	const kataKalimat = kalimat.split(' ');
	/** @type {HTMLElement} */ let elKalimat;
	let nyala = 0;

	// cerita bertahap (sticky)
	const langkah = [
		{ no: '01', judul: 'Jual dalam hitungan detik.', isi: 'Ketuk produk, pilih varian, terima tunai, QRIS, atau transfer. Stok berkurang dan kas laci bertambah saat itu juga.', img: '/landing/web-kasir.webp', label: 'Kasir' },
		{ no: '02', judul: 'Setiap rupiah tercatat.', isi: 'Penjualan, pembelian, dan gaji otomatis menjadi jurnal debit–kredit. Tidak ada lagi buku kas yang tertinggal.', img: '/landing/web-riwayat.webp', label: 'Riwayat transaksi' },
		{ no: '03', judul: 'Pantau dari mana saja.', isi: 'Saldo kas, pemasukan, pengeluaran, stok menipis, dan kinerja hari ini — dalam satu dasbor yang selalu terbaru.', img: '/landing/web-dasbor.webp', label: 'Dasbor' },
		{ no: '04', judul: 'Pahami arah bisnis.', isi: 'Tren bulanan, laba rugi, neraca, dan metode bayar terpopuler. Keputusan berdasarkan angka, bukan perkiraan.', img: '/landing/web-laporan.webp', label: 'Laporan' }
	];
	/** @type {HTMLElement} */ let elCerita;
	let langkahAktif = 0;
	let progresCerita = 0;

	// deret HP bergeser
	/** @type {HTMLElement} */ let elDeret;
	let geserDeret = 0;

	// percakapan AI
	const percakapan = [
		{ dari: 'saya', teks: 'jual kopi susu 3 cup tunai' },
		{ dari: 'ai', teks: 'Tercatat ✓ Penjualan Kopi Susu ×3 — Rp54.000 masuk ke Kas Tunai. Jurnal debit–kredit dibuat otomatis.' },
		{ dari: 'saya', teks: 'omzet hari ini berapa?' },
		{ dari: 'ai', teks: 'Omzet hari ini Rp98.000 dari 3 transaksi. Produk terlaris: Roti Bakar Keju.' },
		{ dari: 'saya', teks: 'produk apa yang hampir habis?' },
		{ dari: 'ai', teks: '2 produk menipis: Croissant Cokelat (habis) dan Es Teh Manis (sisa 3). Mau saya buatkan PO ke supplier?' }
	];
	let tampilChat = 0;
	let mengetik = false;
	/** @type {HTMLElement} */ let kotakChat;

	const modul = ['Kasir (POS)', 'Pembukuan otomatis', 'Stok & varian', 'Stok opname', 'Pengadaan & PO', 'HR & absensi', 'Penggajian', 'Portal karyawan', 'CRM & pipeline', 'Penawaran & sales order', 'Toko online', 'Website usaha', 'Laporan WhatsApp', 'Bizgrow AI', 'Multi-cabang', 'Pajak & PPN', 'Tutup buku', 'Piutang & hutang', 'Aset tetap', 'Anggaran', 'Layanan pelanggan', 'Kampanye marketing'];

	const faq = [
		{ t: 'Apakah Bizgrow bisa dipakai gratis?', j: 'Bisa. Paket Free Tier gratis selamanya untuk hingga 3 unit usaha: pencatatan transaksi, manajemen produk, dan laporan keuangan dasar. Upgrade kapan saja bila butuh kasir, HR, dan AI.' },
		{ t: 'Apakah bisa dipakai di HP?', j: 'Bisa. Tersedia aplikasi Android untuk pemilik dan kasir, dan seluruh halaman web juga menyesuaikan layar HP. Data web dan aplikasi selalu sama karena tersimpan di satu server.' },
		{ t: 'Bagaimana kalau internet putus?', j: 'Aplikasi Android menyimpan transaksi yang dicatat saat offline ke antrean, lalu mengirimkannya otomatis begitu koneksi kembali. Statusnya bisa dilihat di menu Sinkronisasi.' },
		{ t: 'Apakah data usaha saya aman?', j: 'Data setiap usaha dipisahkan secara ketat — pengguna lain tidak bisa melihat atau mengubahnya. Kasir masuk dengan PIN, hak akses mengikuti peran (pemilik, manajer, kasir), dan periode yang sudah ditutup buku terkunci dari perubahan.' },
		{ t: 'Saya punya beberapa cabang. Bisa?', j: 'Bisa. Kelola banyak unit usaha dan cabang dari satu akun, masing-masing dengan stok, kasir, karyawan, dan laporan sendiri — lalu lihat ringkasannya dari satu beranda.' },
		{ t: 'Apakah saya perlu paham akuntansi?', j: 'Tidak. Cukup catat penjualan dan pengeluaran seperti biasa (atau ketik ke AI). Bizgrow membuat jurnal, buku besar, laba rugi, dan neraca secara otomatis.' }
	];
	let faqBuka = -1;

	const harga = [
		{ nama: 'Free Tier', harga: 'Rp0', per: 'selamanya', ket: 'Untuk mulai merapikan pembukuan.', fitur: ['Hingga 3 unit usaha', 'Pencatatan pemasukan & pengeluaran', 'Manajemen produk & stok', 'Laporan keuangan dasar', 'Penyimpanan 2 GB'], cta: 'Mulai gratis', unggul: false },
		{ nama: 'Pro Hub', harga: 'Rp149.000', per: '/bulan', ket: 'Untuk usaha yang berjualan setiap hari.', fitur: ['Hingga 10 unit usaha', 'Kasir (POS) web & Android', 'HR, absensi & penggajian', 'Portal karyawan', 'Asisten AI & catat lewat chat', 'Penyimpanan 20 GB'], cta: 'Coba Pro Hub', unggul: true },
		{ nama: 'Enterprise', harga: 'Rp499.000', per: '/bulan', ket: 'Untuk jaringan cabang dan tim besar.', fitur: ['Unit usaha tanpa batas', 'Semua fitur Pro Hub', 'CRM & pipeline penjualan lengkap', 'Portal staf & hak akses per peran', 'Audit log & keamanan', 'Penyimpanan 100 GB'], cta: 'Pilih Enterprise', unggul: false }
	];

	/** @type {(() => void)[]} */ const bersih = [];

	onMount(() => {
		kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (kurangiGerak) { rx = 0; nyala = kataKalimat.length; }

		let antre = false;
		const hitungScroll = () => {
			antre = false;
			const y = window.scrollY;
			const vh = window.innerHeight;
			sudahGulir = y > 8;
			if (kurangiGerak) return;
			heroScroll = Math.min(1, y / (vh * 0.9));
			if (elKalimat) {
				const r = elKalimat.getBoundingClientRect();
				const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.45)));
				nyala = Math.round(p * kataKalimat.length);
			}
			if (elCerita && elCerita.offsetParent !== null) {
				const r = elCerita.getBoundingClientRect();
				const total = r.height - vh;
				const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
				progresCerita = p;
				langkahAktif = Math.min(langkah.length - 1, Math.floor(p * langkah.length * 0.999));
			}
			if (elDeret) {
				const r = elDeret.getBoundingClientRect();
				geserDeret = Math.min(1, Math.max(-1, ((vh - r.top) / (r.height + vh)) * 2 - 1));
			}
		};
		const onScroll = () => { if (!antre) { antre = true; requestAnimationFrame(hitungScroll); } };
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		hitungScroll();
		bersih.push(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); });

		// video hanya berjalan saat terlihat
		for (const v of [videoWeb, videoHp]) {
			if (!v) continue;
			if (kurangiGerak) { v.pause(); videoJalan = false; continue; }
			const io = new IntersectionObserver(([e]) => {
				if (!videoJalan) return;
				if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
			}, { threshold: 0.2 });
			io.observe(v);
			bersih.push(() => io.disconnect());
		}

		// percakapan AI
		if (kotakChat) {
			const io = new IntersectionObserver(([e]) => {
				if (!e.isIntersecting) return;
				io.disconnect();
				if (kurangiGerak) { tampilChat = percakapan.length; return; }
				let i = 0;
				const lanjut = () => {
					if (i >= percakapan.length) return;
					mengetik = percakapan[i].dari === 'ai';
					const t = setTimeout(() => { mengetik = false; tampilChat = ++i; lanjut(); }, mengetik ? 1300 : 650);
					bersih.push(() => clearTimeout(t));
				};
				lanjut();
			}, { threshold: 0.35 });
			io.observe(kotakChat);
			bersih.push(() => io.disconnect());
		}
	});

	onDestroy(() => bersih.forEach((f) => f()));
</script>

<svelte:head>
	<title>Bizgrow — Kasir, Keuangan & ERP untuk UMKM Indonesia</title>
	<meta name="description" content="Bizgrow menyatukan kasir, pembukuan otomatis, stok, karyawan, dan pelanggan dalam satu aplikasi web dan Android — dibantu asisten AI. Mulai gratis." />
	<meta property="og:title" content="Bizgrow — Seluruh bisnis. Satu genggaman." />
	<meta property="og:description" content="Kasir, pembukuan otomatis, stok, karyawan, dan pelanggan dalam satu aplikasi — dibantu AI. Web & Android." />
	<meta property="og:image" content="/landing/web-dasbor.webp" />
	<meta property="og:type" content="website" />
	<meta name="theme-color" content="#000000" />
</svelte:head>

<div class="lp">
	<!-- ═══ NAVIGASI ═══ -->
	<header class="lp-nav {sudahGulir ? 'lp-nav--gulir' : ''}">
		<div class="lp-wrap flex items-center justify-between h-12">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight text-[15px] text-white" aria-label="Bizgrow, beranda">
				<span class="lp-logo">B</span> Bizgrow
			</a>
			<nav class="hidden md:flex items-center gap-7 text-[12px] text-white/70">
				{#each [['#cerita', 'Cara kerja'], ['#modul', 'Modul'], ['#ai', 'AI'], ['#aplikasi', 'Aplikasi'], ['#harga', 'Harga'], ['#faq', 'FAQ']] as [h, l]}
					<a href={h} class="hover:text-white transition-colors">{l}</a>
				{/each}
			</nav>
			<div class="flex items-center gap-2">
				<a href="/auth/login" class="hidden sm:inline text-[12px] text-white/80 hover:text-white px-2">Masuk</a>
				<a href="/auth/register" class="lp-btn lp-btn--kecil">Coba gratis</a>
				<button class="md:hidden p-2 -mr-2 text-white" aria-label="Menu" aria-expanded={menuTerbuka} on:click={() => (menuTerbuka = !menuTerbuka)}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						{#if menuTerbuka}<path d="M6 6l12 12M18 6L6 18" />{:else}<path d="M4 8h16M4 16h16" />{/if}
					</svg>
				</button>
			</div>
		</div>
		{#if menuTerbuka}
			<div class="md:hidden lp-wrap pb-5 flex flex-col text-[20px] font-semibold text-white" role="menu">
				{#each [['#cerita', 'Cara kerja'], ['#modul', 'Modul'], ['#ai', 'Bizgrow AI'], ['#aplikasi', 'Aplikasi'], ['#harga', 'Harga'], ['#faq', 'FAQ'], ['/auth/login', 'Masuk']] as [h, l]}
					<a href={h} class="py-3 border-b border-white/10" on:click={() => (menuTerbuka = false)}>{l}</a>
				{/each}
			</div>
		{/if}
	</header>

	<main>
		<!-- ═══ HERO ═══ -->
		<section class="lp-hero" on:pointermove={geserKursor}>
			<div class="lp-aurora" aria-hidden="true"><i></i><i></i><i></i></div>
			<div class="lp-grid-bg" aria-hidden="true"></div>

			<div class="lp-wrap relative text-center pt-20 md:pt-28" style="transform: translateY({heroScroll * 60}px); opacity: {1 - heroScroll * 0.9}">
				<a href="#ai" class="lp-pil lp-hero-in" style="--d:0ms">
					<span class="lp-pil-baru">Baru</span> Catat transaksi cukup dengan chat ke AI <span aria-hidden="true">›</span>
				</a>
				<h1 class="lp-h1 mt-7">
					{#each ['Seluruh', 'bisnis.'] as k, i}<span class="lp-kata" style="--d:{120 + i * 90}ms">{k}</span>{' '}{/each}<br />
					{#each ['Satu', 'genggaman.'] as k, i}<span class="lp-kata lp-kilau" style="--d:{320 + i * 90}ms">{k}</span>{' '}{/each}
				</h1>
				<p class="lp-lead mx-auto max-w-[640px] lp-hero-in" style="--d:560ms">
					Kasir, pembukuan, stok, karyawan, dan pelanggan — tercatat otomatis, dibantu AI, di web dan Android.
				</p>
				<div class="flex flex-wrap items-center justify-center gap-3 mt-9 lp-hero-in" style="--d:680ms">
					<a href="/auth/register" class="lp-btn lp-btn--besar">Mulai gratis</a>
					<a href="#tur" class="lp-btn lp-btn--kaca lp-btn--besar">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg> Lihat cara kerjanya
					</a>
				</div>
			</div>

			<!-- panggung perangkat -->
			<div class="lp-wrap relative mt-16 md:mt-20 pb-16" id="tur">
				<div class="lp-panggung lp-hero-in" style="--d:820ms">
					<div class="lp-perangkat" style="transform: perspective(1600px) rotateX({rx - heroScroll * 10}deg) rotateY({ry}deg) scale({0.94 + heroScroll * 0.06})">
						<div class="lp-cahaya" aria-hidden="true"></div>
						<div class="lp-laptop">
							<div class="lp-laptop-bar"><i></i><i></i><i></i><span>bizgrow — dasbor, laporan & kasir</span></div>
							<video bind:this={videoWeb} class="block w-full aspect-[16/10] bg-[#0b1020]" autoplay muted loop playsinline preload="metadata"
								poster="/landing/tur-web-poster.webp" aria-label="Video: dasbor, laporan, dan kasir Bizgrow di web">
								<source src="/landing/tur-web.webm" type="video/webm" />
								<source src="/landing/tur-web.mp4" type="video/mp4" />
							</video>
						</div>
						<div class="lp-hp lp-hp--hero">
							<div class="lp-hp-layar">
								<video bind:this={videoHp} autoplay muted loop playsinline preload="metadata" poster="/landing/tur-hp-poster.webp" aria-label="Video: aplikasi Android Bizgrow">
									<source src="/landing/tur-hp.webm" type="video/webm" />
									<source src="/landing/tur-hp.mp4" type="video/mp4" />
								</video>
							</div>
						</div>
						<!-- kartu notifikasi melayang -->
						<div class="lp-notif lp-notif--1" aria-hidden="true"><span class="lp-notif-ik lp-ik-hijau">+</span><div><b>Penjualan Kopi Susu ×3</b><small>+Rp54.000 · Kas Tunai</small></div></div>
						<div class="lp-notif lp-notif--2" aria-hidden="true"><span class="lp-notif-ik lp-ik-ungu">✓</span><div><b>Jurnal tercatat otomatis</b><small>Debit Kas · Kredit Pendapatan</small></div></div>
						<div class="lp-notif lp-notif--3" aria-hidden="true"><span class="lp-notif-ik lp-ik-kuning">!</span><div><b>2 produk stok menipis</b><small>Buat PO ke supplier?</small></div></div>
					</div>
					<button class="lp-putar" on:click={aturVideo} aria-label={videoJalan ? 'Jeda video' : 'Putar video'}>
						{#if videoJalan}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
						{:else}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
						{/if}
					</button>
				</div>
			</div>
		</section>

		<!-- ═══ MARQUEE MODUL ═══ -->
		<section class="py-10 md:py-14 lp-marquee-wrap" aria-label="Daftar modul Bizgrow">
			{#each [0, 1] as baris}
				<div class="lp-marquee {baris === 1 ? 'lp-marquee--balik' : ''}">
					<div class="lp-marquee-isi">
						{#each [...modul.slice(baris * 11, baris * 11 + 11), ...modul.slice(baris * 11, baris * 11 + 11)] as m}
							<span class="lp-chip-m">{m}</span>
						{/each}
					</div>
				</div>
			{/each}
		</section>

		<!-- ═══ KALIMAT MENYALA ═══ -->
		<section class="lp-sec">
			<div class="lp-wrap">
				<p bind:this={elKalimat} class="lp-kalimat">
					{#each kataKalimat as k, i}<span class={i < nyala ? 'lp-nyala' : ''}>{k}</span>{' '}{/each}
				</p>
			</div>
		</section>

		<!-- ═══ ANGKA ═══ -->
		<section class="pb-24 md:pb-32">
			<div class="lp-wrap grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 text-center">
				<div use:muncul><p class="lp-angka"><span use:hitung={22}>0</span>+</p><p class="lp-angka-ket">modul siap pakai</p></div>
				<div use:muncul={{ jeda: 90 }}><p class="lp-angka"><span use:hitung={2}>0</span></p><p class="lp-angka-ket">platform: web & Android</p></div>
				<div use:muncul={{ jeda: 180 }}><p class="lp-angka">1</p><p class="lp-angka-ket">akun untuk semua cabang</p></div>
				<div use:muncul={{ jeda: 270 }}><p class="lp-angka">24/7</p><p class="lp-angka-ket">asisten AI siap ditanya</p></div>
			</div>
		</section>

		<!-- ═══ CERITA BERTAHAP (sticky, desktop) ═══ -->
		<section id="cerita" bind:this={elCerita} class="lp-cerita">
			<div class="lp-cerita-lengket">
				<div class="lp-wrap lp-cerita-grid">
					<div>
						<p class="lp-eyebrow">Cara kerja</p>
						<div class="relative mt-4 min-h-[300px]">
							{#each langkah as l, i}
								<div class="lp-langkah {i === langkahAktif ? 'lp-langkah--aktif' : ''}" aria-hidden={i !== langkahAktif}>
									<p class="text-[15px] font-semibold text-white/40 tabular-nums">{l.no} / 04</p>
									<h2 class="lp-h2 lp-h2--kolom mt-3">{l.judul}</h2>
									<p class="lp-lead lp-lead--kecil">{l.isi}</p>
								</div>
							{/each}
						</div>
						<div class="flex gap-2 mt-8" aria-hidden="true">
							{#each langkah as l, i}
								<span class="lp-titik-progres"><i style="transform: scaleX({Math.min(1, Math.max(0, progresCerita * langkah.length - i))})"></i></span>
							{/each}
						</div>
					</div>
					<div class="lp-cerita-layar">
						<div class="lp-laptop">
							<div class="lp-laptop-bar"><i></i><i></i><i></i><span>{langkah[langkahAktif].label}</span></div>
							<div class="relative aspect-[16/10] bg-[#0b1020]">
								{#each langkah as l, i}
									<img src={l.img} alt={l.label} class="lp-layar-cerita {i === langkahAktif ? 'lp-layar-cerita--aktif' : ''}" loading="lazy" decoding="async" />
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
		<!-- versi HP/tablet: cerita ditumpuk -->
		<section class="lp-cerita-hp" id="cerita-hp">
			<div class="lp-wrap space-y-20">
				{#each langkah as l}
					<div use:muncul>
						<p class="text-[14px] font-semibold text-white/40">{l.no} / 04</p>
						<h2 class="lp-h2 lp-h2--kolom mt-2">{l.judul}</h2>
						<p class="lp-lead lp-lead--kecil">{l.isi}</p>
						<div class="lp-laptop mt-8"><div class="lp-laptop-bar"><i></i><i></i><i></i><span>{l.label}</span></div><img src={l.img} alt={l.label} class="block w-full" loading="lazy" decoding="async" /></div>
					</div>
				{/each}
			</div>
		</section>

		<!-- ═══ BENTO MODUL ═══ -->
		<section class="lp-sec" id="modul">
			<div class="lp-wrap">
				<div class="text-center" use:muncul>
					<p class="lp-eyebrow">Semua modul</p>
					<h2 class="lp-h2">Semua kebutuhan usaha.<br /><span class="text-white/40">Dalam satu tempat.</span></h2>
				</div>
				<div class="lp-bento mt-14" use:sorot>
					<div class="lp-tile lp-sorot lp-tile--lebar" use:muncul>
						<div class="p-7 md:p-9 relative z-[1]">
							<p class="lp-eyebrow">Produk & stok</p>
							<h3 class="lp-h3">Stok selalu akurat.</h3>
							<p class="text-white/55 mt-2 max-w-[440px]">Varian, kategori, harga modal, stok opname, dan peringatan stok menipis — lengkap dengan riwayat setiap perubahan.</p>
						</div>
						<img src="/landing/web-produk.webp" alt="Katalog produk dengan stok dan varian" class="lp-tile-img" loading="lazy" decoding="async" />
					</div>
					<div class="lp-tile lp-sorot" use:muncul={{ jeda: 80 }}>
						<div class="p-7 md:p-9 relative z-[1]">
							<p class="lp-eyebrow">HR & penggajian</p>
							<h3 class="lp-h3">Tim terurus, gaji tepat waktu.</h3>
							<p class="text-white/55 mt-2">Absensi dengan PIN dan lokasi, cuti & lembur, slip gaji, dan payroll yang masuk ke laporan keuangan.</p>
						</div>
						<img src="/landing/web-hr.webp" alt="Dasbor HR pemilik" class="lp-tile-img" loading="lazy" decoding="async" />
					</div>
					<div class="lp-tile lp-sorot" use:muncul>
						<div class="p-7 md:p-9 relative z-[1]">
							<p class="lp-eyebrow">CRM & penjualan</p>
							<h3 class="lp-h3">Setiap peluang terpantau.</h3>
							<p class="text-white/55 mt-2">Pipeline deal, penawaran, sales order, aktivitas, dan target tim penjualan.</p>
						</div>
						<img src="/landing/web-crm.webp" alt="Pipeline penjualan CRM" class="lp-tile-img" loading="lazy" decoding="async" />
					</div>
					<div class="lp-tile lp-sorot lp-tile--lebar lp-tile--ungu" use:muncul={{ jeda: 80 }}>
						<div class="p-7 md:p-9 relative z-[1] h-full flex flex-col justify-between gap-8">
							<div>
								<p class="lp-eyebrow">Laporan otomatis</p>
								<h3 class="lp-h3">Laba rugi, neraca, buku besar —<br class="hidden md:block" /> tanpa menyentuh spreadsheet.</h3>
							</div>
							<div class="grid grid-cols-3 gap-3 text-center">
								{#each [['Laba rugi', 'per bulan / tahun'], ['Neraca', 'seimbang otomatis'], ['Laporan WA', 'dikirim ke WhatsApp']] as [a, b]}
									<div class="rounded-2xl bg-white/[.06] border border-white/10 py-4 px-2"><p class="text-[15px] md:text-[17px] font-semibold text-white">{a}</p><p class="text-[11px] md:text-[12px] text-white/45 mt-1">{b}</p></div>
								{/each}
							</div>
						</div>
					</div>
					{#each [
						{ j: 'Pengadaan', t: 'Purchase order, penerimaan barang, retur, dan tagihan supplier.', ik: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7' },
						{ j: 'Toko online & website', t: 'Katalog publik dan halaman usaha Anda sendiri, tanpa koding.', ik: 'M3 9l1-5h16l1 5M3 9h18M3 9v11h18V9M9 20v-6h6v6' },
						{ j: 'Banyak unit & cabang', t: 'Satu akun untuk semua usaha, tiap cabang dengan datanya sendiri.', ik: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6' },
						{ j: 'Layanan pelanggan', t: 'Tiket keluhan, inbox, dan knowledge base agar jawaban tim seragam.', ik: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z' },
						{ j: 'Marketing', t: 'Kampanye, leads, jadwal media sosial, dan landing page promosi.', ik: 'M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zm13-3a5 5 0 010 8' },
						{ j: 'Pajak & tutup buku', t: 'Rekap PPN per bulan dan kunci periode yang sudah final.', ik: 'M7 11V7a5 5 0 0110 0v4M5 11h14v10H5z' }
					] as k, i}
						<div class="lp-tile lp-sorot lp-tile--kecil" use:muncul={{ jeda: (i % 3) * 80 }}>
							<span class="lp-ikon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d={k.ik} /></svg></span>
							<h3 class="text-[19px] font-semibold tracking-tight mt-5 text-white relative z-[1]">{k.j}</h3>
							<p class="text-[15px] text-white/55 mt-2 leading-relaxed relative z-[1]">{k.t}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ AI ═══ -->
		<section class="lp-ai lp-sec" id="ai">
			<div class="lp-orb" aria-hidden="true"></div>
			<div class="lp-wrap relative grid lg:grid-cols-2 gap-14 items-center">
				<div use:muncul>
					<p class="lp-eyebrow">Bizgrow AI</p>
					<h2 class="lp-h2 lp-h2--kolom text-left">Tanya bisnis Anda.<br /><span class="lp-kilau">Pakai bahasa sehari-hari.</span></h2>
					<p class="lp-lead lp-lead--kecil text-left">Ketik “jual kopi 3 cup” dan transaksinya langsung tercatat. Tanya omzet, stok menipis, piutang jatuh tempo, atau minta saran — AI membaca data usaha Anda sendiri.</p>
					<div class="flex flex-wrap gap-2 mt-8">
						{#each ['Omzet hari ini?', 'Produk stok menipis', 'Cek piutang overdue', 'Laba rugi bulan ini', 'Analisis cash flow'] as c}
							<span class="lp-chip">{c}</span>
						{/each}
					</div>
				</div>
				<div bind:this={kotakChat} class="lp-chat" use:muncul={{ jeda: 120 }} aria-label="Contoh percakapan dengan Bizgrow AI">
					<div class="flex items-center gap-3 pb-4 border-b border-white/10">
						<span class="lp-ai-logo">✦</span>
						<div><b class="text-white text-[15px]">Bizgrow AI</b><p class="text-[12px] text-emerald-300">● Online · membaca data Kedai Kopi Sari</p></div>
					</div>
					<div class="flex flex-col gap-3 pt-5 min-h-[360px]">
						{#each percakapan.slice(0, tampilChat) as m}
							<div class="lp-bubble {m.dari === 'saya' ? 'lp-bubble--saya' : 'lp-bubble--ai'}">{m.teks}</div>
						{/each}
						{#if mengetik}
							<div class="lp-bubble lp-bubble--ai lp-ngetik" aria-label="AI sedang mengetik"><i></i><i></i><i></i></div>
						{/if}
					</div>
					<div class="mt-4 flex items-center gap-2 rounded-full bg-white/[.06] border border-white/10 pl-4 pr-2 py-2 text-[14px] text-white/40" aria-hidden="true">
						Tanya apa saja… <span class="ml-auto w-7 h-7 rounded-full bg-white text-black flex items-center justify-center text-[13px]">↑</span>
					</div>
				</div>
			</div>
		</section>

		<!-- ═══ APLIKASI ANDROID ═══ -->
		<section class="lp-sec overflow-hidden" id="aplikasi">
			<div class="lp-wrap text-center">
				<div use:muncul>
					<p class="lp-eyebrow">Aplikasi Android</p>
					<h2 class="lp-h2">Bisnis Anda,<br />di dalam saku.</h2>
					<p class="lp-lead lp-lead--kecil mx-auto max-w-[620px]">Pantau omzet, jalankan kasir, tutup shift, dan catat pengeluaran dari mana saja.</p>
				</div>
			</div>
			<div class="lp-deret-wadah mt-14">
				<div bind:this={elDeret} class="lp-deret" style="transform: translateX({geserDeret * -6}%)">
					{#each [
						{ src: '/landing/hp-beranda.webp', ket: 'Beranda & AI' },
						{ src: '/landing/hp-dasbor.webp', ket: 'Arus kas' },
						{ src: '/landing/hp-varian.webp', ket: 'Pilih varian' },
						{ src: '/landing/hp-bayar.webp', ket: 'Pembayaran' },
						{ src: '/landing/hp-shift.webp', ket: 'Tutup shift' },
						{ src: '/landing/hp-laporan.webp', ket: 'Laporan' },
						{ src: '/landing/hp-gelap.webp', ket: 'Mode gelap' }
					] as h, i}
						<figure class="lp-deret-item" style="transform: translateY({(i % 2 ? 1 : -1) * geserDeret * 26}px)">
							<div class="lp-hp"><div class="lp-hp-layar"><img src={h.src} alt={h.ket} loading="lazy" decoding="async" /></div></div>
							<figcaption class="text-[13px] text-white/45 mt-4">{h.ket}</figcaption>
						</figure>
					{/each}
				</div>
			</div>
			<div class="lp-wrap grid sm:grid-cols-3 gap-4 mt-16">
				{#each [
					['Tetap mencatat saat offline', 'Transaksi masuk antrean dan terkirim otomatis begitu sinyal kembali.'],
					['Mode gelap', 'Nyaman dipakai di malam hari dan lebih hemat baterai.'],
					['Scan barcode', 'Kamera HP jadi pemindai produk di kasir dan stok opname.']
				] as [j, t], i}
					<div class="lp-kaca p-6 text-left" use:muncul={{ jeda: i * 90 }}>
						<h3 class="text-[17px] font-semibold text-white">{j}</h3>
						<p class="text-[15px] text-white/55 mt-2 leading-relaxed">{t}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- ═══ KEAMANAN ═══ -->
		<section class="lp-sec lp-sec--atas0">
			<div class="lp-wrap">
				<h2 class="lp-h2 text-center" use:muncul>Data usaha Anda,<br /> tetap milik Anda.</h2>
				<div class="grid md:grid-cols-3 gap-4 mt-12" use:sorot>
					{#each [
						{ j: 'Terpisah per usaha', t: 'Setiap unit usaha terisolasi. Pengguna lain tidak bisa membaca atau mengubah data Anda — diperiksa di setiap permintaan.', ik: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z' },
						{ j: 'Akses sesuai peran', t: 'Pemilik, manajer, dan kasir punya hak berbeda. Kasir masuk dengan PIN, otorisasi diskon dan retur butuh persetujuan.', ik: 'M7 11V7a5 5 0 0110 0v4M5 11h14v10H5z' },
						{ j: 'Angka yang bisa dipercaya', t: 'Jurnal selalu seimbang, periode yang ditutup terkunci, dan setiap perubahan stok punya jejak.', ik: 'M9 12l2 2 4-4M5 4h14v16H5z' }
					] as k, i}
						<div class="lp-tile lp-sorot lp-tile--kecil" use:muncul={{ jeda: i * 90 }}>
							<span class="lp-ikon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d={k.ik} /></svg></span>
							<h3 class="text-[19px] font-semibold tracking-tight mt-5 text-white relative z-[1]">{k.j}</h3>
							<p class="text-[15px] text-white/55 mt-2 leading-relaxed relative z-[1]">{k.t}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ HARGA ═══ -->
		<section class="lp-sec" id="harga">
			<div class="lp-wrap">
				<div class="text-center" use:muncul>
					<p class="lp-eyebrow">Harga</p>
					<h2 class="lp-h2">Mulai gratis.<br /> Tumbuh kapan saja.</h2>
					<p class="lp-lead lp-lead--kecil mx-auto max-w-[540px]">Tanpa biaya pemasangan. Ganti paket kapan pun sesuai perkembangan usaha.</p>
				</div>
				<div class="grid md:grid-cols-3 gap-4 mt-12 items-stretch">
					{#each harga as p, i}
						<div class="lp-harga {p.unggul ? 'lp-harga--unggul' : ''}" use:muncul={{ jeda: i * 90 }}>
							{#if p.unggul}<span class="lp-label">Paling populer</span>{/if}
							<h3 class="text-[21px] font-semibold tracking-tight text-white">{p.nama}</h3>
							<p class="text-[14px] text-white/50 mt-1">{p.ket}</p>
							<p class="mt-6 text-white"><span class="text-[42px] font-semibold tracking-tight">{p.harga}</span> <span class="text-[14px] text-white/50">{p.per}</span></p>
							<ul class="mt-6 space-y-3 text-[15px] text-white/80 flex-1">
								{#each p.fitur as f}<li class="flex gap-2.5"><span class="lp-centang" aria-hidden="true">✓</span>{f}</li>{/each}
							</ul>
							<a href="/auth/register" class="lp-btn mt-8 w-full justify-center {p.unggul ? '' : 'lp-btn--kaca'}">{p.cta}</a>
						</div>
					{/each}
				</div>
				<p class="text-center text-[12px] text-white/35 mt-6">Pembayaran langganan diproses dengan aman melalui Midtrans.</p>
			</div>
		</section>

		<!-- ═══ FAQ ═══ -->
		<section class="lp-sec lp-sec--atas0" id="faq">
			<div class="lp-wrap max-w-[820px]">
				<h2 class="lp-h2 text-center" use:muncul>Pertanyaan umum.</h2>
				<div class="mt-10 divide-y divide-white/10 border-y border-white/10">
					{#each faq as f, i}
						<div>
							<button class="w-full flex items-center justify-between gap-6 py-5 text-left text-[17px] md:text-[19px] font-semibold tracking-tight text-white"
								aria-expanded={faqBuka === i} on:click={() => (faqBuka = faqBuka === i ? -1 : i)}>
								{f.t}
								<span class="lp-plus {faqBuka === i ? 'lp-plus--buka' : ''}" aria-hidden="true">+</span>
							</button>
							<div class="lp-faq-isi {faqBuka === i ? 'lp-faq-isi--buka' : ''}">
								<div><p class="pb-6 text-[15px] md:text-[17px] text-white/60 leading-relaxed">{f.j}</p></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ AJAKAN AKHIR ═══ -->
		<section class="lp-akhir">
			<div class="lp-aurora lp-aurora--redup" aria-hidden="true"><i></i><i></i><i></i></div>
			<div class="lp-wrap relative text-center" use:muncul>
				<span class="lp-logo lp-logo--besar mx-auto">B</span>
				<h2 class="lp-h1 lp-h1--akhir mt-8"><span class="lp-kilau">Mulai hari ini.</span></h2>
				<p class="lp-lead mx-auto max-w-[520px]">Daftar dalam satu menit. Gratis selamanya, tanpa kartu kredit.</p>
				<div class="flex flex-wrap items-center justify-center gap-3 mt-9">
					<a href="/auth/register" class="lp-btn lp-btn--besar">Buat akun gratis</a>
					<a href="/auth/login" class="lp-btn lp-btn--kaca lp-btn--besar">Masuk</a>
				</div>
			</div>
		</section>
	</main>

	<footer class="border-t border-white/10 text-[12px] text-white/45">
		<div class="lp-wrap py-10">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-white/10">
				{#each [
					['Produk', [['#cerita', 'Cara kerja'], ['#modul', 'Modul'], ['#ai', 'Bizgrow AI'], ['#aplikasi', 'Aplikasi Android']]],
					['Modul', [['#modul', 'Stok & produk'], ['#modul', 'HR & penggajian'], ['#modul', 'CRM & penjualan'], ['#modul', 'Pengadaan']]],
					['Mulai', [['/auth/register', 'Daftar gratis'], ['/auth/login', 'Masuk'], ['#harga', 'Harga'], ['#faq', 'FAQ']]],
					['Akun', [['/auth/forgot-password', 'Lupa password'], ['#faq', 'Bantuan & FAQ']]]
				] as [judul, tautan]}
					<div>
						<h4 class="font-semibold text-white/80 mb-3">{judul}</h4>
						<ul class="space-y-2">{#each tautan as [h, l]}<li><a href={h} class="hover:text-white">{l}</a></li>{/each}</ul>
					</div>
				{/each}
			</div>
			<div class="pt-6 flex flex-wrap justify-between gap-3">
				<p>Hak cipta © {tahun} Bizgrow. Semua hak dilindungi.</p>
				<p>Dibuat untuk UMKM Indonesia.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	.lp {
		--biru: #2997ff;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		color: #f5f5f7;
		background: #000;
		-webkit-font-smoothing: antialiased;
		letter-spacing: -0.01em;
		overflow-x: clip;
	}
	.lp-wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 22px; }
	.lp-sec { padding: 110px 0; position: relative; }
	@media (min-width: 768px) { .lp-sec { padding: 150px 0; } }
	.lp-sec--atas0 { padding-top: 40px; }

	/* tipografi */
	.lp-eyebrow { display: inline-block; font-size: 15px; font-weight: 600; background: linear-gradient(90deg, #a78bfa, #f0abfc); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 8px; letter-spacing: .01em; }
	.lp-h1 { font-size: clamp(52px, 10.5vw, 128px); line-height: .98; font-weight: 700; letter-spacing: -0.045em; color: #fff; }
	.lp-h1--akhir { font-size: clamp(56px, 11vw, 140px); }
	.lp-h2 { font-size: clamp(38px, 6vw, 76px); line-height: 1.03; font-weight: 700; letter-spacing: -0.035em; color: #fff; }
	.lp-h2--kolom { font-size: clamp(34px, 4.4vw, 56px); }
	.lp-h3 { font-size: clamp(24px, 2.8vw, 34px); line-height: 1.08; font-weight: 700; letter-spacing: -0.028em; color: #fff; }
	.lp-lead { font-size: clamp(19px, 2.2vw, 24px); line-height: 1.42; color: #a1a1a6; margin-top: 22px; font-weight: 500; }
	.lp-lead--kecil { font-size: clamp(17px, 1.8vw, 21px); }
	.lp-kilau {
		background: linear-gradient(100deg, #818cf8 0%, #c084fc 25%, #f472b6 45%, #fbbf24 60%, #818cf8 85%);
		background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
		animation: lp-kilau 8s linear infinite;
	}
	@keyframes lp-kilau { to { background-position: -220% 0; } }

	/* judul per kata */
	.lp-kata { display: inline-block; opacity: 0; transform: translateY(.45em) rotateX(-40deg); filter: blur(10px); animation: lp-kata 1s cubic-bezier(.2, .8, .2, 1) forwards; animation-delay: var(--d); }
	.lp-kata.lp-kilau { animation: lp-kata 1s cubic-bezier(.2, .8, .2, 1) forwards, lp-kilau 8s linear infinite; animation-delay: var(--d), 0s; }
	@keyframes lp-kata { to { opacity: 1; transform: none; filter: none; } }
	.lp-hero-in { opacity: 0; transform: translateY(20px); animation: lp-naik 1s cubic-bezier(.2, .8, .2, 1) forwards; animation-delay: var(--d); }
	@keyframes lp-naik { to { opacity: 1; transform: none; } }

	/* tombol */
	.lp-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #000; font-size: 15px; font-weight: 600; padding: 11px 22px; border-radius: 980px; transition: transform .25s cubic-bezier(.2, .8, .2, 1), background .2s, box-shadow .3s; }
	.lp-btn:hover { transform: scale(1.04); box-shadow: 0 10px 40px -10px rgba(255, 255, 255, .45); }
	.lp-btn:active { transform: scale(.97); }
	.lp-btn--besar { font-size: 17px; padding: 14px 28px; }
	.lp-btn--kecil { font-size: 12px; padding: 5px 13px; }
	.lp-btn--kaca { background: rgba(255, 255, 255, .08); color: #fff; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .16); backdrop-filter: blur(16px); }
	.lp-btn--kaca:hover { background: rgba(255, 255, 255, .14); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25); }

	/* navigasi */
	.lp-nav { position: sticky; top: 0; z-index: 60; background: rgba(0, 0, 0, .5); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); transition: background .3s, box-shadow .3s; }
	.lp-nav--gulir { background: rgba(10, 10, 14, .78); box-shadow: 0 1px 0 rgba(255, 255, 255, .08); }
	.lp-logo { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 7px; background: linear-gradient(135deg, #6366f1, #c026d3); color: #fff; font-size: 13px; font-weight: 800; }
	.lp-logo--besar { display: flex; width: 84px; height: 84px; border-radius: 24px; font-size: 42px; box-shadow: 0 0 0 1px rgba(255, 255, 255, .15), 0 30px 80px -10px rgba(168, 85, 247, .7); }

	/* hero */
	.lp-hero { position: relative; overflow: hidden; }
	.lp-aurora { position: absolute; inset: -20% -10% auto; height: 120%; pointer-events: none; filter: blur(90px) saturate(140%); opacity: .75; }
	.lp-aurora i { position: absolute; border-radius: 50%; mix-blend-mode: screen; animation: lp-melayang 18s ease-in-out infinite alternate; }
	.lp-aurora i:nth-child(1) { width: 55vw; height: 55vw; left: 5%; top: 0; background: radial-gradient(circle, #4f46e5 0%, transparent 65%); }
	.lp-aurora i:nth-child(2) { width: 45vw; height: 45vw; right: 0; top: 8%; background: radial-gradient(circle, #c026d3 0%, transparent 65%); animation-duration: 22s; animation-delay: -6s; }
	.lp-aurora i:nth-child(3) { width: 40vw; height: 40vw; left: 30%; top: 35%; background: radial-gradient(circle, #0ea5e9 0%, transparent 65%); animation-duration: 26s; animation-delay: -12s; opacity: .7; }
	.lp-aurora--redup { opacity: .45; inset: 0; height: 100%; }
	@keyframes lp-melayang { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(6vw, 4vh) scale(1.15); } 100% { transform: translate(-5vw, -3vh) scale(.95); } }
	.lp-grid-bg { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(255, 255, 255, .045) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .045) 1px, transparent 1px); background-size: 64px 64px; mask-image: radial-gradient(ellipse 70% 55% at 50% 30%, #000 30%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 30%, #000 30%, transparent 75%); }
	.lp-pil { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255, 255, 255, .85); padding: 6px 14px 6px 6px; border-radius: 999px; background: rgba(255, 255, 255, .06); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14); backdrop-filter: blur(12px); transition: background .2s; }
	.lp-pil:hover { background: rgba(255, 255, 255, .1); }
	.lp-pil-baru { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: linear-gradient(90deg, #6366f1, #d946ef); color: #fff; }

	.lp-panggung { position: relative; }
	.lp-perangkat { position: relative; transform-style: preserve-3d; transition: transform .6s cubic-bezier(.2, .8, .2, 1); will-change: transform; }
	.lp-cahaya { position: absolute; inset: 8% 5% -6%; background: radial-gradient(ellipse at 50% 60%, rgba(129, 140, 248, .55), rgba(192, 38, 211, .25) 45%, transparent 70%); filter: blur(60px); z-index: -1; }
	.lp-laptop { position: relative; border-radius: 16px; overflow: hidden; background: #0b1020; box-shadow: 0 0 0 1px rgba(255, 255, 255, .12), 0 50px 120px -30px rgba(0, 0, 0, .9); }
	.lp-laptop-bar { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; background: #16181f; border-bottom: 1px solid rgba(255, 255, 255, .06); }
	.lp-laptop-bar i { width: 10px; height: 10px; border-radius: 50%; background: #ff5f57; }
	.lp-laptop-bar i:nth-child(2) { background: #febc2e; }
	.lp-laptop-bar i:nth-child(3) { background: #28c840; }
	.lp-laptop-bar span { flex: 1; text-align: center; font-size: 11px; color: rgba(255, 255, 255, .4); margin-right: 40px; }
	.lp-putar { position: absolute; right: 18px; bottom: 26px; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, .12); color: #fff; backdrop-filter: blur(14px); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18); z-index: 5; }

	.lp-hp { width: 100%; max-width: 250px; border-radius: 42px; padding: 9px; background: linear-gradient(145deg, #3a3a40, #121214); box-shadow: 0 0 0 1px rgba(255, 255, 255, .14), 0 40px 80px -20px rgba(0, 0, 0, .9); }
	.lp-hp-layar { position: relative; aspect-ratio: 1179 / 2556; border-radius: 34px; overflow: hidden; background: #f5f5f7; }
	.lp-hp-layar img, .lp-hp-layar video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; }
	.lp-hp--hero { position: absolute; right: -3%; bottom: -8%; width: 23%; min-width: 118px; max-width: 250px; transform: translateZ(60px); }
	@media (max-width: 640px) {
		.lp-hp--hero { right: -6px; width: 31%; border-radius: 22px; padding: 5px; }
		.lp-hp--hero .lp-hp-layar { border-radius: 18px; }
	}

	/* kartu notifikasi melayang */
	.lp-notif { position: absolute; display: flex; align-items: center; gap: 10px; padding: 10px 14px 10px 10px; border-radius: 16px; background: rgba(22, 22, 30, .72); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14), 0 20px 40px -12px rgba(0, 0, 0, .7); color: #fff; font-size: 13px; line-height: 1.25; animation: lp-naik 1s cubic-bezier(.2, .8, .2, 1) both, lp-apung 6s ease-in-out infinite; white-space: nowrap; opacity: 0; transform: translateY(20px); }
	.lp-notif b { display: block; font-weight: 600; }
	.lp-notif small { display: block; font-size: 11.5px; color: rgba(255, 255, 255, .55); margin-top: 2px; }
	.lp-notif-ik { flex-shrink: 0; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
	.lp-ik-hijau { background: rgba(16, 185, 129, .22); color: #6ee7b7; }
	.lp-ik-ungu { background: rgba(99, 102, 241, .3); color: #c7d2fe; }
	.lp-ik-kuning { background: rgba(245, 158, 11, .22); color: #fcd34d; }
	.lp-notif--1 { left: -4%; top: 18%; animation-delay: 1.3s, 0s; }
	.lp-notif--2 { left: 6%; bottom: 10%; animation-delay: 1.6s, -2s; }
	.lp-notif--3 { right: 14%; top: -5%; animation-delay: 1.9s, -4s; }
	@keyframes lp-apung { 0%, 100% { translate: 0 0; } 50% { translate: 0 -12px; } }
	@media (max-width: 767px) {
		.lp-notif { font-size: 11px; padding: 7px 10px 7px 7px; border-radius: 12px; }
		.lp-notif small { display: none; }
		.lp-notif-ik { width: 22px; height: 22px; font-size: 12px; border-radius: 7px; }
		.lp-notif--1 { left: -2px; top: 6%; }
		.lp-notif--2 { left: 2%; bottom: 4%; }
		.lp-notif--3 { display: none; }
	}

	/* marquee */
	.lp-marquee-wrap { display: grid; gap: 14px; mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
	.lp-marquee { overflow: hidden; }
	.lp-marquee-isi { display: flex; gap: 12px; width: max-content; animation: lp-marquee 48s linear infinite; }
	.lp-marquee--balik .lp-marquee-isi { animation-direction: reverse; animation-duration: 56s; }
	@keyframes lp-marquee { to { transform: translateX(-50%); } }
	.lp-chip-m { font-size: 15px; font-weight: 500; padding: 10px 18px; border-radius: 999px; color: rgba(255, 255, 255, .78); background: rgba(255, 255, 255, .05); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); white-space: nowrap; }

	/* kalimat menyala */
	.lp-kalimat { font-size: clamp(30px, 4.6vw, 58px); line-height: 1.15; font-weight: 700; letter-spacing: -0.03em; text-align: center; max-width: 980px; margin: 0 auto; }
	.lp-kalimat span { color: rgba(255, 255, 255, .16); transition: color .5s ease; }
	.lp-kalimat span.lp-nyala { color: #fff; }

	/* angka */
	.lp-angka { font-size: clamp(48px, 7vw, 84px); font-weight: 700; letter-spacing: -0.04em; line-height: 1; background: linear-gradient(180deg, #fff 30%, rgba(255, 255, 255, .45)); -webkit-background-clip: text; background-clip: text; color: transparent; font-variant-numeric: tabular-nums; }
	.lp-angka-ket { font-size: 15px; color: rgba(255, 255, 255, .5); margin-top: 10px; }

	/* cerita sticky (desktop) */
	.lp-cerita { display: none; position: relative; height: 420vh; }
	.lp-cerita-hp { padding: 40px 0 60px; }
	@media (min-width: 1024px) {
		.lp-cerita { display: block; }
		.lp-cerita-hp { display: none; }
	}
	.lp-cerita-lengket { position: sticky; top: 0; height: 100vh; display: flex; align-items: center; }
	.lp-cerita-grid { display: grid; grid-template-columns: .85fr 1.4fr; gap: 56px; align-items: center; }
	.lp-langkah { position: absolute; inset: 0; opacity: 0; transform: translateY(28px); transition: opacity .6s ease, transform .7s cubic-bezier(.2, .8, .2, 1); pointer-events: none; }
	.lp-langkah--aktif { opacity: 1; transform: none; pointer-events: auto; }
	.lp-titik-progres { flex: 1; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, .12); overflow: hidden; }
	.lp-titik-progres i { display: block; height: 100%; background: linear-gradient(90deg, #818cf8, #e879f9); transform-origin: left; }
	.lp-layar-cerita { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; opacity: 0; transform: scale(1.04); transition: opacity .7s ease, transform 1.1s cubic-bezier(.2, .8, .2, 1); }
	.lp-layar-cerita--aktif { opacity: 1; transform: none; }
	.lp-cerita-layar { position: relative; }
	.lp-cerita-layar::before { content: ''; position: absolute; inset: 10% 5%; background: radial-gradient(ellipse, rgba(99, 102, 241, .45), transparent 70%); filter: blur(60px); z-index: -1; }

	/* bento */
	.lp-bento { display: grid; gap: 16px; grid-template-columns: 1fr; }
	@media (min-width: 768px) { .lp-bento { grid-template-columns: repeat(3, 1fr); } .lp-tile--lebar { grid-column: span 2; } }
	.lp-tile { position: relative; border-radius: 28px; background: linear-gradient(180deg, rgba(255, 255, 255, .06), rgba(255, 255, 255, .025)); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .09); overflow: hidden; display: flex; flex-direction: column; isolation: isolate; }
	.lp-tile--kecil { padding: 30px; }
	.lp-tile--ungu { background: radial-gradient(120% 120% at 100% 0%, rgba(168, 85, 247, .25), transparent 55%), linear-gradient(180deg, rgba(255, 255, 255, .06), rgba(255, 255, 255, .02)); }
	.lp-sorot::before { content: ''; position: absolute; inset: 0; z-index: 0; opacity: 0; transition: opacity .4s; background: radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%), rgba(167, 139, 250, .16), transparent 45%); pointer-events: none; }
	.lp-sorot:hover::before { opacity: 1; }
	.lp-tile-img { position: relative; z-index: 1; display: block; width: 92%; margin: auto 0 0 auto; border-top-left-radius: 14px; box-shadow: 0 0 0 1px rgba(255, 255, 255, .1), -20px -10px 50px -20px rgba(0, 0, 0, .8); transition: transform .9s cubic-bezier(.2, .8, .2, 1); }
	.lp-tile:hover .lp-tile-img { transform: translate(-8px, -8px) scale(1.01); }
	.lp-ikon { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, rgba(99, 102, 241, .35), rgba(217, 70, 239, .3)); color: #fff; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .15); }
	.lp-kaca { border-radius: 22px; background: rgba(255, 255, 255, .045); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .09); }

	/* AI */
	.lp-ai { overflow: hidden; }
	.lp-orb { position: absolute; width: 900px; height: 900px; right: -300px; top: 50%; transform: translateY(-50%); background: radial-gradient(circle, rgba(147, 51, 234, .35), rgba(79, 70, 229, .15) 40%, transparent 70%); filter: blur(40px); animation: lp-denyut 8s ease-in-out infinite; pointer-events: none; }
	@keyframes lp-denyut { 50% { transform: translateY(-50%) scale(1.12); opacity: .8; } }
	.lp-chip { font-size: 13px; padding: 8px 14px; border-radius: 999px; background: rgba(255, 255, 255, .06); color: #e5e5ea; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .12); }
	.lp-chat { position: relative; border-radius: 30px; padding: 22px; background: rgba(20, 18, 32, .7); backdrop-filter: blur(24px); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .12), 0 50px 100px -30px rgba(147, 51, 234, .55); }
	.lp-ai-logo { width: 40px; height: 40px; border-radius: 13px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #d946ef); color: #fff; font-size: 18px; box-shadow: 0 8px 24px -6px rgba(217, 70, 239, .7); }
	.lp-bubble { max-width: 86%; padding: 11px 15px; border-radius: 20px; font-size: 15px; line-height: 1.45; animation: lp-gelembung .45s cubic-bezier(.2, .8, .2, 1); }
	.lp-bubble--saya { align-self: flex-end; background: var(--biru); color: #fff; border-bottom-right-radius: 6px; }
	.lp-bubble--ai { align-self: flex-start; background: rgba(255, 255, 255, .09); color: #f5f5f7; border-bottom-left-radius: 6px; }
	@keyframes lp-gelembung { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
	.lp-ngetik { display: flex; gap: 4px; padding: 15px 16px; }
	.lp-ngetik i { width: 7px; height: 7px; border-radius: 50%; background: #c7c7cc; animation: lp-titik 1s infinite ease-in-out; }
	.lp-ngetik i:nth-child(2) { animation-delay: .15s; }
	.lp-ngetik i:nth-child(3) { animation-delay: .3s; }
	@keyframes lp-titik { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }

	/* deret HP */
	.lp-deret-wadah { overflow-x: auto; scrollbar-width: none; }
	.lp-deret-wadah::-webkit-scrollbar { display: none; }
	.lp-deret { display: flex; gap: 26px; width: max-content; margin: 0 auto; padding: 30px 22px; transition: transform .2s linear; will-change: transform; }
	.lp-deret-item { flex: 0 0 190px; display: flex; flex-direction: column; align-items: center; transition: transform .2s linear; }
	@media (min-width: 900px) { .lp-deret-item { flex-basis: 220px; } }

	/* harga */
	.lp-harga { position: relative; display: flex; flex-direction: column; border-radius: 28px; padding: 34px; background: rgba(255, 255, 255, .045); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .09); }
	.lp-harga--unggul { background: linear-gradient(#0d0b18, #0d0b18) padding-box, linear-gradient(135deg, #818cf8, #e879f9, #fbbf24) border-box; border: 1.5px solid transparent; box-shadow: 0 40px 90px -30px rgba(168, 85, 247, .6); }
	.lp-label { position: absolute; top: 18px; right: 18px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: linear-gradient(90deg, #6366f1, #d946ef); color: #fff; }
	.lp-centang { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: rgba(129, 140, 248, .2); color: #c7d2fe; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 2px; }

	/* FAQ */
	.lp-plus { flex-shrink: 0; font-size: 26px; font-weight: 300; color: rgba(255, 255, 255, .5); transition: transform .3s; }
	.lp-plus--buka { transform: rotate(45deg); }
	.lp-faq-isi { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s ease; }
	.lp-faq-isi > div { overflow: hidden; }
	.lp-faq-isi--buka { grid-template-rows: 1fr; }

	/* ajakan akhir */
	.lp-akhir { position: relative; overflow: hidden; padding: 140px 0 160px; }

	/* reveal */
	:global(.lp-reveal) { opacity: 0; transform: translateY(40px) scale(.98); transition: opacity 1s cubic-bezier(.2, .8, .2, 1), transform 1s cubic-bezier(.2, .8, .2, 1); }
	:global(.lp-reveal.lp-tampil) { opacity: 1; transform: none; }

	@media (prefers-reduced-motion: reduce) {
		.lp-kata, .lp-hero-in, .lp-bubble, .lp-notif { animation: none !important; opacity: 1; transform: none; filter: none; }
		.lp-kilau, .lp-aurora i, .lp-marquee-isi, .lp-orb { animation: none !important; }
		:global(.lp-reveal) { opacity: 1 !important; transform: none !important; transition: none !important; }
		.lp-perangkat, .lp-deret, .lp-deret-item, .lp-layar-cerita, .lp-langkah { transition: none; }
	}
</style>
