<script lang="ts">
  import { useClerkContext } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import "../../app.css";

  let { children } = $props();

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);

  $effect(() => {
    if (clerk?.user) {
      kawasakiStore.syncWithClerk(clerk.user);
    }
  });
</script>

<div class="experiment-page-wrapper">
  {@render children()}
</div>

<style>
  .experiment-page-wrapper {
    width: 100%;
    min-height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
  }
</style>
