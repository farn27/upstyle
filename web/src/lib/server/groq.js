import { env } from '$env/dynamic/private';

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
	model = 'llama-3.1-8b-instant',
	temperature = 0.7,
	max_tokens = 1024,
	response_format
}) {
	const apiKey = env.GROQ_API_KEY;
	if (!apiKey) {
		throw new Error('GROQ_API_KEY is not configured');
	}

	/** @type {Record<string, unknown>} */
	const body = { model, messages, temperature, max_tokens };
	if (response_format) {
		body.response_format = response_format;
	}

	const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Groq API error: ${response.status} ${text}`);
	}

	return response.json();
}
