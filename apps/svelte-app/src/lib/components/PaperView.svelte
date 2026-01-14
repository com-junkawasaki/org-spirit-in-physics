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

  :global(.dark) :global(body) {
    background-color: #000;
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

  :global(.dark) .toc-inner {
    background: #121214;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
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

  :global(.dark) .toc-sidebar a {
    color: #e5e5e7;
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
    padding: 6rem 8rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    color: #1d1d1f;
    line-height: 1.6;
    max-width: 900px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif;
    position: relative;
    box-sizing: border-box;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  :global(.dark) .paper-article {
    background: #1c1c1e;
    color: #e5e5e7;
    box-shadow: 0 10px 60px rgba(0, 0, 0, 0.4);
  }

  /* Academic Typography */
  :global(.paper-article h1) {
    font-size: 3.5rem;
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 4rem;
    text-align: left;
    color: #000;
    letter-spacing: -0.04em;
  }

  :global(.dark .paper-article h1) {
    color: #fff;
  }

  :global(.paper-article h2) {
    font-size: 2rem;
    font-weight: 800;
    margin-top: 5rem;
    margin-bottom: 1.5rem;
    color: #000;
    letter-spacing: -0.02em;
  }

  :global(.dark .paper-article h2) {
    color: #fff;
  }

  :global(.paper-article h3) {
    font-size: 1.4rem;
    font-weight: 700;
    margin-top: 3rem;
    margin-bottom: 1rem;
    color: #1d1d1f;
  }

  :global(.dark .paper-article h3) {
    color: #fff;
  }

  :global(.paper-article p) {
    margin-bottom: 1.5rem;
    font-size: 1.15rem;
    line-height: 1.6;
    color: #3a3a3c;
  }

  :global(.dark .paper-article p) {
    color: #d1d1d6;
  }

  :global(.paper-article strong) {
    font-weight: 600;
    color: #000;
  }

  :global(.dark .paper-article strong) {
    color: #fff;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .paper-container {
      display: block; /* Switch from grid to block to prevent layout shift */
      width: 100%;
      overflow-x: hidden;
      padding: 0;
      padding-bottom: 120px;
    }
    .toc-sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: 280px;
      transform: translateX(-100%);
      background: white;
      z-index: 2000;
      height: 100dvh;
      box-shadow: 20px 0 50px rgba(0,0,0,0.1);
      visibility: hidden; /* Hide completely when closed */
    }
    :global(.dark) .toc-sidebar {
      background: #1c1c1e;
    }
    .toc-sidebar.open {
      transform: translateX(0);
      visibility: visible;
    }
    .toc-overlay {
      display: block;
      z-index: 1900;
    }
    .toc-trigger {
      display: flex;
      position: fixed;
      top: auto;
      bottom: 100px;
      right: 1.5rem;
      background: #007aff;
      color: #fff;
      padding: 0.8rem 1.5rem;
      border-radius: 100px;
      box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
      font-size: 0.9rem;
      font-weight: 800;
      z-index: 1500;
    }
    .close-toc {
      display: block;
    }
    .paper-article {
      padding: 2.5rem 1.25rem;
      border-radius: 0;
      box-shadow: none;
      background: transparent;
      width: 100%;
      max-width: 100vw;
      margin: 0;
      box-sizing: border-box;
    }
    :global(.paper-article h1) {
      font-size: 2rem;
      margin-bottom: 2rem;
      text-align: left;
      line-height: 1.1;
      width: 100%;
    }
    :global(.paper-article h2) {
      font-size: 1.5rem;
      margin-top: 3rem;
      margin-bottom: 1.2rem;
    }
    :global(.paper-article p) {
      font-size: 1.05rem;
      line-height: 1.6;
      margin-bottom: 1.2rem;
      width: 100%;
    }
  }
</style>
