<script lang="ts">
  import PaperView from "$lib/components/PaperView.svelte";
  import * as m from "$lib/paraglide/messages.js";
</script>

<svelte:head>
  <title>{m.paper()} | Spirit in Physics</title>
</svelte:head>

<div class="paper-page">
  <PaperView />
</div>

<style>
  .paper-page {
    width: 100%;
    min-height: 100%;
    background-color: #f5f5f7;
  }

  :global(.dark) .paper-page {
    background-color: #000;
  }
</style>
