<script lang="ts">
  import { participantClient, timelineClient } from '$lib/connect';
  import { TimelineVisualization, AnalyticsOverview } from '@spirit/researcher-ui';
  import type { Participant } from '../generated/proto/participant/v1/participant_pb';

  let participants: Participant[] = $state([]);
  let selectedParticipantId: string | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  async function loadParticipants() {
    loading = true;
    error = null;
    try {
      const response = await participantClient.getParticipants({});
      participants = response.participants || [];
      if (participants.length > 0 && !selectedParticipantId) {
        selectedParticipantId = participants[0].id;
      }
    } catch (e: any) {
      error = e.message || 'Failed to load participants';
      console.error('Failed to load participants:', e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadParticipants();
  });
</script>

<div class="overview-page">
  <section class="analytics-section">
    <h3 class="section-title">📈 全体統計</h3>
    <AnalyticsOverview />
  </section>

  <section class="visualization-section">
    <div class="section-header">
      <h3 class="section-title">🧠 Neural Space Analysis</h3>
      <div class="participant-selector">
        <label for="participant-select">被験者:</label>
        <select
          id="participant-select"
          bind:value={selectedParticipantId}
          disabled={loading || participants.length === 0}
        >
          {#if loading}
            <option>読み込み中...</option>
          {:else if participants.length === 0}
            <option>被験者なし</option>
          {:else}
            {#each participants as p}
              <option value={p.id}>{p.id.slice(0, 8)}... ({p.gender || '不明'})</option>
            {/each}
          {/if}
        </select>
      </div>
    </div>

    {#if error}
      <div class="error-message">
        <p>⚠️ {error}</p>
        <button onclick={loadParticipants}>再試行</button>
      </div>
    {:else if selectedParticipantId}
      <TimelineVisualization
        participantId={selectedParticipantId}
        {timelineClient}
        width={1200}
        height={800}
      />
    {:else if !loading}
      <div class="empty-state">
        <p>被験者を選択してください</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .overview-page {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .analytics-section {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
  }

  .visualization-section {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .participant-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .participant-selector label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
  }

  .participant-selector select {
    padding: 0.5rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
  }

  .participant-selector select:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    color: #dc2626;
  }

  .error-message button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .empty-state {
    background: #f8fafc;
    border-radius: 12px;
    padding: 4rem;
    text-align: center;
    color: #94a3b8;
  }
</style>
