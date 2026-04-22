import * as GenerativeAI from "@google/generative-ai";
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
    if (now - this.lastFetchTime < this.FETCH_INTERVAL && this.keysCached.length > 0) {
      return;
    }

    try {
      const docSnap = await getDoc(doc(db, 'api_keys', 'gemini'));
      if (docSnap.exists()) {
        const data = docSnap.data() as GeminiKeyInfo;
        if (Array.isArray(data.keys)) {
          this.keysCached = data.keys;
          this.exhaustedKeysCached = new Set(data.exhaustedKeys || []);
        } else if ((data as any).key) {
          this.keysCached = [(data as any).key];
          this.exhaustedKeysCached = new Set();
        }
      } else {
        const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
        if (envKey) {
          this.keysCached = [envKey];
        }
      }
      this.lastFetchTime = now;
    } catch (error) {
      console.error("Error refreshing Gemini keys:", error);
    }
  }

  public async getAvailableKey(): Promise<string | null> {
    await this.refreshKeys();
    const activeKeys = this.keysCached.filter(k => !this.exhaustedKeysCached.has(k));
    if (activeKeys.length === 0) return null;
    return activeKeys[Math.floor(Math.random() * activeKeys.length)];
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
      if (!apiKey) throw new Error("No available Gemini API keys.");

      try {
        const GoogleGenAI = (GenerativeAI as any).GoogleGenAI || (GenerativeAI as any).default?.GoogleGenAI;
        if (!GoogleGenAI) throw new Error("GoogleGenAI not found in module");
        
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
