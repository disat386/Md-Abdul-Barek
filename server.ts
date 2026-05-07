import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { GoogleAuth } from 'google-auth-library';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production (dist/server.js), __dirname is the 'dist' folder.
// We need to look for config in the root (one level up).
const isProd = process.env.NODE_ENV === 'production' || __dirname.endsWith('dist');
const rootDir = isProd ? path.join(__dirname, '..') : process.cwd();

// Load config manually to avoid crash if file is missing in production
let firebaseConfig: any = {};
try {
  const configFile = path.join(rootDir, 'firebase-applet-config.json');
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  }
} catch (err) {
  console.warn('Firebase config file not found or invalid at:', path.join(rootDir, 'firebase-applet-config.json'));
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID,
  });
}

const firestore = admin.firestore();

// Background Cleanup Job (Runs every 12 hours)
setInterval(async () => {
  console.log('Running background project cleanup...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const snapshot = await firestore.collection('projects')
      .where('createdAt', '<', thirtyDaysAgo)
      .limit(100)
      .get();
      
    if (snapshot.empty) {
      console.log('No old projects to delete.');
      return;
    }
    
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Successfully deleted ${snapshot.size} expired projects.`);
  } catch (err) {
    console.error('Cleanup Job Failed:', err);
  }
}, 12 * 60 * 60 * 1000); // 12 hours

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // --- Vertex AI Proxy ---
  // This endpoint proxys requests to Google Cloud Vertex AI
  // It handles authentication server-side to keep credentials secure
  app.post('/api/vertex/predict', async (req, res) => {
    try {
      const { projectId, region, modelId, contents, generationConfig, credentials } = req.body;

      if (!projectId || !region || !modelId || !credentials) {
        return res.status(400).json({ error: 'Missing Vertex AI configuration' });
      }

      // Initialize Auth with provided Service Account JSON
      const auth = new GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
      });

      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      // For Gemini models, we use the generateContent endpoint
      const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${modelId}:generateContent`;

      console.log(`Proxying request to Vertex AI: ${modelId}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contents, generationConfig }),
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Vertex AI API Error:', JSON.stringify(data.error, null, 2));
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (error: any) {
      console.error('Vertex Proxy Exception:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error during Vertex AI call' });
    }
  });

  // --- TTS Proxy (Google Cloud) ---
  app.post('/api/tts/cloud', async (req, res) => {
    try {
      const { text, languageCode, voiceName, credentials } = req.body;
      if (!credentials) return res.status(400).json({ error: 'Missing credentials' });

      const auth = new GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
      });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode, name: voiceName },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      
      res.json(data); // Returns { audioContent: "..." }
    } catch (error: any) {
      console.error('TTS Cloud Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- TTS Proxy (Translate Simple) ---
  app.get('/api/tts/proxy', async (req, res) => {
    try {
      const { q, tl } = req.query;
      if (!q || !tl) return res.status(400).send('Missing params');
      
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&q=${encodeURIComponent(q as string)}&tl=${tl}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) throw new Error(`Translate TTS failed with status: ${response.status}`);
      
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error('TTS Proxy Error:', error);
      res.status(500).send('Failed to fetch audio');
    }
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Auurio Hub', uptime: process.uptime() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, the file might be running from the root or a dist folder
    // Since server.js is inside dist, the static files are in the same folder
    const distPath = isProd ? __dirname : path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    console.log(`Production server serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`Frontend build not found at ${indexPath}. Please run npm run build.`);
      }
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
