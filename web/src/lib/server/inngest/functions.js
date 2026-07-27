import { inngest } from "$lib/server/inngest";
import { db } from "$lib/server/drizzle";
import { products } from "$lib/server/schema";
import { sql } from "drizzle-orm";

// Lazy import Redis and Pusher to avoid blocking SSR
const getRedis = () => import("$lib/server/redis").then(m => m.redis).catch(() => null);
const getPusher = () => import("$lib/server/pusher").then(m => m.pusherServer).catch(() => null);

// 1. Membersihkan cache Redis saat ada perubahan transaksi
export const redisCleaner = inngest.createFunction(
  { id: "clean-redis-cache", triggers: [{ event: "app/transaction.changed" }] },
  async ({ event, step }) => {
    const { userId, slug } = event.data;

    await step.run("delete-redis-keys", async () => {
        const redis = await getRedis();
        if (!redis) return { status: "success", cleared: false, reason: "Redis not configured" };

        const keys = await redis.keys(`*:${userId}:${slug}:*`);
        if (keys.length > 0) {
            await redis.del(...keys);

            const pusher = await getPusher();
            if (pusher) {
                await pusher.trigger('finance-channel', 'cache-cleared', {
                    userId,
                    slug
                });
            }

            return `Sapu ${keys.length} keys selesai!`;
        }
    });

    return { status: "success", cleared: true };
  }
);

// 2. Generate Laporan Keuangan (Long-running process)
export const generateReportJob = inngest.createFunction(
    { id: "generate-report", triggers: [{ event: "finance/report.generate" }] },
    async ({ event, step }) => {
        const { unitId, slug, filter, email } = event.data;

        // Step 1: Simulasi pengolahan data yang lama
        const reportUrl = await step.run("compile-and-upload-report", async () => {
            // Simulasi proses query Drizzle yang berat dan pembuatan Excel
            await new Promise(resolve => setTimeout(resolve, 5000));
            return `https://storage.upstyle.id/reports/report_${unitId}_${Date.now()}.xlsx`;
        });

        // Step 2: Kirim notifikasi via Pusher ke klien (Optimistic / Realtime update)
        await step.run("notify-user", async () => {
            const pusher = await getPusher();
            if (pusher) {
                await pusher.trigger(`finance-${slug}`, 'report-ready', {
                    message: `Laporan keuangan Anda sudah siap diunduh!`,
                    downloadUrl: reportUrl
                });
            }
        });

        return { status: "success", url: reportUrl };
    }
);

// 3. Notifikasi Slip Gaji via WhatsApp & In-app
export const payrollNotificationJob = inngest.createFunction(
    { id: "payroll-notification", triggers: [{ event: "hr/payroll.generated" }] },
    async ({ event, step }) => {
        const { payrollIds, unitId, slug } = event.data;

        await step.run("send-whatsapp-notifications", async () => {
            console.log(`[WA] Mengirim slip gaji untuk payroll IDs: ${payrollIds.join(', ')}`);
            // Simulasi API call ke Fonnte/Wablas
            await new Promise(resolve => setTimeout(resolve, 3000));
        });

        await step.run("notify-admin-dashboard", async () => {
            const pusher = await getPusher();
            if (pusher) {
                await pusher.trigger(`finance-${slug}`, 'payroll-notified', {
                    message: `Berhasil mengirim ${payrollIds.length} slip gaji via WhatsApp`
                });
            }
        });

        return { status: "success", count: payrollIds.length };
    }
);

// 4. Cron Job: Stock Alert (berjalan otomatis tanpa di-trigger manual)
export const stockAlertCron = inngest.createFunction(
    { id: "stock-alert-cron", triggers: [{ cron: "0 8 * * *" }] }, // Jam 8 Pagi setiap hari
    async ({ step }) => {
        // Step 1: Query produk yang stoknya menipis
        const lowStockProducts = await step.run("query-low-stock", async () => {
            // Kita gunakan raw sql condition agar lebih fleksibel membandingkan 2 kolom
            const lowStock = await db.query.products.findMany({
                where: sql`stok <= min_stok AND stok > 0`, 
                with: { unitBisni: true }
            });
            return lowStock;
        });

        // Step 2: Kirim alert berdasarkan unitnya
        if (lowStockProducts.length > 0) {
            await step.run("send-alerts", async () => {
                const alertsByUnit = {};
                for (const p of lowStockProducts) {
                    if (!alertsByUnit[p.unitId]) alertsByUnit[p.unitId] = [];
                    alertsByUnit[p.unitId].push(p.nama);
                }

                const pusher = await getPusher();
                if (pusher) {
                    for (const [unitId, productNames] of Object.entries(alertsByUnit)) {
                        await pusher.trigger(`private-unit-${unitId}`, 'stock-alert', {
                            message: `Peringatan: ${productNames.length} produk stoknya hampir habis!`,
                            products: productNames
                        });
                    }
                }
            });
        }

        return { status: "success", count: lowStockProducts.length };
    }
);

