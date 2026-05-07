# Auurio Platform Architectural Guardrails

To maintain stability and cost efficiency, the following AI model usage rules are MANDATORY and must not be changed without explicit user requested architectural redesign.

## 1. AI Engine Usage Split

### A. Legacy API Key Pool (Firestore `api_keys`)
- **PURPOSE**: ONLY for Audio Generation (Text-to-Speech / Narration).
- **RATIONALE**: Legacy keys (standard Gemini API) are used to handle the heavy multi-chunk synthesis required for long stories, utilizing the prebuilt voice configurations.
- **LOCATION**: `src/services/aiService.ts -> generateSingleAudioChunk` call to `getBestPooledKey()`.

### B. Vertex AI / Primary Environment Key (`process.env.GEMINI_API_KEY`)
- **PURPOSE**: ALL other AI tasks including:
  - Story Generation (Text)
  - Image Generation (Multimodal IMAGE output)
  - Video Generation
  - Script Analysis
- **RATIONALE**: These tasks benefit from the high-speed, high-quota environment of Vertex AI or the primary project key. 
- **RULE**: NEVER use the Pooled Keys for these functions.

## 2. Audio Generation Specifics
- Audio generation MUST use `responseModalities: ["AUDIO"]`.
- It MUST support chunking for long texts to avoid truncation.
- It MUST use the `voiceNameMap` to handle legacy voice IDs safely.

## 3. Image Generation Specifics
- Must prioritize Gemini 2.0/1.5 multimodal generation (modality: IMAGE).
- Must have a sequential fallback mechanism through multiple models before hitting the CDN fallback.
- Must NOT report success/error status to the Firestore `api_keys` collection, as it doesn't use pooled keys.
