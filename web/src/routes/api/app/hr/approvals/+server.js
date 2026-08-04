import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { approvalRequests, approvalLogs, employees, riwayatAksi, transaksi } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET: Fetch approval requests for reimbursements and loans
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const type = url.searchParams.get('type') || 'all'; // all, reimbursement, loan
        const status = url.searchParams.get('status'); // PENDING, APPROVED, REJECTED

        let conditions = [
            eq(approvalRequests.unitId, Number(unitId))
        ];

        if (type === 'reimbursement') {
            conditions.push(eq(approvalRequests.module, 'REIMBURSEMENT'));
        } else if (type === 'loan') {
            conditions.push(eq(approvalRequests.module, 'LOAN'));
        } else {
            // All HR approvals
            conditions.push(sql`${approvalRequests.module} IN ('REIMBURSEMENT', 'LOAN', 'LEAVE', 'OVERTIME')`);
        }

        if (status) {
            conditions.push(eq(approvalRequests.status, status));
        }

        const approvals = await db.select()
            .from(approvalRequests)
            .where(and(...conditions))
            .orderBy(desc(approvalRequests.id))
            .limit(100);

        // Get employee names for requesters
        const requestersIds = [...new Set(approvals.map(a => a.requesterId).filter(Boolean))];
        const employeeNames = {};
        
        if (requestersIds.length > 0) {
            const employeesList = await db.select()
                .from(employees)
                .where(sql`${employees.id} IN (${requestersIds.map(id => `'${id}'`).join(',')})`);
            
            employeesList.forEach(emp => {
                employeeNames[emp.id] = emp.fullName;
            });
        }

        const data = approvals.map(a => ({
            id: a.id,
            module: a.module,
            referenceId: a.referenceId,
            requesterId: Number(a.requesterId || 0),
            requesterName: employeeNames[a.requesterId] || 'Unknown',
            actionType: a.actionType,
            dataBefore: a.dataBefore || {},
            dataAfter: a.dataAfter || {},
            currentLevel: a.currentLevel ?? 0,
            maxLevel: a.maxLevel ?? 0,
            status: a.status,
            note: a.note || '',
            createdAt: a.createdAt || '',
            updatedAt: a.updatedAt || ''
        }));

        const grouped = {
            pending: data.filter(x => x.status === 'PENDING'),
            approved: data.filter(x => x.status === 'APPROVED'),
            rejected: data.filter(x => x.status === 'REJECTED')
        };

        return json({ success: true, approvals: grouped });

    } catch (err) {
        log.api.error({ err }, 'GET hr/approvals error');
        return json({ success: false, message: 'Gagal mengambil data approval' }, { status: 500 });
    }
}

// POST: Create reimbursement/loan approval request
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'create-reimbursement-request') {
            const schema = z.object({
                action: z.literal('create-reimbursement-request'),
                unitId: z.coerce.number().int().positive(),
                employeeId: z.coerce.number().int().positive(),
                amount: z.coerce.number().min(0),
                category: z.string().min(1),
                description: z.string().min(1),
                receiptUrl: z.string().optional(),
                expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input reimbursement tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { unitId, employeeId, amount, category, description, receiptUrl, expenseDate } = body;

            const requestData = {
                employeeId,
                amount,
                category,
                description,
                receiptUrl: receiptUrl || null,
                expenseDate,
                requestedAt: new Date().toISOString()
            };

            const [result] = await db.insert(approvalRequests).values({
                module: 'REIMBURSEMENT',
                referenceId: `REIMB-${Date.now()}`,
                requesterId: String(employeeId),
                unitId: Number(unitId),
                actionType: 'CREATE',
                dataBefore: null,
                dataAfter: requestData,
                currentLevel: 1,
                maxLevel: 1,
                status: 'PENDING',
                note: `Reimbursement request: ${category} - Rp ${amount.toLocaleString('id-ID')}`
            });

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Permintaan reimbursement dibuat: ${category} - Rp ${amount.toLocaleString('id-ID')}`,
                kategori: 'HR',
                tipe: 'info'
            });

            return json({ 
                success: true, 
                message: 'Permintaan reimbursement berhasil dibuat',
                data: { id: result.insertId, referenceId: `REIMB-${Date.now()}` }
            });
        }

        if (action === 'create-loan-request') {
            const schema = z.object({
                action: z.literal('create-loan-request'),
                unitId: z.coerce.number().int().positive(),
                employeeId: z.coerce.number().int().positive(),
                amount: z.coerce.number().min(0),
                purpose: z.string().min(1),
                repaymentMonths: z.coerce.number().int().min(1).max(60),
                monthlyDeduction: z.coerce.number().min(0)
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input loan tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { unitId, employeeId, amount, purpose, repaymentMonths, monthlyDeduction } = body;

            const requestData = {
                employeeId,
                amount,
                purpose,
                repaymentMonths,
                monthlyDeduction,
                requestedAt: new Date().toISOString()
            };

            const [result] = await db.insert(approvalRequests).values({
                module: 'LOAN',
                referenceId: `LOAN-${Date.now()}`,
                requesterId: String(employeeId),
                unitId: Number(unitId),
                actionType: 'CREATE',
                dataBefore: null,
                dataAfter: requestData,
                currentLevel: 1,
                maxLevel: 1,
                status: 'PENDING',
                note: `Loan request: ${purpose} - Rp ${amount.toLocaleString('id-ID')}`
            });

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Permintaan pinjaman dibuat: ${purpose} - Rp ${amount.toLocaleString('id-ID')}`,
                kategori: 'HR',
                tipe: 'info'
            });

            return json({ 
                success: true, 
                message: 'Permintaan pinjaman berhasil dibuat',
                data: { id: result.insertId, referenceId: `LOAN-${Date.now()}` }
            });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'POST hr/approvals error');
        return json({ success: false, message: 'Gagal membuat approval request: ' + err.message }, { status: 500 });
    }
}

