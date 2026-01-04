<script lang="ts">
  import { onMount } from "svelte";
  import TimelineVisualization from "$lib/components/researcher/TimelineVisualization.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import { i18n } from "$lib/i18n";
  import { languageTag } from "$lib/paraglide/runtime.js";

  let participantId = $state(kawasakiStore.participantId);

  onMount(() => {
    if (!participantId && typeof window !== 'undefined') {
      participantId = localStorage.getItem('participantId');
    }
  });

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: 'My Spirit Manifold | Spirit in Physics',
        text: 'I just contributed my psychological data to the Spirit in Physics landmark study. Check out my 3D spirit manifold!',
        url: window.location.href
      }).catch(console.error);
    }
  }
</script>

<svelte:head>
  <title>Your Spirit Manifold | Spirit in Physics</title>
  <meta property="og:title" content="My Spirit Manifold | Spirit in Physics" />
  <meta property="og:description" content="I've mapped my spirit as a thermodynamic information quantity. Join the landmark study for Nature Physics." />
  <meta property="og:image" content="/images/ogp-manifold.png" /> <!-- 後ほど動的生成への差し替えを検討 -->
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="My Spirit Manifold | Spirit in Physics" />
  <meta name="twitter:description" content="Explore high-dimensional psychological structures through the lens of physics." />
</svelte:head>

<div class="py-12 md:py-24">
  <div class="mb-16 text-center">
    <div class="inline-block px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-widest mb-4">
      Contribution Complete
    </div>
    <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-6">
      Thank You for Your <span class="text-blue-600">Spirit</span>
    </h1>
    <p class="max-w-2xl mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
      Your data has been successfully integrated into our research manifold. 
      Below is the real-time analysis of your psychological space, including detected Ghost Patterns.
    </p>
  </div>

  <div class="bg-white dark:bg-gray-950 rounded-[3rem] p-8 md:p-12 border border-gray-100 dark:border-gray-900 shadow-2xl shadow-blue-500/10 mb-12">
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <h2 class="text-2xl font-black uppercase tracking-tight">Your Manifold Analysis</h2>
        <p class="text-sm font-mono text-gray-400">{participantId}</p>
      </div>
      
      <div class="flex gap-4">
        <button 
          onclick={() => window.print()}
          class="px-6 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
        >
          Download PDF
        </button>
        <button 
          onclick={handleShare}
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all"
        >
          Share Results
        </button>
      </div>
    </div>

    <div class="aspect-video w-full bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800">
      {#if participantId}
        <TimelineVisualization {participantId} width={1000} height={600} />
      {:else}
        <div class="h-full flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest">
          {m.loading_data()}
        </div>
      {/if}
    </div>
  </div>

  <div class="max-w-3xl mx-auto text-center">
    <h3 class="text-xl font-bold mb-4">What's Next?</h3>
    <p class="text-sm text-gray-500 leading-relaxed mb-8">
      We are processing thousands of participants to establish the thermodynamic constants of human spirit. 
      Your contribution brings us closer to publication in Nature Physics. 
      Follow our progress on the <a href="/" class="text-blue-600 hover:underline font-bold">Paper</a> page.
    </p>
    <a 
      href={i18n.resolveRoute('/experiment', languageTag())}
      class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-all"
    >
      Return to Project Home
    </a>
  </div>
</div>

<style>
  @media print {
    header, footer, button, .mt-24 {
      display: none !important;
    }
    .py-12 {
      padding: 0 !important;
    }
  }
</style>

