
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
  const width = aspectRatio === 'video' ? 1920 : 1080;
  const height = aspectRatio === 'video' ? 1080 : 1920;

  onProgress?.({ progress: 5, status: 'Preparing audio engine...' });
  
  // 1. Prepare Audio Context & Buffers
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioDestination = audioContext.createMediaStreamDestination();
  
  // Load and deduplicate audio URLs
  const uniqueAudioUrls = Array.from(new Set(scenes.map(s => s.audioUrl).filter(Boolean)));
  const useMultiAudio = uniqueAudioUrls.length > 1 && uniqueAudioUrls.every(url => url !== 'MULTI_SCENE_AUDIO' && url!.length > 10);
  
  // Also check if we are in "Segment" mode where all scenes share ONE part-specific URL
  const isSegmentMode = uniqueAudioUrls.length === 1 && uniqueAudioUrls[0] !== 'MULTI_SCENE_AUDIO' && uniqueAudioUrls[0]!.length > 10;

  const audioBuffers: (AudioBuffer | null)[] = [];
  
  if (useMultiAudio) {
    // Independent scene audio mode
    for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].audioUrl && scenes[i].audioUrl !== 'MULTI_SCENE_AUDIO') {
            try {
                const res = await fetch(scenes[i].audioUrl!);
                const arrayBuffer = await res.arrayBuffer();
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                audioBuffers.push(buffer);
            } catch (e) {
                audioBuffers.push(null);
            }
        } else {
            audioBuffers.push(null);
        }
    }
  } else {
    // Single master audio or Segment mode
    const urlToFetch = isSegmentMode ? uniqueAudioUrls[0]! : audioUrlFallback;
    try {
      const res = await fetch(urlToFetch);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.push(buffer);
    } catch (e) {
      console.error("Failed to load audio for reel", e);
    }
  }

  // Calculate duration and scene timings
  let totalDuration = 0;
  const sceneStartTimes: number[] = [];
  
  if (useMultiAudio) {
    let current = 0;
    audioBuffers.forEach((b, i) => {
        sceneStartTimes.push(current);
        current += b?.duration || 5;
    });
    totalDuration = current;
  } else {
    // Shared Audio Mode (Master Reel or Segment)
    const masterBuffer = audioBuffers[0];
    totalDuration = masterBuffer?.duration || 10;
    if (totalDuration < 1) totalDuration = 10; // Safety fallback
    
    const totalCharCount = scenes.reduce((sum, s) => sum + s.narration.length, 0) || 1;
    let current = 0;
    scenes.forEach(scene => {
      sceneStartTimes.push(current);
      const sceneWeight = scene.narration.length / totalCharCount;
      current += sceneWeight * totalDuration;
    });
  }

  // Ensure total duration is sane
  if (isNaN(totalDuration) || totalDuration <= 0) totalDuration = 10;

  onProgress?.({ progress: 10, status: 'Initializing cinematic renderer...' });

  // 2. Prepare Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 3. Prepare Images in Parallel
  const loadedImages: (HTMLImageElement | null)[] = await Promise.all(scenes.map(async (scene, i) => {
    onProgress?.({ 
      progress: 10 + Math.floor((i / scenes.length) * 30), 
      status: `Optimizing Assets (${i + 1}/${scenes.length})...` 
    });

    if (!scene.imageUrl) return null;

    const loadImage = async (url: string, attempts = 3): Promise<HTMLImageElement | null> => {
      for (let j = 0; j < attempts; j++) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const loadPromise = new Promise<void>((res, rej) => {
            img.onload = () => {
              try {
                const testCanvas = document.createElement('canvas');
                testCanvas.width = 1; testCanvas.height = 1;
                const tCtx = testCanvas.getContext('2d');
                if (tCtx) {
                  tCtx.drawImage(img, 0, 0, 1, 1);
                  testCanvas.toDataURL(); 
                }
                res();
              } catch (e) {
                console.warn("Auurio: Cross-origin taint detected", url);
                res(); 
              }
            };
            img.onerror = rej;
            const timeout = setTimeout(() => rej(new Error("Timeout")), 30000);
            img.src = url; 
          });
          await loadPromise;
          if (img.complete) return img;
        } catch (e) {
          if (j === attempts - 1) return null;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      return null;
    };

    return loadImage(scene.imageUrl);
  }));

  // 4. Setup Recording
  const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : null;
  
  if (!canvasStream) {
    throw new Error("Your browser does not support canvas video capture.");
  }

  // Ensure we have audio tracks even if synthesis is slow
  const audioTracks = audioDestination.stream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.warn("No audio tracks found in destination stream, creating silent track fallback");
    const oscillator = audioContext.createOscillator();
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    oscillator.connect(silentGain);
    silentGain.connect(audioDestination);
    oscillator.start();
  }

  // Combine streams
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((t: MediaStreamTrack) => combinedStream.addTrack(t));
  audioDestination.stream.getAudioTracks().forEach((t: MediaStreamTrack) => combinedStream.addTrack(t));

  if (combinedStream.getVideoTracks().length === 0) {
    throw new Error("Critical Failure: Video track initialization failed.");
  }

  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const mimeType = getSupportedMimeType();
  console.log("Selected Production MIME Type:", mimeType);
  
  if (!mimeType) {
    throw new Error("Your browser does not support any compatible video recording formats.");
  }

  // Use higher bitrate for HD quality
  const videoBitsPerSecond = 20000000; // 20 Mbps for higher quality HD
  
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      console.log("Auurio: Production stopped, compiling chunks...");
      onProgress?.({ progress: 100, status: 'Perfecting export...' });
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      audioContext.close().catch(() => {});
      resolve(blob);
    };

    recorder.onerror = (e) => {
      console.error("MediaRecorder error:", e);
      reject(new Error(`Recording error: ${e.type}`));
    };

    // Start Audio Playback Sequence
    let playStartTime = 0;
    let renderTimer: any = null;
    
    const startRecording = async () => {
      try {
        console.log("Auurio: Initializing production tracks...");
        await audioContext.resume();
        
        // Schedule all buffers
        if (useMultiAudio) {
          let loadedCount = 0;
          audioBuffers.forEach((buffer, i) => {
            if (buffer) {
              const source = audioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(audioDestination);
              source.start(audioContext.currentTime + (sceneStartTimes[i] || 0));
              loadedCount++;
            }
          });
          console.log(`Auurio: Scheduled ${loadedCount} audio segments`);
        } else if (audioBuffers[0]) {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffers[0];
          source.connect(audioDestination);
          source.start(audioContext.currentTime);
          console.log("Auurio: Scheduled master master track");
        }

        // Draw initial frame to "kickstart" the stream
        renderFrame(0);

        // Check if stream is active
        if (!combinedStream.active) {
          throw new Error("Target stream is inactive. Check camera/audio permissions.");
        }

        console.log("Auurio: Starting MediaRecorder...");
        recorder.start(100); // Smaller timeslice for better chunking
        playStartTime = performance.now();
        
        // Safety timeout to prevent infinite hanging
        const maxDuration = (totalDuration + 20) * 1000; // Increased buffer
        const safetyTimeout = setTimeout(() => {
          if (recorder.state === 'recording') {
            console.warn("Auurio: Production auto-stopped after timeout safeguard");
            stopProduction();
          }
        }, maxDuration);

        // Solid Heartbeat: We MUST maintain frame cadence even if tab is blurred
        const FPS = 30;
        const frameInterval = 1000 / FPS;
        let lastFrameTime = 0;
        
        const renderLoop = () => {
          if (recorder.state === 'inactive') {
            clearTimeout(safetyTimeout);
            return;
          }
          
          const now = performance.now();
          const elapsedSinceStart = now - playStartTime;
          const currentTimeSeconds = elapsedSinceStart / 1000;

          if (currentTimeSeconds >= totalDuration) {
            stopProduction();
            clearTimeout(safetyTimeout);
            return;
          }

          // Force render at specific interval
          if (elapsedSinceStart - lastFrameTime >= frameInterval) {
            renderFrame(currentTimeSeconds);
            lastFrameTime = elapsedSinceStart;
          }
          
          renderTimer = requestAnimationFrame(renderLoop);
        };

        // Failsafe Background Pulse (Intervals run even when blurred, though throttled)
        const failsafeInterval = setInterval(() => {
          if (recorder.state === 'recording') {
            const now = performance.now();
            const elapsed = (now - playStartTime) / 1000;
            if (elapsed < totalDuration) {
              renderFrame(elapsed);
            }
          } else {
            clearInterval(failsafeInterval);
          }
        }, 100); // 10 FPS fallback if backgrounded
        
        renderTimer = requestAnimationFrame(renderLoop);
        
        // Clear failsafe on stop
        const originalOnStop = recorder.onstop;
        recorder.onstop = (e) => {
          clearInterval(failsafeInterval);
          clearTimeout(safetyTimeout);
          if (originalOnStop) (originalOnStop as any)(e);
        };

      } catch (e) {
        console.error("Auurio: Production failure:", e);
        reject(new Error(`Production failed: ${e instanceof Error ? e.message : 'Unknown error'}`));
      }
    };

    const stopProduction = () => {
       if (recorder.state === 'recording') {
         recorder.stop();
       }
       if (renderTimer) {
         cancelAnimationFrame(renderTimer);
         renderTimer = null;
       }
    };

    let lastValidImg: HTMLImageElement | null = null;

    const renderFrame = (time: number) => {
      const sceneIndex = sceneStartTimes.findLastIndex(startTime => time >= startTime);
      const activeIndex = sceneIndex === -1 ? 0 : sceneIndex;
      const img = loadedImages[activeIndex] || lastValidImg;

      // Rendering Logic (Movement, Captions)
      // Only clear if we actually have something to draw over it, or we lose transparency/smoothness
      // But for Reels (full coverage), we always clear with black
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, width, height);

      if (img && img.complete) {
        lastValidImg = img;
        const sceneStartTime = sceneStartTimes[activeIndex];
        const sceneEnd = activeIndex < sceneStartTimes.length - 1 ? sceneStartTimes[activeIndex+1] : totalDuration;
        const sDur = sceneEnd - sceneStartTime;
        const sceneProgress = Math.min((time - sceneStartTime) / (sDur || 1), 1);
        
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

      onProgress?.({ 
        progress: 40 + Math.floor((time / totalDuration) * 55), 
        status: `Capturing Production: ${Math.min(Math.floor((time / totalDuration) * 100), 99)}%` 
      });
    };

    startRecording();
  });
}
