<script lang="ts">
  import { goto } from "$app/navigation";
  import JungVoiceTest from "$lib/jung-voice-assessment/JungVoiceTest.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { resolveRoute } from "$lib/routing";

  function handleTestComplete() {
    goto(resolveRoute("/participant/complete"));
  }
</script>

<svelte:head>
  <title>{m.device_check()} | Spirit in Physics</title>
</svelte:head>

<div class="step-container">
  <JungVoiceTest onComplete={handleTestComplete} />
</div>

<style>
  .step-container {
    width: 100%;
    max-width: 900px;
    padding: 0 2rem;
  }
</style>

