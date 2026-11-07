/**
 * Pemeriksa kontrak: membaca model Kotlin (Models.kt) & daftar panggilan GET (UpstyleApi.kt) dari repo mobile,
 * lalu membandingkannya dengan balasan handler server — menemukan properti wajib yang hilang, tipe yang salah,
 * dan daftar yang tak berbentuk array (penyebab layar kosong/crash di app). Kembali null bila sumber Kotlin tak ada.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '../multi_platform/bizgrow-kmp/shared/src/commonMain/kotlin/com/upstyle/bizgrow');

export function muatKotlin() {
	const fModels = path.join(ROOT, 'data/Models.kt');
	const fApi = path.join(ROOT, 'api/UpstyleApi.kt');
	if (!fs.existsSync(fModels) || !fs.existsSync(fApi)) return null;
	return { classes: parseKelas(fs.readFileSync(fModels, 'utf8')), endpoints: parseEndpoint(fs.readFileSync(fApi, 'utf8')) };
}

/** @param {string} src */
function parseKelas(src) {
	/** @type {Record<string, {name: string, type: string, wajib: boolean}[]>} */
	const kelas = {};
	for (const m of src.matchAll(/data class (\w+)\s*(?:<[^>]*>)?\(/g)) {
		const nama = m[1];
		let i = (m.index ?? 0) + m[0].length;
		let depth = 1;
		const mulai = i;
		for (; i < src.length && depth > 0; i++) {
			if (src[i] === '(') depth++;
			else if (src[i] === ')') depth--;
		}
		const isi = src.slice(mulai, i - 1);
		const bagian = [];
		let d = 0, cur = '';
		for (const ch of isi) {
			if ('(<['.includes(ch)) d++;
			if (')>]'.includes(ch)) d--;
			if (ch === ',' && d === 0) { bagian.push(cur); cur = ''; } else cur += ch;
		}
		bagian.push(cur);
		kelas[nama] = [];
		for (const p0 of bagian) {
			const p = p0.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '').trim();
			const mm = p.match(/(?:val|var)\s+(\w+)\s*:\s*([^=]+?)\s*(=[\s\S]*)?$/);
			if (!mm) continue;
			const sn = p.match(/@SerialName\("([^"]+)"\)/);
			const tipe = mm[2].trim();
			kelas[nama].push({ name: sn ? sn[1] : mm[1], type: tipe, wajib: !mm[3] && !tipe.endsWith('?') });
		}
	}
	return kelas;
}

/** @param {string} src */
function parseEndpoint(src) {
	/** @type {{ fn: string, path: string, tipe: string, query: Record<string, string> }[]} */
	const out = [];
	const bagian = src.split(/\n\s*(?:private )?suspend fun /).slice(1);
	for (const b of bagian) {
		const fn = b.match(/^(\w+)/)?.[1] || '?';
		const get = b.match(/client\.get\("([^"]+)"/);
		const ret = b.match(/\)\s*:\s*ApiResponse<([^=\n{]+?)>\s*(?:=|\{)/);
		if (!get || !ret) continue;
		/** @type {Record<string, string>} */
		const query = {};
		for (const q of b.matchAll(/parameter\("(\w+)",\s*([^)]+?)\)/g)) query[q[1]] = q[2].trim();
		out.push({ fn, path: get[1], tipe: ret[1].trim(), query });
	}
	return out;
}

/**
 * @param {any} nilai balasan server (isi `data`)
 * @param {string} tipe tipe Kotlin, mis. "List<Receivable>" / "Product" / "Map<String, String>"
 * @param {Record<string, {name: string, type: string, wajib: boolean}[]>} kelas
 * @param {string} jejak
 * @param {string[]} out
 * @param {number} dalam
 */
export function periksa(nilai, tipe, kelas, jejak, out, dalam = 0) {
	const t = tipe.trim();
	const nullable = t.endsWith('?');
	const inti = t.replace(/\?$/, '');
	if (nilai === null || nilai === undefined) {
		if (!nullable) out.push(`${jejak || '(akar)'}: ${nilai === null ? 'null' : 'hilang'} padahal tipe ${t}`);
		return;
	}
	if (dalam > 4) return;
	const list = inti.match(/^List<(.+)>$/);
	if (list) {
		if (!Array.isArray(nilai)) { out.push(`${jejak || '(akar)'}: harus array (${t}) tapi ${typeof nilai}`); return; }
		nilai.slice(0, 3).forEach((e, i) => periksa(e, list[1], kelas, `${jejak}[${i}]`, out, dalam + 1));
		return;
	}
	if (/^(Map|JsonElement|JsonObject|JsonArray|Any)\b/.test(inti)) return;
	if (inti === 'Boolean') { if (typeof nilai !== 'boolean') out.push(`${jejak}: Boolean tapi ${JSON.stringify(nilai)}`); return; }
	if (inti === 'Int' || inti === 'Long') {
		if (typeof nilai === 'number' ? !Number.isInteger(nilai) : !(typeof nilai === 'string' && /^-?\d+$/.test(nilai))) out.push(`${jejak}: ${inti} tapi ${JSON.stringify(nilai)}`);
		return;
	}
	if (inti === 'Double' || inti === 'Float') {
		if (typeof nilai === 'number' ? false : !(typeof nilai === 'string' && nilai.trim() !== '' && !Number.isNaN(Number(nilai)))) out.push(`${jejak}: ${inti} tapi ${JSON.stringify(nilai)}`);
		return;
	}
	if (inti === 'String') { if (typeof nilai === 'object') out.push(`${jejak}: String tapi objek`); return; }
	const props = kelas[inti];
	if (!props) return;
	if (typeof nilai !== 'object' || Array.isArray(nilai)) { out.push(`${jejak || '(akar)'}: harus objek ${inti}`); return; }
	for (const p of props) {
		const v = nilai[p.name];
		if (v === undefined) { if (p.wajib) out.push(`${jejak ? jejak + '.' : ''}${p.name}: WAJIB (${inti}) tapi tidak dikirim server`); continue; }
		if (v === null && !p.wajib) continue; // null → default (coerceInputValues di app)
		periksa(v, p.type, kelas, `${jejak ? jejak + '.' : ''}${p.name}`, out, dalam + 1);
	}
}
