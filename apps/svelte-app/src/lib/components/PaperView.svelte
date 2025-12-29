<script lang="ts">
  // PaperView.svelte - Complete research paper content ported from archive with JSON-LD and KaTeX
  import { onMount } from "svelte";
  import * as m from "$lib/paraglide/messages.js";
  import katex from "katex";
  import "katex/dist/katex.min.css";
  import renderMathInElement from "katex/dist/contrib/auto-render.mjs";

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

  const sections = $derived([
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
  ]);

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

  const authors: Author[] = [
    {
      name: "Jun Kawasaki",
      email: "root@junkawasaki.com",
      affiliation: "Graduate School of Medical and Dental Sciences, Niigata University"
    },
    {
      name: "Kazuki Tainaka",
      affiliation: "Brain Research Institute, Niigata University, Japan"
    },
    {
      name: "Tomonori Takeuchi",
      affiliation: "Department of Biomedicine, Aarhus University, Denmark"
    }
  ];

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "ScholarlyArticle",
    "headline": "Spirit in Physics: Spirit as a Thermodynamic Information Quantity",
    "description": "Defining and measuring Spirit as a thermodynamic information quantity on a high-dimensional manifold.",
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
      <header class="paper-header">
        <h1 class="paper-title">{m.logo()}: Spirit as a Thermodynamic Information Quantity</h1>
        
        <div class="author-grid">
          {#each authors as author}
            <div class="author-item">
              <span class="author-name">{author.name}</span>
              {#if author.email}
                <a href="mailto:{author.email}" class="author-email">{author.email}</a>
              {/if}
              <span class="author-affiliation">{author.affiliation}</span>
            </div>
          {/each}
        </div>

        <div class="paper-metadata">
          <span class="date"><strong>{m.published()}:</strong> 2024-11-30</span>
          <span class="version"><strong>{m.version()}:</strong> 1.0.0</span>
          <span class="schema"><strong>{m.id()}:</strong> research/spirit-in-physics</span>
        </div>
      </header>

      <section id="abstract" class="section abstract-box">
        <h2>{m.abstract()}</h2>
        <p>
          Philosophical accounts often invoke “spirit” as a non-material essence, yet have lacked an operational definition compatible with physics. Here we introduce Spirit as a thermodynamic information quantity defined on a high-dimensional manifold that couples linguistic, behavioural and physiological signals. This paper presents a theoretical framework for Spirit, a model for interpreting its internal structures, and an experimental methodology for its measurement.
        </p>
      </section>

      <section id="introduction" class="section">
        <h2>{m.introduction()}</h2>
        <p>
          The concept of "spirit" has long been central to philosophical and psychological inquiry, yet it has remained largely outside the scope of empirical science due to the absence of a physically grounded, measurable definition. This conceptual gap has hindered our ability to investigate the material basis of what are often considered non-material phenomena. To bridge this gap, we propose a fundamental re-conceptualization of Spirit, moving it from the metaphysical realm to the physical.
        </p>
        <p>
          Our approach is built on a foundational premise established in modern physics: information is physical (Landauer, 1991). The erasure of one bit of information corresponds to a minimal dissipation of energy, a principle that has been experimentally verified (Bérut et al., 2012). If Spirit is fundamentally informational in nature, as we postulate, then it must also be subject to physical laws.
        </p>
        <p>
          In this paper, we define Spirit as a thermodynamic information quantity. Specifically, we model it as a state on a high-dimensional manifold—termed Complex Space—that integrates multiple streams of data: linguistic (word associations), behavioural (reaction times), and physiological (skin potential, emotional expression). We then propose an experimental method to quantify this state and analyze its structure. By operationalizing Spirit in this way, we provide a new framework for investigating the physical underpinnings of consciousness and psychosomatic phenomena.
        </p>
      </section>

      <section id="theory" class="section">
        <h2>{m.theory()}</h2>
        
        <h3>2.1. The Physical Nature of Information</h3>
        <p>
          Our framework rests on the principle that information is a physical quantity, inextricably linked to thermodynamics. Landauer's principle states that any logically irreversible manipulation of information, such as the erasure of a bit, must be accompanied by a corresponding entropy increase in the non-information-bearing degrees of freedom of the information-processing apparatus. This establishes a direct connection between information theory and thermodynamics, which we extend to the concept of Spirit.
        </p>

        <h3>2.2. The Physical Definition of Spirit</h3>
        <p>
          We define Spirit not as a monolithic entity but as a dynamic state within a high-dimensional vector space. This "Spirit Physical Space" is a manifold constructed from informational and biological components.
        </p>
        
        <div class="equation-block">
          <p class="formula">
            &#92;[ S = &#123;V, E, T&#125; &#92;]
          </p>
          <p class="equation-desc">
            Let the state of the Spirit, S, be a point in a space composed of a set of informational vertices V, edges E, and time axis T.
          </p>
        </div>

        <p>
          The energy potential of an edge connecting two informational vertices (w_I, w_O) is defined as the negative logarithm of their association probability, reflecting the information content or "surprise" of their connection:
        </p>

        <div class="equation-block">
          <p class="formula">
            &#92;[ E = -&#92;ln P(w_O | w_I),&#92;; V = &#123;&#92;vec&#123;w_I&#125;, &#92;vec&#123;w_O&#125;, ...&#125;,&#92;; T = &#92;text&#123;time axis&#125; &#92;]
          </p>
        </div>

        <p>
          We can then define Spirit, &#92;psi(S), as a physical field quantity—the functional derivative of the total information energy of the system with respect to its state:
        </p>

        <div class="equation-block">
          <p class="formula">
            &#92;[ &#92;psi(S) = &#92;frac&#123;&#92;delta E(S)&#125;&#123;&#92;delta S&#125; &#92;]
          </p>
        </div>

        <h3>2.3. The Open System Dynamics of Spirit</h3>
        <p>
          The Spirit operates as a thermodynamic open system, constantly exchanging information and energy with its environment. The total entropy change of the system can be expressed as:
        </p>

        <div class="equation-block">
          <p class="formula">
            &#92;[ &#92;frac&#123;dS&#125;&#123;dt&#125; = &#92;frac&#123;dS_&#123;internal&#125;&#125;&#123;dt&#125; + &#92;frac&#123;dS_&#123;exchange&#125;&#125;&#123;dt&#125; &#92;]
          </p>
        </div>
      </section>

      <section id="structural" class="section">
        <h2>{m.structural()}</h2>
        <p>
          While the physical framework allows us to define and measure the Spirit manifold, understanding its internal structure requires an interpretative model. We use the concepts of analytical psychology developed by C.G. Jung as a model to interpret the physical structures we measure.
        </p>

        <div class="definition-grid">
          <div class="definition-card">
            <h4>Complex</h4>
            <p>An individual's personal implementation of an Archetype, acting as an energy-charged node in the informational space.</p>
          </div>
          <div class="definition-card">
            <h4>Archetype</h4>
            <p>A fundamental, structural template residing in the Collective Unconscious.</p>
          </div>
          <div class="definition-card">
            <h4>Shadow</h4>
            <p>The unconscious and often suppressed part of a Complex, a primary source of internal conflict.</p>
          </div>
        </div>

        <h3>Classification of Observed Patterns</h3>
        <p>
          We classify the observed patterns within the Spirit manifold into two primary categories:
        </p>
        
        <div class="pattern-box spirit-type">
          <h4>Spirit Type (Integrated)</h4>
          <p>Stable and integrated structures formed by the harmonious integration of Archetypes.</p>
          <p class="formula-inline">&#92;( SpiritType = Archetype(Gene, Meme, Field) &#92;)</p>
        </div>

        <div class="pattern-box ghost-pattern">
          <h4>Ghost Pattern (Unintegrated)</h4>
          <p>Problematic structures arising from the interference of the Shadow and unintegrated Archetypes.</p>
          <p class="formula-inline">&#92;( GhostPattern = f(Shadow, CollectiveArchetype, Meme, Field) &#92;)</p>
        </div>
      </section>

      <section id="measurement" class="section">
        <h2>{m.measurement()}</h2>
        <p>
          We use a modified version of the Word Association Experiment (Jung, 1910) to probe the structure of an individual's information space. The probability of association is modeled as:
        </p>

        <div class="equation-block large">
          <p class="formula">
            &#92;[ P(w_O | w_I) = &#92;frac&#123;&#92;exp(&#92;vec&#123;w_I&#125; &#92;cdot &#92;vec&#123;w_O&#125;) &#92;cdot [r(w_I, w_O)]^&#123;&#92;alpha&#125; &#92;cdot &#92;exp(&#92;gamma &#92;frac&#123;&#92;Delta SP&#125;&#123;&#92;lambda&#125;) &#92;cdot &#92;exp(&#92;eta F)&#125;&#123;&#92;sum_&#123;j&#125; &#92;exp(&#92;vec&#123;w_I&#125; &#92;cdot &#92;vec&#123;w_j&#125;) &#92;cdot [r(w_I, w_j)]^&#123;&#92;alpha&#125; &#92;cdot &#92;exp(&#92;gamma &#92;frac&#123;&#92;Delta SP&#125;&#123;&#92;lambda&#125;) &#92;cdot &#92;exp(&#92;eta F)&#125; &#92;]
          </p>
        </div>

        <div class="component-list">
          <div class="component-item">
            <strong>Semantic Component (&#92;vec&#123;w_I&#125; &#92;cdot &#92;vec&#123;w_O&#125;):</strong> Cosine similarity between word vectors.
          </div>
          <div class="component-item">
            <strong>Behavioural Component (r(w_I, w_O)):</strong> Inverse of reaction time.
          </div>
          <div class="component-item">
            <strong>Physiological Component (Emotion F, Arousal &#92;Delta SP):</strong> Multi-modal data from Hume AI and SKINPRO.
          </div>
        </div>
      </section>

      <section id="methods" class="section">
        <h2>{m.methods()}</h2>
        <p>
          <strong>Participants:</strong> Healthy adults (n=30) meeting specific inclusion/exclusion criteria.
        </p>
        <p>
          <strong>Equipment:</strong> High-resolution display, SKINPRO (8-channel skin potential), Hume AI Expression Measurement API (face, voice, language).
        </p>
        <p>
          <strong>Data Integration:</strong> Time-series synchronization of stimulus presentation, verbal responses, and physiological/emotional data with a ±2-second matching window.
        </p>
        <p>
          <strong>Analysis Pipeline:</strong> 1024-dimensional complex space vectors reduced via PCA/UMAP for 3D visualization and classification using K-means and Isolation Forest.
        </p>
      </section>

      <section id="results" class="section">
        <h2>{m.results()}</h2>
        <div class="results-overview">
          <div class="result-card highlight">
            <span class="result-label">{m.classification_accuracy()}</span>
            <span class="result-value">82%</span>
            <span class="result-sub">For Spirit Type identification</span>
          </div>
          <div class="result-card">
            <span class="result-label">{m.ghost_patterns_identified()}</span>
            <span class="result-value">14</span>
            <span class="result-sub">Distinct types identified</span>
          </div>
          <div class="result-card">
            <span class="result-label">{m.manifold_dim()}</span>
            <span class="result-value">1024</span>
            <span class="result-sub">Initial feature space</span>
          </div>
        </div>
        
        <div class="results-details grid md:grid-cols-2 gap-8 my-12">
          <div class="results-sub-section p-6 bg-gray-50 rounded-xl">
            <h3 class="mt-0 text-xl">Spirit Type Distribution</h3>
            <p class="text-sm text-gray-600 mb-4">Typical patterns composed of Gene + Meme + Field.</p>
            <ul class="text-sm space-y-2">
              <li class="flex justify-between"><strong>Hero Archetype:</strong> <span>124 responses</span></li>
              <li class="flex justify-between"><strong>Sage Archetype:</strong> <span>98 responses</span></li>
              <li class="flex justify-between"><strong>Lover Archetype:</strong> <span>76 responses</span></li>
              <li class="flex justify-between"><strong>Caregiver Archetype:</strong> <span>45 responses</span></li>
            </ul>
            <div class="mt-4 pt-4 border-t border-gray-200">
              <p class="text-xs italic text-gray-500">Mean distance to archetype: 0.142</p>
            </div>
          </div>

          <div class="results-sub-section p-6 bg-gray-50 rounded-xl">
            <h3 class="mt-0 text-xl">Ghost Pattern Detection</h3>
            <p class="text-sm text-gray-600 mb-4">Hidden patterns primarily composed of Meme + Field.</p>
            <ul class="text-sm space-y-2">
              <li class="flex justify-between"><strong>Individual Shadow:</strong> <span>56 responses</span></li>
              <li class="flex justify-between"><strong>Collective Unconscious Meme:</strong> <span>32 responses</span></li>
            </ul>
            <div class="mt-4 pt-4 border-t border-gray-200">
              <p class="text-xs font-semibold text-gray-700 mb-2">Problematic Indicators:</p>
              <div class="flex flex-wrap gap-2">
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]">High Meme Variance</span>
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]">Pattern Interference</span>
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]">Cognitive Bias</span>
              </div>
            </div>
          </div>
        </div>
        
        <p>
          The experimental results support the viability of our framework. We observed clear differentiation between stable archetypal structures (Spirit Types) and unstable shadow-driven interferences (Ghost Patterns).
        </p>

        <!-- Placeholder for Interactive Visualization -->
        <div class="viz-placeholder">
          <div class="viz-header">
            <h4>Interactive Visualization (Spirit Manifold)</h4>
            <span class="badge">Experimental</span>
          </div>
          <div class="viz-body">
            <p>Visualization components like <code>Force3DWordGraphTypeGPU</code> and <code>TimelineVisualization</code> can be integrated here to show real-time analysis of the spirit manifold.</p>
            <div class="mock-graph">
              <!-- Graph mock visualization here -->
            </div>
          </div>
        </div>
      </section>

      <section id="discussion" class="section">
        <h2>{m.discussion()}</h2>
        <p>
          The successful construction of the high-dimensional manifold from linguistic, behavioural, and physiological data demonstrates the viability of our framework. The distinction between Spirit Types and Ghost Patterns provides a quantitative basis for identifying both healthy, coherent informational structures and problematic, bug-producing ones.
        </p>
        <p>
          Our analysis suggests Ghost Patterns arise from measurable interference between different informational layers, such as conflicts between unconscious patterns (the Shadow) and conscious intentions. This work builds upon Jung's foundational work by embedding it within a modern information-theoretic and thermodynamic framework.
        </p>
        <h3>Comparison with Existing Research</h3>
        <ul class="comparison-list">
          <li><strong>Jung (1910):</strong> We extend qualitative insights into quantitative structural analysis.</li>
          <li><strong>Landauer (1991):</strong> Physical validation of information as a state variable for Spirit.</li>
          <li><strong>Botvinick (1998):</strong> Rubber hand illusion as a manifold boundary transition.</li>
        </ul>
      </section>

      <section id="conclusion" class="section">
        <h2>{m.conclusion()}</h2>
        <p>
          This paper introduces a paradigm shift, moving "spirit" from metaphysical abstraction to concrete, physically measurable quantity. By operationalizing Spirit as a thermodynamic information quantity on a high-dimensional manifold, we have provided a framework that is both theoretically coherent and experimentally verifiable. This work lays the foundation for a new physics of spirit, opening the door to a truly empirical investigation of consciousness and the human condition.
        </p>
      </section>

      <section id="references" class="section">
        <h2>{m.references()}</h2>
        <ul class="ref-list">
          {#each references as ref (ref.id)}
            <li id={ref.id}>
              <span class="ref-text">{ref.citation}</span>
              {#if ref.doi}
                <a href="https://doi.org/{ref.doi}" class="ref-doi" target="_blank" rel="noopener noreferrer">DOI: {ref.doi}</a>
              {/if}
            </li>
          {/each}
        </ul>
      </section>

      <section class="section addendum">
        <h3>Additional Research: High-IQ Japanese GWAS</h3>
        <p>
          Leveraging Japan's unique genetics, a GWAS targeting individuals with IQ ≥140 will compare genetic and cognitive data to identify SNPs linked to intelligence. The study begins in 2024 with results slated for publication.
        </p>
        <div class="dataset-info">
          <strong>Dataset:</strong> 92 people / CAMS IQ140 sd15 - IQ180t / SNPs.
        </div>
        <p class="ref-text text-sm mt-4">
          <strong>ref:</strong> Jonathan R. I. Coleman et al, Mol Psychiatry 24, 182-197 (2019)
        </p>
      </section>
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
