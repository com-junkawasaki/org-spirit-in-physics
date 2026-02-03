<script lang="ts">
  import { participantClient } from '$lib/connect';
  import { ParticipantList } from '@spirit/researcher-ui';
  import type { Participant } from '../../generated/proto/participant/v1/participant_pb';

  let participants: Participant[] = $state([]);
  let loading = $state(true);
  let error: string | null = $state(null);

  async function loadParticipants() {
    loading = true;
    error = null;
    try {
      const response = await participantClient.getParticipants({});
      participants = response.participants || [];
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

  function getParticipantUrl(id: string): string {
    return `/participants/${id}`;
  }
</script>

<div class="participants-page">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>読み込み中...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>⚠️ {error}</p>
      <button onclick={loadParticipants}>再試行</button>
    </div>
  {:else}
    <ParticipantList
      {participants}
      {getParticipantUrl}
      basePath=""
    />
  {/if}
</div>

<style>
  .participants-page {
    min-height: 400px;
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    background: white;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
  }

  .loading-state p,
  .error-state p {
    margin-top: 1rem;
    color: #64748b;
  }

  .error-state {
    color: #dc2626;
  }

  .error-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
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
</style>
