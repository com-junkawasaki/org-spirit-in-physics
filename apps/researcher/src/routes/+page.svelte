<script lang="ts">
  import AnalyticsOverview from "$lib/components/researcher/AnalyticsOverview.svelte";
  import TimelineVisualization from "$lib/components/researcher/TimelineVisualization.svelte";
  import { participantClient } from "$lib/connect";
  import type { Participant } from "../generated/proto/participant/v1/participant_pb";
  import { onMount } from "svelte";
  import * as m from "$lib/paraglide/messages.js";

  let participants = $state<Participant[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedParticipantId = $state<string | null>(null);

  onMount(async () => {
    try {
      const response = await participantClient.getParticipants({});
      participants = response.participants;
      if (participants.length > 0) {
        const kawasaki = participants.find(p => p.id.includes('kawasaki') || p.id.includes('144b325f'));
        selectedParticipantId = kawasaki?.id || participants[0].id;
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<div class="analyzer-page">
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
    <div class="analyzer-content space-y-8">
      <section class="participant-selector">
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Select Subject</h3>
        <div class="selector-scroll custom-scrollbar">
          {#each participants as p}
            <button
              class="participant-chip"
              class:active={selectedParticipantId === p.id}
              onclick={() => selectedParticipantId = p.id}
            >
              <span class="avatar">{p.gender === 'male' ? '👨' : p.gender === 'female' ? '👩' : '👤'}</span>
              <span class="id-label">{p.id.slice(0, 8)}</span>
            </button>
          {/each}
        </div>
      </section>

      {#if selectedParticipantId}
        <section class="analysis-section animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="section-header flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-1 h-6 bg-blue-600 rounded-full"></div>
              <h2 class="text-xl font-black tracking-tight">Neural Analysis</h2>
            </div>
            <span class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-mono font-bold text-gray-500">
              {selectedParticipantId}
            </span>
          </div>

          <div class="analysis-card bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <TimelineVisualization
              participantId={selectedParticipantId}
              width={1200}
              height={850}
            />
          </div>
        </section>
      {/if}

      <section class="mt-12 pt-12 border-t border-gray-100 dark:border-gray-800">
        <h2 class="text-xl font-black tracking-tight mb-8">Cohort Statistics</h2>
        <AnalyticsOverview {participants} />
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

  .loading-state, .error-state {
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
    to { transform: rotate(360deg); }
  }

  .participant-selector {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    padding: 1rem 0;
    margin: -1rem -1rem 2rem -1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  :global(.dark) .participant-selector {
    background: rgba(0, 0, 0, 0.2);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .selector-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding: 0.5rem 1rem;
    -webkit-overflow-scrolling: touch;
  }

  .participant-chip {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e5e5e7;
    border-radius: 100px;
    transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
    cursor: pointer;
  }

  :global(.dark) .participant-chip {
    background: #1c1c1e;
    border-color: #2c2c2e;
  }

  .participant-chip.active {
    background: #000;
    border-color: #000;
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  :global(.dark) .participant-chip.active {
    background: #fff;
    border-color: #fff;
    color: #000;
  }

  .avatar {
    font-size: 1rem;
  }

  .id-label {
    font-size: 0.75rem;
    font-weight: 800;
    font-family: ui-monospace, SFMono-Regular, monospace;
  }

  .custom-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .error-card {
    background: white;
    padding: 2.5rem;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    max-width: 400px;
  }

  .error-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
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

  @media (max-width: 1024px) {
    .analyzer-content {
      padding: 0;
    }
    .analysis-section {
      padding: 0 1rem;
    }
    .analysis-card {
      border-radius: 24px;
      border: none;
    }
  }
</style>
