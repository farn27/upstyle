/**
 * Laporan POS (/finance/[slug]/pos/reports): kolom TOTAL dan "Total Nominal" pada detail
 * harus membaca field `total` yang dikirim load(). Regresi: dulu membaca `nominal`
 * (tidak pernah dikirim server) sehingga tampil "Rp NaN".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../routes/(app)/finance/[slug]/pos/reports/', import.meta.url));
const halaman = readFileSync(dir + '+page.svelte', 'utf8');
const server = readFileSync(dir + '+page.server.js', 'utf8');

describe('Laporan POS', () => {
	it('server mengirim total per transaksi', () => {
		expect(server).toMatch(/total:\s*Number\(order\.total\)/);
	});

	it('tampilan tidak membaca field yang tidak dikirim server', () => {
		const dipakai = new Set([...halaman.matchAll(/\b(?:trx|selectedTrx)\.(\w+)/g)].map((m) => m[1]));
		expect(dipakai.has('nominal')).toBe(false);
		expect(dipakai.has('total')).toBe(true);
	});
});
