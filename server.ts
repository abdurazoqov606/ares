import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Translation API Route
  app.post("/api/translate", async (req, res) => {
    const { text } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is missing in server environment variables. Please add it to your environment settings in Vercel or your local .env file." 
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "Siz o'zbek tili lug'at boyligi va grammatikasini mukammal biladigan professional tarjimonsiz."
      });

      const prompt = `Siz jahon miqyosidagi professional tarjimon va muharrirsiz. 
      Quyidagi matnni o'zbek tiliga AKADEMIK va BADIIY uslubda o'giring.
      
      MUHIM TALABLAR:
      1. Ma'noni 100% saqlang, lekin o'zbek tilida tabiiy eshitilishini ta'minlang.
      2. Gaplar tuzilishini o'zbek tili grammatikasiga moslang.
      3. Kitobning (yoki hujjatning) asl ruhini va terminologiyasini saqlab qoling.
      4. Agar matn ilmiy bo'lsa - ilmiy, agar badiiy bo'lsa - badiiy uslubdan foydalaning.
      5. Texnik buyruqlarni (code, commands) o'zgarishsiz qoldiring.
      
      MATN:
      ---
      ${text}
      ---
      
      Faqat o'zbekcha tarjimani qaytaring.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ translatedText: response.text() });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Translation failed" });
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
