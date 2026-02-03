<script lang="ts">
  import { SignedIn, SignedOut, useClerkContext } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { resolveRoute } from "$lib/routing";

  let { children } = $props();

  // In local dev with placeholder keys, skip Clerk auth entirely
  const isLocalDev = runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('placeholder');
  const clerk = $derived(!isLocalDev && runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const userId = $derived(clerk?.user?.id || (isLocalDev ? 'local-dev-user' : null));
</script>

<div class="analyzer-container">
  {#if !runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY || isLocalDev}
    <!-- Local dev mode: show analyzer without auth -->
    <div class="analyzer-layout">
      <header class="analyzer-header">
        <div class="header-left">
          <a href={resolveRoute("/")} class="back-link">← {m.back_to_home?.() || 'ホームへ戻る'}</a>
          <h1 class="page-title">📊 マイ分析</h1>
        </div>
        <div class="header-right">
          <span class="dev-badge">🧪 ローカル開発モード</span>
        </div>
      </header>

      <main class="analyzer-content">
        {@render children()}
      </main>
    </div>
  {:else}
    <SignedOut>
      <div class="auth-required">
        <div class="auth-card">
          <h1>🔐 ログインが必要です</h1>
          <p>マイ分析を表示するにはログインしてください。</p>
          <a href={resolveRoute("/")} class="btn primary">ホームへ戻る</a>
        </div>
      </div>
    </SignedOut>

    <SignedIn let:user>
      <div class="analyzer-layout">
        <header class="analyzer-header">
          <div class="header-left">
            <a href={resolveRoute("/")} class="back-link">← {m.back_to_home?.() || 'ホームへ戻る'}</a>
            <h1 class="page-title">📊 マイ分析</h1>
          </div>
          <div class="header-right">
            <span class="user-email">{user?.primaryEmailAddress?.emailAddress}</span>
          </div>
        </header>

        <main class="analyzer-content">
          {@render children()}
        </main>
      </div>
    </SignedIn>
  {/if}
</div>

<style>
  .analyzer-container {
    min-height: 100vh;
    background: #f8fafc;
  }

  .analyzer-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .analyzer-header {
    background: white;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .back-link {
    color: #64748b;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #3b82f6;
  }

  .page-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-email {
    font-size: 0.875rem;
    color: #64748b;
  }

  .dev-badge {
    font-size: 0.75rem;
    background: #fef3c7;
    color: #92400e;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-weight: 600;
  }

  .analyzer-content {
    flex: 1;
    padding: 2rem;
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
</style>
