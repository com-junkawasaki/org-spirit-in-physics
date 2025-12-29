<script lang="ts">
import { onMount } from "svelte";
import { SignedIn, SignedOut, SignInButton, useClerkContext } from 'svelte-clerk';
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";
import ConsentForm from "./ConsentForm.svelte";
  import JungVoiceTest from "../jung-voice-assessment/JungVoiceTest.svelte";
  import { kawasakiStore } from "../jung-voice-assessment/store.svelte";
  import { languageTag } from "$lib/i18n.svelte";
  import * as m from "$lib/paraglide/messages.js";

  let step = $state<"landing" | "consent" | "assessment" | "complete">("landing");
  const clerk = PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null;

  onMount(async () => {
    // 参加者IDの初期化
    kawasakiStore.initializeParticipant();
    await kawasakiStore.loadStimulusWords();
  });

  async function handleConsent(id: string, email: string, agreements: any, demographics: any) {
    console.log("Consent received:", { id, email, agreements, demographics });
    
    try {
      // 参加者情報の初期化（ストア）
      kawasakiStore.initializeParticipant(id, demographics);
      
      // API 連携: 参加者作成
      await kawasakiStore.createParticipantOnServer(email, agreements);
      
      kawasakiStore.startPreflight();
      step = "assessment";
    } catch (error) {
      console.error("Failed to create participant:", error);
    }
  }

  function startParticipantFlow() {
    step = "consent";
  }

  function handleTestComplete() {
    step = "complete";
  }
</script>

<div class="participant-container">
  {#if kawasakiStore.error}
    <div class="error-banner">
      <div class="error-content">
        <svg xmlns="http://www.w3.org/2000/svg" class="error-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-18 0 8 8 0 0118 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span class="error-message">{kawasakiStore.error}</span>
        <button class="error-close" onclick={() => kawasakiStore.clearError()}>×</button>
      </div>
    </div>
  {/if}

  {#if step !== "landing"}
    <header class="step-header">
      <div class="header-content">
        <button class="back-link" onclick={() => step = "landing"}>← {m.back()}</button>
        <span class="step-title">{m.participant_portal()}</span>
      </div>
    </header>
  {/if}

  {#if step === "landing"}
    <div class="landing-hero">
      <h1 class="main-title">
        <span class="gradient-text">{m.logo()}</span>
      </h1>
      
      <div class="button-group">
        {#if PUBLIC_CLERK_PUBLISHABLE_KEY}
          <SignedOut>
            <SignInButton mode="modal">
              <button class="btn secondary">{m.signin()}</button>
            </SignInButton>
          </SignedOut>
        {/if}
        
        <button class="btn primary large" onclick={startParticipantFlow}>
          {m.subject_view()}
        </button>
      </div>
    </div>
  {:else if step === "consent"}
    <div class="step-container">
      <ConsentForm participantId={kawasakiStore.participantId || ""} onConsent={handleConsent} />
    </div>
  {:else if step === "assessment"}
    <div class="step-container">
      <JungVoiceTest onComplete={handleTestComplete} />
    </div>
  {:else if step === "complete"}
    <div class="step-container success">
      <h2>{m.thank_you()}</h2>
      <p>{m.experiment_finished()}</p>
      <button class="btn" onclick={() => {
        kawasakiStore.resetTest();
        step = "landing";
      }}>{m.back_to_top()}</button>
    </div>
  {/if}
</div>

<style>
  .participant-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 100px);
    width: 100%;
    position: relative;
  }

  .error-banner {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    width: 90%;
    max-width: 600px;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { transform: translate(-50%, -20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }

  .error-content {
    background: #fee2e2;
    border: 1px solid #ef4444;
    color: #b91c1c;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .error-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .error-message {
    font-size: 0.9rem;
    font-weight: 600;
    flex: 1;
  }

  .error-close {
    background: none;
    border: none;
    color: #b91c1c;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.5rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .error-close:hover {
    opacity: 1;
  }

  .step-header {
    width: 100%;
    background: white;
    padding: 1rem 2rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .back-link {
    background: none;
    border: none;
    color: #6366f1;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
  }

  .step-title {
    font-weight: 700;
    color: #111;
  }

  .landing-hero {
    text-align: center;
    max-width: 800px;
  }

  .main-title {
    font-size: 4rem;
    font-weight: 900;
    margin-bottom: 3rem;
    letter-spacing: -0.02em;
  }

  .gradient-text {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    align-items: center;
  }

  .btn {
    width: 280px;
    padding: 1rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
  }

  .btn.primary {
    background: #000;
    color: #fff;
  }

  .btn.primary.large {
    height: 80px;
    font-size: 1.25rem;
  }

  .btn.primary:hover {
    background: #333;
    transform: translateY(-2px);
  }

  .btn.secondary {
    background: #fff;
    color: #000;
    border: 1px solid #e5e7eb;
  }

  .btn.outline {
    background: transparent;
    color: #4b5563;
    border: 2px solid #e5e7eb;
    height: 80px;
    font-size: 1.25rem;
  }

  .btn.outline:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .step-container {
    width: 100%;
    max-width: 900px;
    padding: 2rem;
  }

  .assessment-placeholder, .success {
    background: white;
    padding: 4rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }

  .success h2 {
    color: #10b981;
    margin-bottom: 1rem;
  }

  @media (max-width: 640px) {
    .main-title {
      font-size: 2.5rem;
    }
  }
</style>
