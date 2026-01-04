<script lang="ts">
  import { goto } from "$app/navigation";
  import JungVoiceTest from "$lib/jung-voice-assessment/JungVoiceTest.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { i18n } from "$lib/i18n";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";

  function handleTestComplete() {
    // Navigate to report page after experiment is done
    goto(i18n.resolveRoute('/experiment/report', languageTag()));
  }
</script>

<svelte:head>
  <title>{m.device_check()} | Spirit in Physics</title>
</svelte:head>

<div class="py-12 flex justify-center">
  <div class="w-full max-w-4xl">
    <div class="mb-8 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Research Session</span>
      </div>
      <div class="text-[10px] font-mono text-gray-400">
        ID: {kawasakiStore.participantId}
      </div>
    </div>

    <JungVoiceTest onComplete={handleTestComplete} />
  </div>
</div>

