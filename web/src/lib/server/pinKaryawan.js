/**
 * PIN karyawan — satu cara simpan & periksa untuk web dan mobile.
 *
 * Dulu: form web menyimpan PIN sebagai hash, API mobile menyimpannya terenkripsi (bisa dibaca balik)
 * dan mengirim PIN asli di daftar karyawan; verifikasi di kasir web mendekripsi sehingga PIN karyawan
 * yang dibuat dari web selalu dianggap salah, dan saat terjadi galat verifikasi malah meloloskan.
 * Sekarang PIN selalu disimpan sebagai hash Argon2 dan tidak pernah dikirim ke klien.
 */
import { hashEmployeePassword, verifyEmployeePassword } from '$lib/server/employeePassword';
import { decryptField } from '$lib/server/encryption';

/** PIN sah: 4 sampai 6 digit angka */
export const POLA_PIN = /^\d{4,6}$/;

/** @param {unknown} pin */
export function pinSah(pin) {
	return typeof pin === 'string' && POLA_PIN.test(pin);
}

/** @param {string} pin */
export async function hashPin(pin) {
	return hashEmployeePassword(pin);
}

/**
 * Cocokkan PIN dengan nilai tersimpan (hash Argon2, atau data lama yang masih terenkripsi).
 * @param {string | null | undefined} tersimpan
 * @param {unknown} pin
 * @returns {Promise<{ cocok: boolean, perluHashUlang: boolean }>}
 */
export async function cocokkanPin(tersimpan, pin) {
	const masukan = String(pin ?? '');
	if (!tersimpan || !POLA_PIN.test(masukan)) return { cocok: false, perluHashUlang: false };
	if (tersimpan.startsWith('$argon2')) {
		const { valid } = await verifyEmployeePassword(tersimpan, masukan);
		return { cocok: valid, perluHashUlang: false };
	}
	// Data lama: terenkripsi (API mobile) — decryptField mengembalikan nilai asli bila gagal dekripsi
	let lama = '';
	try {
		lama = String(decryptField(tersimpan, true) ?? '');
	} catch {
		lama = '';
	}
	const cocok = POLA_PIN.test(lama) && lama === masukan;
	return { cocok, perluHashUlang: cocok };
}
