# RECEPTAI V2 Technical Architecture

## Overview
RECEPTAI V2 is an industrial-grade AI Receptionist built for low-latency voice interactions, high-fidelity data visualization, and modular service management.

## Core Stack
- **Runtime:** Node.js (v20+)
- **Brain:** DeepSeek V4 (LLM via OpenAI-compatible API)
- **Telephony:** Twilio (Voice Webhooks + SMS)
- **Storage:** SQLite3 (Local, fast, reliable)
- **Frontend:** Vanilla JS + CSS (Zinc/Bento Aesthetic)

## Architectural Design

### 1. Service Layer (`/lib`)
To ensure "Holy Shit" code quality, the system is decoupled into specific service modules:
- **`db.js`**: Centralized database interface using Promises. Handles business configuration and call logging.
- **`ai.js`**: Integration with DeepSeek. Includes robust system prompting for decision-making (Booking vs. Routing).
- **`twilio.js`**: TwiML generator and SMS sender. Handles the specialized XML required for voice telephony.

### 2. Decision Logic
The AI acts as a router. Every user transcript is processed with a specific system prompt that forces one of three outcomes:
- `BOOKING_REQUEST`: Triggers an automated SMS with a Cal.com link.
- `ROUTE_REQUEST`: Triggers a `<Dial>` verb to connect the caller to a human agent.
- `ANSWER`: Provides a helpful response based on the business knowledge base.

### 3. Latency Optimization
- **Built-in Fetch:** Uses Node 22 native `fetch` for faster API calls.
- **Small Models:** Utilizes DeepSeek V4 for sub-second token generation.
- **TwiML Streamlining:** Minimizes XML overhead to keep Twilio responses ultra-fast.

## Testing & Validation
- **Integration Suite:** `tests/core.test.js` verifies the end-to-end flow from DB lookup to AI decision without requiring a live telephony link.
- **Logging:** All webhooks log to `call_logs.txt` with ISO timestamps for forensic debugging.

## Setup
1. `npm install`
2. `node init_db.js`
3. Configure `.env` with `DEEPSEEK_API_KEY`.
4. `node server.js`
5. Connect Twilio to your ngrok tunnel at `/webhook/voice`.
