<script lang="ts">
  import { participantClient } from "$lib/connect";
  import type { Participant } from "@/generated/proto/participant/v1/participant_pb";
  import { onMount } from "svelte";

  let participants = $state<Participant[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const response = await participantClient.getParticipants({ isPublic: true });
      participants = response.participants;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<div class="view">
  <h2>Participant Portal</h2>
  <p>Welcome to the Spirit in Physics study. You can view public participants here.</p>

  {#if loading}
    <p>Loading...</p>
  {:else if error}
    <p class="error">Error: {error}</p>
  {:else}
    <ul class="participant-list">
      {#each participants as p}
        <li>
          <strong>ID:</strong> {p.id} 
          <span class="status">Public</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .view {
    padding: 1rem;
  }
  .participant-list {
    list-style: none;
    padding: 0;
  }
  .participant-list li {
    padding: 1rem;
    border: 1px solid #eee;
    margin-bottom: 0.5rem;
    border-radius: 4px;
    background: white;
  }
  .status {
    background: #e6f4ea;
    color: #1e8e3e;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    margin-left: 1rem;
  }
  .error {
    color: red;
  }
</style>

