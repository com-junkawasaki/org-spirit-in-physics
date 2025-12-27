<script lang="ts">
  // PaperView.svelte - Completely ported research paper content with JSON-LD
  import { onMount } from "svelte";

  const sections = [
    { id: 'abstract', title: 'Abstract' },
    { id: 'introduction', title: '1. Introduction' },
    { id: 'theory', title: '2. Theoretical Framework' },
    { id: 'structural', title: '3. Structural Interpretation' },
    { id: 'measurement', title: '4. Measurement Methodology' },
    { id: 'methods', title: '5. Methods' },
    { id: 'results', title: '6. Results' },
    { id: 'discussion', title: '7. Discussion' },
    { id: 'conclusion', title: 'Conclusion' },
    { id: 'references', title: 'References' }
  ];

  const jsonLd = {
    "@context": {
      "@version": 1.1,
      "@vocab": "http://spirit.localhost/research#",
      "id": "@id",
      "type": "@type",
      "dct": "http://purl.org/dc/terms/",
      "schema": "https://schema.org/",
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "title": "dct:title",
      "description": "dct:description",
      "datePublished": {"@id": "schema:datePublished", "@type": "xsd:date"},
      "author": {"@id": "schema:author", "@type": "@id"},
      "affiliation": {"@id": "schema:affiliation", "@type": "@id"}
    },
    "@id": "http://spirit.localhost/research/spirit-in-physics",
    "@type": ["schema:ScholarlyArticle", "schema:ResearchPaper"],
    "title": "Spirit in Physics",
    "description": "Structuring and Quantifying Human Spirit Using the Informational Vector Space",
    "datePublished": "2024-11-30",
    "author": [
      {
        "@type": "schema:Person",
        "name": "Jun Kawasaki",
        "email": "root@junkawasaki.com"
      },
      {
        "@type": "schema:Person",
        "name": "Kazuki Tainaka"
      },
      {
        "@type": "schema:Person",
        "name": "Tomonori Takeuchi"
      }
    ]
  };
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-n9jH495v6S6LyE3FqbEuRSBy6wub9GkBnqDZ6ZQ7GtSvpMAJJFEFrLQH6NJ9CPdr" crossorigin="anonymous">
  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<div class="paper-layout">
  <nav class="toc">
    <h3>Table of Contents</h3>
    <ul>
      {#each sections as section}
        <li><a href="#{section.id}">{section.title}</a></li>
      {/each}
    </ul>
  </nav>

  <article class="paper">
    <header>
      <h1>Spirit in Physics: Spirit as a Thermodynamic Information Quantity</h1>
      <div class="authors">
        <strong>Authors:</strong> Jun Kawasaki (root@junkawasaki.com), Kazuki Tainaka, Tomonori Takeuchi
      </div>
      <div class="affiliations">
        <strong>Affiliation:</strong> Graduate School of Medical and Dental Sciences, Niigata University, Brain Research Institute, Niigata University, Japan, Department of Biomedicine, Aarhus University, Denmark
      </div>
      <div class="date"><strong>Date:</strong> 2024-11-30</div>
    </header>

    <section id="abstract" class="abstract">
      <h2>Abstract</h2>
      <p>
        Philosophical accounts often invoke “spirit” as a non-material essence, yet have lacked an operational definition compatible with physics. Here we introduce Spirit as a thermodynamic information quantity defined on a high-dimensional manifold that couples linguistic, behavioural and physiological signals. This paper presents a theoretical framework for Spirit, a model for interpreting its internal structures, and an experimental methodology for its measurement.
      </p>
    </section>

    <section id="introduction">
      <h2>1. Introduction</h2>
      <p>
        The concept of "spirit" has long been central to philosophical and psychological inquiry, yet it has remained largely outside the scope of empirical science due to the absence of a physically grounded, measurable definition. This conceptual gap has hindered our ability to investigate the material basis of what are often considered non-material phenomena. To bridge this gap, we propose a fundamental re-conceptualization of Spirit, moving it from the metaphysical realm to the physical.
      </p>
      <p>
        Our approach is built on a foundational premise established in modern physics: information is physical (Landauer, 1991). The erasure of one bit of information corresponds to a minimal dissipation of energy, a principle that has been experimentally verified (Bérut et al., 2012). If Spirit is fundamentally informational in nature, as we postulate, then it must also be subject to physical laws.
      </p>
      <p>
        In this paper, we define Spirit as a thermodynamic information quantity. Specifically, we model it as a state on a high-dimensional manifold—termed Complex Space—that integrates multiple streams of data: linguistic (word associations), behavioural (reaction times), and physiological (skin potential, emotional expression).
      </p>
    </section>

    <section id="theory">
      <h2>2. Theoretical Framework: The Physics of Spirit</h2>
      <h3>2.1. The Physical Nature of Information</h3>
      <p>
        Our framework rests on the principle that information is a physical quantity, inextricably linked to thermodynamics. Landauer's principle states that any logically irreversible manipulation of information, such as the erasure of a bit, must be accompanied by a corresponding entropy increase in the non-information-bearing degrees of freedom of the information-processing apparatus.
      </p>

      <h3>2.2. The Physical Definition of Spirit</h3>
      <p>
        We define Spirit not as a monolithic entity but as a dynamic state within a high-dimensional vector space.
      </p>
      <div class="equation">{"\\[ S = \\{V, E, T\\} \\]"}</div>
      <p>
        The energy potential of an edge connecting two informational vertices ($w_I$, $w_O$) is defined as:
      </p>
      <div class="equation">{"\\[ E = -\\ln P(w_O | w_I) \\]"}</div>
      <p>
        We define Spirit, $\psi(S)$, as:
      </p>
      <div class="equation">{"\\[ \\psi(S) = \\frac{\\delta E(S)}{\\delta S} \\]"}</div>

      <h3>2.3. The Open System Dynamics of Spirit</h3>
      <div class="equation">{"\\[ \\frac{dS}{dt} = \\frac{dS_{internal}}{dt} + \\frac{dS_{exchange}}{dt} \\]"}</div>
    </section>

    <section id="structural">
      <h2>3. Structural Interpretation: A Jungian Model</h2>
      <p>
        We find that the concepts of analytical psychology, particularly those developed by C.G. Jung, provide a powerful vocabulary for classifying the patterns and dynamics observed within this physically defined space.
      </p>
      <ul>
        <li><strong>Complex:</strong> An individual's personal implementation of an Archetype.</li>
        <li><strong>Archetype:</strong> A fundamental, structural template residing in the Collective Unconscious.</li>
        <li><strong>Shadow:</strong> The unconscious and often suppressed part of a Complex.</li>
      </ul>
      <p><strong>Integrated vs. Unintegrated Patterns:</strong></p>
      <p>
        <strong>Spirit Type (Integrated):</strong> $SpiritType = Archetype(Gene, Meme, Field)$
      </p>
      <p>
        <strong>Ghost Pattern (Unintegrated):</strong> $GhostPattern = f(Shadow, CollectiveArchetype, Meme, Field)$
      </p>
    </section>

    <section id="measurement">
      <h2>4. Measurement Methodology</h2>
      <p>
        The probability of associating an output word ($w_O$) with an input word ($w_I$):
      </p>
      <div class="equation">
        {"\\[ P(w_O | w_I) = \\frac{\\exp(\\vec{w_I} \\cdot \\vec{w_O}) \\cdot [r(w_I, w_O)]^{\\alpha} \\cdot \\exp(\\gamma \\frac{\\Delta SP}{\\lambda}) \\cdot \\exp(\\eta F)}{\\sum_{j} \\dots} \\]"}
      </div>
    </section>

    <section id="methods">
      <h2>5. Methods</h2>
      <p>
        <strong>Experiment:</strong> Modified Word Association Experiment.<br>
        <strong>Participants:</strong> Healthy adults (n=30).<br>
        <strong>Measures:</strong> Reaction times, 8-channel skin potential (SKINPRO), Hume AI emotion analysis (face, voice, language).
      </p>
    </section>

    <section id="results">
      <h2>6. Results</h2>
      <div class="results-grid">
        <div class="stat-box">
          <h4>Spirit Type Classification</h4>
          <p class="value">82%</p>
          <p class="label">Accuracy</p>
        </div>
        <div class="stat-box">
          <h4>Ghost Patterns Identified</h4>
          <p class="value">14</p>
          <p class="label">Bugs/Interferences</p>
        </div>
      </div>
      <p>
        The high-dimensional Spirit manifold allows for clear differentiation between stable archetypal structures and unstable shadow-driven interferences.
      </p>
    </section>

    <section id="discussion">
      <h2>7. Discussion</h2>
      <p>
        Our analysis suggests Ghost Patterns arise from measurable interference between different informational layers, such as conflicts between unconscious patterns (the Shadow) and conscious intentions.
      </p>
    </section>

    <section id="conclusion">
      <h2>Conclusion</h2>
      <p>
        This paper introduces a paradigm shift, moving "spirit" from metaphysical abstraction to concrete, physically measurable quantity. By operationalizing Spirit as a thermodynamic information quantity, we lay the foundation for a new physics of consciousness.
      </p>
    </section>

    <section id="references">
      <h2>References</h2>
      <ol>
        <li>Landauer, R. (1991). Information is physical. <em>Physics Today</em>.</li>
        <li>Bérut, A. et al. (2012). Experimental verification of Landauer's principle. <em>Nature</em>.</li>
        <li>Jung, C. G. (1910). The association method. <em>AJOP</em>.</li>
      </ol>
    </section>
  </article>
</div>

<style>
  .paper-layout {
    display: flex;
    gap: 3rem;
    max-width: 1280px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }

  .toc {
    width: 280px;
    position: sticky;
    top: 6rem;
    height: fit-content;
    background: #fff;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    border: 1px solid rgba(0,0,0,0.05);
  }

  .toc h3 {
    margin-top: 0;
    font-size: 0.85rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    margin-bottom: 1.5rem;
  }

  .toc ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc li {
    margin: 1rem 0;
  }

  .toc a {
    text-decoration: none;
    color: #444;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
    display: block;
  }

  .toc a:hover {
    color: #007aff;
    transform: translateX(4px);
  }

  .paper {
    flex: 1;
    background: #fff;
    padding: 5rem;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.03);
    line-height: 1.8;
    color: #1d1d1f;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  header {
    margin-bottom: 4rem;
    text-align: center;
  }

  h1 {
    font-size: 3rem;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02rem;
    margin-bottom: 2rem;
    color: #000;
  }

  .authors, .affiliations, .date {
    margin: 0.75rem 0;
    font-size: 1.1rem;
    color: #6e6e73;
  }

  section {
    margin-bottom: 5rem;
  }

  h2 {
    font-size: 2.25rem;
    font-weight: 700;
    margin-top: 4rem;
    margin-bottom: 2rem;
    color: #000;
    border-bottom: 1px solid #f2f2f2;
    padding-bottom: 1rem;
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 3rem;
    margin-bottom: 1.5rem;
    color: #333;
  }

  .abstract {
    background: #f5f5f7;
    padding: 3rem;
    border-radius: 16px;
    font-style: italic;
    font-size: 1.15rem;
    line-height: 1.6;
    color: #48484a;
    border: none;
  }

  .equation {
    text-align: center;
    margin: 3rem 0;
    padding: 2rem;
    background: #fcfcfc;
    border-radius: 12px;
    border: 1px solid #f0f0f0;
    font-size: 1.4rem;
    overflow-x: auto;
  }

  .results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin: 3rem 0;
  }

  .stat-box {
    background: #fbfbfd;
    padding: 2rem;
    border-radius: 16px;
    text-align: center;
    border: 1px solid #f2f2f2;
  }

  .stat-box h4 {
    margin: 0;
    font-size: 0.9rem;
    color: #86868b;
    text-transform: uppercase;
  }

  .stat-box .value {
    font-size: 3rem;
    font-weight: 700;
    margin: 1rem 0 0.5rem;
    color: #007aff;
  }

  .stat-box .label {
    font-size: 1rem;
    color: #1d1d1f;
    margin: 0;
  }

  ul, ol {
    padding-left: 2rem;
    margin: 1.5rem 0;
  }

  li {
    margin-bottom: 1rem;
  }

  @media (max-width: 1024px) {
    .paper {
      padding: 3rem;
    }
    h1 {
      font-size: 2.5rem;
    }
  }

  @media (max-width: 768px) {
    .paper-layout {
      flex-direction: column;
      padding: 1rem;
    }
    .toc {
      width: 100%;
      position: static;
      margin-bottom: 2rem;
    }
    .paper {
      padding: 2rem;
    }
    .results-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
