require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  for (const m of models) {
    try {
      const t0 = Date.now();
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Say OK'
      });
      console.log(`Model ${m} succeeded in ${Date.now() - t0}ms:`, res.text?.trim());
    } catch(e) {
      console.log(`Model ${m} failed:`, e.message);
    }
  }
}
test();
