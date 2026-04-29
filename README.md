# RECEPTAI: Cloud-AI Receptionist (Low Latency)

## Prerequisites

1. **Gemini API Key:** Get a free key from [aistudio.google.com](https://aistudio.google.com).
2. **Twilio:** You need a Twilio account and a phone number. Point your Voice URL to `https://your-ngrok-url.com/webhook/voice`.
3. **Ngrok:** Install to expose your local server for Twilio webhooks.

## Installation

```bash
cd ai-receptionist-v2
npm install
node init_db.js
```

## Setup

1. Create a `.env` file in the root:
```env
GEMINI_API_KEY=your_key_here
```

## Running the Server

```bash
node server.js
```

The application will be available at `http://localhost:3000`.

## Aesthetic & Architecture

- **Visuals:** Dark, industrial, sharp. Zinc-900 surfaces with high-contrast Inter typography.
- **Backend:** Node.js + Express + SQLite.
- **AI Logic:** 
  - Call routing and FAQ handling powered by **Google Gemini 1.5 Flash** (Cloud).
  - Speech-to-text via **Twilio Native Speech Recognition**.
  - Text-to-speech via **Twilio Amazon Polly (Neural)**.
- **Integrations:** Cal.com (Booking) and Twilio (Telephony).
