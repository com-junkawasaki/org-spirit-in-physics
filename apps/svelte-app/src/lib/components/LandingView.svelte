<script lang="ts">
  import Force3DWordGraphTypeGPU from "./researcher/Force3DWordGraphTypeGPU.svelte";
  import type { WordNode, WordLink } from "./researcher/types";
  import * as m from "$lib/paraglide/messages.js";
  import { i18n } from "$lib/i18n";
  import { languageTag } from "$lib/paraglide/runtime.js";

  // Dummy data for the beautiful LP graph
  const nodes: WordNode[] = [
    { id: 'a1', label: 'Hero / 英雄', scale: 1.5, nodeType: 'anchor', color: '#ff3b30', initial: [200, 0, 0] },
    { id: 'a2', label: 'Sage / 賢者', scale: 1.5, nodeType: 'anchor', color: '#007aff', initial: [-200, 0, 0] },
    { id: 'a3', label: 'Lover / 恋人', scale: 1.5, nodeType: 'anchor', color: '#ff2d55', initial: [0, 200, 0] },
    { id: 'a4', label: 'Caregiver / 介護者', scale: 1.5, nodeType: 'anchor', color: '#34c759', initial: [0, -200, 0] },
    { id: 'a5', label: 'Shadow / 影', scale: 1.5, nodeType: 'anchor', color: '#5856d6', initial: [0, 0, 200] },
    { id: 'n1', label: 'Spirit', scale: 1.2, nodeType: 'word' },
    { id: 'n2', label: 'Physics', scale: 1.1, nodeType: 'word' },
    { id: 'n3', label: 'Soul', scale: 1.0, nodeType: 'word' },
    { id: 'n4', label: 'Energy', scale: 1.0, nodeType: 'word' },
    { id: 'n5', label: 'Information', scale: 1.0, nodeType: 'word' },
    { id: 'n6', label: 'Entropy', scale: 1.0, nodeType: 'word' },
    { id: 'n7', label: 'Connection', scale: 1.0, nodeType: 'word' },
    { id: 'n8', label: 'Jung', scale: 1.1, nodeType: 'word' },
    { id: 'n9', label: 'Complex', scale: 1.0, nodeType: 'word' },
    { id: 'n10', label: 'Archetype', scale: 1.2, nodeType: 'word' },
  ];

  const links: WordLink[] = [
    { source: 5, target: 0, weight: 0.8 },
    { source: 6, target: 1, weight: 0.7 },
    { source: 7, target: 2, weight: 0.6 },
    { source: 8, target: 3, weight: 0.5 },
    { source: 9, target: 4, weight: 0.9 },
    { source: 10, target: 5, weight: 0.4 },
    { source: 11, target: 6, weight: 0.3 },
    { source: 12, target: 7, weight: 0.8 },
    { source: 13, target: 8, weight: 0.5 },
    { source: 14, target: 9, weight: 0.7 },
    { source: 5, target: 6, weight: 0.2 },
    { source: 7, target: 8, weight: 0.2 },
    { source: 9, target: 14, weight: 0.2 },
  ];

  let containerHeight = $state(600);

  // Helper to resolve routes with current language
  function l(path: string) {
    return i18n.resolveRoute(path, languageTag());
  }
</script>

<div class="lp-container">
  <div class="hero-section">
    <div class="graph-background">
      <Force3DWordGraphTypeGPU 
        {nodes} 
        {links} 
        width={2000} 
        height={800} 
        background="transparent"
        physics={{ repulsionK: 5000, springK: 1.5 }}
      />
    </div>

    <div class="hero-content">
      <h1 class="title">
        <span class="gradient-text">{m.logo()}</span>
      </h1>
      <p class="subtitle">{m.paper_title_full()}</p>
      
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

      <div class="scroll-indicator">
        <a href="#paper" class="scroll-link">
          <span>Read Paper</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </a>
      </div>
    </div>
  </div>

  <section id="paper" class="paper-section">
    <slot />
  </section>
</div>

<style>
  .lp-container {
    width: 100%;
    overflow-x: hidden;
  }

  .hero-section {
    position: relative;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    color: #fff;
    overflow: hidden;
  }

  .graph-background {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.6;
    pointer-events: none;
    z-index: 1;
  }

  .hero-content {
    position: relative;
    z-index: 10;
    text-align: center;
    max-width: 900px;
    padding: 2rem;
  }

  .title {
    font-size: 5rem;
    font-weight: 900;
    margin-bottom: 1rem;
    letter-spacing: -0.04em;
  }

  .gradient-text {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 1.5rem;
    font-weight: 500;
    color: #a1a1a6;
    margin-bottom: 4rem;
    letter-spacing: 0.02em;
  }

  .entry-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 4rem;
    width: 100%;
  }

  .card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 1.5rem;
    text-align: left;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 280px;
  }

  .card.featured {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(99, 102, 241, 0.08);
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2);
  }

  .card:hover {
    transform: translateY(-12px);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .card-icon {
    font-size: 2rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .free-badge {
    background: rgba(255, 255, 255, 0.1);
    color: #a1a1a6;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .premium-badge {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 900;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .expert-badge {
    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 900;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .subscription-hint {
    margin-top: auto;
    font-size: 0.65rem;
    font-weight: 800;
    color: #f59e0b;
    text-align: center;
    border-top: 1px solid rgba(245, 158, 11, 0.2);
    padding-top: 0.75rem;
    letter-spacing: 0.05em;
  }

  .card.professional .subscription-hint {
    color: #a855f7;
    border-top-color: rgba(168, 85, 247, 0.2);
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
    font-size: 0.85rem;
    font-weight: 800;
  }

  .card-body h3 {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
  }

  .card-body p {
    font-size: 0.9rem;
    color: #a1a1a6;
    margin: 0 0 1rem 0;
  }

  .time-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .scroll-indicator {
    margin-top: 2rem;
  }

  .scroll-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #86868b;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    transition: color 0.2s;
  }

  .scroll-link:hover {
    color: #fff;
  }

  .scroll-link svg {
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-10px);}
    60% {transform: translateY(-5px);}
  }

  .paper-section {
    padding-top: 4rem;
    background: #f5f5f7;
  }

  :global(.dark) .paper-section {
    background: #000;
  }

  @media (max-width: 768px) {
    .title { font-size: 3rem; }
    .subtitle { font-size: 1.1rem; }
    .entry-cards { grid-template-columns: 1fr; }
    .hero-content { padding: 1rem; }
  }
</style>


