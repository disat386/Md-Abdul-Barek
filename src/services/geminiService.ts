import { GoogleGenAI } from "@google/genai";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

interface GeminiKeyInfo {
  keys: string[];
  exhaustedKeys?: string[];
}

class GeminiService {
  private static instance: GeminiService;
  private keysCached: string[] = [];
  private exhaustedKeysCached: Set<string> = new Set();
  private lastFetchTime: number = 0;
  private FETCH_INTERVAL = 30000;

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private async refreshKeys() {
    const now = Date.now();
    // Cache for 1 minute for faster performance
    if (now - this.lastFetchTime < 60000 && this.keysCached.length > 0) {
      return;
    }

    console.log("GeminiService: Fetching latest keys...");
    try {
      const docSnap = await getDoc(doc(db, 'api_keys', 'gemini'));
      let dbKeys: string[] = [];
      
      if (docSnap.exists()) {
        const data = docSnap.data() as GeminiKeyInfo;
        dbKeys = (data.keys || []).filter(k => k && k.trim().length > 0);
      }
      
      // Merge unique keys from DB and Environment
      const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
      const validEnvKey = envKey && envKey.trim().startsWith("AIzaSy") ? [envKey.trim()] : [];
      
      const allKeys = Array.from(new Set([...dbKeys, ...validEnvKey]));
      
      if (allKeys.length > 0) {
        this.keysCached = allKeys;
        this.lastFetchTime = now;
        console.log(`GeminiService: Sync complete. Active keys count: ${this.keysCached.length}`);
      } else {
        console.warn("GeminiService: No valid API keys found in DB or Env.");
      }
    } catch (error) {
      console.error("GeminiService: Refresh failed:", error);
      // Fail-safe: use env key if available even on DB error
      const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (envKey && envKey.trim().startsWith("AIzaSy")) {
        this.keysCached = [envKey.trim()];
      }
    }
  }

  public async forceRefresh() {
    this.lastFetchTime = 0;
    await this.refreshKeys();
  }

  public async getAvailableKey(): Promise<string | null> {
    await this.refreshKeys();
    // Filter out empty, null or whitespace-only keys and ensure they look like Gemini keys
    const activeKeys = this.keysCached.filter(k => 
      k && 
      typeof k === 'string' && 
      k.trim().length > 10 && 
      k.trim().startsWith("AIzaSy") &&
      !this.exhaustedKeysCached.has(k.trim())
    );
    
    if (activeKeys.length === 0) {
      console.error("GeminiService: No valid keys found after extensive filtering.", {
        cachedCount: this.keysCached.length,
        exhaustedCount: this.exhaustedKeysCached.size
      });
      return null;
    }
    
    const selected = activeKeys[Math.floor(Math.random() * activeKeys.length)].trim();
    return selected;
  }

  public async markKeyAsExhausted(key: string) {
    this.exhaustedKeysCached.add(key);
    try {
      const docRef = doc(db, 'api_keys', 'gemini');
      await updateDoc(docRef, { exhaustedKeys: arrayUnion(key) });
      
      setTimeout(async () => {
        this.exhaustedKeysCached.delete(key);
        try {
          await updateDoc(docRef, { exhaustedKeys: arrayRemove(key) });
        } catch (e) {}
      }, 3600000); 
    } catch (error) {}
  }

  public async generateContentWithRotation(params: any, maxRetries: number = 3): Promise<any> {
    let attempts = 0;
    while (attempts < maxRetries) {
      const apiKey = await this.getAvailableKey();
      if (!apiKey) {
        throw new Error("Ecosystem API Key not configured by Admin. Please check Admin Dashboard > API Keys.");
      }

      try {
        const genAI = new GoogleGenAI(apiKey);
        const model = genAI.getGenerativeModel({ model: params.model || "gemini-1.5-flash" });
        
        const result = await model.generateContent(params.contents || params.prompt || "");
        const response = await result.response;
        return response.text();
      } catch (error: any) {
        const errorMessage = error?.message || "";
        if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit exceeded")) {
          await this.markKeyAsExhausted(apiKey);
          attempts++;
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Failed to generate content after ${maxRetries} attempts.`);
  }
}

export const geminiService = GeminiService.getInstance();
