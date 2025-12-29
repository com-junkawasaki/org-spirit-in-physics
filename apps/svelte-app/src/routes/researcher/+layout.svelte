<script lang="ts">
  import { UserButton } from "svelte-clerk";
  import { page } from "$app/state";
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";

  let { children } = $props();

  let activeTab = $derived.by(() => {
    const path = page.url.pathname;
    if (path.startsWith('/researcher/participants')) return 'participants';
    if (path.startsWith('/researcher/sessions')) return 'sessions';
    if (path.startsWith('/researcher/settings')) return 'settings';
    return 'overview';
  });
</script>

<div class="researcher-container">
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="brand">Admin Dashboard</span>
      </div>
      <nav class="sidebar-nav">
        <a 
          href="/researcher"
          class="nav-item"
          class:active={activeTab === "overview"} 
        >
          <span class="icon">📊</span> 概要
        </a>
        <a 
          href="/researcher/participants"
          class="nav-item"
          class:active={activeTab === "participants"} 
        >
          <span class="icon">👥</span> 被験者一覧
        </a>
        <a 
          href="/researcher/sessions"
          class="nav-item"
          class:active={activeTab === "sessions"} 
        >
          <span class="icon">🕒</span> セッション履歴
        </a>
        <a 
          href="/researcher/settings"
          class="nav-item"
          class:active={activeTab === "settings"} 
        >
          <span class="icon">⚙️</span> 設定
        </a>
      </nav>
      <div class="sidebar-footer">
        {#if PUBLIC_CLERK_PUBLISHABLE_KEY}
          <UserButton />
        {/if}
        <span class="user-name">管理者</span>
      </div>
    </aside>

    <main class="main-content">
      <header class="content-header">
        <div class="flex items-center gap-4">
          <h2 class="text-xl font-bold text-gray-800">
            {#if activeTab === "overview"}概要
            {:else if activeTab === "participants"}被験者管理
            {:else if activeTab === "sessions"}セッション履歴
            {:else if activeTab === "settings"}システム設定
            {/if}
          </h2>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" onclick={() => window.location.reload()}>更新</button>
        </div>
      </header>

      <div style="background: blue; padding: 10px;">LAYOUT BEFORE CHILDREN</div>
      {@render children()}
      <div style="background: green; padding: 10px;">LAYOUT AFTER CHILDREN</div>

      <div class="content-body">
        {@render children()}
      </div>
    </main>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
  }

  .researcher-container {
    height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
    background-color: #f8fafc;
  }

  .dashboard-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    height: 100%;
  }

  .sidebar {
    background: #1e293b;
    color: white;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  .sidebar-header {
    margin-bottom: 2.5rem;
  }

  .brand {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .nav-item {
    background: transparent;
    border: none;
    color: #94a3b8;
    text-align: left;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
  }

  .nav-item:hover {
    background: rgba(255,255,255,0.05);
    color: white;
  }

  .nav-item.active {
    background: #3b82f6;
    color: white;
  }

  .sidebar-footer {
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-name {
    font-size: 0.875rem;
    color: #cbd5e1;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-header {
    background: white;
    padding: 1rem 2rem;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .btn-refresh {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .content-body {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }
</style>
