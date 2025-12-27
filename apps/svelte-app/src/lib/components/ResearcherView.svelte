<script lang="ts">
  import { participantClient } from "$lib/connect";
  import type { Participant } from "../../../generated/proto/participant/v1/participant_pb";
  import { onMount } from "svelte";
  import { SignedIn, SignedOut, UserButton } from "svelte-clerk";
  import ParticipantList from "./researcher/ParticipantList.svelte";
  import SessionHistory from "./researcher/SessionHistory.svelte";
  import AnalyticsOverview from "./researcher/AnalyticsOverview.svelte";

  let participants = $state<Participant[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let activeTab = $state<"overview" | "participants" | "sessions" | "settings">("overview");

  onMount(async () => {
    try {
      const response = await participantClient.getParticipants({});
      participants = response.participants;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });

  function setTab(tab: "overview" | "participants" | "sessions" | "settings") {
    activeTab = tab;
  }
</script>

<div class="researcher-container">
  <SignedOut>
    <div class="auth-required">
      <div class="auth-card">
        <h1>研究者ポータル</h1>
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
          <button 
            class:active={activeTab === "overview"} 
            onclick={() => setTab("overview")}
          >
            <span class="icon">📊</span> 概要
          </button>
          <button 
            class:active={activeTab === "participants"} 
            onclick={() => setTab("participants")}
          >
            <span class="icon">👥</span> 被験者一覧
          </button>
          <button 
            class:active={activeTab === "sessions"} 
            onclick={() => setTab("sessions")}
          >
            <span class="icon">🕒</span> セッション履歴
          </button>
          <button 
            class:active={activeTab === "settings"} 
            onclick={() => setTab("settings")}
          >
            <span class="icon">⚙️</span> 設定
          </button>
        </nav>
        <div class="sidebar-footer">
          <UserButton />
          <span class="user-name">管理者</span>
        </div>
      </aside>

      <main class="main-content">
        <header class="content-header">
          <h2>
            {#if activeTab === "overview"}概要
            {:else if activeTab === "participants"}被験者管理
            {:else if activeTab === "sessions"}セッション履歴
            {:else if activeTab === "settings"}システム設定
            {/if}
          </h2>
          <div class="header-actions">
            <button class="btn-refresh" onclick={() => window.location.reload()}>更新</button>
          </div>
        </header>

        <div class="content-body">
          {#if loading}
            <div class="loading-state">
              <div class="spinner"></div>
              <p>データを読み込んでいます...</p>
            </div>
          {:else if error}
            <div class="error-state">
              <p>エラーが発生しました: {error}</p>
            </div>
          {:else}
            {#if activeTab === "overview"}
              <AnalyticsOverview {participants} />
            {:else if activeTab === "participants"}
              <ParticipantList {participants} />
            {:else if activeTab === "sessions"}
              <SessionHistory />
            {:else if activeTab === "settings"}
              <div class="settings-view">
                <h3>システム設定</h3>
                <p>現在、設定可能な項目はありません。</p>
              </div>
            {/if}
          {/if}
        </div>
      </main>
    </div>
  </SignedIn>
</div>

<style>
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

  .sidebar-nav button {
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
  }

  .sidebar-nav button:hover {
    background: rgba(255,255,255,0.05);
    color: white;
  }

  .sidebar-nav button.active {
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

  .content-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
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

  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .settings-view {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }
</style>
