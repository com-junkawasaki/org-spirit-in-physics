<script lang="ts">
  import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag, availableLanguageTags, type AvailableLanguageTag } from "$lib/paraglide/runtime.js";
  import { i18n } from "$lib/i18n";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { theme } from "$lib/theme.svelte";

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
    const newLang = select.value as AvailableLanguageTag;
    
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

<svelte:head>
  <title>{m.settings()} | Spirit in Physics</title>
</svelte:head>

<div class="settings-container p-6 max-w-2xl mx-auto">
  <header class="mb-8">
    <h1 class="text-3xl font-black tracking-tighter uppercase">{m.settings()}</h1>
    <p class="text-gray-500 dark:text-gray-400">{m.ui_preferences()}</p>
  </header>

  <div class="space-y-8">
    <!-- Language Section -->
    <section class="settings-section">
      <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{m.language()}</h2>
      <div class="card p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
        <select 
          class="w-full bg-transparent border-none text-lg font-bold outline-none cursor-pointer" 
          value={languageTag()} 
          onchange={handleLanguageChange}
        >
          {#each availableLanguageTags as lang}
            <option value={lang}>{languageNames[lang] || lang}</option>
          {/each}
        </select>
      </div>
    </section>

    <!-- Theme Section -->
    <section class="settings-section">
      <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{m.appearance()}</h2>
      <div class="grid grid-cols-3 gap-4">
        <button 
          class="theme-card" 
          class:active={theme.current === 'light'}
          onclick={() => theme.set('light')}
        >
          <div class="preview light"></div>
          <span>{m.theme_light()}</span>
        </button>
        <button 
          class="theme-card" 
          class:active={theme.current === 'dark'}
          onclick={() => theme.set('dark')}
        >
          <div class="preview dark"></div>
          <span>{m.theme_dark()}</span>
        </button>
        <button 
          class="theme-card" 
          class:active={theme.current === 'system'}
          onclick={() => theme.set('system')}
        >
          <div class="preview system"></div>
          <span>{m.theme_system()}</span>
        </button>
      </div>
    </section>

    <section class="settings-section pt-8 border-t border-gray-100 dark:border-gray-900">
      <button 
        class="w-full p-4 text-center font-black uppercase tracking-widest bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl"
        onclick={() => history.back()}
      >
        {m.back()}
      </button>
    </section>
  </div>
</div>

<style>
  .theme-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--card-bg, #f9f9fb);
    border: 2px solid transparent;
    border-radius: 20px;
    transition: all 0.2s;
    cursor: pointer;
  }

  :global(.dark) .theme-card {
    --card-bg: #111;
  }

  .theme-card.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }

  .preview {
    width: 100%;
    height: 60px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.05);
  }

  .preview.light { background: #fff; }
  .preview.dark { background: #000; }
  .preview.system { background: linear-gradient(135deg, #fff 50%, #000 50%); }

  .theme-card span {
    font-size: 0.8rem;
    font-weight: 700;
  }
</style>

