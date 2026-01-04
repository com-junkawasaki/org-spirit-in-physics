<script lang="ts">
  import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
  import UserSync from "$lib/components/auth/UserSync.svelte";
  import ResearcherGuard from "$lib/components/auth/ResearcherGuard.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag, availableLanguageTags, type AvailableLanguageTag } from "$lib/paraglide/runtime.js";
  import { i18n } from "$lib/i18n";
  import "../app.css";

  let { children } = $props();

  onMount(async () => {
    if (runtimeConfig.IS_CAPACITOR) {
      const { App } = await import('@capacitor/app');
      
      App.addListener('appUrlOpen', (event: any) => {
        // Handle deep links for Clerk
        // URL format: ai.gftd.spirit://clerk?__clerk_ticket=...
        const url = new URL(event.url);
        const slug = url.hostname;
        
        console.log("[Mobile] Deep link received:", event.url);
        
        if (slug === 'clerk' || url.searchParams.has('__clerk_ticket')) {
          // Redirect to the auth handler within the app
          const path = url.pathname + url.search;
          goto(path);
        }
      });
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

  // Create a reactive state for the language tag to ensure Svelte 5 UI updates
  let currentLang = $state(languageTag());

  let isParticipantPage = $derived(page.url.pathname.includes('/participant'));
  
  function handleLanguageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newLang = select.value as AvailableLanguageTag;
    
    console.log("[Layout] Switching language to:", newLang);
    
    // Manual prefix stripping to prevent nesting like /fr/fr/ja/
    let path = page.url.pathname;
    const segments = path.split('/').filter(Boolean);
    while (segments.length > 0 && availableLanguageTags.includes(segments[0] as any)) {
      segments.shift();
    }
    const canonicalPath = '/' + segments.join('/');
    
    const newPath = i18n.resolveRoute(canonicalPath, newLang);
    console.log("[Layout] Navigating to:", newPath);
    
    goto(newPath);
  }

  // Sync html lang and dir attributes
  $effect(() => {
    // Depend on page.url.pathname to re-run on navigation
    const currentPath = page.url.pathname;
    
    if (browser) {
      const lang = languageTag();
      currentLang = lang; // Update reactive state
      console.log("[Layout] Current languageTag:", lang);
      console.log("[Layout] Current path:", currentPath);
      
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  });
</script>

{#if runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}
  <ClerkProvider publishableKey={runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <UserSync />
    {@render layoutContent()}
  </ClerkProvider>
{:else}
  {@render layoutContent()}
{/if}

{#snippet layoutContent()}
  <header class="global-nav">
    <div class="nav-container">
      <div class="nav-left">
        <div class="logo">
          <a href="/" class="logo-text">{m.logo()}</a>
        </div>
        
        {#if !isParticipantPage}
          <nav class="main-nav">
            <a href="/" class="nav-link" class:active={page.url.pathname === '/' || availableLanguageTags.some(lang => page.url.pathname === `/${lang}/`)}>{m.paper()}</a>
            <div class="subtle-links">
              <a href="/participant" class="subtle-link" class:active={page.url.pathname.includes('/participant')}>{m.participant()}</a>
              <ResearcherGuard>
                <a href="/researcher" class="subtle-link" class:active={page.url.pathname.includes('/researcher')}>{m.researcher()}</a>
              </ResearcherGuard>
            </div>
          </nav>
        {/if}
      </div>

      <div class="nav-right">
        <div class="controls-group">
          <select class="lang-selector" value={currentLang} onchange={handleLanguageChange}>
            {#each availableLanguageTags as lang}
              <option value={lang}>{languageNames[lang] || lang}</option>
            {/each}
          </select>
          <div class="divider"></div>
          <ThemeSwitcher />
        </div>
        
        <div class="auth-group">
          {#if runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}
            <SignedOut>
              <SignInButton mode="modal" class="signin-btn" />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          {:else}
            <span class="text-[10px] text-gray-400 uppercase tracking-widest font-bold">No Auth</span>
          {/if}
        </div>
      </div>
    </div>
  </header>

  <main class="content-wrapper">
    {@render children()}
  </main>
{/snippet}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f5f5f7;
    transition: background-color 0.3s;
  }

  :global(.dark body) {
    background-color: #000;
    color: #fff;
  }

  .global-nav {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    transition: background 0.3s, border-color 0.3s;
  }

  :global(.dark) .global-nav {
    background: rgba(0, 0, 0, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .nav-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-left, .nav-right {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .controls-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.03);
    padding: 4px;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .controls-group {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .lang-selector {
    background: transparent;
    border: none;
    padding: 0.4rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
    outline: none;
  }

  :global(.dark) .lang-selector {
    color: #aaa;
  }

  .lang-selector:hover {
    color: #000;
  }

  :global(.dark) .lang-selector:hover {
    color: #fff;
  }

  .divider {
    width: 1px;
    height: 1.2rem;
    background: rgba(0, 0, 0, 0.1);
    margin: 0 0.5rem;
  }

  :global(.dark) .divider {
    background: rgba(255, 255, 255, 0.1);
  }

  .logo .logo-text {
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-decoration: none;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
    display: inline-block;
  }

  .main-nav {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-link {
    text-decoration: none;
    color: #86868b;
    font-weight: 600;
    font-size: 0.9rem;
    transition: color 0.2s;
  }

  :global(.dark) .nav-link {
    color: #86868b;
  }

  .nav-link:hover, .nav-link.active {
    color: #000;
  }

  :global(.dark) .nav-link:hover, :global(.dark) .nav-link.active {
    color: #fff;
  }

  .subtle-links {
    display: flex;
    gap: 1.5rem;
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    padding-left: 1.5rem;
  }

  :global(.dark) .subtle-links {
    border-left-color: rgba(255, 255, 255, 0.1);
  }

  .subtle-link {
    text-decoration: none;
    color: #86868b;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .subtle-link:hover {
    color: #1d1d1f;
  }

  :global(.dark) .subtle-link:hover {
    color: #fff;
  }

  :global(.signin-btn) {
    background: #007aff;
    color: white;
    border: none;
    padding: 0.5rem 1.2rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
  }

  :global(.signin-btn:hover) {
    transform: scale(1.02);
    opacity: 0.9;
  }

  .content-wrapper {
    min-height: calc(100vh - 64px);
  }

  @media (max-width: 1024px) {
    .subtle-links {
      display: none;
    }
    .nav-left, .nav-right {
      gap: 1rem;
    }
  }

  @media (max-width: 768px) {
    .nav-container {
      padding: 0 1rem;
    }
    .main-nav {
      display: none;
    }
  }
</style>
