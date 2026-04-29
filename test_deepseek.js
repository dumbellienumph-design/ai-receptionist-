require('dotenv').config();

async function testDeepSeek() {
    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "user", content: "Say hello" }],
                max_tokens: 10
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error("FAILURE:", data.error.message);
        } else {
            console.log("SUCCESS:", data.choices[0].message.content);
        }
    } catch (err) {
        console.error("FAILURE:", err.message);
    }
}

testDeepSeek();
