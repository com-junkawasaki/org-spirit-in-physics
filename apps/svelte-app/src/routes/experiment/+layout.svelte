<script lang="ts">
  import { ClerkProvider, SignedIn, SignedOut, useClerkContext } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag, availableLanguageTags } from "$lib/paraglide/runtime.js";
  import { i18n } from "$lib/i18n";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import "../../app.css";

  let { children } = $props();

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);

  $effect(() => {
    if (clerk?.user) {
      kawasakiStore.syncWithClerk(clerk.user);
    }
  });

  const languageNames: Record<string, string> = {
    en: "English",
    ja: "日本語",
    fr: "Français",
    es: "Español",
    ru: "Русский",
    ar: "العربية",
    zh: "简体中文"
  };

  function handleLanguageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newLang = select.value as any;
    
    let path = page.url.pathname;
    const segments = path.split('/').filter(Boolean);
    while (segments.length > 0 && availableLanguageTags.includes(segments[0] as any)) {
      segments.shift();
    }
    const canonicalPath = '/' + segments.join('/');
    const newPath = i18n.resolveRoute(canonicalPath, newLang);
    goto(newPath);
  }
</script>

<div class="experiment-root min-h-screen bg-white dark:bg-black text-black dark:text-white selection:bg-blue-500 selection:text-white">
  <header class="p-6 flex justify-between items-center max-w-5xl mx-auto w-full">
    <div class="logo">
      <a href="/experiment" class="text-xl font-black tracking-tighter uppercase">
        Spirit <span class="text-blue-600">in</span> Physics
      </a>
    </div>
    
    <div class="flex items-center gap-4">
      <select 
        class="bg-gray-100 dark:bg-gray-900 border-none text-[10px] font-black uppercase rounded-full px-3 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none" 
        value={languageTag()} 
        onchange={handleLanguageChange}
      >
        {#each availableLanguageTags as lang}
          <option value={lang}>{languageNames[lang] || lang}</option>
        {/each}
      </select>
      <ThemeSwitcher />
    </div>
  </header>

  <main class="max-w-5xl mx-auto w-full px-6 pb-24">
    {@render children()}
  </main>

  <footer class="p-12 text-center border-t border-gray-100 dark:border-gray-900">
    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
      &copy; 2026 Spirit in Physics Project. All Rights Reserved.
    </p>
  </footer>
</div>

<style>
  :global(body) {
    background-color: transparent !important;
  }
  
  .experiment-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>

