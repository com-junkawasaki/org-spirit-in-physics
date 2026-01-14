<script lang="ts">
  import Force3DWordGraphTypeGPU from "./researcher/Force3DWordGraphTypeGPU.svelte";
  import type { WordNode, WordLink } from "./researcher/types";
  import * as m from "$lib/paraglide/messages.js";
  import { i18n } from "$lib/i18n";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import { onMount } from "svelte";
  import { timelineClient } from "$lib/connect";
  import { theme } from "$lib/theme.svelte";

  let scrollY = $state(0);
  let innerHeight = $state(0);

  const anchor2d = [
    { name: 'Joy', label: 'Joy / 喜び', x: 0.15, y: 0.85, color: '#f59e0b' },
    { name: 'Sadness', label: 'Sadness / 悲しみ', x: 0.70, y: 0.45, color: '#1f2937' },
    { name: 'Anger', label: 'Anger / 怒り', x: 0.82, y: 0.25, color: '#ef4444' },
    { name: 'Fear', label: 'Fear / 恐れ', x: 0.92, y: 0.10, color: '#a78bfa' },
    { name: 'Disgust', label: 'Disgust / 嫌悪', x: 0.78, y: 0.52, color: '#10b981' },
    { name: 'Calmness', label: 'Calmness / 冷静', x: 0.28, y: 0.70, color: '#93c5fd' },
    { name: 'Interest', label: 'Interest / 興味', x: 0.35, y: 0.55, color: '#60a5fa' },
    { name: 'Surprise', label: 'Surprise / 驚き', x: 0.40, y: 0.20, color: '#22c55e' },
    { name: 'Confusion', label: 'Confusion / 混乱', x: 0.48, y: 0.35, color: '#64748b' },
    { name: 'Determination', label: 'Determination / 決意', x: 0.22, y: 0.85, color: '#f97316' },
  ];

  const anchorToKey: Record<string, string> = {
    'Joy / 喜び': 'joy', 'Sadness / 悲しみ': 'sadness', 'Anger / 怒り': 'anger', 'Fear / 恐れ': 'fear', 'Disgust / 嫌悪': 'disgust',
    'Calmness / 冷静': 'calm', 'Interest / 興味': 'focus', 'Surprise / 驚き': 'surprise', 'Confusion / 混乱': 'confusion', 'Determination / 決意': 'excitement',
  };

  function toSphereLocal(x01: number, y01: number, radius: number): [number, number, number] {
    const u = (x01 - 0.5) * Math.PI * 1.6;
    const v = (y01 - 0.5) * Math.PI;
    const cx = Math.cos(v) * Math.cos(u);
    const cy = Math.cos(v) * Math.sin(u);
    const cz = Math.sin(v);
    return [radius * cx, radius * cy, radius * cz];
  }

  let isDark = $derived(
    theme.current === 'dark' || 
    (theme.current === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  let graphBg = $derived(isDark ? 'transparent' : '#fbfbfd');

  // Researcher IDs whose data can be made public for the landing page
  const RESEARCHER_IDS = [
    "e41a9cd2-d803-49a8-9020-0260e55cd03e", // Jun Kawasaki
    // "144b325f-5966-4d59-a629-f2ca421388cc", // Participant 1
    // "f7221b87-28ac-48c7-8ef1-1d675aa5e38f", // Participant 2
  ];

  let nodes = $state<WordNode[]>(anchor2d.map((a, idx) => {
    const u = (a.x - 0.5) * Math.PI * 1.6;
    const v = (a.y - 0.5) * Math.PI;
    const radius = 400;
    const cx = Math.cos(v) * Math.cos(u);
    const cy = Math.cos(v) * Math.sin(u);
    const cz = Math.sin(v);
    return {
      id: `anchor-${idx}`,
      label: a.label,
      scale: 8,
      fixed: true,
      nodeType: 'anchor',
      initial: [radius * cx, radius * cy, radius * cz],
      color: a.color
    };
  }));

  let links = $state<WordLink[]>([]);
  let ghostPatterns = $state<any[]>([]);

  function generateMockData() {
    console.log("Generating mock data for the 3D graph...");
    const mockWords = [
      "Spirit", "Physics", "Information", "Entropy", "Consciousness", 
      "Quantum", "Thermodynamics", "Neural", "Topology", "Manifold",
      "Emotion", "Resonance", "Dissonance", "Harmony", "Complexity",
      "Life", "Death", "Entropy", "Order", "Chaos",
      "Meaning", "Pattern", "Signal", "Noise", "Frequency"
    ];

    const mockNodes: WordNode[] = [];
    const mockLinks: WordLink[] = [];

    for (let i = 0; i < 60; i++) {
      const word = mockWords[i % mockWords.length] + (i >= mockWords.length ? ` ${Math.floor(i/mockWords.length)}` : "");
      const emotion: Record<string, number> = {};
      const emotionKeys = ['joy', 'sadness', 'anger', 'fear', 'disgust', 'calm', 'focus', 'surprise', 'confusion', 'excitement'];
      
      // Randomly assign some emotions
      if (Math.random() > 0.3) {
        const key = emotionKeys[Math.floor(Math.random() * emotionKeys.length)]!;
        emotion[key] = 0.5 + Math.random() * 0.5;
      }

      mockNodes.push({
        id: `mock-node-${i}`,
        label: word,
        scale: 1.5 + Math.random() * 3,
        color: i % 2 === 0 ? '#6366f1' : '#a855f7',
        emotion: Object.keys(emotion).length > 0 ? emotion : undefined
      });
    }

    // Timeline-like links
    for (let i = 0; i < mockNodes.length - 1; i++) {
      if (Math.random() > 0.2) {
        mockLinks.push({
          source: anchor2d.length + i,
          target: anchor2d.length + i + 1,
          weight: 0.3
        });
      }
    }

    // Emotion links to anchors
    mockNodes.forEach((node, i) => {
      if (node.emotion) {
        anchor2d.forEach((anchor, ai) => {
          const key = anchorToKey[anchor.label];
          if (key && (node.emotion as any)[key] > 0.15) {
            mockLinks.push({
              source: anchor2d.length + i,
              target: ai,
              weight: (node.emotion as any)[key] * 0.8,
              mode: 'tension'
            });
          }
        });
      }
    });

    nodes = [...nodes, ...mockNodes];
    links = mockLinks;
  }

  onMount(async () => {
    try {
      console.log("Loading data for researchers:", RESEARCHER_IDS);
      
      // Use shorter timeout or handle individual failures
      const fetchData = async (id: string) => {
        try {
          const [timeline, vectors, analysis] = await Promise.all([
            timelineClient.getIntegratedTimeline({ participantId: id }),
            timelineClient.getEmotionVectors({ participantId: id }),
            timelineClient.getAnalysis({ participantId: id })
          ]);
          return { timeline, vectors, analysis };
        } catch (err) {
          console.error(`Failed to fetch data for researcher ${id}:`, err);
          return null;
        }
      };

      const results = await Promise.all(RESEARCHER_IDS.map(fetchData));
      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

      console.log(`Successfully loaded data for ${validResults.length} researchers`);

      const allResponses = validResults.map(r => r.timeline);
      const allVectors = validResults.map(r => r.vectors);
      const allAnalysis = validResults.map(r => r.analysis);

      console.log("Responses received:", allResponses.map(r => r?.points?.length || 0));
      console.log("Vectors received:", allVectors.map(v => v?.vectors?.length || 0));

      if (validResults.length === 0) {
        console.warn("No data received for any researcher. Check if gRPC services are running.");
        generateMockData();
        return;
      }

      let mergedWordNodes: WordNode[] = [];
      let mergedLinks: WordLink[] = [];
      let mergedGhostPatterns: any[] = [];

      allResponses.forEach((response, researcherIdx) => {
        if (!response || !response.points) return;
        
        const vectors = allVectors[researcherIdx];
        if (!vectors) return;

        const analysis = allAnalysis[researcherIdx];
        if (analysis && analysis.ghostPatterns) {
          mergedGhostPatterns = [...mergedGhostPatterns, ...analysis.ghostPatterns];
        }

        const researcherOffset = mergedWordNodes.length;
        const wordNodes: WordNode[] = response.points
          .map(p => {
            // Buf messages have getters, spreading doesn't work well
            const word = p.word || (p as any).w || '';
            const reactionValue = p.reactionValue ?? (p as any).rv ?? 0;
            return {
              ...p,
              word,
              reactionValue
            };
          })
          .filter((p): p is any & { word: string } => !!p.word && p.word !== 'Unknown')
          .slice(0, 300) // Higher density for Jun Kawasaki
          .map((d, i) => {
            const word = d.word;
            const vec = vectors.vectors.find(v => v.word === word);
            const emotion: Record<string, number> = {};
            if (vec) {
              const keys = ['joy', 'sadness', 'anger', 'fear', 'disgust', 'calm', 'focus', 'surprise', 'confusion', 'excitement'];
              keys.forEach(key => {
                const val = (vec as any)[key + 'Sum'] || (vec as any)[key] || 0;
                if (val) emotion[key] = Number(val);
              });
            }
            
            const reactionValue = d.reactionValue || 0;
            const emotionSum = Object.values(emotion).reduce((a, b) => a + b, 0);
            const nodeScale = 1.0 + (reactionValue || 0) * 3.5 + (emotionSum * 0.15);

            const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
            const researcherColor = colors[researcherIdx % colors.length];

            return {
              id: `node-${researcherIdx}-${i}`,
              label: word,
              scale: nodeScale,
              color: researcherColor,
              emotion: Object.keys(emotion).length > 0 ? emotion : undefined
            };
          });

        mergedWordNodes = [...mergedWordNodes, ...wordNodes];

        // Timeline links
        for (let i = 0; i < wordNodes.length - 1; i++) {
          mergedLinks.push({ 
            source: anchor2d.length + researcherOffset + i, 
            target: anchor2d.length + researcherOffset + i + 1, 
            weight: 0.5 
          });
        }
        
        // Emotion tension links
        wordNodes.forEach((node, i) => {
          if (node.emotion) {
            anchor2d.forEach((anchor, ai) => {
              const key = anchorToKey[anchor.label];
              if (key && (node.emotion as any)[key] > 0.15) {
                mergedLinks.push({
                  source: anchor2d.length + researcherOffset + i,
                  target: ai,
                  weight: (node.emotion as any)[key] * 0.8,
                  mode: 'tension'
                });
              }
            });
          }
        });
      });

      nodes = [...nodes, ...mergedWordNodes];
      links = mergedLinks;
      ghostPatterns = mergedGhostPatterns;
    } catch (e) {
      console.error("Failed to load landing page data:", e);
    }
  });

  let relScrollHero = $derived(Math.max(0, scrollY - innerHeight));
  let opacity = $derived(Math.max(0, 1 - relScrollHero / (innerHeight * 0.8)));
  let scale = $derived(Math.max(0.8, 1 - relScrollHero / (innerHeight * 2)));
  let blur = $derived(Math.min(20, relScrollHero / 20));
  let yOffset = $derived(relScrollHero * 0.3);

  let containerHeight = $state(600);

  // Helper to resolve routes with current language
  function l(path: string) {
    return i18n.resolveRoute(path, languageTag());
  }

  interface Props {
    mode?: 'full' | 'compact';
  }

  let { mode = 'full' }: Props = $props();
</script>

<svelte:window bind:scrollY bind:innerHeight />

<div class="lp-container" class:compact={mode === 'compact'}>
  <!-- 1. Interactive 3D Force Section -->
  <div class="interactive-graph-section">
    <div class="section-label">Neural Topology Visualization</div>
    <h2 class="interactive-title">Explore the Spirit's Manifold</h2>
    <Force3DWordGraphTypeGPU 
      {nodes} 
      {links} 
      {ghostPatterns}
      width={2000} 
      height={1000} 
      background={graphBg}
      physics={{ 
        repulsionK: 15000, 
        springK: 3.5, 
        damping: 0.95,
        restLength: 100,
        shellRadius: 450
      }}
      showAnalysis={true}
    />
    <div class="interaction-hint">
      Drag to rotate • Scroll to zoom • Interaction Enabled
    </div>
  </div>

  {#if mode === 'full'}
    <!-- 2. Current Hero Section -->
    <div class="hero-visual-section">
      <div class="hero-main-content" style="opacity: {opacity}; transform: translateY({yOffset}px) scale({scale}); filter: blur({blur}px)">
        <h1 class="title">
          <span class="gradient-text">{m.logo()}</span>
        </h1>
        <p class="subtitle">{m.paper_title_full()}</p>
        
        <div class="scroll-indicator" style="opacity: {Math.max(0, 1 - scrollY / 100)}">
          <div class="scroll-link">
            <span>Scroll to Explore Plans</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Plan (Entry Cards) Section -->
    <div id="plan" class="entry-cards-section">
      <div class="section-header">
        <h2 class="section-title">Research Protocols</h2>
        <p class="section-subtitle">Choose your depth of immersion into the thermodynamic information of the Spirit.</p>
      </div>

       <div class="entry-cards">
         <a href={l("/participant/consent?mode=quick")} class="card quick">
           <div class="card-header">
             <span class="card-icon">⚡</span>
             <span class="free-badge">FREE</span>
           </div>
           <div class="card-body">
             <h3>Quick Scan</h3>
             <p>心の「今の温度」を5分で測定。直感的な診断を即座に体験。</p>
             <div class="card-footer">
               <span class="time-badge">5 min</span>
             </div>
           </div>
         </a>
   
         <div class="card full featured">
           <div class="card-header">
             <span class="card-icon">🔬</span>
             <span class="premium-badge">PREMIUM</span>
           </div>
           <div class="card-body">
             <h3>Full Research</h3>
             <p>深層心理の完全な多様体を可視化。専門的な構造分析レポートを提供。</p>
             <div class="card-footer">
               <span class="time-badge">30 min</span>
               <span class="price-tag">$80</span>
             </div>
           </div>
           <div class="subscription-hint">Premium Subscription Required</div>
         </div>
       </div>

      <div class="paper-cta">
        <a href={l("/paper")} class="scroll-link">
          <span>Read Full Scientific Paper</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  .lp-container {
    /* Light mode variables (Default) */
    --lp-bg: #fbfbfd;
    --lp-text: #1d1d1f;
    --lp-subtext: #86868b;
    --lp-card-bg: #fff;
    --lp-card-border: rgba(0, 0, 0, 0.1);
    --lp-badge-bg: rgba(0, 0, 0, 0.05);
    --lp-gradient-start: #fbfbfd;
    --lp-gradient-end: #f5f5f7;

    width: 100%;
    overflow-x: hidden;
    background: var(--lp-bg);
    color: var(--lp-text);
    transition: background-color 0.5s ease, color 0.5s ease;
  }

  .lp-container.compact {
    height: 100%;
    overflow: hidden;
  }

  :global(.dark) .lp-container {
    /* Dark mode variables override */
    --lp-bg: #000;
    --lp-text: #fff;
    --lp-subtext: #a1a1a6;
    --lp-card-bg: rgba(255, 255, 255, 0.03);
    --lp-card-border: rgba(255, 255, 255, 0.08);
    --lp-badge-bg: rgba(255, 255, 255, 0.05);
    --lp-gradient-start: #000;
    --lp-gradient-end: #0a0a0c;
  }

  /* 1. Interactive Graph Section */
  .interactive-graph-section {
    position: relative;
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, rgba(99, 102, 241, 0.12) 0%, #000 80%);
    overflow: hidden;
  }

  .section-label {
    position: absolute;
    top: 4rem;
    font-size: 0.75rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--lp-subtext);
    z-index: 5;
  }

  .interactive-title {
    position: absolute;
    top: 7rem;
    font-size: 2.5rem;
    font-weight: 900;
    color: #fff;
    letter-spacing: -0.04em;
    z-index: 5;
    pointer-events: none;
    text-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
    max-width: 90%;
    line-height: 1.1;
    text-align: center;
  }

  @media (max-width: 768px) {
    .interactive-title {
      font-size: 1.6rem;
      top: 5.5rem;
      max-width: 85%;
    }
    .section-label {
      top: 3.5rem;
      font-size: 0.65rem;
    }
    .interaction-hint {
      bottom: 2.5rem;
      font-size: 0.75rem;
      padding: 0.4rem 1.2rem;
    }
  }

  .interaction-hint {
    position: absolute;
    bottom: 4rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--lp-subtext);
    background: var(--lp-badge-bg);
    padding: 0.5rem 1.5rem;
    border-radius: 100px;
    backdrop-filter: blur(10px);
    z-index: 5;
  }

  /* 2. Hero Visual Section */
  .hero-visual-section {
    position: relative;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    z-index: 10;
  }

  .hero-main-content {
    position: relative;
    z-index: 10;
    text-align: center;
    max-width: 900px;
    padding: 2rem;
  }

  /* 3. Entry Cards Section */
  .entry-cards-section {
    position: relative;
    z-index: 20;
    min-height: 100vh;
    padding: 8rem 2rem;
    background: linear-gradient(to bottom, var(--lp-gradient-start) 0%, var(--lp-gradient-end) 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .section-header {
    text-align: center;
    margin-bottom: 5rem;
  }

  .section-title {
    font-size: 3.5rem;
    font-weight: 900;
    color: var(--lp-text);
    margin-bottom: 1.5rem;
    letter-spacing: -0.04em;
  }

  .section-subtitle {
    font-size: 1.25rem;
    color: var(--lp-subtext);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .title {
    font-size: 6rem;
    font-weight: 900;
    margin-bottom: 1.5rem;
    letter-spacing: -0.05em;
    color: var(--lp-text);
  }

  .gradient-text {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--lp-subtext);
    margin-bottom: 2rem;
    letter-spacing: 0.02em;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

    .entry-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
      margin-bottom: 5rem;
      width: 100%;
      max-width: 900px;
    }

  .paper-cta {
    margin-top: 2rem;
  }

  .card {
    background: var(--lp-card-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--lp-card-border);
    border-radius: 32px;
    padding: 2.5rem;
    text-align: left;
    text-decoration: none;
    color: inherit;
    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-height: 320px;
  }

  .card.featured {
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(99, 102, 241, 0.05);
    transform: translateY(-12px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.05), 0 0 40px rgba(99, 102, 241, 0.05);
  }

  :global(.dark) .card.featured {
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(99, 102, 241, 0.1);
  }

  .card:hover {
    transform: translateY(-16px);
    background: var(--lp-badge-bg);
    border-color: var(--lp-card-border);
    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.08);
  }

  :global(.dark) .card:hover {
    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.4);
  }

  .card-icon {
    font-size: 2.5rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .free-badge {
    background: var(--lp-badge-bg);
    color: var(--lp-subtext);
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    letter-spacing: 0.05em;
    border: 1px solid var(--lp-card-border);
  }

  .premium-badge {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 900;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }

  .subscription-hint {
    margin-top: auto;
    font-size: 0.7rem;
    font-weight: 800;
    color: #f59e0b;
    text-align: center;
    border-top: 1px solid rgba(245, 158, 11, 0.15);
    padding-top: 1rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
  }

  .price-tag {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 1rem;
    font-weight: 800;
    color: var(--lp-text);
  }

  .card-body h3 {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 0.75rem 0;
    color: var(--lp-text);
  }

  .card-body p {
    font-size: 1rem;
    color: var(--lp-subtext);
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  }

  .time-badge {
    background: var(--lp-badge-bg);
    padding: 0.4rem 1rem;
    border-radius: 100px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--lp-text);
  }

  .scroll-indicator {
    margin-top: 4rem;
  }

  .scroll-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: var(--lp-subtext);
    text-decoration: none;
    font-size: 1rem;
    font-weight: 600;
    transition: color 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .scroll-link:hover {
    color: var(--lp-text);
  }

  .scroll-link svg {
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-10px);}
    60% {transform: translateY(-5px);}
  }

  /* 4. Paper Section */
  .paper-section {
    padding: 8rem 0;
    background: var(--lp-bg);
  }

  /* Compact mode overrides */
  .compact .interactive-graph-section {
    height: 100%;
  }

   @media (max-width: 1024px) {
     .title { font-size: 4rem; }
   }

  @media (max-width: 768px) {
    .title { font-size: 3rem; }
    .subtitle { font-size: 1.1rem; }
    .section-title { font-size: 2.5rem; }
    .entry-cards { grid-template-columns: 1fr; }
    .hero-main-content { padding: 1rem; }
    .entry-cards-section { padding: 4rem 1.5rem; }
  }
</style>


