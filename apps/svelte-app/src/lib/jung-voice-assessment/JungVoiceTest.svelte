<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { kawasakiStore } from "./store.svelte";
  import AudioVisualizer from "./AudioVisualizer.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import { fade, fly, scale } from "svelte/transition";
  import { resolveRoute } from "$lib/routing";

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

  let showManifestation = $state(false);
  let manifestationProgress = $state(0);
  let manifestationMessage = $state("");

  const manifestationMessages = [
    "解析の儀式を開始します...",
    "意識の幾何学を構築しています...",
    "情報のエントロピーを計算中...",
    "精神多様体の位相を特定しています...",
    "ゴースト・パターンを抽出中...",
    "あなたの Spirit が形作られています..."
  ];

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
  const DEBUG_MODE = true; 

  onMount(async () => {
    if (kawasakiStore.testStatus === 'idle') {
      goto(resolveRoute("/experiment/consent"));
      return;
    }

    if (kawasakiStore.stimulusWords.length === 0) {
      await kawasakiStore.loadStimulusWords();
    }
  });

  let isInitializingMedia = false;
  async function initializeMedia() {
    if (isInitializingMedia) return;
    isInitializingMedia = true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      kawasakiStore.stream = stream;
      kawasakiStore.deviceStatus = 'success';
      
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
    } finally {
      isInitializingMedia = false;
    }
  }

  $effect(() => {
    if (kawasakiStore.testStatus === 'preflight' && !kawasakiStore.stream) {
      initializeMedia();
    }
  });

  $effect(() => {
    if (kawasakiStore.testStatus === 'completed') {
      startManifestation();
    }
  });

  async function startManifestation() {
    showManifestation = true;
    for (let i = 0; i < manifestationMessages.length; i++) {
      manifestationMessage = manifestationMessages[i]!;
      manifestationProgress = ((i + 1) / manifestationMessages.length) * 100;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    if (onComplete) onComplete();
  }

  async function startRecording(session: 1 | 2) {
    if (kawasakiStore.stream) {
      captureSnapshot(session);
      videoChunks = [];
      try {
        const options: MediaRecorderOptions = {};
        const mimeTypes = ['video/webm; codecs=vp9', 'video/webm; codecs=vp8', 'video/webm', 'video/mp4'];
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
          await kawasakiStore.uploadArtifact(blob, 'video', session);
        };
        mediaRecorder.start();
      } catch (e) {
        console.error("Failed to start MediaRecorder", e);
      }
    }

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
        if (blob) await kawasakiStore.uploadArtifact(blob, 'image', sessionIndex);
      }, 'image/jpeg', 0.8);
    }
  }

  async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try { mediaRecorder.stop(); } catch (e) {}
    }
    mediaRecorder = null;
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      await kawasakiStore.stopNativeRecording(kawasakiStore.currentSession);
    }
  }

  async function handleStartSession() {
    stopRecording();
    await new Promise(resolve => setTimeout(resolve, 300));
    await startRecording(kawasakiStore.currentSession);
    const wordCount = kawasakiStore.testMode === 'quick' ? 15 : (DEBUG_MODE ? 3 : 100);
    kawasakiStore.startSession(wordCount);
  }

  async function handleStartNextSession() {
    stopRecording();
    await new Promise(resolve => setTimeout(resolve, 500));
    await startRecording(kawasakiStore.currentSession);
    const wordCount = kawasakiStore.testMode === 'quick' ? 15 : (DEBUG_MODE ? 3 : 100);
    kawasakiStore.startSession(wordCount);
  }

  function startRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTimeout(() => { if (isListening) handleResponse("(Not Supported)"); }, 3000);
      return;
    }
    cleanupRecognition();
    recognition = new SpeechRecognition();
    recognition.lang = currentLocale;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { isListening = true; };
    recognition.onend = () => { isListening = false; };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
      recognizedText = transcript;
      if (event.results[0].isFinal) {
        handleResponse(transcript);
        recognition.stop();
      }
    };
    try { recognition.start(); } catch (e) {}
  }

  function handleResponse(response: string) {
    if (isProcessingResponse) return;
    isProcessingResponse = true;
    if (responseTimer) { clearTimeout(responseTimer); responseTimer = null; }
    const reactionTimeMs = Date.now() - wordDisplayedTime;
    kawasakiStore.recordWordResponse({ responseWord: response, reactionTimeMs });
    recognizedText = "";
  }

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

      wordDisplayedTime = Date.now();
      recognizedText = "";

      const audioUrl = `/audio/jung-voice-assessment/${word.id}.mp3`;
      if (stimulusAudio) {
        stimulusAudio.src = audioUrl;
        stimulusAudio.onended = () => { setTimeout(startRecognition, 500); };
        stimulusAudio.play().catch(() => {
          const utterance = new SpeechSynthesisUtterance(stimulusWord);
          utterance.lang = currentLocale;
          utterance.onend = () => setTimeout(startRecognition, 500);
          speechSynthesis.speak(utterance);
        });
      }

      responseTimer = setTimeout(() => {
        cleanupRecognition();
        kawasakiStore.advanceToNextWord();
      }, 10000);

      return () => {
        if (responseTimer) { clearTimeout(responseTimer); responseTimer = null; }
        cleanupRecognition();
        speechSynthesis.cancel();
      };
    }
  });

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

