<script lang="ts">
  import TimelineVisualization from "$lib/components/researcher/TimelineVisualization.svelte";
  import { sessionClient, timelineClient } from "$lib/connect";
  import { useClerkContext } from "svelte-clerk";
  import { onMount } from "svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { runtimeConfig } from "$lib/env.svelte";

  // In local dev, use a placeholder user ID
  const isLocalDev = runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('placeholder');
  const clerk = $derived(!isLocalDev && runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const userId = $derived(clerk?.user?.id || (isLocalDev ? 'local-dev-user' : null));

  let loading = $state(true);
  let error = $state<string | null>(null);
  let hasSessions = $state(false);

  onMount(async () => {
    if (!userId) {
      loading = false;
      return;
    }

    try {
      // Check if user has any sessions
      const response = await sessionClient.getSessions({ participantId: userId });
      hasSessions = (response.sessions?.length || 0) > 0;
    } catch (e: any) {
      // If no sessions found, that's ok
      hasSessions = false;
    } finally {
      loading = false;
    }
  });
</script>

<div class="analyzer-page">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>{m.loading_data?.() || '読み込み中...'}</p>
    </div>
  {:else if !userId}
    <div class="empty-state">
      <div class="empty-card">
        <span class="empty-icon">🔐</span>
        <h3>ログインが必要です</h3>
        <p>マイ分析を表示するにはログインしてください。</p>
      </div>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-card">
        <span class="error-icon">⚠️</span>
        <h3>{m.fetch_error?.() || 'エラーが発生しました'}</h3>
        <p>{error}</p>
        <button class="retry-btn" onclick={() => window.location.reload()}>{m.retry?.() || '再試行'}</button>
      </div>
    </div>
  {:else if !hasSessions && !isLocalDev}
    <div class="empty-state">
      <div class="empty-card">
        <span class="empty-icon">📊</span>
        <h3>データがありません</h3>
        <p>まだ実験に参加していません。実験を開始してデータを記録してください。</p>
        <a href="/experiment" class="start-btn">実験を開始する</a>
      </div>
    </div>
  {:else}
    <div class="analyzer-content">
      <section class="analysis-section">
        <div class="section-header">
          <div class="title-group">
            <div class="title-bar"></div>
            <h2>Neural Analysis</h2>
          </div>
          <span class="user-id-badge">
            {userId.slice(0, 8)}...
          </span>
        </div>

        <div class="analysis-card">
          <TimelineVisualization
            participantId={userId}
            width={1200}
            height={runtimeConfig.IS_CAPACITOR ? 600 : 850}
          />
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  .analyzer-page {
    width: 100%;
    min-height: 100%;
  }

  .analyzer-content {
    max-width: 1400px;
    margin: 0 auto;
  }

  .loading-state,
  .error-state,
  .empty-state {
    height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-card,
  .error-card {
    background: white;
    padding: 2.5rem;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    max-width: 400px;
  }

  .empty-icon,
  .error-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .empty-card h3,
  .error-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .empty-card p,
  .error-card p {
    color: #64748b;
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .start-btn {
    display: inline-block;
    background: #3b82f6;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s;
  }

  .start-btn:hover {
    background: #2563eb;
  }

  .retry-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.6rem 1.5rem;
    border-radius: 12px;
    font-weight: 800;
    cursor: pointer;
    margin-top: 1rem;
  }

  .analysis-section {
    padding: 1rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .title-bar {
    width: 4px;
    height: 24px;
    background: #3b82f6;
    border-radius: 2px;
  }

  .title-group h2 {
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
    margin: 0;
  }

  .user-id-badge {
    padding: 0.375rem 0.75rem;
    background: #f1f5f9;
    border-radius: 8px;
    font-size: 0.75rem;
    font-family: ui-monospace, monospace;
    font-weight: 600;
    color: #64748b;
  }

  .analysis-card {
    background: white;
    border-radius: 24px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  }

  @media (max-width: 1024px) {
    .analyzer-content {
      padding: 0;
    }
    .analysis-section {
      padding: 0 0.5rem;
    }
    .analysis-card {
      border-radius: 16px;
      border: none;
    }
  }
</style>
