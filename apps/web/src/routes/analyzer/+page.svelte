<script lang="ts">
  import { SignedIn, SignedOut, useClerkContext } from "svelte-clerk";
  import TimelineVisualization from "$lib/components/researcher/TimelineVisualization.svelte";
  import { participantClient } from "$lib/connect";
  import { runtimeConfig } from "$lib/env.svelte";
  import { onMount } from "svelte";
  import * as m from "$lib/paraglide/messages.js";
  import type { Participant } from "../../generated/proto/participant/v1/participant_pb";

  let participantId = $state<string | null>(null);
  let participant = $state<Participant | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);

  // Watch for user changes and fetch participant
  $effect(() => {
    if (!runtimeConfig.API_ENABLED) {
      loading = false;
      error = "Cloudflare Worker API is not enabled for personal analysis yet.";
      return;
    }
    const user = clerk?.user;
    if (user) {
      const email = user.primaryEmailAddress?.emailAddress;
      if (email) {
        fetchParticipant(email);
      } else {
        loading = false;
        error = "メールアドレスが見つかりません";
      }
    } else if (!runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) {
      // No auth mode - skip participant lookup
      loading = false;
    }
  });

  async function fetchParticipant(email: string) {
    try {
      loading = true;
      error = null;
      const response = await participantClient.getParticipantByEmail({ email });
      if (response.participant) {
        participant = response.participant;
        participantId = response.participant.id;
      } else {
        error = "参加者データが見つかりません。まず実験に参加してください。";
      }
    } catch (e: any) {
      if (e.message?.includes("not found")) {
        error = "参加者データが見つかりません。まず実験に参加してください。";
      } else {
        error = e.message;
      }
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Analysis | Spirit in Physics</title>
</svelte:head>

<div class="analyzer-page">
  {#if !runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}
    <!-- No Auth Mode -->
    <div class="no-auth-state">
      <div class="auth-card">
        <span class="icon">🔬</span>
        <h2>Analysis View</h2>
        <p>認証が無効のため、個人分析を表示できません。</p>
        <p class="hint">ログイン機能を有効にしてください。</p>
      </div>
    </div>
  {:else}
    <SignedOut>
      <div class="auth-required-state">
        <div class="auth-card">
          <span class="icon">🔐</span>
          <h2>ログインが必要です</h2>
          <p>あなたの分析結果を表示するには、ログインしてください。</p>
          <a href="/settings" class="login-btn">ログイン / サインアップ</a>
          <div class="experiment-link-container">
            <p class="new-user-text">まだ実験に参加していませんか？</p>
            <a href="/experiment" class="experiment-link">🧪 実験を始める</a>
          </div>
        </div>
      </div>
    </SignedOut>

    <SignedIn>
      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>{m.loading_data()}</p>
        </div>
      {:else if error}
        <div class="error-state">
          <div class="error-card">
            <span class="icon">⚠️</span>
            <h3>データを取得できませんでした</h3>
            <p>{error}</p>
            <a href="/participant/consent" class="action-btn">実験に参加する</a>
          </div>
        </div>
      {:else if participantId}
        <div class="analysis-container">
          <header class="analysis-header">
            <div class="header-content">
              <div class="flex items-center gap-3">
                <div class="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <div>
                  <h1 class="text-2xl font-black tracking-tight">Your Analysis</h1>
                  <p class="text-sm text-gray-500 font-mono">{participantId.slice(0, 8)}...</p>
                </div>
              </div>
            </div>
          </header>

          <div class="visualization-wrapper">
            <TimelineVisualization
              {participantId}
              width={runtimeConfig.IS_CAPACITOR ? 1000 : 1200}
              height={runtimeConfig.IS_CAPACITOR ? 600 : 750}
            />
          </div>
        </div>
      {/if}
    </SignedIn>
  {/if}
</div>

<style>
  .analyzer-page {
    min-height: calc(100vh - 120px);
    padding: 1rem;
  }

  .loading-state, .error-state, .auth-required-state, .no-auth-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: #64748b;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid #e2e8f0;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .auth-card, .error-card {
    background: white;
    padding: 3rem;
    border-radius: 32px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
    max-width: 420px;
    width: 90%;
  }

  :global(.dark) .auth-card, :global(.dark) .error-card {
    background: #1c1c1e;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .auth-card .icon, .error-card .icon {
    font-size: 4rem;
    display: block;
    margin-bottom: 1.5rem;
  }

  .auth-card h2, .error-card h3 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: #1e293b;
  }

  :global(.dark) .auth-card h2, :global(.dark) .error-card h3 {
    color: #f1f5f9;
  }

  .auth-card p, .error-card p {
    color: #64748b;
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .hint {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .login-btn, .action-btn {
    display: inline-block;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    color: white;
    border: none;
    padding: 0.875rem 2rem;
    border-radius: 16px;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  .login-btn:hover, .action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
  }

  .experiment-link-container {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e2e8f0;
  }

  :global(.dark) .experiment-link-container {
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .new-user-text {
    font-size: 0.9rem;
    color: #94a3b8;
    margin-bottom: 0.75rem;
  }

  .experiment-link {
    display: inline-block;
    color: #3b82f6;
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 12px;
    background: rgba(59, 130, 246, 0.1);
    transition: all 0.2s ease;
  }

  .experiment-link:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: translateY(-1px);
  }

  :global(.dark) .experiment-link {
    background: rgba(59, 130, 246, 0.2);
  }

  :global(.dark) .experiment-link:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  .analysis-container {
    max-width: 1400px;
    margin: 0 auto;
  }

  .analysis-header {
    margin-bottom: 1.5rem;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .visualization-wrapper {
    background: white;
    border-radius: 32px;
    padding: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  :global(.dark) .visualization-wrapper {
    background: #1c1c1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 768px) {
    .analyzer-page {
      padding: 0.5rem;
    }

    .visualization-wrapper {
      border-radius: 24px;
      padding: 1rem;
    }

    .auth-card, .error-card {
      padding: 2rem;
      border-radius: 24px;
    }
  }
</style>
