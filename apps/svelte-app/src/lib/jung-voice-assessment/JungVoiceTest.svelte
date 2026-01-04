<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { kawasakiStore } from "./store.svelte";
  import AudioVisualizer from "./AudioVisualizer.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag } from "$lib/paraglide/runtime.js";

  let { onComplete } = $props<{ onComplete?: () => void }>();

  const localeMap: Record<string, string> = {
    en: "en-US",
    ja: "ja-JP",
    fr: "fr-FR",
    es: "es-ES",
    ru: "ru-RU",
    ar: "ar-SA",
    zh: "zh-CN"
  };

  const currentLocale = $derived(localeMap[languageTag()] || "en-US");

  let videoPreview: HTMLVideoElement | undefined = $state();
  let stimulusAudio: HTMLAudioElement | undefined = $state();
  
  let recognizedText = $state("");
  let isListening = $state(false);
  let wordDisplayedTime = $state(0);
  let isProcessingResponse = false;
  
  let recognition: any = null;
  let mediaRecorder: MediaRecorder | null = null;
  let videoChunks: Blob[] = [];
  let responseTimer: any = null;

  function cleanupRecognition() {
    if (recognition) {
      try {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.stop();
      } catch (e) {}
      recognition = null;
    }
  }

  // Constants
  const WELCOME_MESSAGE = m.welcome_message();
  const DEBUG_MODE = true; // Added for validation as requested

  onMount(async () => {
    // If status is idle, we probably shouldn't be here directly without consent
    if (kawasakiStore.testStatus === 'idle') {
      goto("/participant/consent");
      return;
    }

    // Initial words are loaded by parent (Landing page)
    // but we check just in case it's mounted directly or failed
    if (kawasakiStore.stimulusWords.length === 0) {
      await kawasakiStore.loadStimulusWords();
    }
  });

  let isInitializingMedia = false;
  // Media initialization
  async function initializeMedia() {
    if (isInitializingMedia) return;
    isInitializingMedia = true;
    try {
      // Check if navigator.mediaDevices is available (HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported in this browser context (requires HTTPS or localhost)");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      kawasakiStore.stream = stream;
      kawasakiStore.deviceStatus = 'success';
      kawasakiStore.logEvent('preflight_devices_acquired');
      
      if (videoPreview) {
        videoPreview.srcObject = stream;
        videoPreview.onloadedmetadata = () => {
          videoPreview?.play().catch(e => console.warn("Video preview play failed:", e));
        };
      }
    } catch (err: any) {
      console.error("Failed to initialize media:", err);
      kawasakiStore.deviceStatus = 'error';
      kawasakiStore.error = m.device_access_error() + ": " + (err.message || "Unknown error");
      kawasakiStore.logEvent('preflight_devices_failed', { error: err.message });
    } finally {
      isInitializingMedia = false;
    }
  }

  // Effect to handle preflight media
  $effect(() => {
    if (kawasakiStore.testStatus === 'preflight' && !kawasakiStore.stream) {
      initializeMedia();
    }
  });

  // Effect to handle completion callback
  $effect(() => {
    if (kawasakiStore.testStatus === 'completed' && onComplete) {
      onComplete();
    }
  });

  // Recording logic
  async function startRecording(session: 1 | 2) {
    if (kawasakiStore.stream) {
      console.log(`Starting web recording for session ${session}`);
      // Take a snapshot at the start of recording
      try {
        captureSnapshot(session);
      } catch (e) {
        console.error("Failed to capture snapshot:", e);
      }

      videoChunks = [];
      try {
        const options: MediaRecorderOptions = {};
        const mimeTypes = [
          'video/webm; codecs=vp9',
          'video/webm; codecs=vp8',
          'video/webm',
          'video/mp4'
        ];
        
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            options.mimeType = type;
            break;
          }
        }

        mediaRecorder = new MediaRecorder(kawasakiStore.stream, options);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) videoChunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          if (videoChunks.length === 0) return;
          const blob = new Blob(videoChunks, { type: options.mimeType || 'video/webm' });
          kawasakiStore.logEvent('recording_stopped', { session });
          // Upload the video
          await kawasakiStore.uploadArtifact(blob, 'video', session);
        };
        mediaRecorder.start();
        kawasakiStore.logEvent('recording_started', { session, mimeType: options.mimeType });
      } catch (e) {
        console.error("Failed to start MediaRecorder", e);
        kawasakiStore.error = "Recording error: " + (e instanceof Error ? e.message : String(e));
      }
    }

    // Always attempt native recording if in Capacitor
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      await kawasakiStore.startNativeRecording();
    }
  }

  function captureSnapshot(sessionIndex: number) {
    if (!videoPreview || videoPreview.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          await kawasakiStore.uploadArtifact(blob, 'image', sessionIndex);
        }
      }, 'image/jpeg', 0.8);
    }
  }

  async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (e) {
        console.error("Failed to stop MediaRecorder", e);
      }
    }
    mediaRecorder = null;

    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      await kawasakiStore.stopNativeRecording(kawasakiStore.currentSession);
    }
  }

  // Session control
  async function handleStartSession() {
    try {
      // Just in case something is already recording
      stopRecording();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await startRecording(kawasakiStore.currentSession);
      const wordCount = kawasakiStore.testMode === 'quick' ? 15 : (DEBUG_MODE ? 3 : 100);
      kawasakiStore.startSession(wordCount);
    } catch (e) {
      console.error("Error starting session:", e);
      kawasakiStore.error = "Error starting session: " + (e instanceof Error ? e.message : String(e));
    }
  }

  async function handleStartNextSession() {
    try {
      stopRecording();
      // Wait a bit for MediaRecorder to fully stop and resource to be released
      await new Promise(resolve => setTimeout(resolve, 500));
      await startRecording(kawasakiStore.currentSession);
      const wordCount = kawasakiStore.testMode === 'quick' ? 15 : (DEBUG_MODE ? 3 : 100);
      kawasakiStore.startSession(wordCount);
    } catch (e) {
      console.error("Error starting next session:", e);
      kawasakiStore.error = "Error starting next session: " + (e instanceof Error ? e.message : String(e));
    }
  }

  // Word association logic
  function startRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser");
      // Fallback: trigger response manually or skip
      setTimeout(() => {
        if (isListening) handleResponse("(Speech Recognition Not Supported)");
      }, 3000);
      return;
    }

    cleanupRecognition();

    recognition = new SpeechRecognition();
    recognition.lang = currentLocale;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      isListening = true;
      kawasakiStore.logEvent('recognition_started');
    };
    recognition.onend = () => {
      isListening = false;
      kawasakiStore.logEvent('recognition_ended');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      recognizedText = transcript;
      
      if (event.results[0].isFinal) {
        handleResponse(transcript);
        recognition.stop();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      kawasakiStore.logEvent('recognition_error', { error: event.error });
      if (event.error === 'no-speech') {
        // Just let it timeout or retry if appropriate
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }

  function handleResponse(response: string) {
    if (isProcessingResponse) return;
    isProcessingResponse = true;

    if (responseTimer) {
      clearTimeout(responseTimer);
      responseTimer = null;
    }
    
    const reactionTimeMs = Date.now() - wordDisplayedTime;
    kawasakiStore.recordWordResponse({
      responseWord: response,
      reactionTimeMs
    });
    recognizedText = "";
  }

  // Effect for word display
  $effect(() => {
    const isRunning = kawasakiStore.testStatus.includes('running');
    const word = kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex];

    if (isRunning && word) {
      isProcessingResponse = false;
      const lang = languageTag();
      let stimulusWord = word.english;
      if (lang === 'ja') stimulusWord = word.japanese;
      else if (lang === 'fr') stimulusWord = word.french || word.english;
      else if (lang === 'es') stimulusWord = word.spanish || word.english;
      else if (lang === 'ru') stimulusWord = word.russian || word.english;
      else if (lang === 'ar') stimulusWord = word.arabic || word.english;
      else if (lang === 'zh') stimulusWord = word.chinese || word.english;

      kawasakiStore.logEvent('word_displayed', { word: stimulusWord, id: word.id });
      wordDisplayedTime = Date.now();
      recognizedText = "";

      // Play audio or TTS
      const audioUrl = `/audio/jung-voice-assessment/${word.id}.mp3`;
      if (stimulusAudio) {
        stimulusAudio.src = audioUrl;
        stimulusAudio.onended = () => {
          setTimeout(startRecognition, 500);
        };
        stimulusAudio.play().catch((err) => {
          console.warn("Audio play failed, using TTS:", err);
          // Fallback to TTS
          const utterance = new SpeechSynthesisUtterance(stimulusWord);
          utterance.lang = currentLocale;
          utterance.onend = () => setTimeout(startRecognition, 500);
          speechSynthesis.speak(utterance);
        });
      }

      // Timeout for no response
      responseTimer = setTimeout(() => {
        kawasakiStore.logEvent('response_timeout', { word: stimulusWord });
        cleanupRecognition();
        kawasakiStore.advanceToNextWord();
      }, 10000);

      return () => {
        if (responseTimer) {
          clearTimeout(responseTimer);
          responseTimer = null;
        }
        cleanupRecognition();
        speechSynthesis.cancel();
      };
    }
  });

  // Stop recording on session complete
  $effect(() => {
    if (kawasakiStore.testStatus === 'session-1-complete' || kawasakiStore.testStatus === 'completed') {
      stopRecording();
    }
  });

  onDestroy(() => {
    stopRecording();
    if (kawasakiStore.stream) {
      kawasakiStore.stream.getTracks().forEach(t => t.stop());
      kawasakiStore.stream = null;
    }
  });
</script>

<div class="test-container">
  {#if kawasakiStore.testStatus === 'preflight'}
    <div class="screen preflight">
      <h2>{m.device_check()}</h2>
      <div class="card welcome-card">
        <h3>{m.welcome_title()}</h3>
        <p>{WELCOME_MESSAGE}</p>
        <button class="btn" onclick={() => stimulusAudio?.play().catch(console.error)}>{m.listen_again()}</button>
        <audio bind:this={stimulusAudio} src="/audio/jung-voice-assessment/welcome_message.mp3"></audio>
      </div>

      <div class="video-container">
        <video bind:this={videoPreview} autoPlay playsInline muted class="video-preview"></video>
        {#if kawasakiStore.deviceStatus !== 'success'}
          <div class="overlay">
            <div class="flex flex-col items-center gap-4">
              <p class="text-sm font-bold">{kawasakiStore.deviceStatus === 'pending' ? m.preparing_devices() : m.device_access_error()}</p>
              {#if kawasakiStore.deviceStatus === 'error'}
                <div class="text-[10px] bg-red-500/20 p-4 rounded-xl max-w-xs leading-relaxed">
                  <p class="mb-2 font-bold uppercase tracking-widest">Mobile Guide:</p>
                  <ul class="text-left list-disc pl-4 space-y-1">
                    <li>iOS: Use <strong>Safari</strong> and ensure "Camera & Microphone" are allowed in Settings.</li>
                    <li>Android: Use <strong>Chrome</strong>.</li>
                    <li>Please reload the page if you accidentally denied permissions.</li>
                  </ul>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      {#if kawasakiStore.deviceStatus === 'success'}
        <div class="status-ready">
          <p class="success-text">{m.devices_ready()}</p>
          <AudioVisualizer stream={kawasakiStore.stream} />
        </div>
      {/if}

      {#if kawasakiStore.error}
        <p class="error-text">{kawasakiStore.error}</p>
      {/if}

      <button class="btn primary large" disabled={kawasakiStore.deviceStatus !== 'success'} onclick={handleStartSession}>
        {m.start_session()}
      </button>
    </div>

  {:else if kawasakiStore.testStatus.includes('running')}
    <div class="screen session">
      <div class="progress-container">
        <p>{m.session_info({ session: kawasakiStore.currentSession, current: kawasakiStore.currentWordIndex + 1, total: kawasakiStore.stimulusWords.length })}</p>
        <div class="progress-bar">
          <div class="fill" style="width: {((kawasakiStore.currentWordIndex + 1) / (kawasakiStore.stimulusWords.length || 1)) * 100}%"></div>
        </div>
      </div>

      {#if kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex]}
        {@const word = kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex]}
        {@const lang = languageTag()}
        <h1 class="stimulus-word">
          {lang === 'ja' ? word.japanese : 
           lang === 'fr' ? (word.french || word.english) :
           lang === 'es' ? (word.spanish || word.english) :
           lang === 'ru' ? (word.russian || word.english) :
           lang === 'ar' ? (word.arabic || word.english) :
           lang === 'zh' ? (word.chinese || word.english) :
           word.english}
        </h1>
      {/if}

      <div class="visualizer-box">
        <AudioVisualizer stream={kawasakiStore.stream} />
      </div>

      <div class="recognition-status">
        {#if isListening}
          <span class="listening-indicator">{m.listening()}</span>
        {/if}
        {#if recognizedText}
          <p class="recognized-text">{m.recognition_result({ text: recognizedText })}</p>
        {/if}
      </div>
      
      <audio bind:this={stimulusAudio}></audio>
    </div>

  {:else if kawasakiStore.testStatus === 'session-1-complete'}
    <div class="screen break">
      <h2>{m.session_1_complete_title()}</h2>
      <p>{m.session_1_complete_desc()}</p>
      <button class="btn primary large" onclick={handleStartNextSession}>
        {m.start_session_2()}
      </button>
    </div>

  {:else if kawasakiStore.testStatus === 'completed'}
    <div class="screen completion">
      <h2>{m.test_complete_title()}</h2>
      <p>{m.test_complete_desc()}</p>
      <button class="btn" onclick={() => kawasakiStore.resetTest()}>
        {m.start_new_session()}
      </button>
    </div>
  {/if}
</div>

<style>
  .test-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 2rem;
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }

  .welcome-card {
    text-align: left;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .video-container {
    position: relative;
    width: 100%;
    max-width: 480px;
    aspect-ratio: 16/9;
    background: #111;
    border-radius: 12px;
    overflow: hidden;
  }

  .video-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    text-align: center;
    padding: 1rem;
  }

  .stimulus-word {
    font-size: 5rem;
    font-weight: 900;
    margin: 4rem 0;
    color: #111;
    text-align: center;
    word-break: break-word;
  }

  @media (max-width: 640px) {
    .stimulus-word {
      font-size: 3rem;
      margin: 2rem 0;
    }
    .screen {
      padding: 1rem;
    }
  }

  .progress-container {
    width: 100%;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .fill {
    height: 100%;
    background: #6366f1;
    transition: width 0.3s ease;
  }

  .success-text {
    color: #10b981;
    font-weight: 600;
  }

  .error-text {
    color: #ef4444;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #e5e7eb;
    background: white;
    transition: all 0.2s;
  }

  .btn.primary {
    background: #000;
    color: white;
    border: none;
  }

  .btn.large {
    padding: 1rem 3rem;
    font-size: 1.25rem;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .listening-indicator {
    color: #6366f1;
    font-weight: 600;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  .recognized-text {
    font-size: 1.25rem;
    color: #4b5563;
    margin-top: 1rem;
  }
</style>
