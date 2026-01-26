<script lang="ts">
  import { onMount } from "svelte";
  import TimelineVisualization from "$lib/components/researcher/TimelineVisualization.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { kawasakiStore } from "$lib/jung-voice-assessment/store.svelte";
  import { resolveRoute } from "$lib/routing";
  import VoidBackground from "$lib/components/experiment/VoidBackground.svelte";
  import { fade, fly } from "svelte/transition";

  let participantId = $state(kawasakiStore.participantId);
  let showContent = $state(false);

  onMount(() => {
    if (!participantId && typeof window !== 'undefined') {
      participantId = localStorage.getItem('participantId') || "";
    }
    
    // Smooth delay for narrative effect
    setTimeout(() => {
      showContent = true;
    }, 500);
  });

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: 'My Spirit Manifold | Spirit in Physics',
        text: 'I just mapped my spirit as a thermodynamic information quantity. Explore my 3D mental manifold!',
        url: window.location.href
      }).catch(console.error);
    }
  }
</script>

<svelte:head>
  <title>Your Spirit Manifold | Spirit in Physics</title>
  <meta property="og:title" content="My Spirit Manifold | Spirit in Physics" />
  <meta property="og:description" content="I've mapped my spirit as a thermodynamic information quantity. Join the landmark study for Nature Physics." />
  <meta property="og:image" content="/images/ogp-manifold.png" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<VoidBackground />

{#if showContent}
  <div in:fade={{ duration: 1000 }} class="min-h-screen py-12 md:py-24 flex flex-col items-center">
    <div class="max-w-6xl w-full px-6">
      <!-- Header Section -->
      <div class="mb-24 text-center space-y-6">
        <div in:fly={{ y: 20, duration: 800 }} class="inline-block px-6 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black rounded-full uppercase tracking-[0.3em]">
          Analysis Complete
        </div>
        <h1 in:fly={{ y: 20, duration: 800, delay: 200 }} class="text-5xl md:text-7xl font-black tracking-tighter">
          Your <span class="text-blue-600">Spirit</span> Manifold
        </h1>
        <p in:fly={{ y: 20, duration: 800, delay: 400 }} class="max-w-2xl mx-auto text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
          あなたの意識の深層が、熱力学的な情報多様体として描き出されました。<br/>
          この幾何学的な構造は、あなたの直感、葛藤、そして潜在的な精神の「形」を物理学的に表現しています。
        </p>
      </div>

      <!-- Main Analysis Card -->
      <div in:fly={{ y: 40, duration: 1000, delay: 600 }} class="bg-white/80 dark:bg-black/80 backdrop-blur-3xl rounded-[4rem] p-8 md:p-16 border border-white/20 dark:border-white/5 shadow-[0_32px_128px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_128px_rgba(0,0,0,0.4)] mb-24">
        <div class="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div class="space-y-2">
            <h2 class="text-3xl font-black uppercase tracking-tighter">Deep Structure</h2>
            <div class="flex items-center gap-3">
              <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <p class="text-xs font-mono text-gray-400 tracking-widest uppercase">{participantId}</p>
            </div>
          </div>
          
          <div class="flex gap-4">
            <button 
              onclick={() => window.print()}
              class="px-8 py-4 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Export PDF
            </button>
            <button 
              onclick={handleShare}
              class="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-600/30 transition-all hover:scale-105"
            >
              Share Spirit
            </button>
          </div>
        </div>

        <div class="aspect-video w-full bg-gray-50/50 dark:bg-gray-950/50 rounded-[3rem] overflow-hidden border border-gray-100/50 dark:border-gray-900/50 shadow-inner">
          {#if participantId}
            <TimelineVisualization {participantId} />
          {:else}
            <div class="h-full flex flex-col items-center justify-center gap-4">
              <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Manifold...</p>
            </div>
          {/if}
        </div>

        <!-- Interpretation Legend -->
        <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          <div class="space-y-4">
            <h4 class="text-xs font-black uppercase tracking-widest text-blue-500">Nodes (Nodes)</h4>
            <p class="text-xs text-gray-500 leading-relaxed">
              各点はあなたの特定の概念（言葉）を表します。密集している場所は、あなたの意識において強く連合している領域です。
            </p>
          </div>
          <div class="space-y-4">
            <h4 class="text-xs font-black uppercase tracking-widest text-red-500">Ghost Patterns</h4>
            <p class="text-xs text-gray-500 leading-relaxed">
              赤い発光は「Complex Core」を示唆します。強い生体反応と連合の密集が重なる、あなたの精神における重要な結節点です。
            </p>
          </div>
          <div class="space-y-4">
            <h4 class="text-xs font-black uppercase tracking-widest text-gray-400">Gaps (Voids)</h4>
            <p class="text-xs text-gray-500 leading-relaxed">
              空間の空白は「Repression Gap」かもしれません。意識が避けている、あるいは抑圧されている可能性のある精神的な間隙です。
            </p>
          </div>
        </div>
      </div>

      <!-- Footer / CTA -->
      <div in:fade={{ delay: 1500 }} class="max-w-3xl mx-auto text-center space-y-12">
        <div class="space-y-4">
          <h3 class="text-2xl font-black uppercase tracking-tighter">Beyond the Measurement</h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            この解析結果は、Nature 誌への掲載を目指す大規模な研究の一部として匿名で活用されます。<br/>
            あなたの Spirit が、物理学と心理学の境界を再定義する一助となりました。
          </p>
        </div>
        
        <div class="flex flex-col items-center gap-6">
          <a 
            href={resolveRoute('/')}
            class="px-12 py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-[10px] rounded-full hover:scale-105 transition-all shadow-xl"
          >
            Learn More about the Research
          </a>
          <button 
            onclick={() => kawasakiStore.resetTest()}
            class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-all"
          >
            Run New Experiment
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.experiment-root header),
  :global(.experiment-root footer) {
    display: none !important;
  }

  @media print {
    .bg-white\/80 {
      background-color: white !important;
      backdrop-filter: none !important;
    }
    button, a {
      display: none !important;
    }
  }
</style>
