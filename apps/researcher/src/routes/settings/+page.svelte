<script lang="ts">
</script>

<div class="settings-page">
  <div class="settings-card">
    <h3>🔧 システム設定</h3>
    <p class="description">研究者ダッシュボードの設定を管理します。</p>

    <div class="setting-group">
      <h4>API接続</h4>
      <div class="setting-item">
        <label>API エンドポイント</label>
        <input type="text" value="https://spirit-in-physics.com/api" readonly />
      </div>
    </div>

    <div class="setting-group">
      <h4>表示設定</h4>
      <div class="setting-item">
        <label>
          <input type="checkbox" checked />
          ダークモードを有効にする
        </label>
      </div>
      <div class="setting-item">
        <label>
          <input type="checkbox" checked />
          アニメーションを有効にする
        </label>
      </div>
    </div>

    <div class="setting-group">
      <h4>データエクスポート</h4>
      <button class="btn-export">📥 全データをCSVでエクスポート</button>
    </div>
  </div>
</div>

<style>
  .settings-page {
    max-width: 800px;
  }

  .settings-card {
    background: white;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    padding: 2rem;
  }

  .settings-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .description {
    color: #64748b;
    margin-bottom: 2rem;
  }

  .setting-group {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .setting-group:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .setting-group h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .setting-item {
    margin-bottom: 1rem;
  }

  .setting-item label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: #334155;
    cursor: pointer;
  }

  .setting-item input[type="text"] {
    width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    font-family: ui-monospace, monospace;
    background: #f8fafc;
    color: #64748b;
  }

  .setting-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #3b82f6;
  }

  .btn-export {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-export:hover {
    background: #2563eb;
  }
</style>
