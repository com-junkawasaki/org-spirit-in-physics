<script lang="ts">
  import { onMount } from "svelte";
  import { useClerkContext } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ConsentForm from "$lib/components/ConsentForm.svelte";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { resolveRoute } from "$lib/routing";
  import VoidBackground from "$lib/components/experiment/VoidBackground.svelte";

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const user = $derived(clerk?.user);
  
  // For /experiment, we default to 'full' for Nature-grade data, but allow override
  const mode = $derived((page.url.searchParams.get("mode") as any) || "full");

  onMount(() => {
    if (clerk && !user) {
      // If not signed in, go back to landing
      goto(resolveRoute('/experiment'));
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
      goto(resolveRoute('/experiment/session'));
    } catch (error) {
      console.error("[Experiment] Failed to handle consent:", error);
    }
  }
</script>

<svelte:head>
  <title>{m.consent_title()} | Spirit in Physics</title>
</svelte:head>

<VoidBackground />

<div class="min-h-[80vh] flex flex-col items-center justify-center py-12">
  <div class="w-full max-w-2xl px-6">
    <div class="bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-[40px] border border-white/20 dark:border-white/5 overflow-hidden shadow-2xl shadow-blue-500/5 p-8 sm:p-12">
      <ConsentForm 
        participantId={user?.id || kawasakiStore.participantId || ""} 
        onConsent={handleConsent} 
      />
    </div>
  </div>
</div>

