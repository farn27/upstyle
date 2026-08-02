import { serve } from "inngest/sveltekit";
import { inngest } from "$lib/server/inngest";
import {
    redisCleaner, generateReportJob, payrollNotificationJob, stockAlertCron,
    salesOrderStatusChanged, csTicketCreated, autoCloseResolvedTickets, expireOldVouchers
} from "$lib/server/inngest/functions";
import { shopeeTokenRefresh } from "$lib/server/inngest/shopeeSync";
import { env } from "$env/dynamic/private";
import { log } from "$lib/server/logger";

const handler = serve({
  client: inngest,
  functions: [
    redisCleaner,
    generateReportJob,
    payrollNotificationJob,
    stockAlertCron,
    salesOrderStatusChanged,
    csTicketCreated,
    autoCloseResolvedTickets,
    expireOldVouchers,
    shopeeTokenRefresh
  ],
  isDev: env.INNGEST_DEV === "1"
});

export const GET = async (event) => {
    try {
        return await handler(event);
    } catch (e) {
        log.api.error({ err: e.message }, 'GET Inngest Error');
        return new Response(e.message, { status: 500 });
    }
};
export const POST = async (event) => {
    try {
        return await handler(event);
    } catch (e) {
        log.api.error({ err: e.message }, 'POST Inngest Error');
        return new Response(e.message, { status: 500 });
    }
};
export const PUT = async (event) => {
    try {
        return await handler(event);
    } catch (e) {
        log.api.error({ err: e.message }, 'PUT Inngest Error');
        return new Response(e.message, { status: 500 });
    }
};