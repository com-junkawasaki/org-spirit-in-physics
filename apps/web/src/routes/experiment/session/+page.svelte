<script lang="ts">
  import { goto } from "$app/navigation";
  import JungVoiceTest from "$lib/jung-voice-assessment/JungVoiceTest.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { resolveRoute } from "$lib/routing";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import VoidBackground from "$lib/components/experiment/VoidBackground.svelte";

  function handleTestComplete() {
    // Navigate to report page after experiment is done
    goto(resolveRoute('/experiment/report'));
  }
</script>

<svelte:head>
  <title>{m.device_check()} | Spirit in Physics</title>
</svelte:head>

<VoidBackground />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black overflow-hidden">
  <div class="w-full max-w-4xl px-6">
    <JungVoiceTest onComplete={handleTestComplete} />
  </div>
</div>

<style>
  /* Ensure the session page takes over the whole screen */
  :global(.experiment-root header),
  :global(.experiment-root footer) {
    display: none !important;
  }
</style>
