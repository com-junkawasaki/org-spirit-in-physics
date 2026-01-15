<script lang="ts">
  import LandingView from "$lib/components/LandingView.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { i18n } from "$lib/i18n";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  function resolveRoute(path: string) {
    return i18n.resolveRoute(path, languageTag());
  }

  if (browser) {
    onMount(() => {
      console.log('[DEBUG] +page.svelte: onMount started');
      console.log('[DEBUG] LandingView component will mount');
    });
  }
</script>

<svelte:head>
  <title>{m.logo()} | {m.paper_title_full()}</title>
</svelte:head>

<div class="spirit-page">
  <LandingView mode="compact" />

  <div class="action-overlay">
    <a href={resolveRoute("/experiment")} class="experiment-fab">
      <span class="icon">🔬</span>
      <span class="text">{m.start_experiment()}</span>
    </a>
  </div>
</div>

<style>
  .spirit-page {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .action-overlay {
    position: absolute;
    bottom: 2rem;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: 100;
  }

  .experiment-fab {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #000;
    color: #fff;
    padding: 1rem 2.5rem;
    border-radius: 100px;
    text-decoration: none;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  }

  :global(.dark) .experiment-fab {
    background: #fff;
    color: #000;
    box-shadow: 0 10px 40px rgba(255, 255, 255, 0.2);
  }

  .experiment-fab:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
  }

  .experiment-fab .icon {
    font-size: 1.25rem;
  }

  .experiment-fab .text {
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    .experiment-fab {
      padding: 0.8rem 1.8rem;
    }
    .experiment-fab .text {
      font-size: 0.8rem;
    }
  }
</style>
