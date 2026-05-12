# Auurio Platform Architectural Guardrails

To maintain stability and cost efficiency, the following AI model usage rules are MANDATORY as requested by the user.

## 1. AI Engine Usage - Unified Free Pool
- **STRATEGY**: ALL AI tasks (Story Generation, Image Generation, Voice Synthesis) MUST ONLY use the **Legacy API Key Pool** (Firestore `api_keys`).
- **RATIONALE**: This distributed pool allows for high throughput without incurring costs on a single primary key.
- **NO FALLBACK**: `process.env.GEMINI_API_KEY` and server-side proxies are EXPLICITLY REMOVED. If the pool is exhausted, the system must wait for cooldown or requires more keys to be added to the pool.
- **VERTEX AI**: Vertex AI system is EXPLICITLY REMOVED and must not be used.

## 2. Audio Generation Specifics
- Audio generation MUST use `responseModalities: ["AUDIO"]` and utilize Pooled Keys.
- It MUST support chunking for long texts to avoid truncation.
- It MUST use specialized TTS models (e.g., `gemini-3.1-flash-tts-preview`) via the pool.

## 3. Image Generation Specifics
- Must prioritize Gemini 2.0 multimodal generation (modality: IMAGE) via pooled keys.
- If primary pool models fail, fallback to high-speed CDN generation (flux/pollinations).
- Pooled key status (success/quota) MUST be reported back to the `api_keys` collection to maintain pool health.

## 4. Multi-Tool Architecture
- **CineAura**: Full production tool (Story + Voice + Visuals + Video).
- **CineVoice**: Specialized Storytelling tool (Story + Voice only, with downloadable audio).
- **ReelAura**: Short-form portrait video tool.
- **ThumbAura**: Thumbnail & Banner design tool.
