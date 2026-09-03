import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // Gemini API client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API routes
  app.post("/api/italian-lesson", async (req, res) => {
    try {
      const { messages, mode } = req.body;
      let systemInstruction = "You are an expert Italian language teacher for warehouse logistics operators. Be conversational, encouraging, and structured. When teaching, explain nuances clearly with phonetic guides. Keep responses concise so they are pleasant to listen to via text-to-speech.";
      
      if (mode === 'drill') {
        systemInstruction = "You are an interactive Italian drill master testing a warehouse picker on Italian words, phrases, and workplace situations. Ask ONE specific word or question at a time. If the user answered a previous question, grade their answer first (e.g. 'Ottimo!', 'Molto bene!', or gentle correction), explain briefly, and then immediately give the NEXT question or word to translate/pronounce. Keep it engaging, clear, and focused on warehouse vocabulary.";
      } else if (mode === 'assessment') {
        systemInstruction = "You are the Senior Italian Language Evaluator for warehouse logistics. Assess the student's monthly performance based on their answers, vocabulary recall, and responses. Provide a friendly evaluation with: 1) Monthly Grade (A/B/C), 2) Estimated CEFR level (A1/A2/B1), 3) Key mastered words, 4) Priority recommendations for next month. Keep it concise, motivational, and structured.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: messages,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text || "Ottimo lavoro! Continuiamo con la prossima parola.";
      res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      // Resilient fallback so the client never crashes
      res.status(200).json({ 
        reply: "Molto bene! Continua a praticare i vocaboli del magazzino. Riprova con la prossima frase!",
        fallback: true
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
