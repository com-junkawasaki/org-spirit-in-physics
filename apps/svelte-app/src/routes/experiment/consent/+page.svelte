<script lang="ts">
  import { onMount } from "svelte";
  import { useClerkContext } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ConsentForm from "$lib/components/ConsentForm.svelte";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { i18n } from "$lib/i18n";
  import { languageTag } from "$lib/paraglide/runtime.js";

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const user = $derived(clerk?.user);
  
  // For /experiment, we default to 'full' for Nature-grade data, but allow override
  const mode = $derived((page.url.searchParams.get("mode") as any) || "full");

  onMount(() => {
    if (clerk && !user) {
      // If not signed in, go back to landing
      goto(i18n.resolveRoute('/experiment', languageTag()));
    }
  });

  async function handleConsent(id: string, email: string, agreements: any, demographics: any) {
    console.log("[Experiment] Consent received:", { id, email, demographics, mode });
    
    try {
      // Initialize store with participant info
      kawasakiStore.initializeParticipant(id, demographics, mode);
      
      // Create participant on server (this also starts the Temporal workflow)
      await kawasakiStore.createParticipantOnServer(email, agreements);
      
      // Move to device check / session
      kawasakiStore.startPreflight();
      goto(i18n.resolveRoute('/experiment/session', languageTag()));
    } catch (error) {
      console.error("[Experiment] Failed to handle consent:", error);
    }
  }
</script>

<svelte:head>
  <title>{m.consent_title()} | Spirit in Physics</title>
</svelte:head>

<div class="py-12 flex justify-center">
  <div class="w-full max-w-4xl">
    <div class="mb-12 text-center">
      <h1 class="text-3xl font-black mb-2 uppercase tracking-tight">{m.consent_title()}</h1>
      <p class="text-gray-500">{m.consent_subtitle()}</p>
    </div>

    <div class="bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 overflow-hidden shadow-xl shadow-blue-500/5">
      <ConsentForm 
        participantId={user?.id || kawasakiStore.participantId || ""} 
        onConsent={handleConsent} 
      />
    </div>

    <div class="mt-8 text-center">
      <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
        {m.gcp_standards()}<br/>
        {m.irb_info()}
      </p>
    </div>
  </div>
</div>

