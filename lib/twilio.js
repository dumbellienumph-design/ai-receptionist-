const fetch = require('node-fetch'); // Fallback for environments where global fetch isn't stable for external APIs

const Twilio = {
    generateTwiML: (text, gather = true, voice = 'alice') => {
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
        if (gather) {
            twiml += `<Say voice="${voice}">${text}</Say>`;
            twiml += `<Gather input="speech" action="/webhook/process-speech" method="POST" speechTimeout="auto">
                        <Say voice="${voice}">I'm listening.</Say>
                      </Gather>`;
            twiml += `<Say voice="${voice}">I didn't hear anything. Goodbye.</Say><Hangup/>`;
        } else {
            twiml += `<Say voice="${voice}">${text}</Say><Hangup/>`;
        }
        twiml += `</Response>`;
        return twiml;
    },

    generateDialTwiML: (text, targetPhone, voice = 'alice') => {
        return `<?xml version="1.0" encoding="UTF-8"?><Response>
            <Say voice="${voice}">${text}</Say>
            <Dial>${targetPhone}</Dial>
        </Response>`;
    },

    sendSMS: async (to, from, body, sid, token) => {
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        try {
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: new URLSearchParams({ To: to, From: from, Body: body })
            });
            const data = await response.json();
            if (data.status === 'failed' || data.error_code) {
                console.error("Twilio SMS Failed:", data.message);
                return false;
            }
            return true;
        } catch (error) {
            console.error("Twilio SMS Error:", error);
            return false;
        }
    }
};

module.exports = Twilio;
