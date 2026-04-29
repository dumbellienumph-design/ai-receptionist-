const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Service Layer
const DB = require('./lib/db');
const AI = require('./lib/ai');
const Twilio = require('./lib/twilio');

const app = express();
const port = 3000;
const upload = multer({ dest: 'uploads/' });

// Ensure audio cache directory exists
const audioDir = path.join(__dirname, 'public/audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

/**
 * LOGGING MIDDLEWARE
 */
app.use((req, res, next) => {
    if (req.path.startsWith('/webhook')) {
        const log = `[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.body.From || 'unknown'}\n`;
        fs.appendFileSync('call_logs.txt', log);
    }
    next();
});

// --- DASHBOARD API ---

app.get('/api/dashboard-data', async (req, res) => {
    try {
        const business = await DB.getLatestBusiness();
        if (!business) return res.status(404).json({ error: "No business profile found" });
        
        const calls = await DB.getCallsByBusinessId(business.id);
        const stats = {
            totalToday: calls.length,
            booked: calls.filter(c => c.outcome === 'booked').length,
            routed: calls.filter(c => c.outcome === 'routed').length
        };
        
        res.json({ business, calls, stats });
    } catch (err) {
        console.error("Dashboard Data Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post('/api/onboard', upload.single('voice_file'), async (req, res) => {
    try {
        const id = await DB.saveBusiness(req.body);
        res.status(200).json({ id });
    } catch (err) {
        console.error("Onboarding Error:", err);
        res.status(500).send("Error saving business configuration");
    }
});

// --- TELEPHONY WEBHOOKS ---

/**
 * Entry point for Twilio Voice
 */
app.post('/webhook/voice', async (req, res) => {
    const toNumber = req.body.To;
    console.log(`[CALL STARTED] From: ${req.body.From} To: ${toNumber}`);

    try {
        const business = await DB.getBusinessByPhone(toNumber);
        if (!business) {
            console.log(`[REJECTED] No profile for ${toNumber}`);
            return res.type('text/xml').send(Twilio.generateTwiML("Thank you for calling. No business profile found for this number.", false));
        }

        const greeting = `Hello, thank you for calling ${business.name}. How can I help you today?`;
        res.type('text/xml').send(Twilio.generateTwiML(greeting));
    } catch (err) {
        console.error("Voice Webhook Error:", err);
        res.status(500).send("Server Error");
    }
});

/**
 * Handle speech input
 */
app.post('/webhook/process-speech', async (req, res) => {
    const speechResult = req.body.SpeechResult;
    const fromNumber = req.body.From;
    const toNumber = req.body.To;

    console.log(`[SPEECH] ${fromNumber}: "${speechResult}"`);

    if (!speechResult || speechResult.trim().length === 0) {
        return res.type('text/xml').send(Twilio.generateTwiML("I'm sorry, I didn't catch that. Could you say it again?"));
    }

    try {
        const business = await DB.getBusinessByPhone(toNumber);
        if (!business) throw new Error("Business not found during processing");

        const aiResponse = await AI.decide(speechResult, business);
        console.log(`[AI RESPONSE] -> ${aiResponse}`);

        let outcome = 'answered';
        let twiml = '';

        if (aiResponse.includes('BOOKING_REQUEST')) {
            outcome = 'booked';
            const bookingUrl = business.cal_event_type_id ? `https://cal.com/${business.name.toLowerCase().replace(/ /g, '-')}/${business.cal_event_type_id}` : 'https://cal.com/booking';
            const smsBody = `Hi! Here is the booking link for ${business.name}: ${bookingUrl}`;
            
            await Twilio.sendSMS(fromNumber, toNumber, smsBody, business.twilio_sid, business.twilio_auth_token);
            twiml = Twilio.generateTwiML("I've sent a booking link to your phone via SMS. Have a great day!", false);
        } 
        else if (aiResponse.includes('ROUTE_REQUEST')) {
            outcome = 'routed';
            twiml = Twilio.generateDialTwiML("One moment while I connect you to our team.", business.target_phone);
        } 
        else {
            twiml = Twilio.generateTwiML(aiResponse);
        }

        await DB.logCall(business.id, fromNumber, outcome, speechResult);
        res.type('text/xml').send(twiml);

    } catch (err) {
        console.error("Processing Error:", err);
        res.type('text/xml').send(Twilio.generateTwiML("I'm sorry, I'm experiencing some technical difficulties. Let me connect you to a human."));
        // Potentially dial fallback here
    }
});

app.listen(port, () => {
    console.log(`\n🚀 RECEPTAI V2 - DEEPSEEK CORE - ONLINE`);
    console.log(`Listening on http://localhost:${port}`);
});
