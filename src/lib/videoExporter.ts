
/**
 * Auurio Video Exporter
 * Uses Canvas capturing and MediaRecorder to generate a real video file (MP4/WebM)
 * without needing a backend or heavy WASM libraries.
 */

export interface ExportProgress {
  progress: number;
  status: string;
}

export async function exportToVideo(
  scenes: { imageUrl: string; narration: string; audioUrl?: string }[],
  audioUrlFallback: string,
  options: { 
    aspectRatio: 'video' | 'reel'; 
    onProgress?: (progress: ExportProgress) => void;
  }
): Promise<Blob> {
  const { aspectRatio, onProgress } = options;
  const width = aspectRatio === 'video' ? 1280 : 720;
  const height = aspectRatio === 'video' ? 720 : 1280;

  onProgress?.({ progress: 5, status: 'Preparing audio engine...' });
  
  // 1. Prepare Audio Context & Buffers
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioDestination = audioContext.createMediaStreamDestination();
  
  // Load all audio chunks or fall back to the single audioUrl
  const audioBuffers: (AudioBuffer | null)[] = [];
  const useMultiAudio = scenes.some(s => s.audioUrl && s.audioUrl !== 'MULTI_SCENE_AUDIO' && s.audioUrl.length > 10);

  if (useMultiAudio) {
    for (let i = 0; i < scenes.length; i++) {
      onProgress?.({ progress: 5 + Math.floor((i / scenes.length) * 5), status: `Buffering audio scene ${i+1}...` });
      if (scenes[i].audioUrl && scenes[i].audioUrl !== 'MULTI_SCENE_AUDIO') {
        try {
          const res = await fetch(scenes[i].audioUrl!);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = await audioContext.decodeAudioData(arrayBuffer);
          audioBuffers.push(buffer);
        } catch (e) {
          console.error(`Failed to load audio for scene ${i}`, e);
          audioBuffers.push(null);
        }
      } else {
        audioBuffers.push(null);
      }
    }
  } else {
    // Fallback to single audioUrl mode
    try {
      const res = await fetch(audioUrlFallback);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.push(buffer);
    } catch (e) {
      console.error("Failed to load fallback audio", e);
    }
  }

  // Calculate duration and scene timings
  let totalDuration = 0;
  const sceneDurations = audioBuffers.map(b => b?.duration || 5); // Default 5s if missing
  const sceneStartTimes: number[] = [];
  
  if (useMultiAudio) {
    let current = 0;
    for (let d of sceneDurations) {
      sceneStartTimes.push(current);
      current += d;
    }
    totalDuration = current;
  } else {
    totalDuration = audioBuffers[0]?.duration || 10;
    const anyHasDuration = (scenes as any[]).some(s => s.audioDuration > 0);
    
    if (anyHasDuration) {
      let current = 0;
      scenes.forEach(scene => {
        sceneStartTimes.push(current);
        current += (scene as any).audioDuration || (totalDuration / scenes.length);
      });
    } else {
      const totalCharCount = scenes.reduce((sum, s) => sum + s.narration.length, 0);
      let current = 0;
      scenes.forEach(scene => {
        sceneStartTimes.push(current);
        const sceneWeight = scene.narration.length / totalCharCount || (1 / scenes.length);
        current += sceneWeight * totalDuration;
      });
    }
  }

  onProgress?.({ progress: 10, status: 'Initializing cinematic renderer...' });

  // 2. Prepare Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 3. Prepare Images
  const loadedImages: (HTMLImageElement | null)[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    onProgress?.({ 
      progress: 10 + Math.floor((i / scenes.length) * 30), 
      status: `Mastering Scene ${i + 1} of ${scenes.length}...` 
    });

    if (!scene.imageUrl) {
      loadedImages.push(null);
      continue;
    }

    const loadImage = async (url: string, attempts = 3): Promise<HTMLImageElement | null> => {
      for (let j = 0; j < attempts; j++) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const loadPromise = new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
            const timeout = setTimeout(() => rej(new Error("Timeout")), 20000);
            img.src = url; 
            return () => clearTimeout(timeout);
          });
          await loadPromise;
          if (img.decode) await img.decode();
          return img;
        } catch (e) {
          if (j === attempts - 1) return null;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      return null;
    };

    const img = await loadImage(scene.imageUrl);
    loadedImages.push(img);
  }

  // 4. Setup Recording
  const canvasStream = canvas.captureStream(30); 
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks()
  ]);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9' 
      : 'video/webm',
    videoBitsPerSecond: 8000000
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      audioContext.close();
      resolve(blob);
    };

    recorder.onerror = reject;

    // Start Audio Playback Sequence
    let playStartTime = 0;
    
    const startRecording = async () => {
      try {
        await audioContext.resume();
        
        // Schedule all buffers
        if (useMultiAudio) {
          audioBuffers.forEach((buffer, i) => {
            if (buffer) {
              const source = audioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(audioDestination);
              source.connect(audioContext.destination);
              source.start(audioContext.currentTime + sceneStartTimes[i]);
            }
          });
        } else if (audioBuffers[0]) {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffers[0];
          source.connect(audioDestination);
          source.connect(audioContext.destination);
          source.start(audioContext.currentTime);
        }

        recorder.start();
        playStartTime = performance.now();
        render();
      } catch (e) {
        reject(e);
      }
    };

    const render = () => {
      if (recorder.state === 'inactive') return;
      
      const time = (performance.now() - playStartTime) / 1000;

      if (time >= totalDuration) {
        if (recorder.state === 'recording') recorder.stop();
        return;
      }
      
      const sceneIndex = sceneStartTimes.findLastIndex(startTime => time >= startTime);
      const activeIndex = sceneIndex === -1 ? 0 : sceneIndex;
      const img = loadedImages[activeIndex];

      // Rendering Logic (Movement, Captions)
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      if (img && img.complete) {
        const sceneStartTime = sceneStartTimes[activeIndex];
        const sceneEnd = activeIndex < sceneStartTimes.length - 1 ? sceneStartTimes[activeIndex+1] : totalDuration;
        const sDur = sceneEnd - sceneStartTime;
        const sceneProgress = Math.min((time - sceneStartTime) / sDur, 1);
        
        const moveType = activeIndex % 8;
        let scale: number;
        let xOffset = 0;
        let yOffset = 0;
        
        // Reel Energy: Subtle impact shake at scene start
        let shake = 0;
        if (sceneProgress < 0.12) {
          shake = Math.sin(sceneProgress * 80) * 8 * (1 - (sceneProgress / 0.12));
        }

        if (moveType === 0) scale = 1.05 + (sceneProgress * 0.25); // Intense zoom in
        else if (moveType === 1) scale = 1.3 - (sceneProgress * 0.25); // Intense zoom out
        else if (moveType === 2) { xOffset = -60 + (sceneProgress * 120); scale = 1.15; } // Fast pan
        else if (moveType === 3) { xOffset = 60 - (sceneProgress * 120); scale = 1.15; } // Fast pan
        else if (moveType === 4) { yOffset = -40 + (sceneProgress * 80); scale = 1.2; } // Vertical pan
        else if (moveType === 5) { yOffset = 40 - (sceneProgress * 80); scale = 1.2; } // Vertical pan
        else if (moveType === 6) { xOffset = -40 + (sceneProgress * 80); yOffset = -40 + (sceneProgress * 80); scale = 1.3; }
        else { xOffset = 40 - (sceneProgress * 80); yOffset = 40 - (sceneProgress * 80); scale = 1.3; }

        xOffset += shake;

        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const x = (width - drawWidth) / 2 + xOffset;
        const y = (height - drawHeight) / 2 + yOffset;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
      }

      // Overlays & Text REMOVED
      onProgress?.({ 
        progress: 40 + Math.floor((time / totalDuration) * 55), 
        status: `Capturing Production: ${Math.floor((time / totalDuration) * 100)}%` 
      });

      requestAnimationFrame(render);
    };

    startRecording();
  });
}
