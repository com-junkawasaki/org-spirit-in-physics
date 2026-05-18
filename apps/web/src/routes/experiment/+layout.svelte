<script lang="ts">
  import { auth } from "$lib/auth/store.svelte";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import "../../app.css";

  let { children } = $props();

  $effect(() => {
    if (auth.user) {
      kawasakiStore.syncWithAuthUser(auth.user);
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
