import { serve } from "inngest/sveltekit";
import { inngest } from "$lib/server/inngest";
import {
    redisCleaner, generateReportJob, payrollNotificationJob, stockAlertCron,
    salesOrderStatusChanged, csTicketCreated, autoCloseResolvedTickets, expireOldVouchers
} from "$lib/server/inngest/functions";
import { shopeeTokenRefresh } from "$lib/server/inngest/shopeeSync";

import { env } from "$env/dynamic/private";

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
        console.error("GET Inngest Error:", e);
        return new Response(e.message, { status: 500 });
    }
};
export const POST = async (event) => {
    try {
        return await handler(event);
    } catch (e) {
        console.error("POST Inngest Error:", e);
        return new Response(e.message, { status: 500 });
    }
};
export const PUT = async (event) => {
    try {
        return await handler(event);
    } catch (e) {
        console.error("PUT Inngest Error:", e);
        return new Response(e.message, { status: 500 });
    }
};