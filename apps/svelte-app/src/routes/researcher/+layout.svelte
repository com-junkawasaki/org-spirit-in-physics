<script lang="ts">
  import { SignedIn, SignedOut, UserButton } from "svelte-clerk";
  import { page } from "$app/state";
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";

  let { children } = $props();

  // For E2E testing: bypass auth
  let bypassAuth = $state(false);
  
  $effect(() => {
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
  {#if bypassAuth || !PUBLIC_CLERK_PUBLISHABLE_KEY}
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="brand">Admin Dashboard {#if !PUBLIC_CLERK_PUBLISHABLE_KEY}(No Auth Mode){:else}(Test Mode){/if}</span>
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
          <div class="header-actions">
            <button class="btn-refresh" onclick={() => window.location.reload()} aria-label="更新">更新</button>
          </div>
        </header>

        <div class="content-body" role="region" aria-label="Dashboard Content">
          <div style="background: green; color: white;">LAYOUT CHILDREN START</div>
          {@render children()}
          <div style="background: green; color: white;">LAYOUT CHILDREN END</div>
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
              <h2 class="text-xl font-bold text-gray-800">
                {#if activeTab === "overview"}概要
                {:else if activeTab === "participants"}被験者管理
                {:else if activeTab === "sessions"}セッション履歴
                {:else if activeTab === "settings"}システム設定
                {/if}
              </h2>
            </div>
            <div class="header-actions">
              <button class="btn-refresh" onclick={() => window.location.reload()} aria-label="更新">更新</button>
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
  .researcher-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
  }

  .dashboard-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: 100%;
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
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
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
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
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
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .auth-placeholder {
    padding: 2rem;
    background: #f1f5f9;
    border-radius: 16px;
    color: #94a3b8;
    font-size: 0.9rem;
  }
</style>