<div class="test-view h-full w-full flex flex-col">
  {#if showManifestation}
    <div 
      transition:fade 
      class="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white p-12 text-center"
    >
      <div class="manifestation-glow absolute inset-0 -z-10"></div>
      
      <div class="mb-12 relative">
        <div class="w-32 h-32 border-2 border-blue-500/30 rounded-full animate-ping absolute inset-0"></div>
        <div class="w-32 h-32 border border-blue-500 rounded-full flex items-center justify-center relative">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <h2 class="text-xl font-black uppercase tracking-[0.3em] mb-4 transition-all duration-500">
        {manifestationMessage}
      </h2>
      
      <div class="w-64 h-0.5 bg-gray-900 rounded-full overflow-hidden">
        <div 
          class="h-full bg-blue-500 transition-all duration-500 ease-out"
          style="width: {manifestationProgress}%"
        ></div>
      </div>
    </div>
  {/if}

  {#if kawasakiStore.testStatus === 'preflight'}
    <div in:fade class="flex-1 flex flex-col items-center justify-center py-12">
      <div class="w-full max-w-xl text-center space-y-12">
        <div class="space-y-4">
          <h2 class="text-3xl font-black uppercase tracking-tighter">{m.welcome_title()}</h2>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
            {WELCOME_MESSAGE}
          </p>
        </div>

        <div class="relative group">
          <div class="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative aspect-video bg-black rounded-[28px] overflow-hidden border border-white/10 shadow-2xl">
            <video bind:this={videoPreview} autoPlay playsInline muted class="w-full h-full object-cover opacity-80"></video>
            {#if kawasakiStore.deviceStatus !== 'success'}
              <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div class="flex flex-col items-center gap-6">
                  <div class="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p class="text-xs font-black uppercase tracking-widest text-white">
                    {kawasakiStore.deviceStatus === 'pending' ? m.preparing_devices() : m.device_access_error()}
                  </p>
                </div>
              </div>
            {/if}
          </div>
        </div>

        {#if kawasakiStore.deviceStatus === 'success'}
          <div in:fade class="space-y-8">
            <div class="h-12 flex items-center justify-center">
              <AudioVisualizer stream={kawasakiStore.stream} />
            </div>
            <button 
              class="px-12 py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-full hover:scale-105 transition-all shadow-2xl shadow-blue-600/30"
              onclick={handleStartSession}
            >
              {m.start_session()}
            </button>
          </div>
        {/if}
      </div>
    </div>

  {:else if kawasakiStore.testStatus.includes('running')}
    <div in:fade class="flex-1 flex flex-col items-center justify-center">
      <div class="fixed top-12 left-0 right-0 px-12 flex justify-between items-center">
        <div class="flex flex-col">
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Session {kawasakiStore.currentSession}</span>
          <div class="flex items-center gap-2">
            <div class="w-32 h-1 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-500 transition-all duration-300"
                style="width: {((kawasakiStore.currentWordIndex + 1) / (kawasakiStore.stimulusWords.length || 1)) * 100}%"
              ></div>
            </div>
            <span class="text-[10px] font-mono text-gray-400">
              {kawasakiStore.currentWordIndex + 1} / {kawasakiStore.stimulusWords.length}
            </span>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Recording Data</span>
        </div>
      </div>

      <div class="text-center space-y-24">
        {#if kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex]}
          {@const word = kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex]}
          {@const lang = languageTag()}
          {#key kawasakiStore.currentWordIndex}
            <h1 
              in:fly={{ y: 20, duration: 600, delay: 200 }}
              out:fade={{ duration: 400 }}
              class="text-6xl sm:text-8xl font-black uppercase tracking-tighter"
            >
              {lang === 'ja' ? word.japanese : 
               lang === 'fr' ? (word.french || word.english) :
               lang === 'es' ? (word.spanish || word.english) :
               lang === 'ru' ? (word.russian || word.english) :
               lang === 'ar' ? (word.arabic || word.english) :
               lang === 'zh' ? (word.chinese || word.english) :
               word.english}
            </h1>
          {/key}
        {/if}

        <div class="flex flex-col items-center gap-8">
          <div class="h-16 flex items-center justify-center opacity-40">
            <AudioVisualizer stream={kawasakiStore.stream} />
          </div>
          
          <div class="h-8 flex flex-col items-center justify-center">
            {#if isListening}
              <div in:fade class="flex items-center gap-3">
                <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{m.listening()}</span>
              </div>
            {/if}
            {#if recognizedText}
              <p in:fade class="text-sm font-bold text-gray-400 mt-2">“{recognizedText}”</p>
            {/if}
          </div>
        </div>
      </div>
      
      <audio bind:this={stimulusAudio}></audio>
    </div>

  {:else if kawasakiStore.testStatus === 'session-1-complete'}
    <div in:fade class="flex-1 flex flex-col items-center justify-center text-center space-y-12">
      <div class="space-y-4">
        <h2 class="text-3xl font-black uppercase tracking-tighter">{m.session_1_complete_title()}</h2>
        <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          {m.session_1_complete_desc()}
        </p>
      </div>
      
      <button 
        class="px-12 py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-xs rounded-full hover:scale-105 transition-all shadow-2xl"
        onclick={handleStartNextSession}
      >
        {m.start_session_2()}
      </button>
    </div>
  {/if}
</div>

<style>
  .manifestation-glow {
    background: radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
  }

  :global(body) {
    overflow: hidden;
  }
</style>
