import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { groqChatCompletion } from '$lib/server/groq';
import { eq, and, sql, desc, or, inArray, asc } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import {
	receivables,
	payables,
	journalEntries,
	employees,
	attendance,
	leaveRequests,
	posOrders,
	suppliers,
	purchaseOrders,
	fixedAssets,
	taxRates,
	budgetItems,
	chartOfAccounts,
	approvalRequests,
	stockOpname,
	salaryComponents,
	riwayatAksi,
	salesOrders,
	salesTargets,
	users,
	marketingCampaigns,
	adTrackers,
	vouchers,
	marketingLeads,
	landingPages,
	supportTickets,
	ecommerceOrders,
	ecommerceSettings,
	transaksi,
	unitBisnis,
	crmContacts,
	crmDeals,
	crmActivities,
	closingPeriods,
	products as productsTable
} from '$lib/server/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v) {
	if (!v) return '-';
	const d = v instanceof Date ? v : new Date(v);
	if (isNaN(d.getTime())) return String(v);
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtRp(v) {
	return `Rp${Number(v || 0).toLocaleString('id-ID')}`;
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

const INTENTS = [
	{ key: 'hr_advanced',     pattern: /kpi|penilaian|performa|kontrak|sp|peringatan/ },
	{ key: 'hr',              pattern: /karyawan|gaji|absen|payroll|cuti|shift|pegawai|lembur|staf|staff|sdm/ },
	{ key: 'crm',             pattern: /pelanggan|customer|klien|deal|pipeline|kontak|crm|prospek|pembeli/ },
	{ key: 'inventory',       pattern: /stok|produk|barang|inventori|laku|laris|habis|dead.?stock|item/ },
	{ key: 'finance_advanced',pattern: /tutup.?buku|closing.?period|akhir.?bulan/ },
	{ key: 'finance',         pattern: /uang|laba|rugi|keuangan|kas|saldo|pemasukan|pengeluaran|omzet|hutang|piutang|bon|jurnal|buku.?besar|cash.?flow|profit|tagihan/ },
	{ key: 'pos',             pattern: /pos|kasir|struk|order|bayar|jual|penjualan kasir/ },
	{ key: 'sales',           pattern: /pipeline|deal|closing|penawaran|quotation|sales.?order|komisi|target.?sales/ },
	{ key: 'marketing',       pattern: /kampanye|campaign|iklan|leads?|landing.?page|voucher|diskon|marketing|roas/ },
	{ key: 'cs',              pattern: /tiket|ticket|keluhan|komplain|support|helpdesk|cs|customer.?service/ },
	{ key: 'ecommerce',       pattern: /toko.?online|ecommerce|e-commerce|storefront|marketplace|shopee|tokopedia/ },
	{ key: 'procurement',     pattern: /supplier|vendor|\bpo\b|purchase.?order|pembelian|restock|kulakan/ },
	{ key: 'asset',           pattern: /aset|mobil|mesin|fixed.?asset|penyusutan|kendaraan/ },
	{ key: 'tax',             pattern: /pajak|ppn|pph|tax/ },
	{ key: 'budget',          pattern: /anggaran|budget|jatah/ },
	{ key: 'approval',        pattern: /persetujuan|approval|reimburse/ },
	{ key: 'gudang',          pattern: /gudang|warehouse|opname|selisih.?stok|batch/ },
	{ key: 'penggajian',      pattern: /komponen.?gaji|tunjangan|potongan|slip|bpjs/ },
	{ key: 'akuntansi',       pattern: /akun|coa|chart.?of.?account|rekening/ },
	{ key: 'audit',           pattern: /log|riwayat|audit|hapus|aktivitas|jejak/ },
	{ key: 'help',            pattern: /bantuan|cara|bagaimana|fitur|menu|aplikasi|dimana|link|halaman|help|tolong|bingung/ },
];

function detectIntent(text) {
	const lower = text.toLowerCase();
	for (const { key, pattern } of INTENTS) {
		if (pattern.test(lower)) return key;
	}
	return 'general';
}

// ─── Dynamic Context Loader ────────────────────────────────────────────────────

async function loadDynamicContext(intent, userId, targetUnitId) {
	let ctx = '';
	let suggestions = [];

	try {
		if (intent === 'finance' && targetUnitId) {
			const piutang = await db.select({
				nomor_invoice: receivables.nomorInvoice,
				nominal: receivables.nominal,
				jatuh_tempo: receivables.jatuhTempo,
				status: receivables.status
			}).from(receivables)
			  .where(and(
				eq(receivables.unitId, targetUnitId),
				inArray(receivables.status, ['BELUM_BAYAR', 'SEBAGIAN'])
			  )).limit(10);

			const hutang = await db.select({
				nomor_faktur: payables.nomorFaktur,
				nominal: payables.nominal,
				jatuh_tempo: payables.jatuhTempo,
				status: payables.status
			}).from(payables)
			  .where(and(
				eq(payables.unitId, targetUnitId),
				inArray(payables.status, ['BELUM_BAYAR', 'SEBAGIAN'])
			  )).limit(10);

			const journal = await db.select({
				tanggal: journalEntries.tanggal,
				memo: journalEntries.memo,
				total_debit: journalEntries.totalDebit,
				total_kredit: journalEntries.totalKredit
			}).from(journalEntries)
			  .where(eq(journalEntries.unitId, targetUnitId))
			  .orderBy(desc(journalEntries.tanggal))
			  .limit(5);

			ctx += `\n[FOKUS KEUANGAN & AKUNTANSI]\n`;
			if (piutang.length) ctx += `- Piutang Belum Lunas: ${piutang.map(p => `Invoice ${p.nomor_invoice} | ${fmtRp(p.nominal)} | JT: ${fmtDate(p.jatuh_tempo)} | ${p.status}`).join('; ')}\n`;
			if (hutang.length)  ctx += `- Hutang Belum Lunas: ${hutang.map(h => `Faktur ${h.nomor_faktur} | ${fmtRp(h.nominal)} | JT: ${fmtDate(h.jatuh_tempo)} | ${h.status}`).join('; ')}\n`;
			if (journal.length) ctx += `- Jurnal Umum Terakhir: ${journal.map(j => `[${fmtDate(j.tanggal)}] ${j.memo || '-'} | D:${fmtRp(j.total_debit)} K:${fmtRp(j.total_kredit)}`).join('; ')}\n`;
			suggestions = ['Cek tagihan hutang supplier', 'Proyeksi cash flow bulan ini', 'Analisis laba rugi'];
		}
		else if (intent === 'finance_advanced' && targetUnitId) {
			const closing = await db.select({
				period_start: closingPeriods.periodStart,
				period_end: closingPeriods.periodEnd,
				status: closingPeriods.status,
				laba_rugi_periode: closingPeriods.labaRugiPeriode
			}).from(closingPeriods)
			  .where(eq(closingPeriods.unitId, targetUnitId))
			  .orderBy(desc(closingPeriods.id))
			  .limit(3);

			ctx += `\n[FOKUS TUTUP BUKU]\n`;
			if (closing.length) ctx += `- Periode: ${closing.map(c => `${fmtDate(c.period_start)}~${fmtDate(c.period_end)} | ${c.status} | L/R: ${fmtRp(c.laba_rugi_periode)}`).join('; ')}\n`;
			suggestions = ['Apakah bulan lalu sudah tutup buku?', 'Cek laba bersih bulan lalu'];
		}
		else if (intent === 'crm' && targetUnitId) {
			const contacts = await db.select({
				nama: crmContacts.nama,
				telepon: crmContacts.telepon,
				email: crmContacts.email,
				stage: crmContacts.stage
			}).from(crmContacts)
			  .where(eq(crmContacts.unitId, targetUnitId))
			  .limit(10);

			const deals = await db.select({
				nama_deal: crmDeals.namaDeal,
				nilai: crmDeals.nilai,
				stage: crmDeals.stage
			}).from(crmDeals)
			  .where(and(
				eq(crmDeals.unitId, targetUnitId),
				eq(crmDeals.status, 'open')
			  )).limit(5);

			const activities = await db.select({
				tipe: crmActivities.tipe,
				catatan: crmActivities.catatan,
				tanggal: crmActivities.tanggal
			}).from(crmActivities)
			  .where(eq(crmActivities.unitId, targetUnitId))
			  .orderBy(desc(crmActivities.tanggal))
			  .limit(5);

			ctx += `\n[FOKUS CRM & PELANGGAN]\n`;
			if (contacts.length)   ctx += `- Kontak: ${contacts.map(c => `${c.nama} (${c.stage || 'lead'})`).join('; ')}\n`;
			if (deals.length)      ctx += `- Deals Aktif: ${deals.map(d => `${d.nama_deal} | ${fmtRp(d.nilai)} | ${d.stage}`).join('; ')}\n`;
			if (activities.length) ctx += `- Aktivitas: ${activities.map(a => `[${fmtDate(a.tanggal)}] ${a.tipe}: ${a.catatan || '-'}`).join('; ')}\n`;
			suggestions = ['Pipeline deals terbesar', 'Follow up pelanggan mana?', 'Riwayat meeting terakhir'];
		}
		else if (intent === 'hr') {
			const employeesList = await db.select({
				full_name: employees.fullName,
				position: employees.position,
				salary: employees.salary,
				status: employees.status
			}).from(employees)
			  .where(and(
				eq(employees.userId, userId),
				eq(employees.status, 'active')
			  )).limit(15);

			const attendanceList = await db.select({
				full_name: employees.fullName,
				status: attendance.status,
				check_in: attendance.checkIn
			}).from(attendance)
			  .innerJoin(employees, eq(attendance.employeeId, employees.id))
			  .where(eq(employees.userId, userId))
			  .orderBy(desc(attendance.checkIn))
			  .limit(10);

			const leaves = await db.select({
				full_name: employees.fullName,
				start_date: leaveRequests.startDate,
				end_date: leaveRequests.endDate,
				status: leaveRequests.status
			}).from(leaveRequests)
			  .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
			  .where(and(
				eq(employees.userId, userId),
				eq(leaveRequests.status, 'pending')
			  )).limit(5);

			ctx += `\n[FOKUS HR & KARYAWAN]\n`;
			if (employeesList.length)  ctx += `- Karyawan Aktif: ${employeesList.map(e => `${e.full_name} (${e.position || '-'}) ${fmtRp(e.salary)}`).join('; ')}\n`;
			if (attendanceList.length) ctx += `- Absensi Terkini: ${attendanceList.map(a => `${a.full_name}: ${a.status}`).join('; ')}\n`;
			if (leaves.length)     ctx += `- Cuti Pending Approval: ${leaves.map(l => `${l.full_name}: ${fmtDate(l.start_date)} sd ${fmtDate(l.end_date)}`).join('; ')}\n`;
			suggestions = ['Siapa yang cuti hari ini?', 'Evaluasi efisiensi payroll', 'Siapa yang sering terlambat?'];
		}
		else if (intent === 'hr_advanced') {
			const kpi = await db.select({
				full_name: employees.fullName,
				period_month: employeeKpi.periodMonth,
				period_year: employeeKpi.periodYear,
				score: employeeKpi.score,
				notes: employeeKpi.notes
			}).from(employeeKpi)
			  .innerJoin(employees, eq(employeeKpi.employeeId, employees.id))
			  .where(eq(employees.userId, userId))
			  .orderBy(desc(employeeKpi.periodYear), desc(employeeKpi.periodMonth))
			  .limit(5);

			ctx += `\n[FOKUS KPI KARYAWAN]\n`;
			if (kpi.length) ctx += `- KPI: ${kpi.map(k => `${k.full_name} (${k.period_month}/${k.period_year}): Skor ${k.score}`).join('; ')}\n`;
			suggestions = ['Siapa karyawan KPI tertinggi?', 'Dokumen kontrak yang mau habis?'];
		}
		else if (intent === 'inventory') {
			suggestions = ['Produk stok nyaris habis', 'Analisis dead stock', 'Cek aktivitas gudang'];
		}
		else if (intent === 'pos' && targetUnitId) {
			const orders = await db.select({
				order_number: posOrders.orderNumber,
				total: posOrders.total,
				payment_method: posOrders.paymentMethod,
				status: posOrders.status,
				created_at: posOrders.createdAt
			}).from(posOrders)
			  .where(eq(posOrders.unitId, targetUnitId))
			  .orderBy(desc(posOrders.createdAt))
			  .limit(10);

			ctx += `\n[FOKUS KASIR / POS]\n`;
			if (orders.length) ctx += `- Transaksi POS Terakhir: ${orders.map(o => `#${o.order_number} | ${fmtRp(o.total)} | ${o.payment_method} | ${o.status}`).join('; ')}\n`;
			suggestions = ['Total omzet kasir hari ini?', 'Jam kasir paling ramai?', 'Metode pembayaran terpopuler?'];
		}
		else if (intent === 'procurement' && targetUnitId) {
			const suppliersList = await db.select({
				nama_supplier: suppliers.namaSupplier,
				kontak: suppliers.kontak
			}).from(suppliers)
			  .where(eq(suppliers.unitId, targetUnitId))
			  .limit(10);

			const po = await db.select({
				po_number: purchaseOrders.poNumber,
				total_amount: purchaseOrders.totalAmount,
				status: purchaseOrders.status
			}).from(purchaseOrders)
			  .where(and(
				eq(purchaseOrders.unitId, targetUnitId),
				eq(purchaseOrders.status, 'DRAFT')
			  )).limit(5);

			ctx += `\n[FOKUS PROCUREMENT & SUPPLIER]\n`;
			if (suppliersList.length) ctx += `- Supplier: ${suppliersList.map(s => s.nama_supplier).join('; ')}\n`;
			if (po.length)        ctx += `- PO Pending: ${po.map(p => `PO #${p.po_number} | ${fmtRp(p.total_amount)}`).join('; ')}\n`;
			suggestions = ['Barang yang harus direstock?', 'PO yang belum dikirim supplier?'];
		}
		else if (intent === 'asset' && targetUnitId) {
			const assets = await db.select({
				nama_aset: fixedAssets.namaAset,
				nilai_perolehan: fixedAssets.nilaiPerolehan,
				nilai_buku: fixedAssets.nilaiBuku,
				status: fixedAssets.status
			}).from(fixedAssets)
			  .where(eq(fixedAssets.unitId, targetUnitId))
			  .limit(10);

			ctx += `\n[FOKUS ASET TETAP]\n`;
			if (assets.length) ctx += `- Aset: ${assets.map(a => `${a.nama_aset} | Perolehan: ${fmtRp(a.nilai_perolehan)} | Buku: ${fmtRp(a.nilai_buku)}`).join('; ')}\n`;
			suggestions = ['Total nilai aset saat ini?', 'Penyusutan aset terbesar?'];
		}
		else if (intent === 'tax' && targetUnitId) {
			const taxes = await db.select({
				nama_pajak: taxRates.namaPajak,
				persentase: taxRates.persentase,
				tipe: taxRates.tipe
			}).from(taxRates)
			  .where(and(
				eq(taxRates.unitId, targetUnitId),
				eq(taxRates.isActive, 1)
			  )).limit(5);

			ctx += `\n[FOKUS PAJAK]\n`;
			if (taxes.length) ctx += `- Tarif Pajak: ${taxes.map(t => `${t.nama_pajak} (${t.tipe}): ${t.persentase}%`).join('; ')}\n`;
			suggestions = ['Perhitungan PPN bulan ini?', 'Tarif pajak yang berlaku?'];
		}
		else if (intent === 'budget' && targetUnitId) {
			const budgets = await db.select({
				tahun: budgetItems.tahun,
				bulan: budgetItems.bulan,
				nominal: budgetItems.nominal,
				nama_akun: chartOfAccounts.namaAkun
			}).from(budgetItems)
			  .leftJoin(chartOfAccounts, eq(chartOfAccounts.id, budgetItems.coaId))
			  .where(eq(budgetItems.unitId, targetUnitId))
			  .orderBy(desc(budgetItems.tahun), desc(budgetItems.bulan))
			  .limit(5);

			ctx += `\n[FOKUS ANGGARAN]\n`;
			if (budgets.length) ctx += `- Budget: ${budgets.map(b => `${b.nama_akun || '-'} (${b.bulan}/${b.tahun}): ${fmtRp(b.nominal)}`).join('; ')}\n`;
			suggestions = ['Ada pengeluaran over-budget?', 'Evaluasi anggaran bulan ini?'];
		}
		else if (intent === 'approval' && targetUnitId) {
			const approvals = await db.select({
				module: approvalRequests.module,
				action_type: approvalRequests.actionType,
				status: approvalRequests.status,
				created_at: approvalRequests.createdAt
			}).from(approvalRequests)
			  .where(and(
				eq(approvalRequests.unitId, targetUnitId),
				eq(approvalRequests.status, 'PENDING')
			  )).limit(5);

			ctx += `\n[FOKUS APPROVALS]\n`;
			if (approvals.length) ctx += `- Menunggu Approval: ${approvals.map(a => `${a.module} - ${a.action_type} (${fmtDate(a.created_at)})`).join('; ')}\n`;
			suggestions = ['Dokumen butuh approval saya?', 'Log persetujuan terbaru?'];
		}
		else if (intent === 'gudang' && targetUnitId) {
			const opname = await db.select({
				status: stockOpname.status,
				created_at: stockOpname.createdAt
			}).from(stockOpname)
			  .where(eq(stockOpname.unitId, targetUnitId))
			  .orderBy(desc(stockOpname.createdAt))
			  .limit(3);

			ctx += `\n[FOKUS GUDANG]\n`;
			if (opname.length) ctx += `- Opname Terakhir: ${opname.map(o => `${fmtDate(o.created_at)} (${o.status})`).join('; ')}\n`;
			suggestions = ['Selisih stok opname?', 'Pergerakan barang hari ini?'];
		}
		else if (intent === 'penggajian') {
			const komponen = await db.select({
				name: salaryComponents.name,
				type: salaryComponents.type,
				amount: salaryComponents.amount
			}).from(salaryComponents)
			  .innerJoin(employees, eq(salaryComponents.employeeId, employees.id))
			  .where(eq(employees.userId, userId))
			  .limit(10);

			ctx += `\n[FOKUS PENGGAJIAN]\n`;
			if (komponen.length) ctx += `- Komponen Gaji: ${komponen.map(k => `${k.name} (${k.type}): ${fmtRp(k.amount)}`).join('; ')}\n`;
			suggestions = ['Tunjangan karyawan aktif?', 'Siapa yang lembur bulan ini?'];
		}
		else if (intent === 'akuntansi' && targetUnitId) {
			const coa = await db.select({
				kode_akun: chartOfAccounts.kodeAkun,
				nama_akun: chartOfAccounts.namaAkun,
				tipe_akun: chartOfAccounts.tipeAkun
			}).from(chartOfAccounts)
			  .where(and(
				eq(chartOfAccounts.unitId, targetUnitId),
				eq(chartOfAccounts.isActive, 1)
			  )).limit(10);

			ctx += `\n[FOKUS AKUNTANSI (COA)]\n`;
			if (coa.length) ctx += `- Bagan Akun: ${coa.map(c => `[${c.kode_akun}] ${c.nama_akun} (${c.tipe_akun})`).join('; ')}\n`;
			suggestions = ['Saldo buku besar?', 'Akun yang saldonya minus?', 'Status tutup buku?'];
		}
		else if (intent === 'audit' && targetUnitId) {
			const riwayat = await db.select({
				pesan: riwayatAksi.pesan,
				tipe: riwayatAksi.tipe,
				waktu: riwayatAksi.waktu,
				kategori: riwayatAksi.kategori
			}).from(riwayatAksi)
			  .where(eq(riwayatAksi.unitId, targetUnitId))
			  .orderBy(desc(riwayatAksi.waktu))
			  .limit(10);

			ctx += `\n[FOKUS AUDIT LOG]\n`;
			if (riwayat.length) ctx += `- Log Aktivitas: ${riwayat.map(r => `[${fmtDate(r.waktu)}] [${r.tipe}] ${r.pesan}`).join('; ')}\n`;
			suggestions = ['Siapa yang hapus data hari ini?', 'Aktivitas mencurigakan?'];
		}
		else if (intent === 'sales' && targetUnitId) {
			const deals = await db.select({
				nama_deal: crmDeals.namaDeal,
				nilai: crmDeals.nilai,
				stage: crmDeals.stage,
				status: crmDeals.status
			}).from(crmDeals)
			  .where(eq(crmDeals.unitId, targetUnitId))
			  .orderBy(desc(crmDeals.createdAt))
			  .limit(10);

			const orders = await db.select({
				order_number: salesOrders.orderNumber,
				total_amount: salesOrders.totalAmount,
				status: salesOrders.status
			}).from(salesOrders)
			  .where(eq(salesOrders.unitId, targetUnitId))
			  .orderBy(desc(salesOrders.createdAt))
			  .limit(5);

			const targets = await db.select({
				target_amount: salesTargets.targetAmount,
				komisi_percent: salesTargets.komisiPersen,
				username: users.username
			}).from(salesTargets)
			  .innerJoin(users, eq(users.id, salesTargets.userId))
			  .where(and(
				eq(salesTargets.unitId, targetUnitId),
				sql`${salesTargets.periodMonth} = MONTH(NOW())`,
				sql`${salesTargets.periodYear} = YEAR(NOW())`
			  )).limit(5);

			ctx += `\n[FOKUS PENJUALAN (SALES)]\n`;
			if (deals.length) ctx += `- Pipeline Deals: ${deals.map(d => `${d.nama_deal} | ${fmtRp(d.nilai)} | ${d.stage} | ${d.status}`).join('; ')}\n`;
			if (orders.length) ctx += `- Sales Order Terbaru: ${orders.map(o => `SO#${o.order_number} | ${fmtRp(o.total_amount)} | ${o.status}`).join('; ')}\n`;
			if (targets.length) ctx += `- Target Bulan Ini: ${targets.map(t => `${t.username}: target ${fmtRp(t.target_amount)}, komisi ${t.komisi_percent}%`).join('; ')}\n`;
			suggestions = ['Pipeline deals terbesar?', 'Siapa sales terbaik bulan ini?', 'Status quotation pending?'];
		}
		else if (intent === 'marketing' && targetUnitId) {
			const campaigns = await db.select({
				name: marketingCampaigns.name,
				type: marketingCampaigns.type,
				status: marketingCampaigns.status,
				budget: marketingCampaigns.budget
			}).from(marketingCampaigns)
			  .where(eq(marketingCampaigns.unitId, targetUnitId))
			  .orderBy(desc(marketingCampaigns.createdAt))
			  .limit(5);

			const adSpend = await db.select({
				platform: adTrackers.platform,
				total_spend: sql`SUM(${adTrackers.spendAmount})`,
				total_conv: sql`SUM(${adTrackers.conversions})`
			}).from(adTrackers)
			  .where(eq(adTrackers.unitId, targetUnitId))
			  .groupBy(adTrackers.platform)
			  .orderBy(desc(sql`SUM(${adTrackers.spendAmount})`))
			  .limit(5);

			const vouchersList = await db.select({
				code: vouchers.code,
				discount_type: vouchers.discountType,
				discount_value: vouchers.discountValue,
				current_usage: vouchers.currentUsage,
				max_usage: vouchers.maxUsage,
				is_active: vouchers.isActive
			}).from(vouchers)
			  .where(and(
				eq(vouchers.unitId, targetUnitId),
				eq(vouchers.isActive, true)
			  )).limit(5);

			const leads = await db.select({
				cnt: sql`COUNT(*)`,
				transferred: sql`SUM(CASE WHEN ${marketingLeads.isTransferredToCrm} = 1 THEN 1 ELSE 0 END)`
			}).from(marketingLeads)
			  .innerJoin(landingPages, eq(landingPages.id, marketingLeads.landingPageId))
			  .where(eq(landingPages.unitId, targetUnitId));

			ctx += `\n[FOKUS PEMASARAN (MARKETING)]\n`;
			if (campaigns.length) ctx += `- Kampanye: ${campaigns.map(c => `${c.name} (${c.type}) - ${c.status} | Budget: ${fmtRp(c.budget)}`).join('; ')}\n`;
			if (adSpend.length) ctx += `- Ad Spend per Platform: ${adSpend.map(a => `${a.platform}: ${fmtRp(a.total_spend)}, ${a.total_conv} konversi`).join('; ')}\n`;
			if (vouchersList.length) ctx += `- Voucher Aktif: ${vouchersList.map(v => `${v.code} (${v.discount_value}${v.discount_type === 'PERCENTAGE' ? '%' : 'Rp'}) | Pemakaian: ${v.current_usage}/${v.max_usage || '∞'}`).join('; ')}\n`;
			if (leads[0]?.cnt) ctx += `- Leads Total: ${leads[0].cnt} | Sudah di CRM: ${leads[0].transferred}\n`;
			suggestions = ['Kampanye mana yang paling efektif?', 'Berapa leads bulan ini?', 'ROAS iklan Meta vs Google?'];
		}
		else if (intent === 'cs' && targetUnitId) {
			const tickets = await db.select({
				ticket_number: supportTickets.ticketNumber,
				subject: supportTickets.subject,
				priority: supportTickets.priority,
				status: supportTickets.status,
				created_at: supportTickets.createdAt
			}).from(supportTickets)
			  .where(eq(supportTickets.unitId, targetUnitId))
			  .orderBy(desc(supportTickets.createdAt))
			  .limit(10);

			const ticketStats = await db.select({
				status: supportTickets.status,
				cnt: sql`COUNT(*)`
			}).from(supportTickets)
			  .where(eq(supportTickets.unitId, targetUnitId))
			  .groupBy(supportTickets.status);

			ctx += `\n[FOKUS LAYANAN PELANGGAN (CS)]\n`;
			if (tickets.length) ctx += `- Tiket Terbaru: ${tickets.map(t => `#${t.ticket_number} - "${t.subject}" | ${t.priority} | ${t.status}`).join('; ')}\n`;
			if (ticketStats.length) ctx += `- Statistik: ${ticketStats.map(s => `${s.status}: ${s.cnt}`).join(', ')}\n`;
			suggestions = ['Berapa tiket urgent yang belum diselesaikan?', 'Tiket mana yang sudah lama tidak direspons?', 'Cek tiket pelanggan VIP'];
		}
		else if (intent === 'ecommerce' && targetUnitId) {
			const eOrders = await db.select({
				order_number: ecommerceOrders.orderNumber,
				customer_name: ecommerceOrders.customerName,
				total_amount: ecommerceOrders.totalAmount,
				payment_status: ecommerceOrders.paymentStatus,
				shipping_status: ecommerceOrders.shippingStatus,
				created_at: ecommerceOrders.createdAt
			}).from(ecommerceOrders)
			  .where(eq(ecommerceOrders.unitId, targetUnitId))
			  .orderBy(desc(ecommerceOrders.createdAt))
			  .limit(10);

			const eStats = await db.select({
				payment_status: ecommerceOrders.paymentStatus,
				cnt: sql`COUNT(*)`,
				total: sql`SUM(${ecommerceOrders.totalAmount})`
			}).from(ecommerceOrders)
			  .where(eq(ecommerceOrders.unitId, targetUnitId))
			  .groupBy(ecommerceOrders.paymentStatus);

			const eSettings = await db.select({
				storefront_name: ecommerceSettings.storefrontName,
				domain_slug: ecommerceSettings.domainSlug,
				is_active: ecommerceSettings.isActive
			}).from(ecommerceSettings)
			  .where(eq(ecommerceSettings.unitId, targetUnitId))
			  .limit(1);

			ctx += `\n[FOKUS E-COMMERCE]\n`;
			if (eSettings.length) ctx += `- Toko: ${eSettings[0].storefront_name} | URL: ${eSettings[0].domain_slug}.bizgrow.id | Status: ${eSettings[0].is_active ? 'BUKA' : 'TUTUP'}\n`;
			if (eStats.length) ctx += `- Statistik Order: ${eStats.map(s => `${s.payment_status}: ${s.cnt} order (${fmtRp(s.total)})`).join('; ')}\n`;
			if (eOrders.length) ctx += `- Order Terbaru: ${eOrders.slice(0, 5).map(o => `#${o.order_number} - ${o.customer_name} | ${fmtRp(o.total_amount)} | ${o.payment_status}`).join('; ')}\n`;
			suggestions = ['Berapa order pending yang belum dibayar?', 'Revenue toko online bulan ini?', 'Produk terlaris di toko online?'];
		}
		else if (intent === 'help') {
			ctx += `\n[PANDUAN NAVIGASI ERP]\n`;
			ctx += `Peta Fitur: Piutang → /piutang | Hutang → /hutang | Produk → /produk | Kasir → /pos | Karyawan → /hr | CRM → /crm | Jurnal → /jurnal-umum | Buku Besar → /buku-besar | Laporan → /laporan | Master Data → /master-data\n`;
			ctx += `Modul Baru: Pipeline → /sales/[slug]/pipeline | Quotation → /sales/[slug]/quotation | Target Sales → /sales/[slug]/target | Kampanye → /marketing/[slug]/campaign | Leads → /marketing/[slug]/leads | Voucher → /marketing/[slug]/voucher | Tiket CS → /customer-service/[slug]/tickets | Katalog Toko → /ecommerce/[slug]/katalog\n`;
			suggestions = ['Di mana pengaturan unit bisnis?', 'Cara input transaksi?', 'Cara buat sales order?'];
		}
		else {
			suggestions = ['Ringkasan keuangan hari ini', 'Stok produk menipis', 'Analisis laba rugi'];
		}
	} catch (e) {
		log.ai.error({ err: e.message, intent }, '[Chat] Dynamic context error');
	}

	return { ctx, suggestions };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST({ request, cookies }) {
	try {
		// 1. Auth
		const userId = await getCurrentUserId(cookies);
		if (!userId) {
			return json({ reply: 'Sesi tidak valid, silakan login ulang ya kak.' }, { status: 401 });
		}

		// 2. Parse body
		const { message, activeUnitSlug, history = [] } = await request.json();
		if (!message?.trim()) {
			return json({ reply: 'Pesan tidak boleh kosong.' }, { status: 400 });
		}

		// 3. Unit bisnis
		const unitsQuery = db.select({
			id: unitBisnis.id,
			nama_unit: unitBisnis.namaUnit,
			slug: unitBisnis.slug,
			modal_awal: unitBisnis.modalAwal,
			kategori: unitBisnis.kategori
		}).from(unitBisnis);

		const conditions = [eq(unitBisnis.userId, userId)];
		if (activeUnitSlug) {
			conditions.push(eq(unitBisnis.slug, activeUnitSlug));
		}
		const units = await unitsQuery.where(and(...conditions));

		if (units.length === 0) {
			return json({ reply: 'Data unit bisnis tidak ditemukan. Silakan buat unit bisnis terlebih dahulu ya kak.' });
		}
		const targetUnitId = activeUnitSlug ? units[0]?.id : null;

		// 4. Tanggal helper — semua pakai WIB (Asia/Jakarta, UTC+7)
		const pad = n => String(n).padStart(2, '0');
		const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
		const nowWIBDate = new Date(Date.now() + WIB_OFFSET_MS);
		const thisYear  = nowWIBDate.getUTCFullYear();
		const thisMonth = nowWIBDate.getUTCMonth() + 1; // 1-12
		const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
		const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;
		const thisMonthStart = `${thisYear}-${pad(thisMonth)}-01`;
		const lastMonthStart = `${lastMonthYear}-${pad(lastMonth)}-01`;
		const lastMonthEnd   = `${thisYear}-${pad(thisMonth)}-01`; // exclusive (< thisMonthStart)
		
		const queryTrxCondition = targetUnitId ? eq(transaksi.unitId, targetUnitId) : eq(transaksi.userId, userId);

		// 4a. Summary ALL TIME
		const allTimeRows = await db.select({
			masuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='MASUK' THEN ${transaksi.nominal} ELSE 0 END)`,
			keluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='KELUAR' THEN ${transaksi.nominal} ELSE 0 END)`,
			hpp: sql`SUM(COALESCE(${transaksi.hppTotal}, 0))`
		}).from(transaksi)
		  .where(queryTrxCondition);

		const totalMasuk  = Number(allTimeRows[0]?.masuk  || 0);
		const totalKeluar = Number(allTimeRows[0]?.keluar || 0);
		const totalHpp    = Number(allTimeRows[0]?.hpp    || 0);
		const saldoBersih = totalMasuk - totalKeluar;

		// 4b. Summary BULAN INI
		const bulanIniRows = await db.select({
			masuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='MASUK' THEN ${transaksi.nominal} ELSE 0 END)`,
			keluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='KELUAR' THEN ${transaksi.nominal} ELSE 0 END)`,
			jumlah: sql`COUNT(*)`
		}).from(transaksi)
		  .where(and(
			queryTrxCondition,
			sql`DATE(${transaksi.tanggal}) >= ${thisMonthStart}`
		  ));
		const bulanIniMasuk  = Number(bulanIniRows[0]?.masuk  || 0);
		const bulanIniKeluar = Number(bulanIniRows[0]?.keluar || 0);

		// 4c. Summary BULAN LALU
		const bulanLaluRows = await db.select({
			masuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='MASUK' THEN ${transaksi.nominal} ELSE 0 END)`,
			keluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='KELUAR' THEN ${transaksi.nominal} ELSE 0 END)`,
			jumlah: sql`COUNT(*)`
		}).from(transaksi)
		  .where(and(
			queryTrxCondition,
			sql`DATE(${transaksi.tanggal}) >= ${lastMonthStart}`,
			sql`DATE(${transaksi.tanggal}) < ${lastMonthEnd}`
		  ));
		const bulanLaluMasuk  = Number(bulanLaluRows[0]?.masuk  || 0);
		const bulanLaluKeluar = Number(bulanLaluRows[0]?.keluar || 0);
		const bulanLaluJumlah = Number(bulanLaluRows[0]?.jumlah || 0);

		// 4d. Tren 6 bulan (untuk pertanyaan tren/grafik)
		const trenRows = await db.select({
			tahun: sql`YEAR(${transaksi.tanggal})`,
			bulan: sql`MONTH(${transaksi.tanggal})`,
			masuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='MASUK' THEN ${transaksi.nominal} ELSE 0 END)`,
			keluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx})='KELUAR' THEN ${transaksi.nominal} ELSE 0 END)`
		}).from(transaksi)
		  .where(and(
			queryTrxCondition,
			sql`${transaksi.tanggal} >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`
		  ))
		  .groupBy(sql`YEAR(${transaksi.tanggal})`, sql`MONTH(${transaksi.tanggal})`)
		  .orderBy(sql`YEAR(${transaksi.tanggal})`, sql`MONTH(${transaksi.tanggal})`);

		const bulanNames = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
		const trenText = trenRows.length
			? trenRows.map(r => `${bulanNames[r.bulan]} ${r.tahun}: Masuk ${fmtRp(r.masuk)} | Keluar ${fmtRp(r.keluar)}`).join(' | ')
			: 'Belum ada data tren';

		// 4e. Snippet 20 transaksi terbaru (referensi kontekstual saja)
		const freshTrx = await db.select({
			kategori_trx: transaksi.kategoriTrx,
			nominal: transaksi.nominal,
			keterangan: transaksi.keterangan,
			tanggal: transaksi.tanggal,
			metode_bayar: transaksi.metodeBayar
		}).from(transaksi)
		  .where(queryTrxCondition)
		  .orderBy(desc(transaksi.tanggal))
		  .limit(20);

		// 5. Produk (stok rendah dulu)
		const queryProdCondition = targetUnitId ? eq(productsTable.unitId, targetUnitId) : eq(productsTable.userId, userId);
		const products = await db.select({
			nama: productsTable.nama,
			harga_jual: productsTable.hargaJual,
			stok: productsTable.stok,
			min_stok: productsTable.minStok
		}).from(productsTable)
		  .where(and(
			queryProdCondition,
			sql`${productsTable.deletedAt} IS NULL`
		  ))
		  .orderBy(asc(productsTable.stok))
		  .limit(20);

		// 7. Deteksi intent & load konteks dinamis
		const intent = detectIntent(message);
		const { ctx: dynamicContext, suggestions: dynamicSuggestions } = await loadDynamicContext(intent, userId, targetUnitId);

		// 8. Bangun prompt
		const businessCtx = units
			.map(u => `  • ${u.nama_unit} [${u.slug}] | Modal: ${fmtRp(u.modal_awal)} | Industri: ${u.kategori || 'Umum'}`)
			.join('\n');

		const financeSummary = [
			`• ALL TIME  : Masuk ${fmtRp(totalMasuk)} | Keluar ${fmtRp(totalKeluar)} | Saldo ${fmtRp(saldoBersih)} | HPP ${fmtRp(totalHpp)} | Gross Profit ${fmtRp(totalMasuk - totalHpp)}`,
			`• BULAN INI (${bulanNames[thisMonth]} ${thisYear}): Masuk ${fmtRp(bulanIniMasuk)} | Keluar ${fmtRp(bulanIniKeluar)} | Saldo ${fmtRp(bulanIniMasuk - bulanIniKeluar)}`,
			`• BULAN LALU (${bulanNames[lastMonth]} ${lastMonthYear}): Masuk ${fmtRp(bulanLaluMasuk)} | Keluar ${fmtRp(bulanLaluKeluar)} | Saldo ${fmtRp(bulanLaluMasuk - bulanLaluKeluar)} | ${bulanLaluJumlah} transaksi`,
		].join('\n');

		const trxSnippet = freshTrx.length
			? freshTrx.map(t => `[${fmtDate(t.tanggal)}] ${t.kategori_trx} ${fmtRp(t.nominal)} - ${t.keterangan || t.metode_bayar || '-'}`).join('\n  ')
			: 'Belum ada transaksi';

		const prodSnippet = products.length
			? products.map(p => `${p.nama} | Jual: ${fmtRp(p.harga_jual)} | Stok: ${p.stok}${p.stok <= p.min_stok ? ' ⚠️MENIPIS' : ''}`).join('\n  ')
			: 'Belum ada produk';

		// Unit context helpers
		const hasActiveUnit = Boolean(activeUnitSlug && units.length > 0);
		const activeUnit = hasActiveUnit ? units[0] : null;
		const slug = activeUnit?.slug ?? null;

		const navInstructions = hasActiveUnit && slug
			? `## INSTRUKSI NAVIGASI (Unit: ${activeUnit.nama_unit})
Akhiri jawaban dengan TEPAT 1-2 tombol aksi. Format: [Label Tombol](/path/halaman)
Halaman yang ADA dan VALID (jangan mengarang):
**Operasional:**
- /finance/${slug}/history | /finance/${slug}/laporan | /finance/${slug}/produk
- /finance/${slug}/pos | /finance/${slug}/hr | /finance/${slug}/crm
- /finance/${slug}/piutang | /finance/${slug}/hutang | /finance/${slug}/jurnal-umum
- /finance/${slug}/buku-besar | /finance/${slug}/master-data
- /finance/${slug}/settings
**Penjualan:**
- /sales/${slug} | /sales/${slug}/pipeline | /sales/${slug}/quotation
- /sales/${slug}/order | /sales/${slug}/target
**Pemasaran:**
- /marketing/${slug} | /marketing/${slug}/campaign | /marketing/[slug]/leads | /marketing/[slug]/voucher
**Customer Service:**
- /customer-service/${slug} | /customer-service/${slug}/tickets
**E-Commerce:**
- /ecommerce/${slug} | /ecommerce/${slug}/katalog | /ecommerce/${slug}/integrasi | /ecommerce/${slug}/landing-page`
			: `## INSTRUKSI NAVIGASI (Tanpa Unit Aktif)
JANGAN buat link /finance/[slug]/... karena unit belum dipilih.
Gunakan hanya: [Pilih Unit Bisnis](/finance) atau [Beranda](/beranda)
Untuk panduan navigasi: jelaskan nama menu saja, tanpa link.`;

		const systemPrompt = `Kamu adalah **Bizgrow AI** — asisten ERP cerdas untuk UMKM Indonesia.
Gaya bicara: ramah, analitis, padat, gunakan sapaan "kak". Bahasa Indonesia natural.
PENTING: Jawab SATU KALI SAJA. Jangan ulangi jawaban yang sama.

## TANGGAL HARI INI
${bulanNames[thisMonth]} ${thisYear} (${thisMonthStart} hingga sekarang)
Bulan lalu: ${bulanNames[lastMonth]} ${lastMonthYear}

## UNIT BISNIS AKTIF
${hasActiveUnit ? `${activeUnit.nama_unit} [slug: ${slug}] | Industri: ${activeUnit.kategori || 'Umum'}` : 'Belum dipilih'}
Semua unit: ${units.map(u => u.nama_unit).join(', ')}

## DATA KEUANGAN${hasActiveUnit ? ` — ${activeUnit.nama_unit}` : ' — Semua Unit'}
${financeSummary}

## TREN 6 BULAN TERAKHIR
${trenText}

## 20 TRANSAKSI TERAKHIR (referensi kontekstual)
  ${trxSnippet}

## PRODUK & STOK
  ${prodSnippet}
${dynamicContext}
${navInstructions}

## ATURAN PENTING
- Data keuangan di atas SUDAH AKURAT dari database langsung — gunakan angka ini, jangan mengarang
- Untuk pertanyaan bulan lalu/ini → gunakan data BULAN LALU / BULAN INI di atas, bukan all time
- Untuk pertanyaan tren → gunakan data TREN 6 BULAN
- Jika ditanya filter tanggal spesifik yang tidak ada di data → arahkan ke [Riwayat Transaksi](/finance/${slug || '...'}/history) atau [Laporan](/finance/${slug || '...'}/laporan)
- JANGAN mengarang route/URL selain yang ada di daftar halaman valid di atas
- JANGAN menulis jawaban dua kali

## GRAFIK
Jika diminta grafik, gunakan data tren di atas. Format:
\`\`\`chart
{"type":"bar","data":{"labels":[...],"datasets":[{"label":"...","data":[...]}]},"options":{"responsive":true}}
\`\`\`

## GUARDRAIL
Aksi hapus/bulk/tutup buku: wajib konfirmasi dulu.`;

		// Batasi history max 16 pesan (8 turn)
		const cleanHistory = history
			.slice(-16)
			.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: String(h.content || '') }));

		// 9. Panggil Groq
		const groqResp = await groqChatCompletion({
			model: 'llama-3.3-70b-versatile',
			messages: [
				{ role: 'system', content: systemPrompt },
				...cleanHistory,
				{ role: 'user', content: message }
			],
			temperature: 0.35,
			max_tokens: 1200
		});

		let aiReply = groqResp.choices?.[0]?.message?.content
			?? 'Maaf kak, AI sedang sibuk. Coba lagi sebentar ya! 😊';

		// 10. Ekstrak chart JSON jika ada
		let chartData = null;
		const chartMatch = aiReply.match(/```chart\s*(\{[\s\S]*?\})\s*```/);
		if (chartMatch) {
			try {
				chartData = JSON.parse(chartMatch[1]);
				aiReply = aiReply.replace(/```chart[\s\S]*?```/, '').trim();
			} catch { /* biarkan teks apa adanya */ }
		}

		return json({
			reply: aiReply,
			suggestions: dynamicSuggestions,
			chartData,
			intent // untuk debugging di dev
		});

	} catch (err) {
		log.ai.error({ err }, '[Chat API]');
		return json({ reply: 'Terjadi kesalahan server. Silakan coba lagi ya kak.' }, { status: 500 });
	}
}
