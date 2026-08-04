import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';

const shopeeState = new Map();

function getUserState(userId) {
	if (!shopeeState.has(userId)) {
		shopeeState.set(userId, {
			connected: false,
			shopId: null,
			shopName: null,
			token: null,
			connectedAt: null
		});
	}
	return shopeeState.get(userId);
}

// GET /api/app/shopee
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const state = getUserState(userId);

		const data = {
			connected: state.connected,
			shopId: state.shopId,
			shopName: state.shopName,
			connectedAt: state.connectedAt
		};

		return apiSuccess(data, 'OK');
	} catch (err) {
		log.api.error({ err }, 'GET /api/app/shopee');
		return apiError('Gagal memuat status Shopee', 500);
	}
}

// POST /api/app/shopee — generic action via body.action
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const body = await request.json();
		const action = String(body?.action || '').trim();

		if (!action) return apiError('action wajib diisi', 422);

		if (action === 'connect') {
			const schema = z.object({
				shopId: z.string().min(1).max(100),
				shopName: z.string().min(1).max(150),
				token: z.string().min(1)
			});

			const parsed = schema.safeParse(body);
			if (!parsed.success) {
				const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Data koneksi Shopee tidak valid';
				return apiError(msg, 422);
			}

			const { shopId, shopName, token } = parsed.data;
			const state = getUserState(userId);
			state.connected = true;
			state.shopId = shopId;
			state.shopName = shopName;
			state.token = token;
			state.connectedAt = new Date().toISOString();

			log.api.info({ userId, shopId, shopName }, 'shopee.connected');

			return apiSuccess({ connected: true, shopId, shopName, connectedAt: state.connectedAt }, 'Shopee berhasil terhubung');
		}

		if (action === 'disconnect') {
			const state = getUserState(userId);
			state.connected = false;
			state.shopId = null;
			state.shopName = null;
			state.token = null;
			state.connectedAt = null;

			log.api.info({ userId }, 'shopee.disconnected');

			return apiSuccess({ connected: false }, 'Koneksi Shopee diputus');
		}

		return apiError('Aksi tidak didukung', 400);
	} catch (err) {
		log.api.error({ err }, 'POST /api/app/shopee');
		return apiError('Gagal memproses aksi Shopee', 500);
	}
}