// PUT: Approve/reject reimbursement/loan requests
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'approve-request') {
            const schema = z.object({
                action: z.literal('approve-request'),
                requestId: z.coerce.number().int().positive(),
                unitId: z.coerce.number().int().positive(),
                note: z.string().optional(),
                createTransaction: z.boolean().default(true)
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input approval tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { requestId, unitId, note, createTransaction } = body;

            const request = await db.query.approvalRequests.findFirst({
                where: eq(approvalRequests.id, Number(requestId))
            });

            if (!request) {
                return json({ success: false, message: 'Request tidak ditemukan' }, { status: 404 });
            }

            await db.transaction(async (tx) => {
                // Update approval status
                await tx.update(approvalRequests)
                    .set({ 
                        status: 'APPROVED',
                        note: note || 'Approved',
                        updatedAt: new Date().toISOString()
                    })
                    .where(eq(approvalRequests.id, Number(requestId)));

                // Log approval
                await tx.insert(approvalLogs).values({
                    requestId: Number(requestId),
                    approverId: String(userId),
                    action: 'APPROVE',
                    notes: note || 'Approved',
                    createdAt: new Date().toISOString()
                });

                // Create financial transaction if needed
                if (createTransaction && request.dataAfter) {
                    const data = request.dataAfter;
                    const amount = data.amount || 0;
                    
                    if (amount > 0) {
                        let description = '';
                        if (request.module === 'REIMBURSEMENT') {
                            description = `Reimbursement: ${data.category || 'Expense'}`;
                        } else if (request.module === 'LOAN') {
                            description = `Employee Loan: ${data.purpose || 'Loan'}`;
                        }

                        await tx.insert(transaksi).values({
                            userId,
                            unitId: Number(unitId),
                            keterangan: description,
                            nominal: String(amount),
                            totalHarga: String(amount),
                            kategoriTrx: 'KELUAR',
                            metodeBayar: 'TRANSFER'
                        });
                    }
                }

                // Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `${request.module} request disetujui: ${request.referenceId}`,
                    kategori: 'HR',
                    tipe: 'success'
                });
            });

            return json({ success: true, message: 'Request berhasil disetujui' });
        }

        if (action === 'reject-request') {
            const schema = z.object({
                action: z.literal('reject-request'),
                requestId: z.coerce.number().int().positive(),
                unitId: z.coerce.number().int().positive(),
                reason: z.string().min(1, 'Alasan penolakan wajib diisi')
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input rejection tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { requestId, unitId, reason } = body;

            const request = await db.query.approvalRequests.findFirst({
                where: eq(approvalRequests.id, Number(requestId))
            });

            if (!request) {
                return json({ success: false, message: 'Request tidak ditemukan' }, { status: 404 });
            }

            await db.transaction(async (tx) => {
                // Update approval status
                await tx.update(approvalRequests)
                    .set({ 
                        status: 'REJECTED',
                        note: reason,
                        updatedAt: new Date().toISOString()
                    })
                    .where(eq(approvalRequests.id, Number(requestId)));

                // Log rejection
                await tx.insert(approvalLogs).values({
                    requestId: Number(requestId),
                    approverId: String(userId),
                    action: 'REJECT',
                    notes: reason,
                    createdAt: new Date().toISOString()
                });

                // Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `${request.module} request ditolak: ${request.referenceId}`,
                    kategori: 'HR',
                    tipe: 'warning'
                });
            });

            return json({ success: true, message: 'Request berhasil ditolak' });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'PUT hr/approvals error');
        return json({ success: false, message: 'Gagal memproses approval: ' + err.message }, { status: 500 });
    }
}

// DELETE: Delete approval request (only if pending)
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const requestId = url.searchParams.get('requestId');
    const unitId = url.searchParams.get('unitId');

    if (!requestId) {
        return json({ success: false, message: 'requestId wajib diisi' }, { status: 400 });
    }

    try {
        const approvalRequest = await db.query.approvalRequests.findFirst({
            where: eq(approvalRequests.id, Number(requestId))
        });

        if (!approvalRequest) {
            return json({ success: false, message: 'Request tidak ditemukan' }, { status: 404 });
        }

        if (approvalRequest.status !== 'PENDING') {
            return json({ 
                success: false, 
                message: 'Hanya request yang pending yang dapat dihapus' 
            }, { status: 400 });
        }

        await db.delete(approvalRequests)
            .where(eq(approvalRequests.id, Number(requestId)));

        await db.insert(riwayatAksi).values({
            userId,
            unitId: Number(unitId),
            pesan: `${approvalRequest.module} request dibatalkan: ${approvalRequest.referenceId}`,
            kategori: 'HR',
            tipe: 'info'
        });

        return json({ success: true, message: 'Request berhasil dihapus' });

    } catch (err) {
        log.api.error({ err }, 'DELETE hr/approvals error');
        return json({ success: false, message: 'Gagal menghapus request' }, { status: 500 });
    }
}