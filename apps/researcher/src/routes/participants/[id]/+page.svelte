<script lang="ts">
  import { page } from '$app/state';
  import { participantClient, timelineClient } from '$lib/connect';
  import { TimelineVisualization } from '@spirit/researcher-ui';
  import type { Participant } from '../../../generated/proto/participant/v1/participant_pb';

  let participant: Participant | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  const participantId = $derived(page.params.id);

  async function loadParticipant() {
    if (!participantId) return;
    loading = true;
    error = null;
    try {
      const response = await participantClient.getParticipant({ id: participantId });
      participant = response.participant || null;
    } catch (e: any) {
      error = e.message || 'Failed to load participant';
      console.error('Failed to load participant:', e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadParticipant();
  });
</script>

<div class="participant-detail-page">
  <div class="page-header">
    <a href="/participants" class="back-link">← 被験者一覧へ戻る</a>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>読み込み中...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>⚠️ {error}</p>
      <button onclick={loadParticipant}>再試行</button>
    </div>
  {:else if participant}
    <div class="participant-info">
      <h2 class="participant-id">被験者 ID: {participant.id}</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">年齢</span>
          <span class="value">{participant.age ?? '---'}</span>
        </div>
        <div class="info-item">
          <span class="label">性別</span>
          <span class="value">{participant.gender ?? '---'}</span>
        </div>
        <div class="info-item">
          <span class="label">公開設定</span>
          <span class="value">{participant.isPublic ? '公開' : '非公開'}</span>
        </div>
        <div class="info-item">
          <span class="label">登録日時</span>
          <span class="value">
            {participant.createdAt ? new Date(Number(participant.createdAt.seconds) * 1000).toLocaleString('ja-JP') : '---'}
          </span>
        </div>
      </div>
    </div>

    <div class="visualization-section">
      <h3>タイムライン分析</h3>
      <TimelineVisualization
        participantId={participant.id}
        {timelineClient}
        width={1200}
        height={800}
      />
    </div>
  {:else}
    <div class="empty-state">
      <p>被験者が見つかりません</p>
    </div>
  {/if}
</div>

<style>
  .participant-detail-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    margin-bottom: 0.5rem;
  }

  .back-link {
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .participant-info {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
  }

  .participant-id {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 1rem;
    font-family: ui-monospace, monospace;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-item .label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #64748b;
  }

  .info-item .value {
    font-size: 1rem;
    color: #1e293b;
  }

  .visualization-section {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
  }

  .visualization-section h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    background: white;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
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
