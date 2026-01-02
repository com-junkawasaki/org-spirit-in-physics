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

  let isDark = $derived(
    theme.current === 'dark' || 
    (theme.current === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  let graphBg = $derived(isDark ? 'transparent' : '#fbfbfd');

  // Default participant for landing page data visualization
  const LANDING_PARTICIPANT_ID = "144b325f-5966-4d59-a629-f2ca421388cc";

  let nodes = $state<WordNode[]>([
    { id: 'a1', label: 'Hero / 英雄', scale: 2.5, nodeType: 'anchor', color: '#ff3b30', initial: [300, 0, 0] },
    { id: 'a2', label: 'Sage / 賢者', scale: 2.5, nodeType: 'anchor', color: '#007aff', initial: [-300, 0, 0] },
    { id: 'a3', label: 'Lover / 恋人', scale: 2.5, nodeType: 'anchor', color: '#ff2d55', initial: [0, 300, 0] },
    { id: 'a4', label: 'Caregiver / 介護者', scale: 2.5, nodeType: 'anchor', color: '#34c759', initial: [0, -300, 0] },
    { id: 'a5', label: 'Shadow / 影', scale: 2.5, nodeType: 'anchor', color: '#5856d6', initial: [0, 0, 300] },
    { id: 'n1', label: 'Spirit', scale: 1.5, nodeType: 'word', initial: [100, 100, 100] },
    { id: 'n2', label: 'Physics', scale: 1.5, nodeType: 'word', initial: [-100, -100, -100] },
  ]);

  let links = $state<WordLink[]>([
    { source: 5, target: 0, weight: 0.5 },
    { source: 6, target: 1, weight: 0.5 },
  ]);

  const anchor2d = [
    { name: 'Joy', x: 0.15, y: 0.85, color: '#f59e0b' },
    { name: 'Sadness', x: 0.70, y: 0.45, color: '#1f2937' },
    { name: 'Anger', x: 0.82, y: 0.25, color: '#ef4444' },
    { name: 'Fear', x: 0.92, y: 0.10, color: '#a78bfa' },
    { name: 'Disgust', x: 0.78, y: 0.52, color: '#10b981' },
    { name: 'Calmness', x: 0.28, y: 0.70, color: '#93c5fd' },
    { name: 'Interest', x: 0.35, y: 0.55, color: '#60a5fa' },
    { name: 'Surprise', x: 0.40, y: 0.20, color: '#22c55e' },
    { name: 'Confusion', x: 0.48, y: 0.35, color: '#64748b' },
    { name: 'Determination', x: 0.22, y: 0.85, color: '#f97316' },
  ];

  const anchorToKey: Record<string, string> = {
    Joy: 'joy', Sadness: 'sadness', Anger: 'anger', Fear: 'fear', Disgust: 'disgust',
    Calmness: 'calm', Interest: 'focus', Surprise: 'surprise', Confusion: 'confusion', Determination: 'excitement',
  };

  function toSphereLocal(x01: number, y01: number, radius: number): [number, number, number] {
    const u = (x01 - 0.5) * Math.PI * 1.6;
    const v = (y01 - 0.5) * Math.PI;
    const cx = Math.cos(v) * Math.cos(u);
    const cy = Math.cos(v) * Math.sin(u);
    const cz = Math.sin(v);
    return [radius * cx, radius * cy, radius * cz];
  }

  onMount(async () => {
    try {
      const response = await timelineClient.getIntegratedTimeline({ 
        participantId: LANDING_PARTICIPANT_ID 
      });
      const vectors = await timelineClient.getEmotionVectors({ 
        participantId: LANDING_PARTICIPANT_ID 
      });

      if (response && response.points) {
        const shellRadius = 300;
        const anchorNodes: WordNode[] = anchor2d.map((a, idx) => {
          const [x, y, z] = toSphereLocal(a.x, a.y, shellRadius);
          return {
            id: `anchor-${idx}`,
            label: a.name,
            scale: 6,
            fixed: true,
            nodeType: 'anchor',
            initial: [x, y, z],
            color: a.color
          };
        });

        const wordNodes: WordNode[] = response.points
          .filter((p): p is typeof p & { word: string } => !!p.word && p.word !== 'Unknown')
          .slice(0, 60) // Slightly more nodes for richness
          .map((d, i) => {
            const vec = vectors.vectors.find(v => v.word === d.word);
            const emotion: Record<string, number> = {};
            if (vec) {
              const keys = ['joy', 'sadness', 'anger', 'fear', 'disgust', 'calm', 'focus', 'surprise', 'confusion', 'excitement'];
              keys.forEach(key => {
                const val = (vec as any)[key + 'Sum'];
                if (val) emotion[key] = Number(val);
              });
            }
            
            // Richer scaling based on reaction value and emotion intensity
            const emotionSum = Object.values(emotion).reduce((a, b) => a + b, 0);
            const nodeScale = 0.8 + (d.reactionValue || 0) * 2.5 + (emotionSum * 0.1);

            return {
              id: `node-${i}`,
              label: d.word,
              scale: nodeScale,
              color: '#6366f1', // Matches the gradient start
              emotion: Object.keys(emotion).length > 0 ? emotion : undefined
            };
          });

        nodes = [...anchorNodes, ...wordNodes];
        
        const newLinks: WordLink[] = [];
        for (let i = 0; i < wordNodes.length - 1; i++) {
          newLinks.push({ source: anchorNodes.length + i, target: anchorNodes.length + i + 1, weight: 0.5 });
        }
        
        wordNodes.forEach((node, i) => {
          if (node.emotion) {
            anchorNodes.forEach((anchor, ai) => {
              const key = anchorToKey[anchor.label];
              if (key && (node.emotion as any)[key] > 0.1) {
                newLinks.push({
                  source: anchorNodes.length + i,
                  target: ai,
                  weight: (node.emotion as any)[key] * 0.8,
                  mode: 'tension'
                });
              }
            });
          }
        });
        links = newLinks;
      }
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
</script>

<svelte:window bind:scrollY bind:innerHeight />

<div class="lp-container">
  <!-- 1. Interactive 3D Force Section -->
  <div class="interactive-graph-section">
    <div class="section-label">Neural Topology Visualization</div>
    <h2 class="interactive-title">Explore the Soul's Manifold</h2>
    <Force3DWordGraphTypeGPU 
      {nodes} 
      {links} 
      width={2000} 
      height={1000} 
      background={graphBg}
      physics={{ repulsionK: 12000, springK: 2.5, damping: 0.96 }}
    />
    <div class="interaction-hint">
      Drag to rotate • Scroll to zoom • Interaction Enabled
    </div>
  </div>

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
      <p class="section-subtitle">Choose your depth of immersion into the thermodynamic information of the soul.</p>
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

      <div class="card professional">
        <div class="card-header">
          <span class="card-icon">💎</span>
          <span class="expert-badge">EXPERT</span>
        </div>
        <div class="card-body">
          <h3>Professional</h3>
          <p>専門家による1on1深層分析。無意識のバグを特定し、変容を支援。</p>
          <div class="card-footer">
            <span class="time-badge">60 min+</span>
            <span class="price-tag">$250</span>
          </div>
        </div>
        <div class="subscription-hint">Clerk Subscription Required</div>
      </div>
    </div>

    <div class="paper-cta">
      <a href="#paper" class="scroll-link">
        <span>Read Full Scientific Paper</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </a>
    </div>
  </div>

  <!-- 4. Paper Section -->
  <section id="paper" class="paper-section">
    <slot />
  </section>
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
    background: radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
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
    top: 6rem;
    font-size: 2rem;
    font-weight: 900;
    color: var(--lp-text);
    letter-spacing: -0.02em;
    z-index: 5;
    pointer-events: none;
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
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-bottom: 5rem;
    width: 100%;
    max-width: 1200px;
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

  .expert-badge {
    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
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

  .card.professional .subscription-hint {
    color: #a855f7;
    border-top-color: rgba(168, 85, 247, 0.15);
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

  @media (max-width: 1024px) {
    .entry-cards { grid-template-columns: repeat(2, 1fr); }
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