// ─── SPRINT 2 FUNCTIONS ──────────────────────────────────────────────────────
import { supportTickets, employees, riwayatAksi, salesOrders, crmContacts } from "$lib/server/schema";
import { eq, and } from "drizzle-orm";

// 5. Sales Order Status Changed — Notifikasi + Log
export const salesOrderStatusChanged = inngest.createFunction(
    { id: "sales-order-status-changed", triggers: [{ event: "sales/order.status.changed" }] },
    async ({ event, step }) => {
        const { unitId, orderId, status, slug } = event.data;

        await step.run("log-order-status", async () => {
            await db.insert(riwayatAksi).values({
                userId: event.data.userId,
                unitId,
                pesan: `Sales Order #${orderId} diubah ke status: ${status}`,
                tipe: status === 'CLOSED' ? 'success' : 'info',
                kategori: 'SALES',
                link: `/sales/${slug}/order`
            });
        });

        await step.run("notify-realtime", async () => {
            const pusher = await getPusher();
            if (pusher) {
                await pusher.trigger(`sales-${slug}`, 'order-status-changed', {
                    orderId, status,
                    message: `Order #${orderId} → ${status}`
                });
            }
        });

        // Jika order CLOSED, invalidate semua cache terkait
        if (status === 'CLOSED') {
            await step.run("invalidate-cache", async () => {
                const redis = await getRedis();
                if (redis) {
                    const keys = await redis.keys(`sales_*:${unitId}:*`);
                    if (keys.length > 0) await redis.del(...keys);
                }
            });
        }

        return { handled: true, orderId, status };
    }
);

// 6. CS Ticket Created — Notifikasi ke admin
export const csTicketCreated = inngest.createFunction(
    { id: "cs-ticket-created", triggers: [{ event: "cs/ticket.created" }] },
    async ({ event, step }) => {
        const { unitId, slug, subject, priority } = event.data;

        await step.run("notify-admin-realtime", async () => {
            const pusher = await getPusher();
            if (pusher) {
                await pusher.trigger(`cs-${slug}`, 'ticket-new-notification', {
                    subject, priority,
                    message: `Tiket baru: "${subject}" — Prioritas: ${priority}`
                });
            }
        });

        // Jika URGENT, kirim notifikasi lebih menonjol
        if (priority === 'URGENT') {
            await step.run("urgent-alert", async () => {
                const pusher = await getPusher();
                if (pusher) {
                    await pusher.trigger(`channel-bizgrow`, 'notif-baru', {
                        id: Date.now(),
                        unitId,
                        pesan: `🚨 URGENT: Tiket CS baru — "${subject}"`,
                        kategori: 'CS',
                        tipe: 'error',
                        link: `/customer-service/${slug}/tickets`
                    });
                }
            });
        }

        return { handled: true, subject, priority };
    }
);

// 7. Cron: Auto-close tiket RESOLVED yang sudah 7 hari
export const autoCloseResolvedTickets = inngest.createFunction(
    { id: "auto-close-resolved-tickets", triggers: [{ cron: "0 0 * * *" }] }, // Tengah malam setiap hari
    async ({ step }) => {
        const closed = await step.run("close-old-resolved-tickets", async () => {
            // Tiket RESOLVED > 7 hari → ubah ke CLOSED
            const [result] = await db.execute(
                sql`UPDATE support_tickets
                    SET status = 'CLOSED'
                    WHERE status = 'RESOLVED'
                    AND resolved_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
            );
            return result?.affectedRows || 0;
        });

        return { closed };
    }
);

// 8. Cron: Marketing — expire voucher yang sudah lewat tanggal
export const expireOldVouchers = inngest.createFunction(
    { id: "expire-old-vouchers", triggers: [{ cron: "0 1 * * *" }] }, // Jam 1 pagi setiap hari
    async ({ step }) => {
        const expired = await step.run("deactivate-expired-vouchers", async () => {
            const [result] = await db.execute(
                sql`UPDATE vouchers SET is_active = 0
                    WHERE is_active = 1 AND valid_until < CURDATE()`
            );
            return result?.affectedRows || 0;
        });
        return { expired };
    }
);
