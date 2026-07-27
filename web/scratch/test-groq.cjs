const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
    const apiKey = process.env.GROQ_API_KEY;
    console.log("API Key loaded:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined");
    if (!apiKey) return;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'test' },
                    { role: 'user', content: 'hello' }
                ],
                temperature: 0.4,
                max_tokens: 10
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.log(`Failed: ${response.status} ${text}`);
        } else {
            const data = await response.json();
            console.log("Success:", JSON.stringify(data));
        }
    } catch(err) {
        console.error("Fetch error:", err);
    }
}

test();
