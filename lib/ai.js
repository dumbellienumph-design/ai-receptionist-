/**
 * DeepSeek AI Service
 */
const AI = {
    decide: async (userSpeech, business) => {
        const systemPrompt = `You are an AI receptionist for ${business.name} (${business.industry}).
Knowledge: ${business.knowledge_base}

DECISION RULES:
1. If the user wants to book, start your response with 'BOOKING_REQUEST'.
2. If they want to speak to a human or have an emergency, start with 'ROUTE_REQUEST'.
3. Otherwise, provide a helpful, concise answer.
4. Keep all responses brief and professional.`;

        try {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userSpeech }
                    ],
                    temperature: 0.5,
                    max_tokens: 200
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error("AI Decision Error:", error);
            throw error;
        }
    }
};

module.exports = AI;
