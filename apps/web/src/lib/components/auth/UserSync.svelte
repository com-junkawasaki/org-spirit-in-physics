<script lang="ts">
  import { useClerkContext } from "svelte-clerk";
  import { theme } from "$lib/theme.svelte";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import { preferenceClient } from "$lib/connect";

  const clerk = useClerkContext();

  $effect(() => {
    if (clerk.user) {
      const userId = clerk.user.id;
      theme.setUserId(userId);
      
      // Also sync language to backend if changed
      syncLanguage(userId, languageTag());
    }
  });

  async function syncLanguage(userId: string, lang: string) {
    try {
      await preferenceClient.updatePreference({
        userId,
        language: lang
      });
    } catch (e) {
      console.error("Failed to sync language to backend:", e);
    }
  }
</script>
