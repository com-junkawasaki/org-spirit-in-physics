<script lang="ts">
  import { onMount } from "svelte";
  import { SignedOut, SignInButton, useClerkContext } from 'svelte-clerk';
  import { runtimeConfig } from "$lib/env.svelte";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { hasAccess } from "$lib/subscription";

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const user = $derived(clerk?.user);

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
    {#if runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}
      <SignedOut>
        <SignInButton mode="modal">
          <button class="btn secondary">{m.signin()}</button>
        </SignInButton>
      </SignedOut>
    {/if}
    
    <div class="entry-grid">
      <a href="/participant/consent?mode=quick" class="entry-card quick">
        <div class="icon">⚡</div>
        <div class="info">
          <div class="title-row">
            <h3>Quick Scan</h3>
            <span class="free-badge">FREE</span>
          </div>
          <p class="desc">5 min / 即時診断</p>
        </div>
      </a>
      
      <div class="entry-card full featured {hasAccess(user, 'full') ? '' : 'disabled'}">
        <a href={hasAccess(user, 'full') ? "/participant/consent?mode=full" : "#"} class="card-link-wrapper">
          <div class="icon">🔬</div>
          <div class="info">
            <div class="title-row">
              <h3>Full Research</h3>
              <span class="premium-badge">PREMIUM</span>
            </div>
            <p class="desc">30 min / 専門レポート付</p>
            <div class="price-info">
              <span class="current">$80</span>
            </div>
          </div>
        </a>
        {#if !hasAccess(user, 'full')}
          <div class="lock-overlay">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">Premium Access Required</span>
          </div>
        {/if}
      </div>

      <div class="entry-card professional {hasAccess(user, 'professional') ? '' : 'disabled'}">
        <div class="icon">💎</div>
        <div class="info">
          <div class="title-row">
            <h3>Expert Dive</h3>
            <span class="expert-badge">EXPERT</span>
          </div>
          <p class="desc">60 min+ / 専門家解析</p>
          <div class="price-info">
            <span class="current">$250</span>
          </div>
        </div>
        {#if !hasAccess(user, 'professional')}
          <div class="lock-overlay">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">Sub required</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .free-badge {
    background: #f3f4f6;
    color: #6b7280;
    font-size: 0.6rem;
    font-weight: 800;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
    border: 1px solid #e5e7eb;
  }

  :global(.dark) .free-badge {
    background: #374151;
    color: #9ca3af;
    border-color: #4b5563;
  }

  .premium-badge {
    background: #f59e0b;
    color: #fff;
    font-size: 0.6rem;
    font-weight: 900;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .expert-badge {
    background: #a855f7;
    color: #fff;
    font-size: 0.6rem;
    font-weight: 900;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .price-info {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .price-info .current {
    font-size: 0.8rem;
    color: #10b981;
    font-weight: 800;
    background: rgba(16, 185, 129, 0.1);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }
  .landing-hero {
    text-align: center;
    max-width: 900px;
    margin-top: -50px;
    padding: 0 1.5rem;
  }

  .main-title {
    font-size: 4rem;
    font-weight: 900;
    margin-bottom: 3.5rem;
    letter-spacing: -0.04em;
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
    gap: 2rem;
    align-items: center;
  }

  .entry-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    width: 100%;
    max-width: 900px;
  }

  .entry-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
  }

  .entry-card.featured {
    border-color: #6366f1;
    background: #f5f3ff;
    transform: scale(1.02);
    z-index: 1;
  }

  :global(.dark) .entry-card.featured {
    background: rgba(99, 102, 241, 0.1);
  }

  .entry-card.disabled {
    opacity: 0.8;
    cursor: default;
    background: #f9fafb;
    position: relative;
    pointer-events: none;
  }

  .card-link-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    text-decoration: none;
    color: inherit;
    width: 100%;
    height: 100%;
  }

  .lock-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(2px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    z-index: 10;
  }

  :global(.dark) .lock-overlay {
    background: rgba(0, 0, 0, 0.4);
  }

  .lock-icon {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .lock-text {
    font-size: 0.6rem;
    font-weight: 900;
    text-transform: uppercase;
    color: #a855f7;
    letter-spacing: 0.05em;
  }

  :global(.dark) .entry-card.disabled {
    background: #111827;
  }

  :global(.dark) .entry-card {
    background: #1f2937;
    border-color: #374151;
  }

  .entry-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    border-color: #6366f1;
  }

  .entry-card .icon {
    font-size: 2rem;
  }

  .entry-card h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
  }

  .entry-card p {
    margin: 0.25rem 0 0 0;
    font-size: 0.85rem;
    color: #6b7280;
    font-weight: 600;
  }

  .btn {
    width: 280px;
    padding: 0.75rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    text-transform: uppercase;
    letter-spacing: 0.05em;
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
