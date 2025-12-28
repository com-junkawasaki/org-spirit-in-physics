<script lang="ts">
  import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";
  import { page } from "$app/state";
  import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag, setLanguageTag } from "$lib/paraglide/runtime.js";
  import "../app.css";

  let { children } = $props();

  // 被験者画面では管理画面へのリンクを隠す
  let isParticipantPage = $derived(page.url.pathname === '/participant' || page.url.pathname.startsWith('/en/participant'));
  
  function toggleLanguage() {
    const newLang = languageTag() === 'ja' ? 'en' : 'ja';
    const currentPath = page.url.pathname;
    
    // パスから現在の言語プレフィックスを削除または置換
    let newPath = currentPath;
    if (currentPath.startsWith('/en')) {
      newPath = currentPath.replace('/en', newLang === 'ja' ? '' : '/en');
    } else if (currentPath === '/') {
      newPath = newLang === 'en' ? '/en' : '/';
    } else {
      newPath = newLang === 'en' ? '/en' + currentPath : currentPath;
    }
    
    // 言語を切り替えてリダイレクト
    window.location.href = newPath || '/';
  }
</script>

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
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
            <a href="/researcher" class="subtle-link">{m.researcher()}</a>
          </div>
        </nav>
      {/if}

      <div class="auth-section">
        <button class="lang-switcher" onclick={toggleLanguage}>
          {languageTag() === 'ja' ? 'English' : '日本語'}
        </button>
        <SignedOut>
          <SignInButton mode="modal" class="signin-btn" />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  </header>

  <div class="theme-toggle-container">
    <ThemeSwitcher />
  </div>

  <main class="content-wrapper">
    {@render children()}
  </main>
</ClerkProvider>

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

  .lang-switcher {
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.4rem 0.8rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }

  .lang-switcher:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #000;
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

  .theme-toggle-container {
    position: fixed;
    bottom: 2rem;
    left: 2rem;
    z-index: 1000;
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
