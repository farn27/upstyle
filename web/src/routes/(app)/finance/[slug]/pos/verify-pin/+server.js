import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { employees } from '$lib/server/schema';
import { and, eq } from 'drizzle-orm';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { cocokkanPin, hashPin } from '$lib/server/pinKaryawan';
import { checkRateLimit } from '$lib/server/rateLimit';
import { log } from '$lib/server/logger';

/**
 * POST /finance/[slug]/pos/verify-pin — otorisasi aksi kasir (mis. void) dengan PIN karyawan.
 * Pemilik unit yang sedang login tidak memakai PIN (hooks memastikan ia pemilik unit ini).
 * Untuk staf: PIN wajib cocok. Galat apa pun = DITOLAK (dulu galat/PIN kosong malah meloloskan).
 */
export async function POST({ request, cookies, params, locals }) {
    try {
        const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: params.slug });
        if (!locals.user && !staffSession) {
            return json({ valid: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Pemilik (bukan staf): tidak perlu PIN
        if (!staffSession) return json({ valid: true });

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ valid: false, error: 'Data tidak valid' }, { status: 400 });
        }
        const pin = String(body?.pin ?? '');

        // Cegah tebak-tebakan PIN: 5 percobaan per 15 menit per karyawan
        const rl = await checkRateLimit({ key: String(staffSession.id), prefix: 'rl:pos:pin', limit: 5, windowSec: 15 * 60 });
        if (!rl.allowed) {
            return json({ valid: false, error: 'Terlalu banyak percobaan PIN. Coba lagi nanti.' }, { status: 429 });
        }

        const [emp] = await db.select({ id: employees.id, pin: employees.pin })
            .from(employees)
            .where(and(eq(employees.id, Number(staffSession.id)), eq(employees.companyId, staffSession.unit_id)))
            .limit(1);
        if (!emp?.pin) {
            return json({ valid: false, error: 'PIN belum diatur. Minta pemilik mengatur PIN Anda di menu SDM.' });
        }

        const { cocok, perluHashUlang } = await cocokkanPin(emp.pin, pin);
        if (cocok && perluHashUlang) {
            // PIN lama (terenkripsi) diganti hash saat pertama kali cocok
            await db.update(employees).set({ pin: await hashPin(pin) }).where(eq(employees.id, emp.id)).catch(() => {});
        }
        return json({ valid: cocok, ...(cocok ? {} : { error: 'PIN salah' }) });
    } catch (err) {
        log.pos.error({ err }, '[verify-pin] Error');
        return json({ valid: false, error: 'Verifikasi PIN gagal' }, { status: 500 });
    }
}
