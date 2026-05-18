<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/auth/store.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ConsentForm from "$lib/components/ConsentForm.svelte";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { hasAccess } from "$lib/subscription";
  import { resolveRoute } from "$lib/routing";

  const user = $derived(auth.user);
  const mode = $derived((page.url.searchParams.get("mode") as any) || "full");

  onMount(() => {
    // 権限チェック: quick 以外はサブスクリプションが必要
    if (mode !== 'quick' && !hasAccess(user, mode)) {
      console.warn(`Access denied for mode: ${mode}`);
      goto(resolveRoute("/participant"));
    }
  });

  async function handleConsent(id: string, email: string, agreements: any, demographics: any) {
    console.log("Consent received:", { id, email, agreements, demographics, mode });
    
    try {
      // 参加者情報の初期化（ストア）
      kawasakiStore.initializeParticipant(id, demographics, mode);
      
      // API 連携: 参加者作成と assessment graph 起動
      await kawasakiStore.createParticipantOnServer(email, agreements);
      
      kawasakiStore.startPreflight();
      goto(resolveRoute("/participant/test"));
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
