<script lang="ts">
  import SessionHistory from "$lib/components/researcher/SessionHistory.svelte";
</script>

<svelte:head>
  <title>Sessions | Researcher Dashboard</title>
</svelte:head>

<div class="page-container">
  <SessionHistory />
</div>

<style>
  .page-container {
    height: 100%;
  }
</style>
