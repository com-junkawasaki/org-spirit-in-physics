<script lang="ts">
  import AnalyticsOverview from "$lib/components/researcher/AnalyticsOverview.svelte";
  import { participantClient } from "$lib/connect";
  import type { Participant } from "../../generated/proto/participant/v1/participant_pb";
  import { onMount } from "svelte";
  import * as m from "$lib/paraglide/messages.js";

  let participants = $state<Participant[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    console.log('[ResearcherPage] onMount started');
    try {
      const response = await participantClient.getParticipants({});
      console.log('[ResearcherPage] participants fetched:', response.participants.length);
      participants = response.participants;
    } catch (e: any) {
      console.error('[ResearcherPage] fetch error:', e.message);
      error = e.message;
    } finally {
      loading = false;
      console.log('[ResearcherPage] loading finished, error:', error);
    }
  });
</script>

<svelte:head>
  <title>{m.researcher_dashboard()} | Spirit in Physics</title>
</svelte:head>

<div class="page-container">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>{m.loading_data()}</p>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-card">
        <span class="error-icon">⚠️</span>
        <h3>{m.fetch_error()}</h3>
        <p>{error}</p>
        <button class="retry-btn" onclick={() => window.location.reload()}>{m.retry()}</button>
      </div>
    </div>
  {:else}
    <AnalyticsOverview {participants} />
  {/if}
</div>

<style>
  .page-container {
    min-height: 100%;
  }

  .loading-state, .error-state {
    height: 400px;
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
    to { transform: rotate(360deg); }
  }

  .error-card {
    background: white;
    padding: 2.5rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    max-width: 400px;
  }

  .error-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .error-card h3 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
  }

  .error-card p {
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  .retry-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.6rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .retry-btn:hover {
    opacity: 0.9;
  }
</style>
