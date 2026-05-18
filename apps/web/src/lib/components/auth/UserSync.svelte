<script lang="ts">
  import { auth } from "$lib/auth/store.svelte";
  import { theme } from "$lib/theme.svelte";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import { preferenceClient } from "$lib/connect";

  $effect(() => {
    if (auth.user) {
      const userId = auth.user.id;
      theme.setUserId(userId);
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
