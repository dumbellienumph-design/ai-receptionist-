require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testKey() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Say hello");
        console.log("SUCCESS:", result.response.text());
    } catch (err) {
        console.error("FAILURE:", err.message);
        if (err.message.includes("API_KEY_INVALID")) {
            console.log("HINT: Your API key is invalid. It should start with 'AIza'.");
        }
    }
}

testKey();
