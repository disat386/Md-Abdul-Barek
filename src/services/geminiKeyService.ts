import { GoogleGenAI } from "@google/genai";
import { db } from "../firebase";
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, getDocs } from "firebase/firestore";

export interface ApiKeyEntry {
  id: string;
  key: string;
  isWorking: boolean;
  lastUsed: number;
  errorCount: number;
  lastError?: string;
  source?: 'local' | 'global';
}

class GeminiKeyService {
  private keys: ApiKeyEntry[] = [];
  private currentKeyIndex: number = 0;
  private STORAGE_KEY = 'gemini_rotation_keys';

  constructor() {
    this.loadLocalKeys();
    this.syncGlobalKeys();
  }

  private loadLocalKeys() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    let localKeys: ApiKeyEntry[] = [];
    if (saved) {
      try {
        localKeys = JSON.parse(saved)
          .map((k: any) => ({ ...k, source: 'local' }))
          .filter((k: any) => k.key && k.key !== 'undefined' && k.key.trim().length > 10);
      } catch (e) {
        console.error('Failed to parse saved keys', e);
      }
    }
    
    // Add default key from process.env if it's not already there and valid
    const envKey = process.env.GEMINI_API_KEY;
    const isValidEnvKey = envKey && envKey !== 'undefined' && envKey.trim().length > 10;

    if (isValidEnvKey && !localKeys.some(k => k.key === envKey)) {
      localKeys.push({
        id: 'env-default',
        key: envKey || '',
        isWorking: true,
        lastUsed: 0,
        errorCount: 0,
        source: 'local'
      });
    }

