<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { kawasakiStore } from "./store.svelte";
  import AudioVisualizer from "./AudioVisualizer.svelte";

  let { onComplete } = $props<{ onComplete?: () => void }>();

  let videoPreview: HTMLVideoElement | undefined = $state();
  let stimulusAudio: HTMLAudioElement | undefined = $state();
  
  let recognizedText = $state("");
  let isListening = $state(false);
  let wordDisplayedTime = $state(0);
  
  let recognition: any = null;
  let mediaRecorder: MediaRecorder | null = null;
  let videoChunks: Blob[] = [];
  let responseTimer: any = null;

  // Constants
  const WELCOME_MESSAGE = "ユング式言語連想検査へようこそ。これから100個の単語が表示されます。それぞれの単語から連想される言葉を、できるだけ早く声に出して回答してください。";

  onMount(async () => {
    await kawasakiStore.loadStimulusWords();
  });

  // Media initialization
  async function initializeMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 }
      });
      kawasakiStore.stream = stream;
      kawasakiStore.deviceStatus = 'success';
      kawasakiStore.logEvent('preflight_devices_acquired');
      
      if (videoPreview) {
        videoPreview.srcObject = stream;
      }
    } catch (err: any) {
      kawasakiStore.deviceStatus = 'error';
      kawasakiStore.error = "カメラまたはマイクへのアクセスに失敗しました。";
      kawasakiStore.logEvent('preflight_devices_failed', { error: err.message });
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
    if (!kawasakiStore.stream) return;

    // Take a snapshot at the start of recording
    captureSnapshot(session);

    videoChunks = [];
    try {
      mediaRecorder = new MediaRecorder(kawasakiStore.stream, { mimeType: 'video/webm; codecs=vp9' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(videoChunks, { type: 'video/webm' });
        kawasakiStore.logEvent('recording_stopped', { session });
        // Upload the video
        await kawasakiStore.uploadArtifact(blob, 'video', session);
      };
      mediaRecorder.start();
      kawasakiStore.logEvent('recording_started', { session });
    } catch (e) {
      console.error("Failed to start MediaRecorder", e);
    }
  }

  function captureSnapshot(sessionIndex: number) {
    if (!videoPreview) return;

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

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  }

  // Session control
  async function handleStartSession() {
    await startRecording(kawasakiStore.currentSession);
    kawasakiStore.startSession(100);
  }

  async function handleStartNextSession() {
    await startRecording(kawasakiStore.currentSession);
    kawasakiStore.startSession(100);
  }

  // Word association logic
  function startRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser");
      return;
    }

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
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
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }

  function handleResponse(response: string) {
    const reactionTimeMs = Date.now() - wordDisplayedTime;
    kawasakiStore.recordWordResponse({
      responseWord: response,
      reactionTimeMs
    });
    if (responseTimer) clearTimeout(responseTimer);
    recognizedText = "";
  }

  // Effect for word display
  $effect(() => {
    const isRunning = kawasakiStore.testStatus.includes('running');
    const word = kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex];

    if (isRunning && word) {
      kawasakiStore.logEvent('word_displayed', { word: word.japanese, id: word.id });
      wordDisplayedTime = Date.now();
      recognizedText = "";

      // Play audio or TTS
      const audioUrl = `/audio/jung-voice-assessment/${word.id}.mp3`;
      if (stimulusAudio) {
        stimulusAudio.src = audioUrl;
        stimulusAudio.onended = () => {
          setTimeout(startRecognition, 500);
        };
        stimulusAudio.play().catch(() => {
          // Fallback to TTS
          const utterance = new SpeechSynthesisUtterance(word.japanese);
          utterance.lang = 'ja-JP';
          utterance.onend = () => setTimeout(startRecognition, 500);
          speechSynthesis.speak(utterance);
        });
      }

      // Timeout for no response (increased to 10s as per some requirements seen in other files)
      responseTimer = setTimeout(() => {
        kawasakiStore.logEvent('response_timeout', { word: word.japanese });
        if (recognition) {
          try { recognition.stop(); } catch (e) {}
        }
        kawasakiStore.advanceToNextWord();
      }, 10000);

      return () => {
        if (responseTimer) clearTimeout(responseTimer);
        if (recognition) {
          try { recognition.stop(); } catch (e) {}
        }
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
    }
  });
</script>

<div class="test-container">
  {#if kawasakiStore.testStatus === 'preflight'}
    <div class="screen preflight">
      <h2>デバイスチェック</h2>
      <div class="card welcome-card">
        <h3>ようこそ</h3>
        <p>{WELCOME_MESSAGE}</p>
        <button class="btn" onclick={() => stimulusAudio?.play()}>説明をもう一度聞く</button>
        <audio bind:this={stimulusAudio} src="/audio/jung-voice-assessment/welcome_message.mp3" autoPlay></audio>
      </div>

      <div class="video-container">
        <video bind:this={videoPreview} autoPlay playsInline muted class="video-preview"></video>
        {#if kawasakiStore.deviceStatus !== 'success'}
          <div class="overlay">
            <p>{kawasakiStore.deviceStatus === 'pending' ? 'カメラとマイクを準備しています...' : 'デバイスにアクセスできませんでした。'}</p>
          </div>
        {/if}
      </div>

      {#if kawasakiStore.deviceStatus === 'success'}
        <div class="status-ready">
          <p class="success-text">カメラとマイクの準備ができました。</p>
          <AudioVisualizer stream={kawasakiStore.stream} />
        </div>
      {/if}

      {#if kawasakiStore.error}
        <p class="error-text">{kawasakiStore.error}</p>
      {/if}

      <button class="btn primary large" disabled={kawasakiStore.deviceStatus !== 'success'} onclick={handleStartSession}>
        セッションを開始
      </button>
    </div>

  {:else if kawasakiStore.testStatus.includes('running')}
    <div class="screen session">
      <div class="progress-container">
        <p>セッション {kawasakiStore.currentSession} - 単語 {kawasakiStore.currentWordIndex + 1} / {kawasakiStore.stimulusWords.length}</p>
        <div class="progress-bar">
          <div class="fill" style="width: {((kawasakiStore.currentWordIndex + 1) / kawasakiStore.stimulusWords.length) * 100}%"></div>
        </div>
      </div>

      {#if kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex]}
        <h1 class="stimulus-word">{kawasakiStore.stimulusWords[kawasakiStore.currentWordIndex].japanese}</h1>
      {/if}

      <div class="visualizer-box">
        <AudioVisualizer stream={kawasakiStore.stream} />
      </div>

      <div class="recognition-status">
        {#if isListening}
          <span class="listening-indicator">聞き取り中...</span>
        {/if}
        {#if recognizedText}
          <p class="recognized-text">認識結果: {recognizedText}</p>
        {/if}
      </div>
      
      <audio bind:this={stimulusAudio}></audio>
    </div>

  {:else if kawasakiStore.testStatus === 'session-1-complete'}
    <div class="screen break">
      <h2>セッション1が完了しました</h2>
      <p>短い休憩を取ってください。準備ができたら、セッション2を開始してください。</p>
      <button class="btn primary large" onclick={handleStartNextSession}>
        セッション2を開始
      </button>
    </div>

  {:else if kawasakiStore.testStatus === 'completed'}
    <div class="screen completion">
      <h2>検査完了</h2>
      <p>ご協力ありがとうございました。データは保存されました。</p>
      <button class="btn" onclick={() => kawasakiStore.resetTest()}>
        新しいセッションを開始する
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
    object-cover: cover;
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

