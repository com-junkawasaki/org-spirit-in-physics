<script lang="ts">
  let { sessions = [] }: { sessions?: any[] } = $props();

  function getArtifactIcon(type: string) {
    switch (type) {
      case 'video': return '🎥';
      case 'image': return '🖼️';
      case 'csv': return '📊';
      case 'audio': return '🎙️';
      default: return '📁';
    }
  }

  function formatDate(timestamp: number | null | undefined) {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
</script>

<div class="session-history-container">
  <div class="filter-bar">
    <select>
      <option>全ての検査タイプ</option>
      <option>言語連想検査</option>
    </select>
    <select>
      <option>全てのステータス</option>
      <option>完了</option>
      <option>処理中</option>
      <option>エラー</option>
    </select>
  </div>

  <div class="timeline">
    {#each sessions as session}
      <div class="session-card">
        <div class="session-time">
          <span class="date">{formatDate(session.startTs).split(' ')[0]}</span>
          <span class="time">{formatDate(session.startTs).split(' ')[1]}</span>
        </div>
        <div class="session-main">
          <div class="session-header">
            <h4>言語連想検査 Session {session.sessionIndex}</h4>
            <span class="status-tag" class:processing={session.status !== 'completed'}>
              {session.status === 'completed' ? '完了' : '処理中'}
            </span>
          </div>
          <div class="session-details">
            <span class="participant-link">被験者: {session.participantId}</span>
            <span class="session-id">ID: {session.id}</span>
          </div>
          <div class="artifacts">
            {#if session.artifacts?.length}
              {#each session.artifacts as art}
                <a class="artifact-link" title={art.artifactType} href={art.publicUrl}>
                  {getArtifactIcon(art.artifactType)} {art.artifactType}
                </a>
              {/each}
            {:else}
              <span class="session-id">No artifacts yet</span>
            {/if}
          </div>
        </div>
        <div class="session-actions">
          <button class="btn-detail" disabled>詳細レポート</button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .session-history-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .filter-bar {
    display: flex;
    gap: 1rem;
  }

  .filter-bar select {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    font-size: 0.875rem;
    color: #475569;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .session-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 1.25rem;
    display: grid;
    grid-template-columns: 120px 1fr auto;
    gap: 2rem;
    align-items: center;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .session-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .session-time {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-right: 1px solid #f1f5f9;
    padding-right: 1rem;
  }

  .session-time .date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
  }

  .session-time .time {
    font-size: 0.75rem;
    color: #64748b;
  }

  .session-main {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .session-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .session-header h4 {
    margin: 0;
    font-size: 1rem;
    color: #1e293b;
  }

  .status-tag {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    background: #dcfce7;
    color: #166534;
    border-radius: 4px;
  }

  .status-tag.processing {
    background: #fef9c3;
    color: #854d0e;
  }

  .session-details {
    display: flex;
    gap: 1.5rem;
    font-size: 0.875rem;
    color: #64748b;
  }

  .participant-link {
    color: #3b82f6;
    font-weight: 500;
    cursor: pointer;
  }

  .artifacts {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  .artifact-link {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #475569;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: all 0.2s;
    text-decoration: none;
  }

  .artifact-link:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .btn-detail {
    background: #1e293b;
    color: white;
    border: none;
    padding: 0.625rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: not-allowed;
    transition: background 0.2s;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .session-card {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .session-time {
      border-right: none;
      border-bottom: 1px solid #f1f5f9;
      padding-right: 0;
      padding-bottom: 0.5rem;
      flex-direction: row;
      justify-content: center;
      gap: 1rem;
    }
  }
</style>
