<script lang="ts">
  // Cache bust: 2025-12-27-17-45
  import { SignedIn, SignedOut, UserButton } from "svelte-clerk";
  import { page } from "$app/state";

  let { children } = $props();

  // For E2E testing: bypass auth
  let bypassAuth = $state(false);
  
  $effect(() => {
    // Check both search and hash for test_mode=true
    const checkBypass = () => {
      const url = new URL(window.location.href);
      return url.searchParams.get('test_mode') === 'true' || 
             url.hash.includes('test_mode=true') ||
             window.location.search.includes('test_mode=true');
    };
    
    bypassAuth = checkBypass();
    console.log('[AuthDebug] URL:', window.location.href);
    console.log('[AuthDebug] BypassAuth:', bypassAuth);
  });
  
  let activeTab = $derived.by(() => {
    const path = page.url.pathname;
    if (path.startsWith('/researcher/participants')) return 'participants';
    if (path.startsWith('/researcher/sessions')) return 'sessions';
    if (path.startsWith('/researcher/settings')) return 'settings';
    return 'overview';
  });
</script>

<div class="researcher-container">
  <!-- DEBUG: {bypassAuth} -->
  {#if bypassAuth}
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="brand">Admin Dashboard (Test Mode)</span>
        </div>
        <nav class="sidebar-nav">
          <a 
            href="/researcher?test_mode=true"
            class="nav-item"
            class:active={activeTab === "overview"} 
          >
            <span class="icon">📊</span> 概要
          </a>
          <a 
            href="/researcher/participants?test_mode=true"
            class="nav-item"
            class:active={activeTab === "participants"} 
          >
            <span class="icon">👥</span> 被験者一覧
          </a>
        </nav>
      </aside>

      <main class="main-content">
        <header class="content-header">
          <h2 class="text-xl font-bold text-gray-800">
            {#if activeTab === "overview"}概要
            {:else if activeTab === "participants"}被験者管理
            {:else if activeTab === "sessions"}セッション履歴
            {:else if activeTab === "settings"}システム設定
            {/if}
          </h2>
        </header>

        <div class="content-body">
          {@render children()}
        </div>
      </main>
    </div>
  {:else}
    <SignedOut>
      <div class="auth-required">
      <div class="auth-card">
        <h1>RESEARCHER PORTAL</h1>
        <p>管理者権限を持つアカウントでサインインしてください。</p>
        <div class="auth-placeholder">
          <p>（サインインボタンは共通ヘッダーにあります）</p>
        </div>
      </div>
    </div>
  </SignedOut>

  <SignedIn>
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
          <UserButton />
          <span class="user-name">管理者</span>
        </div>
      </aside>

      <main class="main-content">
        <header class="content-header">
          <div class="flex items-center gap-4">
            {#if activeTab === 'participants' && page.url.pathname !== '/researcher'}
              <a href="/researcher" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="min-width: 20px; min-height: 20px;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </a>
            {/if}
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

        <div class="content-body">
          {@render children()}
        </div>
      </main>
    </div>
  </SignedIn>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
  }

  .researcher-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f8fafc;
  }

  .auth-required {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 2rem;
  }

  .auth-card {
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  .auth-card h1 {
    margin-top: 0;
    color: #1e293b;
  }

  .auth-placeholder {
    margin-top: 2rem;
    color: #64748b;
    font-size: 0.875rem;
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
