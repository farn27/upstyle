<script>
	/**
	 * Halaman tamu (landing page) di "/" untuk pengunjung yang belum masuk.
	 * Semua gambar & video diambil dari sistem asli (web + aplikasi Android) dengan data contoh.
	 * Motion: reveal saat menggulir, panggung hero membesar mengikuti scroll, video tur otomatis
	 * (berhenti saat tidak terlihat), slideshow layar HP, dan percakapan AI yang "mengetik".
	 * Semua animasi dimatikan bila pengguna memilih "kurangi gerakan".
	 */
	import { onMount, onDestroy } from 'svelte';

	const tahun = new Date().getFullYear();

	// ── reveal saat elemen masuk layar ─────────────────────────────────────────
	/** @param {HTMLElement} node @param {{ jeda?: number }} [opsi] */
	function muncul(node, opsi = {}) {
		node.classList.add('lp-reveal');
		if (opsi.jeda) node.style.transitionDelay = `${opsi.jeda}ms`;
		if (typeof IntersectionObserver === 'undefined') { node.classList.add('lp-tampil'); return {}; }
		const io = new IntersectionObserver(
			(es) => es.forEach((e) => { if (e.isIntersecting) { node.classList.add('lp-tampil'); io.disconnect(); } }),
			{ threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	// ── navigasi lokal: latar menebal setelah menggulir ────────────────────────
	let sudahGulir = false;
	let menuTerbuka = false;

	// ── panggung hero: membesar & tegak mengikuti scroll (gaya halaman produk) ──
	/** @type {HTMLElement} */ let panggung;
	let skala = 0.9;
	let miring = 8;

	// ── video tur: putar hanya saat terlihat ─────────────────────────────────
	/** @type {HTMLVideoElement} */ let video;
	let videoJalan = true;
	function aturVideo() {
		if (!video) return;
		if (video.paused) { video.play().catch(() => {}); videoJalan = true; }
		else { video.pause(); videoJalan = false; }
	}

	// ── slideshow layar aplikasi HP ───────────────────────────────────────────
	const layarHp = [
		{ src: '/landing/hp-beranda.webp', alt: 'Beranda aplikasi Bizgrow: ringkasan bisnis dan asisten AI' },
		{ src: '/landing/hp-dasbor.webp', alt: 'Dasbor unit: arus kas bersih, pemasukan, dan pengeluaran' },
		{ src: '/landing/hp-kasir.webp', alt: 'Kasir di aplikasi Android' },
		{ src: '/landing/hp-laporan.webp', alt: 'Laporan keuangan di aplikasi Android' }
	];
	let slide = 0;

	// ── percakapan AI yang muncul bertahap ───────────────────────────────────
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

	// ── FAQ ─────────────────────────────────────────────────────────────────
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
		{ nama: 'Pro Hub', harga: 'Rp149.000', per: '/bulan', ket: 'Untuk usaha yang mulai berjualan setiap hari.', fitur: ['Hingga 10 unit usaha', 'Kasir (POS) web & Android', 'HR, absensi & penggajian', 'Portal karyawan', 'Asisten AI & catat lewat chat', 'Penyimpanan 20 GB'], cta: 'Coba Pro Hub', unggul: true },
		{ nama: 'Enterprise', harga: 'Rp499.000', per: '/bulan', ket: 'Untuk jaringan cabang dan tim besar.', fitur: ['Unit usaha tanpa batas', 'Semua fitur Pro Hub', 'CRM & pipeline penjualan lengkap', 'Portal staf & hak akses per peran', 'Audit log & keamanan', 'Penyimpanan 100 GB'], cta: 'Pilih Enterprise', unggul: false }
	];

	/** @type {ReturnType<typeof setInterval> | undefined} */ let timerSlide;
	/** @type {(() => void)[]} */ const bersih = [];

	onMount(() => {
		const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const onScroll = () => {
			sudahGulir = window.scrollY > 8;
			if (kurangiGerak || !panggung) { skala = 1; miring = 0; return; }
			const r = panggung.getBoundingClientRect();
			const vh = window.innerHeight;
			// 0 saat panggung baru masuk layar → 1 saat bagian atasnya mencapai 15% layar
			const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
			skala = 0.9 + 0.1 * p;
			miring = 8 * (1 - p);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		bersih.push(() => window.removeEventListener('scroll', onScroll));

		if (video) {
			if (kurangiGerak) { video.pause(); videoJalan = false; }
			const ioV = new IntersectionObserver(([e]) => {
				if (!videoJalan) return;
				if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
			}, { threshold: 0.25 });
			ioV.observe(video);
			bersih.push(() => ioV.disconnect());
		}

		if (!kurangiGerak) timerSlide = setInterval(() => (slide = (slide + 1) % layarHp.length), 3200);

		if (kotakChat) {
			const ioC = new IntersectionObserver(([e]) => {
				if (!e.isIntersecting) return;
				ioC.disconnect();
				if (kurangiGerak) { tampilChat = percakapan.length; return; }
				let i = 0;
				const lanjut = () => {
					if (i >= percakapan.length) return;
					const ai = percakapan[i].dari === 'ai';
					mengetik = ai;
					const t = setTimeout(() => { mengetik = false; tampilChat = ++i; lanjut(); }, ai ? 1300 : 650);
					bersih.push(() => clearTimeout(t));
				};
				lanjut();
			}, { threshold: 0.35 });
			ioC.observe(kotakChat);
			bersih.push(() => ioC.disconnect());
		}
	});

	onDestroy(() => {
		clearInterval(timerSlide);
		bersih.forEach((f) => f());
	});
</script>

<svelte:head>
	<title>Bizgrow — Kasir, Keuangan & ERP untuk UMKM Indonesia</title>
	<meta name="description" content="Bizgrow menyatukan kasir, pembukuan otomatis, stok, karyawan, dan pelanggan dalam satu aplikasi web dan Android — dibantu asisten AI. Mulai gratis." />
	<meta property="og:title" content="Bizgrow — Seluruh bisnis Anda. Satu aplikasi." />
	<meta property="og:description" content="Kasir, pembukuan otomatis, stok, karyawan, dan pelanggan dalam satu aplikasi — dibantu AI. Web & Android." />
	<meta property="og:image" content="/landing/web-dasbor.webp" />
	<meta property="og:type" content="website" />
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

<div class="lp">
	<!-- ═══ NAVIGASI ═══ -->
	<header class="lp-nav {sudahGulir ? 'lp-nav--gulir' : ''}">
		<div class="lp-wrap flex items-center justify-between h-12">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight text-[15px]" aria-label="Bizgrow, beranda">
				<span class="lp-logo">B</span> Bizgrow
			</a>
			<nav class="hidden md:flex items-center gap-7 text-[12px] text-neutral-600">
				<a href="#ikhtisar" class="hover:text-neutral-950">Ikhtisar</a>
				<a href="#kasir" class="hover:text-neutral-950">Kasir</a>
				<a href="#keuangan" class="hover:text-neutral-950">Keuangan</a>
				<a href="#ai" class="hover:text-neutral-950">AI</a>
				<a href="#aplikasi" class="hover:text-neutral-950">Aplikasi</a>
				<a href="#harga" class="hover:text-neutral-950">Harga</a>
				<a href="#faq" class="hover:text-neutral-950">FAQ</a>
			</nav>
			<div class="flex items-center gap-2">
				<a href="/auth/login" class="hidden sm:inline text-[12px] text-neutral-700 hover:text-neutral-950 px-2">Masuk</a>
				<a href="/auth/register" class="lp-btn lp-btn--kecil">Coba gratis</a>
				<button class="md:hidden p-2 -mr-2" aria-label="Menu" aria-expanded={menuTerbuka} on:click={() => (menuTerbuka = !menuTerbuka)}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						{#if menuTerbuka}<path d="M6 6l12 12M18 6L6 18" />{:else}<path d="M4 8h16M4 16h16" />{/if}
					</svg>
				</button>
			</div>
		</div>
		{#if menuTerbuka}
			<div class="md:hidden lp-wrap pb-4 flex flex-col text-[17px] font-semibold" role="menu">
				{#each [['#ikhtisar', 'Ikhtisar'], ['#kasir', 'Kasir'], ['#keuangan', 'Keuangan'], ['#ai', 'Asisten AI'], ['#aplikasi', 'Aplikasi'], ['#harga', 'Harga'], ['#faq', 'FAQ'], ['/auth/login', 'Masuk']] as [h, l]}
					<a href={h} class="py-2.5 border-b border-neutral-100" on:click={() => (menuTerbuka = false)}>{l}</a>
				{/each}
			</div>
		{/if}
	</header>

	<main>
		<!-- ═══ HERO ═══ -->
		<section class="pt-16 md:pt-24 text-center overflow-hidden" id="ikhtisar">
			<div class="lp-wrap">
				<p class="lp-eyebrow lp-hero-in" style="--d:0ms">Bizgrow</p>
				<h1 class="lp-h1 lp-hero-in" style="--d:80ms">Seluruh bisnis Anda.<br /><span class="lp-gradien">Satu aplikasi.</span></h1>
				<p class="lp-lead mx-auto max-w-[680px] lp-hero-in" style="--d:160ms">
					Kasir, pembukuan, stok, karyawan, dan pelanggan — tercatat otomatis, dibantu AI, di web dan Android.
				</p>
				<div class="flex flex-wrap items-center justify-center gap-4 mt-8 lp-hero-in" style="--d:240ms">
					<a href="/auth/register" class="lp-btn">Mulai gratis</a>
					<a href="#tur" class="lp-link">Lihat cara kerjanya <span aria-hidden="true">›</span></a>
				</div>
			</div>

			<!-- panggung perangkat: video tur web + HP -->
			<div class="lp-wrap mt-14 md:mt-20" id="tur">
				<div bind:this={panggung} class="lp-panggung" style="transform: perspective(1400px) rotateX({miring}deg) scale({skala});">
					<div class="lp-laptop">
						<div class="lp-laptop-bar"><i></i><i></i><i></i><span>bizgrow — kasir & laporan</span></div>
						<video bind:this={video} class="block w-full aspect-[16/10] bg-neutral-100" autoplay muted loop playsinline preload="metadata"
							poster="/landing/tur-web-poster.webp" aria-label="Video: dasbor, kasir, pembayaran, dan laporan Bizgrow di web">
							<source src="/landing/tur-web.webm" type="video/webm" />
							<source src="/landing/tur-web.mp4" type="video/mp4" />
						</video>
						<button class="lp-putar" on:click={aturVideo} aria-label={videoJalan ? 'Jeda video' : 'Putar video'}>
							{#if videoJalan}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
							{:else}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
							{/if}
						</button>
					</div>
					<div class="lp-hp lp-hp--hero" aria-hidden="true">
						<div class="lp-hp-layar">
							{#each layarHp as l, i}
								<img src={l.src} alt="" class="lp-slide {i === slide ? 'lp-slide--aktif' : ''}" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
							{/each}
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ═══ SOROTAN ═══ -->
		<section class="lp-sec">
			<div class="lp-wrap">
				<h2 class="lp-h2 text-center" use:muncul>Dibuat untuk cara UMKM bekerja.</h2>
				<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
					{#each [
						{ ik: 'M3 7h18M5 7l1 13h12l1-13M9 11v5m6-5v5M9 7V5a3 3 0 016 0v2', j: 'Kasir secepat antrean', t: 'Varian produk, split payment, voucher, struk, dan antrean dapur.' },
						{ ik: 'M4 19V5m0 14h16M8 15l3-4 3 2 5-6', j: 'Pembukuan otomatis', t: 'Setiap penjualan langsung menjadi jurnal, laba rugi, dan neraca.' },
						{ ik: 'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z', j: 'Asisten AI', t: 'Catat transaksi dan tanya kondisi bisnis dengan bahasa sehari-hari.' },
						{ ik: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm4 15h2', j: 'Web & Android', t: 'Satu data di semua perangkat, tetap mencatat saat sinyal putus.' }
					] as k, i}
						<div class="lp-kartu" use:muncul={{ jeda: i * 90 }}>
							<span class="lp-ikon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d={k.ik} /></svg></span>
							<h3 class="text-[19px] font-semibold tracking-tight mt-5">{k.j}</h3>
							<p class="text-[15px] text-neutral-500 mt-2 leading-relaxed">{k.t}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ KASIR (gelap) ═══ -->
		<section class="lp-gelap lp-sec" id="kasir">
			<div class="lp-wrap">
				<div class="text-center max-w-[760px] mx-auto" use:muncul>
					<p class="lp-eyebrow lp-eyebrow--terang">Kasir (POS)</p>
					<h2 class="lp-h2">Kasir yang secepat<br />antrean Anda.</h2>
					<p class="lp-lead lp-lead--gelap">Ketuk produk, pilih varian, bayar tunai, QRIS, atau transfer — stok berkurang, kas laci bertambah, dan jurnal tercatat dalam satu langkah.</p>
				</div>
				<div class="relative mt-14" use:muncul>
					<div class="lp-laptop lp-laptop--gelap">
						<div class="lp-laptop-bar"><i></i><i></i><i></i><span>kasir web</span></div>
						<img src="/landing/web-kasir.webp" alt="Kasir web Bizgrow dengan daftar produk dan keranjang" class="block w-full" loading="lazy" decoding="async" width="1600" height="1000" />
					</div>
					<div class="lp-hp lp-hp--samping">
						<div class="lp-hp-layar"><img src="/landing/hp-varian.webp" alt="Memilih varian produk di kasir Android" loading="lazy" decoding="async" /></div>
					</div>
				</div>
				<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mt-16 md:mt-24">
					{#each [
						['Varian & barcode', 'Ukuran, rasa, atau warna dengan stok dan harga masing-masing. Scan barcode langsung dari kamera.'],
						['Shift & kas laci', 'Buka shift dengan modal, setor dan tarik kas, lalu tutup shift — selisih kas terlihat seketika.'],
						['Voucher & split payment', 'Diskon, kode voucher, PPN, dan pembayaran gabungan tunai + QRIS dalam satu transaksi.'],
						['Antrean dapur & struk', 'Nomor antrean terkirim ke layar dapur. Struk bisa dicetak atau dikirim lewat WhatsApp.']
					] as [j, t], i}
						<div use:muncul={{ jeda: i * 80 }}>
							<h3 class="text-[17px] font-semibold text-white">{j}</h3>
							<p class="text-[15px] text-neutral-400 mt-2 leading-relaxed">{t}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ KEUANGAN ═══ -->
		<section class="lp-sec lp-abu" id="keuangan">
			<div class="lp-wrap">
				<div class="grid lg:grid-cols-[1fr_1.35fr] gap-12 lg:gap-16 items-center">
					<div use:muncul>
						<p class="lp-eyebrow">Keuangan & akuntansi</p>
						<h2 class="lp-h2 lp-h2--kolom text-left">Pembukuan yang menulis dirinya sendiri.</h2>
						<p class="lp-lead text-left">Tidak perlu paham debit dan kredit. Setiap penjualan, pembelian, dan gaji otomatis menjadi jurnal double-entry — siap dibaca sebagai laporan.</p>
						<ul class="mt-8 space-y-4">
							{#each [
								['Laba rugi & neraca', 'Diperbarui setiap kali ada transaksi, per bulan atau per tahun.'],
								['Piutang & hutang', 'Tagihan pelanggan dan supplier lengkap dengan jatuh tempo.'],
								['Tutup buku & pajak', 'Kunci periode yang sudah final dan rekap PPN per bulan.'],
								['Laporan via WhatsApp', 'Ringkasan omzet dan produk terlaris dikirim ke WhatsApp.']
							] as [j, t]}
								<li class="flex gap-3">
									<span class="lp-centang" aria-hidden="true">✓</span>
									<div><b class="font-semibold text-neutral-900">{j}.</b> <span class="text-neutral-500">{t}</span></div>
								</li>
							{/each}
						</ul>
					</div>
					<div use:muncul={{ jeda: 120 }}>
						<div class="lp-laptop">
							<div class="lp-laptop-bar"><i></i><i></i><i></i><span>laporan & analisis</span></div>
							<img src="/landing/web-laporan.webp" alt="Pusat laporan: tren pemasukan dan pengeluaran, distribusi metode bayar" class="block w-full" loading="lazy" decoding="async" width="1600" height="1000" />
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ═══ BENTO: semua modul ═══ -->
		<section class="lp-sec">
			<div class="lp-wrap">
				<h2 class="lp-h2 text-center" use:muncul>Semua kebutuhan usaha.<br /><span class="text-neutral-400">Dalam satu tempat.</span></h2>
				<div class="lp-bento mt-14">
					<div class="lp-tile lp-tile--lebar" use:muncul>
						<div class="p-7 md:p-9">
							<p class="lp-eyebrow">Produk & stok</p>
							<h3 class="lp-h3">Stok selalu akurat.</h3>
							<p class="text-neutral-500 mt-2 max-w-[420px]">Varian, kategori, harga modal, stok opname, dan peringatan stok menipis — lengkap dengan riwayat setiap perubahan.</p>
						</div>
						<img src="/landing/web-produk.webp" alt="Katalog produk dengan stok dan varian" class="lp-tile-img" loading="lazy" decoding="async" />
					</div>
					<div class="lp-tile lp-tile--gelap" use:muncul={{ jeda: 80 }}>
						<div class="p-7 md:p-9">
							<p class="lp-eyebrow lp-eyebrow--terang">HR & penggajian</p>
							<h3 class="lp-h3 text-white">Tim terurus, gaji tepat waktu.</h3>
							<p class="text-neutral-400 mt-2">Absensi dengan PIN dan lokasi, cuti & lembur, slip gaji, dan payroll yang langsung masuk ke laporan keuangan.</p>
						</div>
						<img src="/landing/web-hr.webp" alt="Dasbor HR pemilik" class="lp-tile-img" loading="lazy" decoding="async" />
					</div>
					{#each [
						{ j: 'CRM & penjualan', t: 'Kontak, pipeline deal, penawaran, sales order, dan target tim.', ik: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
						{ j: 'Pengadaan', t: 'Purchase order, penerimaan barang, retur, dan tagihan supplier.', ik: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7' },
						{ j: 'Toko online & website', t: 'Katalog publik dan halaman usaha Anda sendiri, tanpa koding.', ik: 'M3 9l1-5h16l1 5M3 9h18M3 9v11h18V9M9 20v-6h6v6' },
						{ j: 'Banyak unit & cabang', t: 'Satu akun untuk semua usaha, tiap cabang dengan datanya sendiri.', ik: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6' },
						{ j: 'Layanan pelanggan', t: 'Tiket keluhan, inbox, dan knowledge base agar jawaban tim seragam.', ik: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z' },
						{ j: 'Marketing', t: 'Kampanye, leads, jadwal media sosial, dan landing page promosi.', ik: 'M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zm13-3a5 5 0 010 8' }
					] as k, i}
						<div class="lp-tile lp-tile--kecil" use:muncul={{ jeda: (i % 3) * 80 }}>
							<span class="lp-ikon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d={k.ik} /></svg></span>
							<h3 class="text-[19px] font-semibold tracking-tight mt-5">{k.j}</h3>
							<p class="text-[15px] text-neutral-500 mt-2 leading-relaxed">{k.t}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ AI ═══ -->
		<section class="lp-ai lp-sec" id="ai">
			<div class="lp-wrap grid lg:grid-cols-2 gap-14 items-center">
				<div use:muncul>
					<p class="lp-eyebrow lp-eyebrow--terang">Bizgrow AI</p>
					<h2 class="lp-h2 lp-h2--kolom text-left text-white">Tanya bisnis Anda.<br /><span class="lp-gradien-ai">Pakai bahasa sehari-hari.</span></h2>
					<p class="lp-lead lp-lead--gelap text-left">Ketik “jual kopi 3 cup” dan transaksinya langsung tercatat. Tanya omzet, stok menipis, piutang jatuh tempo, atau minta saran — AI membaca data usaha Anda sendiri.</p>
					<div class="flex flex-wrap gap-2 mt-8">
						{#each ['Omzet hari ini?', 'Produk stok menipis', 'Cek piutang overdue', 'Laba rugi bulan ini', 'Analisis cash flow'] as c}
							<span class="lp-chip">{c}</span>
						{/each}
					</div>
				</div>
				<div bind:this={kotakChat} class="lp-chat" use:muncul={{ jeda: 120 }} aria-label="Contoh percakapan dengan Bizgrow AI">
					<div class="flex items-center gap-3 pb-4 border-b border-white/10">
						<span class="lp-ai-logo">✦</span>
						<div><b class="text-white text-[15px]">Bizgrow AI</b><p class="text-[12px] text-emerald-300">● Asisten semua hal bisnis</p></div>
					</div>
					<div class="flex flex-col gap-3 pt-5 min-h-[340px]">
						{#each percakapan.slice(0, tampilChat) as m}
							<div class="lp-bubble {m.dari === 'saya' ? 'lp-bubble--saya' : 'lp-bubble--ai'}">{m.teks}</div>
						{/each}
						{#if mengetik}
							<div class="lp-bubble lp-bubble--ai lp-ngetik" aria-label="AI sedang mengetik"><i></i><i></i><i></i></div>
						{/if}
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
					<p class="lp-lead mx-auto max-w-[640px]">Pantau omzet, jalankan kasir, tutup shift, dan catat pengeluaran dari mana saja. Mode gelap untuk malam hari, antrean offline saat sinyal hilang.</p>
				</div>
				<div class="lp-deret mt-14">
					{#each [
						{ src: '/landing/hp-beranda.webp', alt: 'Beranda aplikasi dengan asisten AI', ket: 'Beranda & AI' },
						{ src: '/landing/hp-bayar.webp', alt: 'Pembayaran di kasir Android', ket: 'Kasir & pembayaran' },
						{ src: '/landing/hp-shift.webp', alt: 'Tutup shift dengan selisih kas otomatis', ket: 'Tutup shift' },
						{ src: '/landing/hp-gelap.webp', alt: 'Pengaturan dengan mode gelap', ket: 'Mode gelap' }
					] as h, i}
						<figure class="lp-deret-item" use:muncul={{ jeda: i * 110 }}>
							<div class="lp-hp"><div class="lp-hp-layar"><img src={h.src} alt={h.alt} loading="lazy" decoding="async" /></div></div>
							<figcaption class="text-[13px] text-neutral-500 mt-4">{h.ket}</figcaption>
						</figure>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ KEAMANAN ═══ -->
		<section class="lp-sec lp-abu">
			<div class="lp-wrap">
				<h2 class="lp-h2 text-center" use:muncul>Data usaha Anda, tetap milik Anda.</h2>
				<div class="grid md:grid-cols-3 gap-4 mt-12">
					{#each [
						{ j: 'Terpisah per usaha', t: 'Setiap unit usaha terisolasi. Pengguna lain tidak bisa membaca atau mengubah data Anda — diperiksa di setiap permintaan.', ik: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z' },
						{ j: 'Akses sesuai peran', t: 'Pemilik, manajer, dan kasir punya hak berbeda. Kasir masuk dengan PIN, otorisasi diskon dan retur butuh persetujuan.', ik: 'M7 11V7a5 5 0 0110 0v4M5 11h14v10H5z' },
						{ j: 'Angka yang bisa dipercaya', t: 'Jurnal selalu seimbang, periode yang ditutup terkunci, dan setiap perubahan stok punya jejak.', ik: 'M9 12l2 2 4-4M5 4h14v16H5z' }
					] as k, i}
						<div class="lp-kartu lp-kartu--putih" use:muncul={{ jeda: i * 90 }}>
							<span class="lp-ikon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d={k.ik} /></svg></span>
							<h3 class="text-[19px] font-semibold tracking-tight mt-5">{k.j}</h3>
							<p class="text-[15px] text-neutral-500 mt-2 leading-relaxed">{k.t}</p>
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
					<h2 class="lp-h2">Mulai gratis. Tumbuh kapan saja.</h2>
					<p class="lp-lead mx-auto max-w-[560px]">Tanpa biaya pemasangan. Ganti paket kapan pun sesuai perkembangan usaha.</p>
				</div>
				<div class="grid md:grid-cols-3 gap-4 mt-12 items-stretch">
					{#each harga as p, i}
						<div class="lp-harga {p.unggul ? 'lp-harga--unggul' : ''}" use:muncul={{ jeda: i * 90 }}>
							{#if p.unggul}<span class="lp-label">Paling populer</span>{/if}
							<h3 class="text-[21px] font-semibold tracking-tight">{p.nama}</h3>
							<p class="text-[14px] {p.unggul ? 'text-neutral-300' : 'text-neutral-500'} mt-1">{p.ket}</p>
							<p class="mt-6"><span class="text-[40px] font-semibold tracking-tight">{p.harga}</span> <span class="text-[14px] {p.unggul ? 'text-neutral-300' : 'text-neutral-500'}">{p.per}</span></p>
							<ul class="mt-6 space-y-3 text-[15px] flex-1">
								{#each p.fitur as f}
									<li class="flex gap-2.5"><span class="lp-centang {p.unggul ? 'lp-centang--terang' : ''}" aria-hidden="true">✓</span>{f}</li>
								{/each}
							</ul>
							<a href="/auth/register" class="lp-btn mt-8 w-full justify-center {p.unggul ? 'lp-btn--putih' : 'lp-btn--garis'}">{p.cta}</a>
						</div>
					{/each}
				</div>
				<p class="text-center text-[12px] text-neutral-400 mt-6">Pembayaran langganan diproses dengan aman melalui Midtrans.</p>
			</div>
		</section>

		<!-- ═══ FAQ ═══ -->
		<section class="lp-sec lp-abu" id="faq">
			<div class="lp-wrap max-w-[820px]">
				<h2 class="lp-h2 text-center" use:muncul>Pertanyaan yang sering diajukan.</h2>
				<div class="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
					{#each faq as f, i}
						<div>
							<button class="w-full flex items-center justify-between gap-6 py-5 text-left text-[17px] md:text-[19px] font-semibold tracking-tight"
								aria-expanded={faqBuka === i} on:click={() => (faqBuka = faqBuka === i ? -1 : i)}>
								{f.t}
								<span class="lp-plus {faqBuka === i ? 'lp-plus--buka' : ''}" aria-hidden="true">+</span>
							</button>
							<div class="lp-faq-isi {faqBuka === i ? 'lp-faq-isi--buka' : ''}">
								<div><p class="pb-6 text-[15px] md:text-[17px] text-neutral-600 leading-relaxed">{f.j}</p></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ═══ AJAKAN AKHIR ═══ -->
		<section class="lp-sec text-center">
			<div class="lp-wrap" use:muncul>
				<span class="lp-logo lp-logo--besar mx-auto">B</span>
				<h2 class="lp-h2 mt-8">Mulai rapikan bisnis Anda <br class="hidden md:block" />hari ini.</h2>
				<p class="lp-lead mx-auto max-w-[560px]">Daftar dalam satu menit. Gratis untuk selamanya, tanpa kartu kredit.</p>
				<div class="flex flex-wrap items-center justify-center gap-4 mt-8">
					<a href="/auth/register" class="lp-btn">Buat akun gratis</a>
					<a href="/auth/login" class="lp-link">Sudah punya akun? Masuk <span aria-hidden="true">›</span></a>
				</div>
			</div>
		</section>
	</main>

	<footer class="bg-neutral-100 text-[12px] text-neutral-500">
		<div class="lp-wrap py-10">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-neutral-300">
				{#each [
					['Produk', [['#kasir', 'Kasir (POS)'], ['#keuangan', 'Keuangan'], ['#ai', 'Bizgrow AI'], ['#aplikasi', 'Aplikasi Android']]],
					['Modul', [['#ikhtisar', 'Stok & produk'], ['#ikhtisar', 'HR & penggajian'], ['#ikhtisar', 'CRM & penjualan'], ['#ikhtisar', 'Pengadaan']]],
					['Mulai', [['/auth/register', 'Daftar gratis'], ['/auth/login', 'Masuk'], ['#harga', 'Harga'], ['#faq', 'FAQ']]],
					['Akun', [['/auth/forgot-password', 'Lupa password'], ['#faq', 'Bantuan & FAQ']]]
				] as [judul, tautan]}
					<div>
						<h4 class="font-semibold text-neutral-800 mb-3">{judul}</h4>
						<ul class="space-y-2">
							{#each tautan as [h, l]}<li><a href={h} class="hover:underline">{l}</a></li>{/each}
						</ul>
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
		--teks: #1d1d1f;
		--abu: #f5f5f7;
		--biru: #0071e3;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		color: var(--teks);
		background: #fff;
		-webkit-font-smoothing: antialiased;
		letter-spacing: -0.01em;
	}
	.lp-wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding: 0 22px; }
	.lp-sec { padding: 96px 0; }
	@media (min-width: 768px) { .lp-sec { padding: 140px 0; } }
	.lp-abu { background: var(--abu); }

	/* tipografi */
	.lp-eyebrow { font-size: 17px; font-weight: 600; color: #bf4800; margin-bottom: 10px; }
	.lp-eyebrow--terang { color: #ff9f6b; }
	.lp-h1 { font-size: clamp(44px, 8vw, 88px); line-height: 1.04; font-weight: 700; letter-spacing: -0.035em; }
	.lp-h2 { font-size: clamp(34px, 5.4vw, 64px); line-height: 1.06; font-weight: 700; letter-spacing: -0.03em; }
	.lp-h2--kolom { font-size: clamp(34px, 4.2vw, 52px); }
	.lp-h3 { font-size: clamp(24px, 3vw, 32px); line-height: 1.1; font-weight: 700; letter-spacing: -0.025em; }
	.lp-lead { font-size: clamp(19px, 2.2vw, 24px); line-height: 1.4; color: #6e6e73; margin-top: 20px; font-weight: 500; }
	.lp-lead--gelap { color: #a1a1a6; }
	.lp-gradien { background: linear-gradient(90deg, #4f46e5, #9333ea 45%, #db2777); -webkit-background-clip: text; background-clip: text; color: transparent; }
	.lp-gradien-ai { background: linear-gradient(90deg, #a5b4fc, #f0abfc 50%, #fda4af); -webkit-background-clip: text; background-clip: text; color: transparent; }

	/* tombol & tautan */
	.lp-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--biru); color: #fff; font-size: 17px; font-weight: 500; padding: 12px 24px; border-radius: 980px; transition: background .2s, transform .2s; }
	.lp-btn:hover { background: #0077ed; }
	.lp-btn:active { transform: scale(.97); }
	.lp-btn--kecil { font-size: 12px; padding: 5px 13px; }
	.lp-btn--putih { background: #fff; color: var(--teks); }
	.lp-btn--putih:hover { background: #f0f0f0; }
	.lp-btn--garis { background: transparent; color: var(--biru); box-shadow: inset 0 0 0 1px var(--biru); }
	.lp-btn--garis:hover { background: var(--biru); color: #fff; }
	.lp-link { color: var(--biru); font-size: 17px; }
	.lp-link:hover { text-decoration: underline; }

	/* navigasi */
	.lp-nav { position: sticky; top: 0; z-index: 50; background: rgba(255, 255, 255, .72); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); transition: box-shadow .3s; }
	.lp-nav--gulir { box-shadow: 0 1px 0 rgba(0, 0, 0, .08); }
	.lp-logo { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 7px; background: linear-gradient(135deg, #4f46e5, #9333ea); color: #fff; font-size: 13px; font-weight: 800; }
	.lp-logo--besar { display: flex; width: 72px; height: 72px; border-radius: 20px; font-size: 36px; box-shadow: 0 20px 40px -12px rgba(79, 70, 229, .5); }

	/* animasi masuk hero */
	.lp-hero-in { opacity: 0; transform: translateY(18px); animation: lp-naik .9s cubic-bezier(.2, .7, .2, 1) forwards; animation-delay: var(--d); }
	@keyframes lp-naik { to { opacity: 1; transform: none; } }

	/* reveal saat menggulir (kelas ditambahkan oleh action muncul) */
	:global(.lp-reveal) { opacity: 0; transform: translateY(36px); transition: opacity .9s cubic-bezier(.2, .7, .2, 1), transform .9s cubic-bezier(.2, .7, .2, 1); }
	:global(.lp-reveal.lp-tampil) { opacity: 1; transform: none; }

	/* perangkat */
	.lp-panggung { position: relative; transform-origin: 50% 0; transition: transform .1s linear; will-change: transform; padding-bottom: 40px; }
	.lp-laptop { position: relative; border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, .06), 0 40px 80px -30px rgba(0, 0, 0, .35); }
	.lp-laptop--gelap { box-shadow: 0 0 0 1px rgba(255, 255, 255, .08), 0 40px 100px -30px rgba(79, 70, 229, .45); }
	.lp-laptop-bar { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; background: #f2f2f4; border-bottom: 1px solid #e5e5ea; }
	.lp-laptop-bar i { width: 10px; height: 10px; border-radius: 50%; background: #ff5f57; }
	.lp-laptop-bar i:nth-child(2) { background: #febc2e; }
	.lp-laptop-bar i:nth-child(3) { background: #28c840; }
	.lp-laptop-bar span { flex: 1; text-align: center; font-size: 11px; color: #8e8e93; margin-right: 40px; }
	.lp-putar { position: absolute; right: 14px; bottom: 14px; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(29, 29, 31, .72); color: #fff; backdrop-filter: blur(10px); }

	.lp-hp { width: 100%; max-width: 250px; border-radius: 40px; padding: 9px; background: #1d1d1f; box-shadow: 0 0 0 2px #3a3a3c, 0 30px 60px -20px rgba(0, 0, 0, .45); }
	.lp-hp-layar { position: relative; aspect-ratio: 1179 / 2556; border-radius: 32px; overflow: hidden; background: #f5f5f7; }
	.lp-hp-layar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; }
	.lp-hp--hero { position: absolute; right: -2%; bottom: -10px; width: 22%; min-width: 120px; max-width: 230px; }
	.lp-hp--samping { position: absolute; right: -1%; bottom: -36px; width: 21%; min-width: 110px; max-width: 220px; }
	@media (max-width: 640px) {
		.lp-hp--hero { right: -4px; width: 30%; border-radius: 24px; padding: 5px; }
		.lp-hp--hero .lp-hp-layar { border-radius: 20px; }
		.lp-hp--samping { right: -4px; width: 30%; border-radius: 24px; padding: 5px; bottom: -24px; }
		.lp-hp--samping .lp-hp-layar { border-radius: 20px; }
	}
	.lp-slide { opacity: 0; transform: scale(1.04); transition: opacity .9s ease, transform 1.4s ease; }
	.lp-slide--aktif { opacity: 1; transform: none; }

	/* kartu & ikon */
	.lp-kartu { border-radius: 24px; padding: 30px; background: var(--abu); }
	.lp-kartu--putih { background: #fff; }
	.lp-ikon { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #eef2ff, #fae8ff); color: #6d28d9; }
	.lp-centang { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: #e8f0fe; color: var(--biru); font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 2px; }
	.lp-centang--terang { background: rgba(255, 255, 255, .15); color: #fff; }

	/* bagian gelap */
	.lp-gelap { background: #000; color: #f5f5f7; }
	.lp-gelap .lp-h2 { color: #f5f5f7; }

	/* bento */
	.lp-bento { display: grid; gap: 16px; grid-template-columns: 1fr; }
	@media (min-width: 768px) { .lp-bento { grid-template-columns: repeat(3, 1fr); } .lp-tile--lebar { grid-column: span 2; } }
	.lp-tile { position: relative; border-radius: 28px; background: var(--abu); overflow: hidden; display: flex; flex-direction: column; }
	.lp-tile--gelap { background: #111; }
	.lp-tile--kecil { padding: 30px; }
	.lp-tile-img { display: block; width: 92%; margin: auto 0 0 auto; border-top-left-radius: 14px; box-shadow: 0 0 0 1px rgba(0, 0, 0, .06), -20px -10px 40px -20px rgba(0, 0, 0, .25); transition: transform .8s cubic-bezier(.2, .7, .2, 1); }
	.lp-tile:hover .lp-tile-img { transform: translate(-6px, -6px); }

	/* AI */
	.lp-ai { background: radial-gradient(120% 80% at 80% 0%, #3b0764 0%, #0b0b1a 55%, #000 100%); color: #f5f5f7; }
	.lp-chip { font-size: 13px; padding: 8px 14px; border-radius: 999px; background: rgba(255, 255, 255, .08); color: #e5e5ea; border: 1px solid rgba(255, 255, 255, .12); }
	.lp-chat { border-radius: 28px; padding: 22px; background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .1); backdrop-filter: blur(20px); box-shadow: 0 40px 80px -30px rgba(147, 51, 234, .5); }
	.lp-ai-logo { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #d946ef); color: #fff; font-size: 18px; }
	.lp-bubble { max-width: 86%; padding: 11px 15px; border-radius: 20px; font-size: 15px; line-height: 1.45; animation: lp-gelembung .45s cubic-bezier(.2, .7, .2, 1); }
	.lp-bubble--saya { align-self: flex-end; background: var(--biru); color: #fff; border-bottom-right-radius: 6px; }
	.lp-bubble--ai { align-self: flex-start; background: rgba(255, 255, 255, .1); color: #f5f5f7; border-bottom-left-radius: 6px; }
	@keyframes lp-gelembung { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
	.lp-ngetik { display: flex; gap: 4px; padding: 15px 16px; }
	.lp-ngetik i { width: 7px; height: 7px; border-radius: 50%; background: #c7c7cc; animation: lp-titik 1s infinite ease-in-out; }
	.lp-ngetik i:nth-child(2) { animation-delay: .15s; }
	.lp-ngetik i:nth-child(3) { animation-delay: .3s; }
	@keyframes lp-titik { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }

	/* deret HP */
	.lp-deret { display: flex; gap: 22px; justify-content: center; overflow-x: auto; scroll-snap-type: x mandatory; padding: 10px 22px 30px; margin: 0 -22px; scrollbar-width: none; }
	.lp-deret::-webkit-scrollbar { display: none; }
	.lp-deret-item { flex: 0 0 210px; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center; }
	@media (min-width: 900px) { .lp-deret-item:nth-child(even) { margin-top: 60px; } .lp-deret-item { flex-basis: 230px; } }
	@media (max-width: 899px) { .lp-deret { justify-content: flex-start; } }

	/* harga */
	.lp-harga { position: relative; display: flex; flex-direction: column; border-radius: 28px; padding: 34px; background: var(--abu); }
	.lp-harga--unggul { background: #1d1d1f; color: #f5f5f7; box-shadow: 0 30px 60px -25px rgba(0, 0, 0, .5); }
	.lp-label { position: absolute; top: 18px; right: 18px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: linear-gradient(90deg, #6366f1, #d946ef); color: #fff; }

	/* FAQ */
	.lp-plus { flex-shrink: 0; font-size: 26px; font-weight: 300; color: #6e6e73; transition: transform .3s; }
	.lp-plus--buka { transform: rotate(45deg); }
	.lp-faq-isi { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s ease; }
	.lp-faq-isi > div { overflow: hidden; }
	.lp-faq-isi--buka { grid-template-rows: 1fr; }

	@media (prefers-reduced-motion: reduce) {
		.lp-hero-in, .lp-bubble { animation: none; opacity: 1; transform: none; }
		:global(.lp-reveal) { opacity: 1 !important; transform: none !important; transition: none !important; }
		.lp-slide, .lp-tile-img, .lp-panggung { transition: none; }
	}
</style>
