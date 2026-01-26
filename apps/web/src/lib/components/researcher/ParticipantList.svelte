<script lang="ts">
  import type { Participant } from "@/generated/proto/participant/v1/participant_pb";
  import { resolveRoute } from "$lib/routing";

  let { participants } = $props<{ participants: Participant[] }>();
  let searchQuery = $state("");

  const filteredParticipants = $derived(
    participants.filter((p: Participant) => 
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.gender || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="participant-list-container">
  <div class="table-actions">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input 
        type="text" 
        placeholder="ID、性別などで検索..." 
        bind:value={searchQuery}
      />
    </div>
    <button class="btn-export">CSVエクスポート</button>
  </div>

  <div class="table-wrapper">
    <table class="participants-table">
      <thead>
        <tr>
          <th>ステータス</th>
          <th>被験者ID</th>
          <th>年齢</th>
          <th>性別</th>
          <th>公開設定</th>
          <th>登録日時</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredParticipants as p}
          <tr>
            <td>
              <span class="status-badge active">参加中</span>
            </td>
            <td>
              <a href={resolveRoute(`/researcher/participants/${p.id}`)} class="id-text hover:underline">{p.id}</a>
            </td>
            <td>{p.age ?? '---'}</td>
            <td>{p.gender ?? '---'}</td>
            <td>
              <span class="visibility-badge" class:public={p.isPublic}>
                {p.isPublic ? '公開' : '非公開'}
              </span>
            </td>
            <td>
              {p.createdAt ? new Date(Number(p.createdAt.seconds) * 1000).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : '---'}
            </td>
            <td>
              <div class="row-actions">
                <a href={resolveRoute(`/researcher/participants/${p.id}`)} title="詳細" class="action-btn">👁️</a>
                <button title="編集">✏️</button>
                <button title="削除" class="delete">🗑️</button>
              </div>
            </td>
          </tr>
        {/each}
        {#if filteredParticipants.length === 0}
          <tr>
            <td colspan="7" class="empty-state">
              被験者が見つかりません。
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  .participant-list-container {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .table-actions {
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    gap: 1rem;
  }

  .search-box {
    position: relative;
    flex: 1;
    max-width: 400px;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-box input {
    width: 100%;
    padding: 0.625rem 1rem 0.625rem 2.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-box input:focus {
    border-color: #3b82f6;
  }

  .btn-export {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 0.625rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .participants-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .participants-table th {
    background: #f8fafc;
    padding: 1rem 1.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
  }

  .participants-table td {
    padding: 1rem 1.5rem;
    font-size: 0.875rem;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
  }

  .status-badge {
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #166534;
  }

  .id-text {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: #3b82f6;
    font-weight: 500;
  }

  .visibility-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    background: #f1f5f9;
    color: #64748b;
  }

  .visibility-badge.public {
    background: #e0f2fe;
    color: #0369a1;
  }

  .row-actions {
    display: flex;
    gap: 0.5rem;
  }

  .row-actions button,
  .row-actions .action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .row-actions button:hover,
  .row-actions .action-btn:hover {
    background: #f1f5f9;
  }

  .row-actions button.delete:hover {
    background: #fee2e2;
  }

  .empty-state {
    text-align: center;
    padding: 4rem;
    color: #94a3b8;
  }
</style>

