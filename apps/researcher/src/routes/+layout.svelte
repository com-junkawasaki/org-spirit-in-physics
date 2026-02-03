<script lang="ts">
  import { ClerkProvider, SignedIn, SignedOut, UserButton } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import "../app.css";

  let { children } = $props();

  // In local dev with placeholder keys, skip Clerk auth entirely
  const isLocalDev = runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('placeholder');

  let activeTab = $derived.by(() => {
    const path = page.url.pathname;
    if (path.startsWith('/participants')) return 'participants';
    if (path.startsWith('/sessions')) return 'sessions';
    if (path.startsWith('/settings')) return 'settings';
    return 'overview';
  });

  // Check if user has researcher role
  function hasResearcherRole(user: any): boolean {
    return user?.publicMetadata?.role === 'researcher';
  }
</script>

{#if runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY && !isLocalDev}
  <ClerkProvider publishableKey={runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <SignedOut>
      <div class="auth-required">
        <div class="auth-card">
          <h1>🔐 ログインが必要です</h1>
          <p>研究者ダッシュボードにアクセスするにはログインしてください。</p>
          <a href="https://spirit-in-physics.com" class="btn primary">メインサイトへ</a>
        </div>
      </div>
    </SignedOut>

    <SignedIn let:user>
      {#if hasResearcherRole(user)}
        {@render dashboardLayout(user)}
      {:else}
        <div class="auth-required">
          <div class="auth-card">
            <h1>🚫 アクセス権限がありません</h1>
            <p>研究者権限 (researcher role) が必要です。管理者にお問い合わせください。</p>
            <p class="user-info">現在のユーザー: {user?.primaryEmailAddress?.emailAddress}</p>
            <a href="https://spirit-in-physics.com" class="btn secondary">トップへ戻る</a>
          </div>
        </div>
      {/if}
    </SignedIn>
  </ClerkProvider>
{:else}
  <!-- Local dev mode: no auth required -->
  {@render dashboardLayout(null)}
{/if}

{#snippet dashboardLayout(user: any)}
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="brand">🔬 Researcher Dashboard</span>
      </div>
      <nav class="sidebar-nav">
        <a
          href="/"
          class="nav-item"
          class:active={activeTab === "overview"}
        >
          <span class="icon">📊</span> 概要
        </a>
        <a
          href="/participants"
          class="nav-item"
          class:active={activeTab === "participants"}
        >
          <span class="icon">👥</span> 被験者一覧
        </a>
        <a
          href="/sessions"
          class="nav-item"
          class:active={activeTab === "sessions"}
        >
          <span class="icon">🕒</span> セッション履歴
        </a>
        <a
          href="/settings"
          class="nav-item"
          class:active={activeTab === "settings"}
        >
          <span class="icon">⚙️</span> 設定
        </a>
      </nav>
      <div class="sidebar-footer">
        {#if user}
          <UserButton />
          <span class="user-name">{user?.primaryEmailAddress?.emailAddress || 'Admin'}</span>
        {:else}
          <span class="user-name">🧪 Local Dev Mode</span>
        {/if}
      </div>
    </aside>

    <main class="main-content">
      <header class="content-header">
        <h2 class="text-xl font-bold text-gray-800">
          {#if activeTab === "overview"}概要
          {:else if activeTab === "participants"}被験者一覧
          {:else if activeTab === "sessions"}セッション履歴
          {:else if activeTab === "settings"}設定
          {/if}
        </h2>
        <div class="header-actions">
          <button class="btn-refresh" onclick={() => window.location.reload()}>更新</button>
        </div>
      </header>

      <div class="content-body">
        {@render children()}
      </div>
    </main>
  </div>
{/snippet}

<style>
  .dashboard-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: 100vh;
    background: #f8fafc;
  }

  @media (max-width: 1024px) {
    .dashboard-layout {
      display: flex;
      flex-direction: column;
    }
    .sidebar {
      display: none;
    }
  }

  .sidebar {
    background: #1e293b;
    color: white;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 10px rgba(0, 0, 0, 0.05);
  }

  .sidebar-header {
    padding: 2rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .brand {
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .sidebar-nav {
    flex: 1;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: #94a3b8;
    text-decoration: none;
    border-radius: 10px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }

  .nav-item.active {
    background: #3b82f6;
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  .icon {
    font-size: 1.1rem;
  }

  .sidebar-footer {
    padding: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-header {
    background: white;
    padding: 1rem 2rem;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }

  .content-body {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  .btn-refresh {
    background: #f1f5f9;
    color: #475569;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-refresh:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .auth-required {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
  }

  .auth-card {
    background: white;
    padding: 3rem;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
    max-width: 480px;
    width: 90%;
  }

  .auth-card h1 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: #1e293b;
  }

  .auth-card p {
    color: #64748b;
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .auth-card .user-info {
    font-size: 0.85rem;
    color: #94a3b8;
    margin-top: 1rem;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
  }

  .btn.primary {
    background: #3b82f6;
    color: white;
  }

  .btn.primary:hover {
    background: #2563eb;
  }

  .btn.secondary {
    background: #f1f5f9;
    color: #475569;
  }

  .btn.secondary:hover {
    background: #e2e8f0;
  }
</style>
