const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fetch = require('node-fetch');
const { exec } = require('child_process');
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const ai = require('./ai_services');
const fs = require('fs');

const app = express();
const port = 3000;
const db = new sqlite3.Database('./database.sqlite');
const upload = multer({ dest: 'uploads/' });

// Ensure directories exist
if (!fs.existsSync('public/audio')) fs.mkdirSync('public/audio', { recursive: true });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// --- API ROUTES ---

// Onboarding: Save business config
app.post('/api/onboard', upload.single('voice_file'), (req, res) => {
    const { name, industry, target_phone, twilio_sid, twilio_auth_token, twilio_phone, voice_choice, knowledge_base, cal_api_key, cal_event_type_id } = req.body;
    
    const query = `INSERT INTO businesses (name, industry, target_phone, twilio_sid, twilio_auth_token, twilio_phone, voice_choice, knowledge_base, cal_api_key, cal_event_type_id) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [name, industry, target_phone, twilio_sid, twilio_auth_token, twilio_phone, voice_choice, knowledge_base, cal_api_key, cal_event_type_id], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send("Error saving business");
        }
        res.status(200).json({ id: this.lastID });
    });
});

// Dashboard Data
app.get('/api/dashboard-data', (req, res) => {
    db.get("SELECT * FROM businesses ORDER BY id DESC LIMIT 1", (err, business) => {
        if (err || !business) return res.status(404).send("Business not found");
        
        db.all("SELECT * FROM calls WHERE business_id = ? ORDER BY timestamp DESC LIMIT 10", [business.id], (err, calls) => {
            const stats = {
                totalToday: calls ? calls.length : 0,
                booked: calls ? calls.filter(c => c.outcome === 'booked').length : 0,
                routed: calls ? calls.filter(c => c.outcome === 'routed').length : 0
            };
            res.json({ business, calls: calls || [], stats });
        });
    });
});

// Incoming Voice Webhook
app.post('/webhook/voice', (req, res) => {
    const twilioPhone = req.body.To;
    
    db.get("SELECT * FROM businesses WHERE twilio_phone = ?", [twilioPhone], async (err, business) => {
        if (err || !business) {
            return res.send(`<Response><Say>Business not found.</Say></Response>`);
        }

        const welcomeText = `Hello, thank you for calling ${business.name}. How can I help you today?`;
        
        const twiml = `
        <Response>
            <Say voice="Polly.Matthew-Neural">${welcomeText}</Say>
            <Gather input="speech" action="/webhook/process-speech" method="POST" speechTimeout="auto"></Gather>
        </Response>`;
        res.type('text/xml');
        res.send(twiml);
    });
});

// Process Speech with Gemini
app.post('/webhook/process-speech', async (req, res) => {
    const speechResult = req.body.SpeechResult;
    const fromNumber = req.body.From;
    const toNumber = req.body.To;

    db.get("SELECT * FROM businesses WHERE twilio_phone = ?", [toNumber], async (err, business) => {
        if (err || !business) return res.send(`<Response><Say>Error.</Say></Response>`);

        // 1. Call Gemini for decision/response
        const prompt = `You are an AI receptionist for ${business.name} (${business.industry}).
        Knowledge: ${business.knowledge_base}
        User said: "${speechResult}"
        
        Decide the action. 
        If they want to book, respond with 'BOOKING_REQUEST'.
        If they want to speak to a human or it's urgent, respond with 'ROUTE_REQUEST'.
        Otherwise, give a helpful response based on knowledge.
        Keep it brief.`;

        try {
            const result = await model.generateContent(prompt);
            const aiResponse = result.response.text().trim();

            let responseTwiml = '';
            let outcome = 'answered';
            let responseText = '';

            if (aiResponse.includes('BOOKING_REQUEST')) {
                responseText = "I've sent a booking link to your phone. Have a great day!";
                outcome = 'booked';
                
                // --- TWILIO SMS LOGIC ---
                try {
                    const bookingUrl = business.cal_event_type_id ? `https://cal.com/${business.name.toLowerCase().replace(/ /g, '-')}/${business.cal_event_type_id}` : 'https://cal.com/booking';
                    const smsBody = `Hi, here is the booking link for ${business.name}: ${bookingUrl}`; 
                    const auth = Buffer.from(`${business.twilio_sid}:${business.twilio_auth_token}`).toString('base64');
                    
                    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${business.twilio_sid}/Messages.json`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${auth}`
                        },
                        body: new URLSearchParams({
                            To: fromNumber,
                            From: business.twilio_phone,
                            Body: smsBody
                        })
                    });
                    console.log(`SMS Sent to ${fromNumber}`);
                } catch (smsErr) {
                    console.error("SMS Error:", smsErr);
                }
            } else if (aiResponse.includes('ROUTE_REQUEST')) {
                responseText = "One moment while I connect you.";
                outcome = 'routed';
            } else {
                responseText = aiResponse;
            }

            if (outcome === 'booked') {
                responseTwiml = `<Response><Say voice="Polly.Matthew-Neural">${responseText}</Say><Hangup/></Response>`;
            } else if (outcome === 'routed') {
                responseTwiml = `<Response><Say voice="Polly.Matthew-Neural">${responseText}</Say><Dial>${business.target_phone}</Dial></Response>`;
            } else {
                responseTwiml = `<Response>
                    <Say voice="Polly.Matthew-Neural">${responseText}</Say>
                    <Gather input="speech" action="/webhook/process-speech" method="POST">
                        <Say voice="Polly.Matthew-Neural">Anything else I can help with?</Say>
                    </Gather>
                </Response>`;
            }

            // Log the call
            db.run("INSERT INTO calls (business_id, caller_number, outcome, transcript) VALUES (?, ?, ?, ?)", 
                   [business.id, fromNumber, outcome, speechResult]);

            res.type('text/xml');
            res.send(responseTwiml);

        } catch (geminiErr) {
            console.error("Gemini Error:", geminiErr);
            res.send(`<Response><Say>I'm sorry, I'm having trouble processing that right now.</Say><Dial>${business.target_phone}</Dial></Response>`);
        }
    });
});

app.listen(port, () => {
    console.log(`AI Receptionist Server running at http://localhost:${port}`);
});

