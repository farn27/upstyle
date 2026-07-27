import { inngest } from "$lib/server/inngest";
import { db } from "$lib/server/drizzle";
import { marketplaceIntegrations } from "$lib/server/schema";
import { eq, sql } from "drizzle-orm";
import { refreshAccessToken } from "$lib/server/shopeeApi";
import { encrypt, decrypt } from "$lib/server/crypto";

export const shopeeTokenRefresh = inngest.createFunction(
    { id: "shopee-token-refresh", triggers: [{ cron: "0 * * * *" }] }, // Jalan setiap jam
    async ({ step }) => {
        
        // 1. Ambil integrasi shopee yang aktif dan tokennya akan kedaluwarsa dalam 2 jam (atau kurang)
        const expiringIntegrations = await step.run("fetch-expiring-integrations", async () => {
            // MySQL: token_expires_at < DATE_ADD(NOW(), INTERVAL 2 HOUR)
            const result = await db.select().from(marketplaceIntegrations)
                .where(
                    sql`${marketplaceIntegrations.platform} = 'shopee' AND 
                        ${marketplaceIntegrations.isActive} = 1 AND 
                        ${marketplaceIntegrations.tokenExpiresAt} < DATE_ADD(NOW(), INTERVAL 2 HOUR)`
                );
            return result;
        });

        if (expiringIntegrations.length === 0) {
            return { message: "No tokens require refreshing at this time." };
        }

        const refreshResults = [];

        for (const integration of expiringIntegrations) {
            const result = await step.run(`refresh-token-${integration.id}`, async () => {
                if (!integration.partnerId || !integration.partnerKey || !integration.refreshToken) {
                    return { id: integration.id, status: 'failed', reason: 'Missing credentials' };
                }

                const partnerKey = decrypt(integration.partnerKey);
                const refreshToken = decrypt(integration.refreshToken);

                if (!partnerKey || !refreshToken) {
                    return { id: integration.id, status: 'failed', reason: 'Decryption failed' };
                }

                // Call Shopee API
                const tokenRes = await refreshAccessToken(refreshToken, integration.shopId, integration.partnerId, partnerKey);
                
                if (tokenRes.error) {
                    // Coba catat kegagalan
                    console.error(`Shopee Token Refresh Failed for ID ${integration.id}:`, tokenRes.error);
                    return { id: integration.id, status: 'error', error: tokenRes.error };
                }

                // Update Database
                const expiresAt = new Date();
                expiresAt.setSeconds(expiresAt.getSeconds() + (tokenRes.expire_in || 14400));
                
                const encryptedAccessToken = encrypt(tokenRes.access_token);
                const encryptedRefreshToken = encrypt(tokenRes.refresh_token);

                await db.update(marketplaceIntegrations)
                    .set({
                        accessToken: encryptedAccessToken,
                        refreshToken: encryptedRefreshToken,
                        tokenExpiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
                        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
                    })
                    .where(eq(marketplaceIntegrations.id, integration.id));
                    
                return { id: integration.id, status: 'success' };
            });
            refreshResults.push(result);
        }

        return {
            processed: expiringIntegrations.length,
            results: refreshResults
        };
    }
);