    this.keys = localKeys;
  }

  private syncGlobalKeys() {
    try {
      // 1. Sync from the new 'gemini_keys' collection (rotation pool)
      const q = query(collection(db, 'gemini_keys'));
      onSnapshot(q, (snapshot) => {
        const poolKeys = snapshot.docs
          .map(d => ({
            id: d.id,
            key: d.data().key,
            isWorking: d.data().isWorking ?? true,
            lastUsed: d.data().lastUsed ?? 0,
            errorCount: d.data().errorCount ?? 0,
            lastError: d.data().lastError ?? '',
            source: 'global' as const
          }))
          .filter(k => k.key && k.key.trim().length > 0);

        this.updateMasterKeyList(poolKeys);
      });

      // 2. Sync from the legacy 'api_keys/global' document
      onSnapshot(doc(db, 'api_keys', 'global'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.gemini && data.gemini.trim()) {
            const legacyKey: ApiKeyEntry = {
              id: 'legacy-global',
              key: data.gemini,
              isWorking: true,
              lastUsed: 0,
              errorCount: 0,
              source: 'global'
            };
            this.updateMasterKeyList([legacyKey]);
          }
        }
      });
    } catch (error) {
      console.error("Failed to sync global keys:", error);
    }
  }

  private updateMasterKeyList(newGlobalKeys: ApiKeyEntry[]) {
    // Keep local keys
    const localKeys = this.keys.filter(k => k.source === 'local');
    
    // Merge existing global keys with new ones, avoiding duplicates by the actual key string
    const existingGlobals = this.keys.filter(k => k.source === 'global');
    
    // Create a map of keys we already have to avoid duplicates
    const finalGlobalKeys = [...newGlobalKeys];
    
    // Combine and deduplicate by 'key' string
    const allKeys = [...localKeys, ...finalGlobalKeys];
    const uniqueKeys: ApiKeyEntry[] = [];
    const keyStrings = new Set();

    for (const keyObj of allKeys) {
      if (!keyStrings.has(keyObj.key)) {
        uniqueKeys.push(keyObj);
        keyStrings.add(keyObj.key);
      }
    }

    this.keys = uniqueKeys;
  }

  private saveLocalKeys() {
    const localKeys = this.keys.filter(k => k.source === 'local');
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(localKeys));
  }

  public getKeys(): ApiKeyEntry[] {
    return [...this.keys];
  }

  public async addKey(key: string, source: 'local' | 'global' = 'local') {
    if (!key.trim()) return;
    if (this.keys.some(k => k.key === key)) return;

    if (source === 'global') {
      try {
        await addDoc(collection(db, 'gemini_keys'), {
          key,
          isWorking: true,
          lastUsed: 0,
          errorCount: 0,
          createdAt: new Date().getTime()
        });
      } catch (e) {
        console.error("Failed to add global key:", e);
      }
    } else {
      const newEntry: ApiKeyEntry = {
        id: crypto.randomUUID(),
        key,
        isWorking: true,
        lastUsed: 0,
        errorCount: 0,
        source: 'local'
      };
      this.keys.push(newEntry);
      this.saveLocalKeys();
    }
  }

  public async removeKey(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (!key) return;

    if (key.source === 'global') {
      try {
        await deleteDoc(doc(db, 'gemini_keys', id));
      } catch (e) {
        console.error("Failed to remove global key:", e);
      }
    } else {
      this.keys = this.keys.filter(k => k.id !== id);
      this.saveLocalKeys();
    }

    if (this.currentKeyIndex >= this.keys.length) {
      this.currentKeyIndex = 0;
    }
  }

  public async toggleKeyStatus(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (!key) return;

    if (key.source === 'global') {
      try {
        await updateDoc(doc(db, 'gemini_keys', id), { isWorking: !key.isWorking });
      } catch (e) {
        console.error("Failed to toggle global key:", e);
      }
    } else {
      key.isWorking = !key.isWorking;
      this.saveLocalKeys();
    }
  }

  private getNextWorkingKey(): ApiKeyEntry | null {
    if (this.keys.length === 0) return null;

    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.currentKeyIndex + i) % this.keys.length;
      const key = this.keys[index];
      if (key.isWorking) {
        this.currentKeyIndex = index;
        return key;
      }
    }
    return null;
  }

  public async executeWithRotation<T>(
    operation: (ai: any) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let attempts = 0;
    let lastError: any = null;

    // Refresh and filter working keys
    const workingKeys = this.keys.filter(k => k.isWorking && k.key && k.key.length > 10);
    const retryCount = Math.max(maxRetries, workingKeys.length);

    if (workingKeys.length === 0) {
      throw new Error('No valid API keys found. Please go to Gemini Lab Settings or Admin Panel to add a working Gemini API Key.');
    }

    while (attempts < retryCount) {
      const activeKey = this.getNextWorkingKey();
      
      if (!activeKey || !activeKey.key || activeKey.key.length < 10) {
        attempts++;
        continue;
      }

      try {
        console.log(`Attempting generation with key: ${activeKey.id.slice(0, 8)}... (source: ${activeKey.source})`);
        
        // The @google/genai package (unified SDK) MUST use the object pattern with apiKey
        const ai = new GoogleGenAI({ apiKey: activeKey.key });
        const result = await operation(ai);
        
        // Success! Update metrics asynchronously and silently
        this.updateKeyMetrics(activeKey, true).catch(console.error);
        
        return result;
      } catch (error: any) {
        console.error(`Error with key ${activeKey.id}:`, error);
        attempts++;
        
        const errorMsg = error.message || String(error);
        
        // Specific check for the missing key error from SDK
        if (errorMsg.includes('API Key must be set')) {
          lastError = new Error('The selected API key appears to be invalid or empty. Please check your settings.');
        } else {
          lastError = error;
        }

        // Determine if key should be marked as bad (only for strictly invalid status)
        const isFatalStatus = errorMsg.includes('API_KEY_INVALID') || 
                            errorMsg.includes('403') || 
                            errorMsg.includes('API Key must be set');
        
        // Quota errors (429) should NOT permanently disable the key if it's the only one
        const markAsDown = isFatalStatus || (errorMsg.includes('429') && this.keys.filter(k => k.isWorking).length > 1);
        
        this.updateKeyMetrics(activeKey, false, errorMsg, markAsDown).catch(console.error);

        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      }
    }

    throw lastError || new Error('All API keys failed. Please ensure at least one working key is added in Settings.');
  }

  private async updateKeyMetrics(key: ApiKeyEntry, isSuccess: boolean, errorMsg?: string, markAsDown: boolean = false) {
    const updates: any = {
      lastUsed: Date.now(),
      errorCount: isSuccess ? 0 : (key.errorCount || 0) + 1,
      lastError: errorMsg || (isSuccess ? '' : key.lastError),
    };

    if (markAsDown) {
      updates.isWorking = false;
    }

    if (key.source === 'global') {
      try {
        await updateDoc(doc(db, 'gemini_keys', key.id), updates);
      } catch (e) {
        // Silently fail global updates if permission issues exist
      }
    } else {
      Object.assign(key, updates);
      this.saveLocalKeys();
    }
  }
}

export const geminiKeyService = new GeminiKeyService();
