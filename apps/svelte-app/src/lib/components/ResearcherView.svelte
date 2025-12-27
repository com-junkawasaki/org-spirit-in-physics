<script lang="ts">
  import { participantClient } from "$lib/connect";
  import type { Participant } from "../../generated/proto/participant/v1/participant_pb";
  import { onMount } from "svelte";
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

<div class="content-wrapper">
  <div class="inner-nav mb-6 flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
    <button 
      class="px-6 py-2 text-sm font-bold rounded-lg transition-all {activeTab === 'overview' ? 'bg-white dark:bg-gray-900 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => setTab("overview")}
    >
      Overview
    </button>
    <button 
      class="px-6 py-2 text-sm font-bold rounded-lg transition-all {activeTab === 'participants' ? 'bg-white dark:bg-gray-900 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => setTab("participants")}
    >
      Participants
    </button>
    <button 
      class="px-6 py-2 text-sm font-bold rounded-lg transition-all {activeTab === 'sessions' ? 'bg-white dark:bg-gray-900 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => setTab("sessions")}
    >
      Sessions
    </button>
  </div>

  <div class="tab-content">
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
</div>

<style>
  .content-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 400px;
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
