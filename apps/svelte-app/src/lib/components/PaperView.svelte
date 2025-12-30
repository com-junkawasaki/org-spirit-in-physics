<script lang="ts">
  // PaperView.svelte - Complete research paper content ported from archive with JSON-LD and KaTeX
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import * as m from "$lib/paraglide/messages.js";
  import { languageTag } from "$lib/paraglide/runtime.js";
  import katex from "katex";
  import "katex/dist/katex.min.css";
  import renderMathInElement from "katex/dist/contrib/auto-render.mjs";
  import PaperContent from "./PaperContent.md";

  interface Section {
    id: string;
    title: string;
    level: number;
  }

  interface Author {
    name: string;
    email?: string;
    affiliation: string;
  }

  interface Reference {
    id: string;
    citation: string;
    doi: string | null;
  }

  const sections = $derived.by(() => {
    // Depend on page.url.pathname to ensure re-calculation on language change
    const _path = page.url.pathname;
    const lang = languageTag();
    console.log("[PaperView] Re-calculating sections for lang:", lang);
    return [
      { id: 'abstract', title: m.abstract(), level: 1 },
      { id: 'introduction', title: m.introduction(), level: 1 },
      { id: 'theory', title: m.theory(), level: 1 },
      { id: 'structural', title: m.structural(), level: 1 },
      { id: 'measurement', title: m.measurement(), level: 1 },
      { id: 'methods', title: m.methods(), level: 1 },
      { id: 'results', title: m.results(), level: 1 },
      { id: 'discussion', title: m.discussion(), level: 1 },
      { id: 'conclusion', title: m.conclusion(), level: 1 },
      { id: 'references', title: m.references(), level: 1 }
    ];
  });

  const references: Reference[] = [
    {
      id: 'landauer-1991',
      citation: 'Landauer, R. (1991). Information is physical. Physics Today, 44(5), 23–29.',
      doi: '10.1063/1.881299',
    },
    {
      id: 'berut-2012',
      citation: 'Bérut, A., Arakelyan, A., Petrosyan, A., Ciliberto, S., Dillenschneider, R., & Lutz, E. (2012). Experimental verification of Landauer\'s principle linking information and thermodynamics. Nature, 483(7388), 187–189.',
      doi: '10.1038/nature10872',
    },
    {
      id: 'botvinick-1998',
      citation: 'Botvinick, M., & Cohen, J. (1998). Rubber-hand illusion. Nature, 391, 756.',
      doi: '10.1038/35784',
    },
    {
      id: 'toyabe-2010',
      citation: 'Toyabe, S., Sagawa, T., Ueda, M., Muneyuki, E., & Sano, M. (2010). Experimental demonstration of information-to-energy conversion and validation of the generalized Jarzynski equality. Nature Physics, 6, 988–992.',
      doi: '10.1038/nphys1821',
    },
    {
      id: 'jung-1910',
      citation: 'Jung, C. G. (1910). The association method. American Journal of Psychology, 21(2), 219–269.',
      doi: null,
    },
  ];

  const authors = $derived.by(() => {
    const _path = page.url.pathname;
    return [
      {
        name: "Jun Kawasaki",
        email: "root@junkawasaki.com",
        affiliation: m.affiliation_niigata_med()
      },
      {
        name: "Kazuki Tainaka",
        affiliation: m.affiliation_niigata_brain()
      },
      {
        name: "Tomonori Takeuchi",
        affiliation: m.affiliation_aarhus()
      }
    ];
  });

  const jsonLd = $derived.by(() => {
    const _path = page.url.pathname;
    return {
      "@context": "https://schema.org/",
      "@type": "ScholarlyArticle",
      "headline": m.paper_title_full(),
      "description": m.abstract_text(),
      "datePublished": "2024-11-30",
      "author": authors.map(a => ({
        "@type": "Person",
        "name": a.name,
        "email": a.email,
        "affiliation": {
          "@type": "Organization",
          "name": a.affiliation
        }
      })),
      "publisher": {
        "@type": "Organization",
        "name": "Spirit in Physics Research Group"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://spirit-in-physics.gftd.ai/research/spirit-in-physics"
      }
    };
  });

  let activeSection = $state('abstract');
  let isTocOpen = $state(false);

  function toggleToc() {
    isTocOpen = !isTocOpen;
  }

  onMount(() => {
    // Render LaTeX
    const paperArticle = document.querySelector('.paper-article');
    if (paperArticle) {
      renderMathInElement(paperArticle as HTMLElement, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }

    const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry: IntersectionObserverEntry) => {
        if (entry.isIntersecting) {
          activeSection = entry.target.id;
        }
      });
    }, { threshold: 0.2 });

    sections.forEach((section: { id: string; title: string; level: number }) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  });
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<div class="paper-container">
  <!-- TOC Trigger Button (Mobile/iPad) -->
  <button class="toc-trigger" onclick={toggleToc} aria-label="Toggle Table of Contents">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
    <span>{m.toc()}</span>
  </button>

  {#if isTocOpen}
    <div class="toc-overlay" onclick={toggleToc} onkeydown={(e) => { if (e.key === 'Escape') toggleToc(); }} role="button" tabindex="0"></div>
  {/if}

  <nav class="toc-sidebar" class:open={isTocOpen}>
    <div class="toc-inner">
      <div class="toc-header">
        <h3 class="toc-title">{m.table_of_contents()}</h3>
        <button class="close-toc" onclick={toggleToc}>&times;</button>
      </div>
      <ul>
        {#each sections as section (section.id)}
          <li>
            <a 
              href="#{section.id}" 
              class:active={activeSection === section.id}
              onclick={() => { isTocOpen = false; }}
            >
              {section.title}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </nav>

  <main class="paper-content">
    <article class="paper-article">
      <PaperContent />
    </article>
  </main>
</div>

<style>
  :global(body) {
    background-color: #f5f5f7;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .addendum {
    background: #fbfbfd;
    padding: 3rem;
    border-radius: 20px;
    border: 1px solid #f0f0f2;
    margin-top: 4rem;
  }

  .dataset-info {
    font-size: 1rem;
    color: #86868b;
    margin-top: 1rem;
  }

  .paper-container {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    position: relative;
  }

  /* TOC Sidebar */
  .toc-sidebar {
    position: sticky;
    top: 2rem;
    height: calc(100vh - 4rem);
    overflow-y: auto;
    z-index: 100;
    transition: transform 0.3s ease-in-out;
  }

  .toc-inner {
    background: white;
    padding: 2rem;
    border-radius: 20px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .toc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .toc-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #86868b;
    margin: 0;
  }

  .close-toc {
    display: none;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #86868b;
  }

  .toc-sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc-sidebar li {
    margin-bottom: 0.5rem;
  }

  .toc-sidebar a {
    text-decoration: none;
    color: #1d1d1f;
    font-size: 0.95rem;
    padding: 0.6rem 1rem;
    border-radius: 10px;
    display: block;
    transition: all 0.2s;
    font-weight: 500;
  }

  .toc-sidebar a:hover {
    background: rgba(0, 122, 255, 0.05);
    color: #007aff;
    transform: translateX(4px);
  }

  .toc-sidebar a.active {
    background: #007aff;
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
  }

  /* TOC Trigger (Mobile) */
  .toc-trigger {
    display: none;
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: #007aff;
    color: white;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 30px;
    box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
    z-index: 1000;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    cursor: pointer;
  }

  .toc-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    z-index: 90;
  }

  /* Main Paper */
  .paper-content {
    min-width: 0;
  }

  .paper-article {
    background: white;
    padding: 5rem 7rem;
    border-radius: 30px;
    box-shadow: 0 10px 60px rgba(0, 0, 0, 0.03);
    color: #1d1d1f;
    line-height: 1.8;
    max-width: 900px;
  }

  .paper-header {
    text-align: left;
    margin-bottom: 6rem;
  }

  .paper-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin-bottom: 4rem;
    color: #000;
  }

  .author-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2.5rem;
    margin-bottom: 4rem;
  }

  .author-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .author-name {
    font-weight: 700;
    font-size: 1.15rem;
    color: #000;
  }

  .author-email {
    font-size: 0.95rem;
    color: #007aff;
    text-decoration: none;
    margin-top: 0.25rem;
  }

  .author-affiliation {
    font-size: 0.85rem;
    color: #86868b;
    margin-top: 0.5rem;
    text-align: left;
    line-height: 1.5;
  }

  .paper-metadata {
    border-top: 1px solid #f5f5f7;
    padding-top: 2.5rem;
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 3rem;
    color: #86868b;
    font-size: 0.9rem;
  }

  /* Sections */
  .section {
    margin-bottom: 7rem;
    scroll-margin-top: 3rem;
  }

  h2 {
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 2rem;
    color: #000;
    border-bottom: 1px solid #f5f5f7;
    padding-bottom: 1rem;
    letter-spacing: -0.01em;
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 3.5rem;
    margin-bottom: 1.25rem;
    color: #1d1d1f;
  }

  p {
    margin-bottom: 1.5rem;
    font-size: 1.15rem;
    color: #3a3a3c;
    font-weight: 400;
    line-height: 1.8;
    text-align: left;
  }

  .abstract-box {
    background: #f8f8f9;
    padding: 3rem;
    border-radius: 20px;
    font-style: normal;
    border-left: 4px solid #007aff;
    margin-bottom: 5rem;
  }

  .abstract-box p {
    font-size: 1.2rem;
    color: #1d1d1f;
    line-height: 1.7;
  }

  .abstract-box h2 {
    border: none;
    padding: 0;
    font-size: 2rem;
    margin-bottom: 2rem;
  }

  /* Equations */
  .equation-block {
    margin: 4rem 0;
    padding: 3rem;
    background: #fcfcfd;
    border-radius: 20px;
    text-align: center;
    border: 1px solid #f0f0f2;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.01);
  }

  .formula {
    font-size: 1.75rem;
    margin-bottom: 1.25rem !important;
    color: #000;
  }

  .equation-desc {
    font-size: 1rem;
    color: #86868b;
    margin: 0;
  }

  /* Structural definitions */
  .definition-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin: 4rem 0;
  }

  .definition-card {
    background: white;
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid #f0f0f2;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    transition: transform 0.2s;
  }

  .definition-card:hover {
    transform: translateY(-4px);
  }

  .definition-card h4 {
    margin: 0 0 1rem 0;
    color: #007aff;
    font-weight: 700;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .definition-card p {
    font-size: 1.05rem;
    margin: 0;
    line-height: 1.6;
    color: #1d1d1f;
  }

  .pattern-box {
    margin: 2rem 0;
    padding: 2.5rem;
    border-radius: 20px;
  }

  .spirit-type {
    background: rgba(0, 122, 255, 0.04);
    border: 1px solid rgba(0, 122, 255, 0.08);
  }

  .spirit-type h4 { color: #007aff; margin: 0 0 0.75rem 0; font-size: 1.2rem; font-weight: 700; }

  .ghost-pattern {
    background: rgba(255, 59, 48, 0.04);
    border: 1px solid rgba(255, 59, 48, 0.08);
  }

  .ghost-pattern h4 { color: #ff3b30; margin: 0 0 0.75rem 0; font-size: 1.2rem; font-weight: 700; }

  .formula-inline {
    font-family: serif;
    font-size: 1.4rem;
    margin-top: 1.5rem;
    font-weight: 600;
    color: #000;
  }

  /* Results */
  .results-overview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.5rem;
    margin: 4rem 0;
  }

  .result-card {
    background: #fbfbfd;
    padding: 3rem 2rem;
    border-radius: 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    border: 1px solid #f0f0f2;
    transition: all 0.3s;
  }

  .result-card:hover {
    box-shadow: 0 8px 30px rgba(0,0,0,0.05);
  }

  .result-card.highlight {
    background: #000;
    color: white;
    border: none;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }

  .result-label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 1.25rem;
    opacity: 0.7;
    font-weight: 600;
  }

  .result-value {
    font-size: 4.5rem;
    font-weight: 800;
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
  }

  .result-card.highlight .result-value {
    color: #007aff;
  }

  .result-sub {
    font-size: 1.05rem;
    opacity: 0.8;
  }

  /* Viz Placeholder */
  .viz-placeholder {
    margin: 5rem 0;
    border: 2px dashed #e5e5e7;
    border-radius: 30px;
    padding: 4rem;
    text-align: center;
    background: #fafafa;
  }

  .viz-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .viz-header h4 { margin: 0; font-size: 1.5rem; font-weight: 700; }

  .badge {
    background: #e5e5e7;
    color: #86868b;
    padding: 0.3rem 0.8rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* References */
  .ref-list {
    list-style: none;
    padding: 0;
  }

  .ref-list li {
    margin-bottom: 2.5rem;
    padding-left: 2.5rem;
    text-indent: -2.5rem;
    line-height: 1.6;
  }

  .ref-text {
    font-size: 1.15rem;
    color: #424245;
  }

  .ref-doi {
    display: block;
    font-size: 0.95rem;
    color: #007aff;
    text-decoration: none;
    margin-top: 0.5rem;
    margin-left: 2.5rem;
  }

  .comparison-list {
    list-style: none;
    padding: 0;
    margin: 2rem 0;
  }

  .comparison-list li {
    margin-bottom: 1rem;
    font-size: 1.15rem;
    padding-left: 1.5rem;
    position: relative;
  }

  .comparison-list li::before {
    content: "•";
    color: #007aff;
    font-weight: bold;
    position: absolute;
    left: 0;
  }

  /* Responsive */
  @media (max-width: 1400px) {
    .paper-article { padding: 4rem 5rem; }
  }

  @media (max-width: 1200px) {
    .paper-container { grid-template-columns: 280px 1fr; }
    .paper-article { padding: 4rem; }
    .paper-title { font-size: 3.25rem; }
    .author-grid { gap: 1.5rem; }
  }

  @media (max-width: 1024px) {
    .paper-container {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
    .toc-sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: 320px;
      transform: translateX(-100%);
      background: white;
      z-index: 1000;
    }
    .toc-sidebar.open {
      transform: translateX(0);
    }
    .toc-overlay {
      display: block;
    }
    .toc-trigger {
      display: flex;
    }
    .close-toc {
      display: block;
    }
    .paper-article {
      padding: 3rem 2rem;
      border-radius: 20px;
    }
    .paper-title { font-size: 2.75rem; }
    .author-grid { grid-template-columns: 1fr; gap: 2rem; }
  }

  @media (max-width: 768px) {
    .definition-grid, .results-overview {
      grid-template-columns: 1fr;
    }
    .paper-title { font-size: 2.25rem; }
    .paper-metadata { flex-direction: column; gap: 1rem; align-items: center; }
    .abstract-box { padding: 2.5rem; }
  }
</style>
