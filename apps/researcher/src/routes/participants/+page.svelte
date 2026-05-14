<script lang="ts">
  import ParticipantList from "$lib/components/researcher/ParticipantList.svelte";
  import { participantClient } from "$lib/connect";
  import { runtimeConfig } from "$lib/env.svelte";
  import type { Participant } from "$lib/api-types";
  import { onMount } from "svelte";

  let participants = $state<Participant[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    if (!runtimeConfig.API_ENABLED) {
      error = "Cloudflare Worker API is not enabled for participant browsing yet.";
      loading = false;
      return;
    }
    try {
      const response = await participantClient.getParticipants({});
      participants = response.participants;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Participants | Researcher Dashboard</title>
</svelte:head>

<div class="page-container">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading participants...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>Error: {error}</p>
    </div>
  {:else}
    <ParticipantList {participants} />
  {/if}
</div>

<style>
  .page-container {
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
</style>
