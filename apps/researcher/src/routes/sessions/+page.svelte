<script lang="ts">
  import SessionHistory from "$lib/components/researcher/SessionHistory.svelte";
  import { sessionClient } from "$lib/connect";
  import { onMount } from "svelte";

  let sessions = $state<any[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const response = await sessionClient.getSessions({});
      sessions = response.sessions ?? [];
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Sessions | Researcher Dashboard</title>
</svelte:head>

<div class="page-container">
  {#if loading}
    <p>Loading sessions...</p>
  {:else if error}
    <p>{error}</p>
  {:else}
    <SessionHistory {sessions} />
  {/if}
</div>

<style>
  .page-container {
    height: 100%;
  }
</style>
