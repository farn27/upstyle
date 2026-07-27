/**
 * Payment gateway service menggunakan Midtrans.
 * Menggunakan fetch langsung ke Midtrans API — tanpa library tambahan.
 */
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

const MIDTRANS_SNAP_URL = 'https://app.midtrans.com/snap/v1/transactions';
const MIDTRANS_SNAP_URL_SANDBOX = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const MIDTRANS_API_URL = 'https://api.midtrans.com/v2';
const MIDTRANS_API_URL_SANDBOX = 'https://api.sandbox.midtrans.com/v2';

function isSandbox() {
	return env.NODE_ENV !== 'production' || env.MIDTRANS_SANDBOX === 'true';
}

function getSnapUrl() {
	return isSandbox() ? MIDTRANS_SNAP_URL_SANDBOX : MIDTRANS_SNAP_URL;
}

function getApiUrl() {
	return isSandbox() ? MIDTRANS_API_URL_SANDBOX : MIDTRANS_API_URL;
}

function getServerKey() {
	if (!env.MIDTRANS_SERVER_KEY) {
		throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi di .env');
	}
	return env.MIDTRANS_SERVER_KEY;
}

function getAuthHeader() {
	return 'Basic ' + Buffer.from(getServerKey() + ':').toString('base64');
}

// ─── Plan Config ───────────────────────────────────────────────────────────────

export const PLAN_PRICES = {
	pro: {
		name: 'Pro Hub',
		amount: 149000, // Rp 149.000
		description: 'Upstyle Pro Hub — 10 Unit Bisnis, 20GB Storage, POS, HR, AI'
	},
	enterprise: {
		name: 'Enterprise',
		amount: 499000, // Rp 499.000
		description: 'Upstyle Enterprise — Unlimited Unit, 100GB, Semua Fitur + CRM'
	}
};

// ─── Snap Transaction ──────────────────────────────────────────────────────────

/**
 * Buat Snap transaction untuk upgrade plan
 * @param {object} opts
 * @param {number} opts.userId
 * @param {string} opts.userEmail
 * @param {string} opts.username
 * @param {'pro' | 'enterprise'} opts.planId
 * @returns {Promise<{ token: string, redirect_url: string }>}
 */
export async function createSnapTransaction({ userId, userEmail, username, planId }) {
	const plan = PLAN_PRICES[planId];
	if (!plan) throw new Error(`Plan tidak valid: ${planId}`);

	const orderId = `UPSTYLE-${planId.toUpperCase()}-${userId}-${Date.now()}`;

	const payload = {
		transaction_details: {
			order_id: orderId,
			gross_amount: plan.amount
		},
		customer_details: {
			first_name: username,
			email: userEmail
		},
		item_details: [
			{
				id: planId,
				price: plan.amount,
				quantity: 1,
				name: plan.description.substring(0, 50) // max 50 char
			}
		],
		callbacks: {
			finish: `${env.ORIGIN}/settings/billing?status=success`,
			error: `${env.ORIGIN}/settings/billing?status=error`,
			pending: `${env.ORIGIN}/settings/billing?status=pending`
		},
		// Custom field untuk identifikasi setelah webhook
		custom_field1: String(userId),
		custom_field2: planId
	};

	const response = await fetch(getSnapUrl(), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: getAuthHeader()
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Midtrans Snap error: ${response.status} ${text}`);
	}

	return response.json();
}

// ─── Webhook / Notification ────────────────────────────────────────────────────

/**
 * Verifikasi signature webhook Midtrans
 * Format: SHA512(order_id + status_code + gross_amount + server_key)
 * @param {object} notification
 * @returns {boolean}
 */
export function verifyWebhookSignature(notification) {
	const { order_id, status_code, gross_amount, signature_key } = notification;
	if (!order_id || !status_code || !gross_amount || !signature_key) return false;

	const expected = crypto
		.createHash('sha512')
		.update(`${order_id}${status_code}${gross_amount}${getServerKey()}`)
		.digest('hex');

	return expected === signature_key;
}

/**
 * Parse status dari notifikasi Midtrans
 * @param {object} notification
 * @returns {'success' | 'pending' | 'failed' | 'expired' | 'unknown'}
 */
export function parseTransactionStatus(notification) {
	const { transaction_status, fraud_status } = notification;

	if (transaction_status === 'capture') {
		return fraud_status === 'accept' ? 'success' : 'failed';
	}
	if (transaction_status === 'settlement') return 'success';
	if (transaction_status === 'pending') return 'pending';
	if (['deny', 'cancel', 'failure'].includes(transaction_status)) return 'failed';
	if (transaction_status === 'expire') return 'expired';

	return 'unknown';
}

/**
 * Check transaction status via Midtrans API
 * @param {string} orderId
 */
export async function checkTransactionStatus(orderId) {
	const response = await fetch(`${getApiUrl()}/${orderId}/status`, {
		headers: { Authorization: getAuthHeader() }
	});

	if (!response.ok) {
		throw new Error(`Midtrans status check error: ${response.status}`);
	}

	return response.json();
}
