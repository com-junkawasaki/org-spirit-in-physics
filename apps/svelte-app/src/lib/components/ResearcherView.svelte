<script lang="ts">
  import { participantClient } from "$lib/connect";
  import type { Participant } from "@/generated/proto/participant/v1/participant_pb";
  import { onMount } from "svelte";
  import { SignedIn, SignedOut } from "svelte-clerk";

  let participants = $state<Participant[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

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
</script>

<div class="view">
  <h2>Researcher Dashboard</h2>
  
  <SignedOut>
    <div class="alert">
      <p>Please sign in with your researcher account to access internal data.</p>
    </div>
  </SignedOut>

  <SignedIn>
    {#if loading}
      <p>Loading internal data...</p>
    {:else if error}
      <p class="error">Error: {error}</p>
    {:else}
      <div class="stats">
        <div class="stat-card">
          <h3>Total Participants</h3>
          <p class="count">{participants.length}</p>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Public</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {#each participants as p}
            <tr>
              <td>{p.id}</td>
              <td>{p.age ?? 'N/A'}</td>
              <td>{p.gender ?? 'N/A'}</td>
              <td>{p.isPublic ? 'Yes' : 'No'}</td>
              <td>{p.createdAt ? new Date(Number(p.createdAt.seconds) * 1000).toLocaleDateString() : 'N/A'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </SignedIn>
</div>

<style>
  .view {
    padding: 1rem;
  }
  .alert {
    background: #fff3cd;
    border: 1px solid #ffeeba;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    border: 1px solid #eee;
  }
  .stat-card h3 {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
  }
  .count {
    font-size: 2rem;
    font-weight: bold;
    margin: 0.5rem 0 0;
    color: #111;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .data-table th, .data-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  .data-table th {
    background: #f8f9fa;
    font-weight: 600;
  }
  .error {
    color: red;
  }
</style>

