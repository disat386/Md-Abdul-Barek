import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // API Routes
  app.post("/api/ai/generate-text", async (req, res) => {
    try {
      const { prompt, modelId, config } = req.body;
      const model = genAI.getGenerativeModel({ 
        model: modelId || "gemini-2.0-flash",
        generationConfig: config
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ text: response.text() });
    } catch (error: any) {
      console.error("Server AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-image", async (req, res) => {
    try {
      const { prompt, modelId } = req.body;
      // In Node SDK, imagen is usually a separate flow or requires specific version
      // We will use the model.generateContent with responseModalities if available, 
      // or just handle standard flash generation for now.
      const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.0-flash-001" });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Generate a photorealistic high-resolution cinematic masterpiece: ${prompt}` }] }],
        generationConfig: { responseModalities: ["IMAGE"] as any }
      });
      
      const parts = result.response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find((p: any) => p.inlineData);
      
      if (imagePart?.inlineData?.data) {
        res.json({ 
          image: `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}` 
        });
      } else {
        res.status(400).json({ error: "No image data returned from AI" });
      }
    } catch (error: any) {
      console.error("Server AI Error:", error);
      res.status(500).json({ error: error.message });
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
