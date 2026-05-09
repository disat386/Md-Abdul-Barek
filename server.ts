import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Hostinger and other cloud providers often provide the PORT via env variable
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === "production";

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini for Server-side Proxy
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is not found in process.env. Fix: Add 'GEMINI_API_KEY' to your environment.");
  } else {
    console.log(`✅ Auurio Server: Key Active [${apiKey.substring(0, 5)}...]`);
  }

  const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Auurio stable backend is active",
      hasKey: !!apiKey,
      node: process.version,
      envKeys: Object.keys(process.env).filter(k => k.includes('KEY'))
    });
  });

  // Proxy for Story Generation
  app.post("/api/generate-text", async (req, res) => {
    if (!genAI) return res.status(500).json({ error: "Gemini API key not configured on server" });
    
    const { prompt, model } = req.body;
    try {
      const response = await genAI.models.generateContent({
        model: model || "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Server API Error (Text):", err.message);
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  // Proxy for Image Generation (Imagen 3)
  app.post("/api/generate-image", async (req, res) => {
    if (!genAI) return res.status(500).json({ error: "Gemini API key not configured on server" });
    
    const { prompt, model, config } = req.body;
    try {
      const response = await genAI.models.generateImages({
        model: model || "imagen-3.0-generate-001",
        prompt,
        config: config || { numberOfImages: 1 }
      });
      
      const bytes = response?.generatedImages?.[0]?.image?.imageBytes;
      if (bytes) {
        const base64 = typeof bytes === 'string' ? bytes : Buffer.from(bytes as Uint8Array).toString('base64');
        res.json({ image: base64 });
      } else {
        res.status(404).json({ error: "No image data returned" });
      }
    } catch (err: any) {
      console.error("Server API Error (Image):", err.message);
      res.status(err.status || 500).json({ error: err.message });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
