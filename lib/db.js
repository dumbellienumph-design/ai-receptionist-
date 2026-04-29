const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const DB = {
    getBusinessByPhone: (phone) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM businesses WHERE twilio_phone = ?", [phone], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    getLatestBusiness: () => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM businesses ORDER BY id DESC LIMIT 1", (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    getCallsByBusinessId: (businessId, limit = 10) => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM calls WHERE business_id = ? ORDER BY timestamp DESC LIMIT ?", [businessId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    saveBusiness: (config) => {
        const { name, industry, target_phone, twilio_sid, twilio_auth_token, twilio_phone, voice_choice, knowledge_base, cal_api_key, cal_event_type_id } = config;
        const query = `INSERT INTO businesses (name, industry, target_phone, twilio_sid, twilio_auth_token, twilio_phone, voice_choice, knowledge_base, cal_api_key, cal_event_type_id) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return new Promise((resolve, reject) => {
            db.run(query, [name, industry, target_phone, twilio_sid, twilio_auth_token, twilio_phone, voice_choice, knowledge_base, cal_api_key, cal_event_type_id], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    },

    logCall: (businessId, callerNumber, outcome, transcript) => {
        return new Promise((resolve, reject) => {
            db.run("INSERT INTO calls (business_id, caller_number, outcome, transcript) VALUES (?, ?, ?, ?)", 
                   [businessId, callerNumber, outcome, transcript], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }
};

module.exports = DB;
