<script lang="ts">
  import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";
  import { runtimeConfig } from "$lib/env.svelte";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import UserSync from "$lib/components/auth/UserSync.svelte";
  import ResearcherGuard from "$lib/components/auth/ResearcherGuard.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag, availableLanguageTags } from "$lib/paraglide/runtime.js";
  import { resolveRoute } from "$lib/routing";
  import "../app.css";

  let { children } = $props();

  onMount(async () => {
    console.log('[DEBUG] +layout.svelte: onMount started');
    console.log('[DEBUG] Current route:', page.url.pathname);
    
    if (runtimeConfig.IS_CAPACITOR) {
      const { App } = await import('@capacitor/app');
      
      App.addListener('appUrlOpen', (event: any) => {
        const url = new URL(event.url);
        const slug = url.hostname;
        
        console.log("[Mobile] Deep link received:", event.url);
        
        if (slug === 'clerk' || url.searchParams.has('__clerk_ticket')) {
          const path = url.pathname + url.search;
          goto(path);
        }
      });
    }
    
    console.log('[DEBUG] +layout.svelte: onMount completed');
  });

  let isExperimentRoute = $derived(page.url.pathname.includes('/experiment'));

  let activeTab = $derived.by(() => {
    const path = page.url.pathname;
    if (path.includes('/analyzer')) return 'analyzer';
    if (path.includes('/paper')) return 'paper';
    return 'spirit';
  });

  // Sync html lang and dir attributes
  $effect(() => {
    if (browser) {
      const lang = languageTag();
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
  <div class="app-shell">
    <header class="global-header">
      <div class="header-container">
        <div class="header-left">
          <a href={resolveRoute("/")} class="logo-text">{m.logo()}</a>
        </div>
        
        <div class="header-right">
          <div class="auth-group">
            {#if runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY}
              <SignedIn>
                <UserButton userProfileMode="navigation" userProfileUrl={resolveRoute("/settings")} />
              </SignedIn>
              <SignedOut>
                <a href={resolveRoute("/settings")} class="settings-link" aria-label="Settings">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </a>
              </SignedOut>
            {:else}
              <span class="no-auth-label">No Auth</span>
            {/if}
          </div>
        </div>
      </div>
    </header>

    <main class="main-content" class:no-header={isExperimentRoute}>
      {@render children()}
    </main>

    {#if !isExperimentRoute}
      <nav class="bottom-nav">
        <div class="nav-container">
          <a href={resolveRoute("/analyzer")} class="nav-item" class:active={activeTab === 'analyzer'}>
            <span class="icon">📊</span>
            <span class="label">Analyzer</span>
          </a>
          
          <a href={resolveRoute("/")} class="nav-item spirit-tab" class:active={activeTab === 'spirit'}>
            <div class="spirit-wrap">
              <span class="icon">✨</span>
            </div>
            <span class="label">Spirit</span>
          </a>
          
          <a href={resolveRoute("/paper")} class="nav-item" class:active={activeTab === 'paper'}>
            <span class="icon">📄</span>
            <span class="label">Paper</span>
          </a>
        </div>
      </nav>
    {/if}
  </div>
{/snippet}

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background-color: #f5f5f7;
  }

  :global(.dark) .app-shell {
    background-color: #000;
  }

  .global-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .global-header {
    background: rgba(0, 0, 0, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo-text {
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    text-decoration: none;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
  }

  .settings-link {
    color: #86868b;
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }

  :global(.dark) .settings-link {
    color: #a1a1a6;
  }

  .main-content {
    flex: 1;
    margin-top: 60px;
    margin-bottom: 70px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .main-content.no-header {
    margin-top: 60px; /* Keep header but we might adjust if needed */
  }

  /* When bottom nav is hidden, remove bottom margin */
  :has(.bottom-nav) .main-content {
    margin-bottom: 70px;
  }
  
  .main-content:not(:has(+ .bottom-nav)) {
    margin-bottom: 0;
  }

  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 1000;
  }

  :global(.dark) .bottom-nav {
    background: rgba(10, 10, 12, 0.9);
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .nav-container {
    max-width: 600px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    color: #86868b;
    transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
    min-width: 80px;
  }

  .nav-item .icon {
    font-size: 1.4rem;
    filter: grayscale(100%) opacity(0.6);
  }

  .nav-item .label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .nav-item.active {
    color: #3b82f6;
  }

  .nav-item.active .icon {
    filter: none;
    opacity: 1;
    transform: scale(1.1);
  }

  .spirit-tab .spirit-wrap {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #6366f1, #ec4899);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: -24px;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .spirit-tab.active .spirit-wrap {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6);
  }

  .spirit-tab .icon {
    filter: none;
    opacity: 1;
    font-size: 1.5rem;
  }

  .no-auth-label {
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 800;
    color: #888;
    letter-spacing: 0.1em;
  }
</style>
