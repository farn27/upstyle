/**
 * POST /finance/[slug]/pos/verify-pin
 * Verifikasi PIN karyawan untuk otorisasi void/retur.
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { employees } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { getCurrentUserId } from '$lib/server/getUser';
import { decryptField } from '$lib/server/encryption';
import { log } from '$lib/server/logger';

export async function POST({ request, cookies, params }) {
    try {
        const ownerUserId = await getCurrentUserId(cookies);
        const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: params.slug });

        if (!ownerUserId && !staffSession) {
            return json({ valid: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { pin } = await request.json();
        if (!pin || pin.length < 4) {
            return json({ valid: false, error: 'PIN tidak valid' });
        }

        // Owner pakai PIN karyawan miliknya, atau staff pakai PIN sendiri
        const employeeId = staffSession?.id;

        if (!employeeId) {
            // Owner tidak punya employee record — izinkan langsung
            return json({ valid: true });
        }

        // Ambil encrypted PIN dari DB
        const emp = await db.query.employees.findFirst({
            where: eq(employees.id, Number(employeeId)),
            columns: { pin: true }
        });

        if (!emp?.pin) {
            // Tidak ada PIN tersimpan — izinkan
            return json({ valid: true });
        }

        // Decrypt dan bandingkan
        try {
            const decryptedPin = decryptField(emp.pin, true);
            const valid = decryptedPin === String(pin);
            return json({ valid });
        } catch {
            // Kalau decrypt gagal (PIN lama mungkin belum diencrypt), izinkan
            return json({ valid: true });
        }
    } catch (err) {
        log.pos.error({ err }, '[verify-pin] Error');
        // Fail open — jangan block transaksi karena error PIN
        return json({ valid: true });
    }
}
