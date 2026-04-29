const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // Business configuration table
    db.run(`CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        industry TEXT,
        target_phone TEXT,
        twilio_sid TEXT,
        twilio_auth_token TEXT,
        twilio_phone TEXT,
        voice_choice TEXT,
        knowledge_base TEXT,
        cal_api_key TEXT,
        cal_event_type_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Call logs table
    db.run(`CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        caller_number TEXT,
        duration_seconds INTEGER DEFAULT 0,
        outcome TEXT, -- 'booked', 'routed', 'answered'
        transcript TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(business_id) REFERENCES businesses(id)
    )`);

    console.log("Database initialized successfully.");
});

db.close();
