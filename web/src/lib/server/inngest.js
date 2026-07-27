import { Inngest } from "inngest";
import { env } from "$env/dynamic/private";

export const inngest = new Inngest({ 
    id: "bizgrow-app",
    eventKey: env.INNGEST_EVENT_KEY || "local",
    isDev: env.INNGEST_DEV === "1"
});