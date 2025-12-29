<script lang="ts">
  import { onMount } from "svelte";
  import { SignedOut, SignInButton } from 'svelte-clerk';
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import * as m from "$lib/paraglide/messages.js";

  onMount(async () => {
    // 参加者IDの初期化
    kawasakiStore.initializeParticipant();
    await kawasakiStore.loadStimulusWords();
  });
</script>

<svelte:head>
  <title>{m.participant_portal()} | Spirit in Physics</title>
</svelte:head>

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
    
    <a href="/participant/consent" class="btn primary large">
      {m.subject_view()}
    </a>
  </div>
</div>

<style>
  .landing-hero {
    text-align: center;
    max-width: 800px;
    margin-top: -50px;
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

  @media (max-width: 640px) {
    .main-title {
      font-size: 2.5rem;
    }
  }
</style>
