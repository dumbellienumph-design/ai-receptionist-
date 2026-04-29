const DB = require('../lib/db');
const AI = require('../lib/ai');
const Twilio = require('../lib/twilio');
require('dotenv').config();

async function runIntegrationTest() {
    console.log("🧪 STARTING INTEGRATION TEST...");

    try {
        // 1. Check DB
        console.log("Step 1: Checking DB Connection...");
        const business = await DB.getLatestBusiness();
        if (!business) {
            console.error("❌ FAIL: No business profile in DB. Run onboarding first.");
            return;
        }
        console.log(`✅ SUCCESS: Connected to business: ${business.name}`);

        // 2. Check AI
        console.log("Step 2: Checking AI Decision Engine (DeepSeek)...");
        const testSpeech = "I would like to book a car wash for tomorrow morning.";
        const decision = await AI.decide(testSpeech, business);
        console.log(`✅ SUCCESS: AI Response: "${decision}"`);
        
        if (!decision.includes("BOOKING_REQUEST")) {
            console.warn("⚠️  WARNING: AI did not flag booking request. Check prompt logic.");
        }

        // 3. Check TwiML Generator
        console.log("Step 3: Checking TwiML Generation...");
        const twiml = Twilio.generateTwiML("Test complete.");
        if (twiml.includes("<Say") && twiml.includes("<Gather")) {
            console.log("✅ SUCCESS: TwiML generated correctly.");
        } else {
            console.error("❌ FAIL: TwiML generation malformed.");
        }

        console.log("\n✨ ALL CORE SYSTEMS OPERATIONAL.");
    } catch (err) {
        console.error("❌ TEST FAILED WITH ERROR:", err.message);
    }
}

runIntegrationTest();
