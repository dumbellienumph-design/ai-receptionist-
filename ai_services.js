const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Speech-to-Text using Local Whisper (Python)
 * Assumes a script 'transcribe.py' that takes an audio path and returns text.
 */
async function transcribeAudio(audioPath) {
    return new Promise((resolve, reject) => {
        exec(`python transcribe.py ${audioPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Whisper Error: ${stderr}`);
                return reject(error);
            }
            resolve(stdout.trim());
        });
    });
}

/**
 * Text-to-Speech using Piper TTS
 * Assumes 'piper' executable is in the path and models are downloaded.
 */
async function generateSpeech(text, voiceModel, outputPath) {
    return new Promise((resolve, reject) => {
        // Example: echo "text" | piper --model model.onnx --output_file output.wav
        const piperCmd = `echo "${text}" | piper --model voices/${voiceModel}.onnx --output_file ${outputPath}`;
        exec(piperCmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Piper Error: ${stderr}`);
                return reject(error);
            }
            resolve(outputPath);
        });
    });
}

module.exports = { transcribeAudio, generateSpeech };
