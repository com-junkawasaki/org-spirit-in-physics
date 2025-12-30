<script lang="ts">
  import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
  import UserSync from "$lib/components/auth/UserSync.svelte";
  import ResearcherGuard from "$lib/components/auth/ResearcherGuard.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag, availableLanguageTags } from "$lib/paraglide/runtime.js";
  import { i18n } from "$lib/i18n";
  import "../app.css";

  let { children } = $props();

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
    const newLang = select.value;
    
    // Use Paraglide-SvelteKit to get the localized path
    const newPath = i18n.resolveRoute(page.url.pathname, newLang);
    goto(newPath);
  }

  // Sync html lang and dir attributes
  $effect(() => {
    if (browser) {
      const lang = languageTag();
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  });
</script>

{#if PUBLIC_CLERK_PUBLISHABLE_KEY}
  <ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <UserSync />
    {@render layoutContent()}
  </ClerkProvider>
{:else}
  {@render layoutContent()}
{/if}

{#snippet layoutContent()}
  <header class="global-nav">
    <div class="nav-container">
      <div class="logo">
        <a href="/" class="logo-text">{m.logo()}</a>
      </div>
      
      {#if !isParticipantPage}
        <nav class="main-nav">
          <a href="/" class="nav-link">{m.paper()}</a>
          <div class="subtle-links">
            <a href="/participant" class="subtle-link">{m.participant()}</a>
            <ResearcherGuard>
              <a href="/researcher" class="subtle-link">{m.researcher()}</a>
            </ResearcherGuard>
          </div>
        </nav>
      {/if}

      <div class="auth-section">
        <select class="lang-selector" value={languageTag()} onchange={handleLanguageChange}>
          {#each availableLanguageTags as lang}
            <option value={lang}>{languageNames[lang] || lang}</option>
          {/each}
        </select>
        <ThemeSwitcher />
        {#if PUBLIC_CLERK_PUBLISHABLE_KEY}
          <SignedOut>
            <SignInButton mode="modal" class="signin-btn" />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        {:else}
          <span class="text-xs text-gray-400">Auth Disabled (No Key)</span>
        {/if}
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
  }

  .auth-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .lang-selector {
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.4rem 0.8rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
    outline: none;
  }

  .lang-selector:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #000;
  }

  .lang-selector option {
    background: white;
    color: black;
  }

  .global-nav {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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
    gap: 3rem;
  }

  .nav-link {
    text-decoration: none;
    color: #000;
    font-weight: 600;
    font-size: 0.95rem;
    transition: color 0.2s;
  }

  .nav-link:hover {
    color: #007aff;
  }

  .subtle-links {
    display: flex;
    gap: 1.5rem;
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    padding-left: 1.5rem;
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

  .signin-btn {
    background: #007aff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .signin-btn:hover {
    opacity: 0.9;
  }

  .content-wrapper {
    min-height: calc(100vh - 64px);
  }

  @media (max-width: 768px) {
    .nav-container {
      padding: 0 1rem;
    }
    .main-nav {
      gap: 1rem;
    }
    .subtle-links {
      display: none; /* Hide subtle links on very small screens */
    }
  }
</style>
