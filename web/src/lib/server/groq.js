import { env } from '$env/dynamic/private';

const MODEL_MAP = {
	'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
	'llama-3.1-8b-instant': 'openai/gpt-oss-20b'
};

/**
 * @param {object} options
 * @param {Array<{ role: string, content: string }>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {number} [options.max_tokens]
 * @param {{ type: string }} [options.response_format]
 */
export async function groqChatCompletion({
	messages,
	model = 'openai/gpt-oss-20b',
	temperature = 0.7,
	max_tokens = 1024,
	response_format
}) {
	const apiKey = env.GROQ_API_KEY;
	if (!apiKey) {
		throw new Error('GROQ_API_KEY is not configured');
	}

	let targetModel = env.GROQ_MODEL || MODEL_MAP[model] || model;

	const callGroq = async (m) => {
		/** @type {Record<string, unknown>} */
		const body = { model: m, messages, temperature, max_tokens };
		if (response_format) {
			body.response_format = response_format;
		}

		return fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(body)
		});
	};

	let response = await callGroq(targetModel);

	// If the model does not exist or user doesn't have access (404 model_not_found), fallback gracefully
	if (response.status === 404 && targetModel !== 'openai/gpt-oss-120b') {
		console.warn(`[Groq] Model "${targetModel}" not found. Retrying with fallback "openai/gpt-oss-120b"...`);
		response = await callGroq('openai/gpt-oss-120b');
	}

	// Fallback untuk Rate Limit (429) ke model yang lebih ringan
	if (response.status === 429 && targetModel !== 'openai/gpt-oss-20b') {
		console.warn(`[Groq] Rate limit reached for "${targetModel}". Retrying with fallback "openai/gpt-oss-20b"...`);
		response = await callGroq('openai/gpt-oss-20b');
	}

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Groq API error: ${response.status} ${text}`);
	}

	return response.json();
}

