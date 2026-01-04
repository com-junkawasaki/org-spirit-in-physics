<script lang="ts">
  import { onMount } from "svelte";
  import { useClerkContext } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ConsentForm from "$lib/components/ConsentForm.svelte";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { hasAccess } from "$lib/subscription";

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const user = $derived(clerk?.user);
  const mode = $derived((page.url.searchParams.get("mode") as any) || "full");

  onMount(() => {
    // 権限チェック: quick 以外はサブスクリプションが必要
    if (mode !== 'quick' && !hasAccess(user, mode)) {
      console.warn(`Access denied for mode: ${mode}`);
      goto("/participant");
    }
  });

  async function handleConsent(id: string, email: string, agreements: any, demographics: any) {
    console.log("Consent received:", { id, email, agreements, demographics, mode });
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/dd38c440-a27e-40c0-b740-1186fa2e0e03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'+page.svelte:11',message:'handleConsent called',data:{id,email,demographics,mode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    try {
      // 参加者情報の初期化（ストア）
      kawasakiStore.initializeParticipant(id, demographics, mode);
      
      // API 連携: 参加者作成
      await kawasakiStore.createParticipantOnServer(email, agreements);
      
      kawasakiStore.startPreflight();
      goto("/participant/test");
    } catch (error) {
      console.error("Failed to create participant:", error);
    }
  }
</script>

<svelte:head>
  <title>{m.consent_title()} | Spirit in Physics</title>
</svelte:head>

<div class="step-container">
  <ConsentForm participantId={kawasakiStore.participantId || ""} onConsent={handleConsent} />
</div>

<style>
  .step-container {
    width: 100%;
    max-width: 900px;
    padding: 0 2rem;
  }
</style>

