(ns spirit-ui.data.paper-content
  "Port of apps/web/src/lib/components/PaperContent.md + PaperView.svelte's
  hardcoded reference/author data. Message text is the English (en.json)
  paraglide catalog values, copied verbatim as static EDN data — this app
  drops the paraglide multi-language routing (see settings.cljc's ns
  docstring: i18n is out of scope for this port).")

(defn msg
  "Look up a message by key, interpolating `{param}`-style placeholders from
  `params` (a map of string-or-keyword param name -> value), matching the
  paraglide runtime's own `{name}` template syntax used in en.json (e.g.
  `:results-responses` \"{count} responses\").

  GOTCHA: `clojure.string/replace`'s string/string overload still hands the
  replacement to native JS `String.prototype.replace`, which treats `$&`,
  `$$`, `$'`, `` $` `` etc. in the REPLACEMENT specially regardless of the
  match arg — the docstring's 'replacement is literal ... except
  pattern/string' claim doesn't hold for this overload in practice. `v` is
  escaped (`$` -> `$$`) before substitution so a future param value
  containing `$` (plausible on this LaTeX-heavy page) can't corrupt the
  surrounding text via JS's special-replacement-pattern substitution."
  ([messages k] (get messages k))
  ([messages k params]
   (reduce-kv (fn [s param-name v]
                (clojure.string/replace s (str "{" (name param-name) "}")
                                         (clojure.string/replace (str v) "$" "$$")))
              (get messages k) params)))

(def messages
  {
   :abstract "Abstract"
   :abstract-text "Philosophical accounts often invoke “spirit” as a non-material essence, yet have lacked an operational definition compatible with physics. Here we introduce Spirit as a thermodynamic information quantity defined on a high-dimensional manifold that couples linguistic, behavioural and physiological signals. This paper presents a theoretical framework for Spirit, a model for interpreting its internal structures, and an experimental methodology for its measurement."
   :addendum-text "Leveraging Japan's unique genetics, a GWAS targeting individuals with IQ ≥140 will compare genetic and cognitive data to identify SNPs linked to intelligence. The study begins in 2024 with results slated for publication."
   :addendum-title "Additional Research: High-IQ Japanese GWAS"
   :affiliation-aarhus "Department of Biomedicine, Aarhus University, Denmark"
   :affiliation-niigata-brain "Brain Research Institute, Niigata University, Japan"
   :affiliation-niigata-med "Graduate School of Medical and Dental Sciences, Niigata University"
   :archetype-text "A fundamental, structural template residing in the Collective Unconscious."
   :archetype-title "Archetype"
   :assumption-1-text "We posit that information is a physical quantity governed by thermodynamic laws. Following Shannon's definition of information entropy as uncertainty (Shannon, 1948), Jaynes linked it to statistical mechanics (Jaynes, 1957). Landauer further established that information processing is physical, with bit erasure incurring an energetic cost (Landauer, 1961), a principle experimentally verified (Bérut et al., 2012)."
   :assumption-1-title "Assumption 1: Information is Thermodynamics"
   :assumption-2-text "We define 'Spirit' as a high-dimensional informational structure. The Rubber Hand Illusion demonstrates that the self-boundary is a malleable informational construct (Botvinick & Cohen, 1998). Jung's Word Association reveals that the psyche consists of measurable information clusters (Jung, 1910)."
   :assumption-2-title "Assumption 2: Spirituality is Information"
   :assumption-3-text "The Spirit is modeled as a thermodynamic Open System. Unlike a closed system, it exchanges entropy with its environment to maintain order (Schrödinger, 1944). This aligns with the Free Energy Principle, where agents minimize surprisal to maintain integrity (Friston, 2010)."
   :assumption-3-title "Assumption 3: Spirit as Open System Dynamics"
   :behavioural-component-text "Inverse of reaction time."
   :behavioural-component-title "Behavioural Component"
   :classification-accuracy "Classification Accuracy"
   :classification-observed-patterns-text "We classify the observed patterns within the Spirit manifold into two primary categories:"
   :classification-observed-patterns-title "Classification of Observed Patterns"
   :cns-2025-details "32nd Annual Meeting of the Cognitive Neuroscience Society (CNS 2025), Boston, MA, USA, March 29 – April 1, 2025."
   :cns-2025-title "F35 - Spirit in Physics: Structuring and Quantifying Human Spirit Using the Vector Space"
   :comparison-botvinick-text "Botvinick (1998): Rubber hand illusion as a manifold boundary transition."
   :comparison-jung-text "Jung (1910): We extend qualitative insights into quantitative structural analysis."
   :comparison-landauer-text "Landauer (1991): Physical validation of information as a state variable for Spirit."
   :comparison-with-existing-research-title "Comparison with Existing Research"
   :complex-text "An individual's personal implementation of an Archetype, acting as an energy-charged node in the informational space."
   :complex-title "Complex"
   :conclusion "Conclusion"
   :conclusion-text "This paper introduces a paradigm shift, moving \"spirit\" from metaphysical abstraction to concrete, physically measurable quantity. By operationalizing Spirit as a thermodynamic information quantity on a high-dimensional manifold, we have provided a framework that is both theoretically coherent and experimentally verifiable. This work lays the foundation for a new physics of spirit, opening the door to a truly empirical investigation of consciousness and the human condition."
   :dataset-label "Dataset:"
   :dataset-value "92 people / CAMS IQ140 sd15 - IQ180t / SNPs."
   :discussion "7. Discussion"
   :discussion-text-1 "The successful construction of the high-dimensional manifold from linguistic, behavioural, and physiological data demonstrates the viability of our framework. The distinction between Spirit Types and Ghost Patterns provides a quantitative basis for identifying both healthy, coherent informational structures and problematic, bug-producing ones."
   :discussion-text-2 "Our analysis suggests Ghost Patterns arise from measurable interference between different informational layers, such as conflicts between unconscious patterns (the Shadow) and conscious intentions. This work builds upon Jung's foundational work by embedding it within a modern information-theoretic and thermodynamic framework."
   :ghost-pattern-text "Problematic structures arising from the interference of the Shadow and unintegrated Archetypes."
   :ghost-pattern-title "Ghost Pattern (Unintegrated)"
   :ghost-patterns-identified "Ghost Patterns Identified"
   :id "ID"
   :introduction "1. Introduction"
   :introduction-text-1 "The concept of \"spirit\" has long been central to philosophical and psychological inquiry, yet it has remained largely outside the scope of empirical science due to the absence of a physically grounded, measurable definition. This conceptual gap has hindered our ability to investigate the material basis of what are often considered non-material phenomena. To bridge this gap, we propose a fundamental re-conceptualization of Spirit, moving it from the metaphysical realm to the physical."
   :introduction-text-2 "Our approach is built on a foundational premise established in modern physics: information is physical (Landauer, 1991). The erasure of one bit of information corresponds to a minimal dissipation of energy, a principle that has been experimentally verified (Bérut et al., 2012). If Spirit is fundamentally informational in nature, as we postulate, then it must also be subject to physical laws."
   :introduction-text-3 "In this paper, we define Spirit as a thermodynamic information quantity. Specifically, we model it as a state on a high-dimensional manifold—termed Complex Space—that integrates multiple streams of data: linguistic (word associations), behavioural (reaction times), and physiological (skin potential, emotional expression). We then propose an experimental method to quantify this state and analyze its structure. By operationalizing Spirit in this way, we provide a new framework for investigating the physical underpinnings of consciousness and psychosomatic phenomena."
   :logo "SPIRIT IN PHYSICS"
   :manifold-dim "Manifold Dim."
   :measurement "4. Measurement Methodology"
   :measurement-text-1 "We use a modified version of the Word Association Experiment (Jung, 1910) to probe the structure of an individual's information space. The probability of association is modeled as:"
   :methods "5. Methods"
   :methods-equipment-text "High-resolution display, SKINPRO (8-channel skin potential), Hume AI Expression Measurement API (face, voice, language)."
   :methods-equipment-title "Equipment"
   :methods-integration-text "Time-series synchronization of stimulus presentation, verbal responses, and physiological/emotional data with a ±2-second matching window."
   :methods-integration-title "Data Integration"
   :methods-participants-text "Healthy adults (n=30) meeting specific inclusion/exclusion criteria."
   :methods-participants-title "Participants"
   :methods-pipeline-text "1024-dimensional complex space vectors reduced via PCA/UMAP for 3D visualization and classification using K-means and Isolation Forest."
   :methods-pipeline-title "Analysis Pipeline"
   :paper "Paper"
   :paper-title-full "Spirit as a Thermodynamic Information Quantity"
   :physiological-component-text "Multi-modal data from Hume AI and SKINPRO."
   :physiological-component-title "Physiological Component"
   :presentations "Conference Presentations"
   :published "Published"
   :ref-label "ref:"
   :references "References"
   :results "6. Results"
   :results-caregiver-archetype "Caregiver Archetype"
   :results-classification-accuracy-sub "For Spirit Type identification"
   :results-cognitive-bias "Cognitive Bias"
   :results-collective-unconscious-meme "Collective Unconscious Meme"
   :results-ghost-pattern-detection-text "Hidden patterns primarily composed of Meme + Field."
   :results-ghost-pattern-detection-title "Ghost Pattern Detection"
   :results-ghost-patterns-identified-sub "Distinct types identified"
   :results-hero-archetype "Hero Archetype"
   :results-high-meme-variance "High Meme Variance"
   :results-individual-shadow "Individual Shadow"
   :results-lover-archetype "Lover Archetype"
   :results-manifold-dim-sub "Initial feature space"
   :results-mean-distance "Mean distance to archetype: {value}"
   :results-pattern-interference "Pattern Interference"
   :results-problematic-indicators "Problematic Indicators:"
   :results-responses "{count} responses"
   :results-sage-archetype "Sage Archetype"
   :results-spirit-type-distribution-text "Typical patterns composed of Gene + Meme + Field."
   :results-spirit-type-distribution-title "Spirit Type Distribution"
   :results-summary-text "The experimental results support the viability of our framework. We observed clear differentiation between stable archetypal structures (Spirit Types) and unstable shadow-driven interferences (Ghost Patterns)."
   :semantic-component-text "Cosine similarity between word vectors."
   :semantic-component-title "Semantic Component"
   :sfn-2025-details "Neuroscience 2025 (SfN), San Diego, CA, USA, November 17, 2025."
   :sfn-2025-title "PSTR197.20 / YY7 - Spirit in Physics: An Information-Physics Model for Quantifying Self-Expansion"
   :shadow-text "The unconscious and often suppressed part of a Complex, a primary source of internal conflict."
   :shadow-title "Shadow"
   :spirit-type-text "Stable and integrated structures formed by the harmonious integration of Archetypes."
   :spirit-type-title "Spirit Type (Integrated)"
   :structural "3. Structural Interpretation"
   :structural-text-1 "While the physical framework allows us to define and measure the Spirit manifold, understanding its internal structure requires an interpretative model. We use the concepts of analytical psychology developed by C.G. Jung as a model to interpret the physical structures we measure."
   :table-of-contents "Table of Contents"
   :theory "2. Theoretical Framework"
   :theory-equation-desc-1 "Let the state of the Spirit, S, be a point in a space composed of a set of informational vertices V, edges E, and time axis T."
   :theory-text-2-2 "We define Spirit not as a monolithic entity but as a dynamic state within a high-dimensional vector space. This \"Spirit Physical Space\" is a manifold constructed from informational and biological components."
   :theory-text-2-2-2 "We can then define Spirit, ψ(S), as a physical field quantity—the functional derivative of the total information energy of the system with respect to its state:"
   :theory-text-2-3 "The Spirit operates as a thermodynamic open system, constantly exchanging information and energy with its environment. The total entropy change of the system can be expressed as:"
   :theory-title-2-2 "2.2. The Physical Definition of Spirit"
   :theory-title-2-3 "2.3. The Open System Dynamics of Spirit"
   :toc "TOC"
   :version "Version"
   :viz-experimental-badge "Experimental"
   :viz-interactive-visualization-title "Interactive Visualization (Spirit Manifold)"
   :viz-visualization-desc "Visualization components like {code1} and {code2} can be integrated here to show real-time analysis of the spirit manifold."
   })

(def sections
  "Table-of-contents entries — id must match an `:id` attr on the
  corresponding heading in paper.cljc's article body (scroll-spy target)."
  [{:id "abstract" :title (msg messages :abstract)}
   {:id "introduction" :title (msg messages :introduction)}
   {:id "theory" :title (msg messages :theory)}
   {:id "structural" :title (msg messages :structural)}
   {:id "measurement" :title (msg messages :measurement)}
   {:id "methods" :title (msg messages :methods)}
   {:id "results" :title (msg messages :results)}
   {:id "discussion" :title (msg messages :discussion)}
   {:id "conclusion" :title (msg messages :conclusion)}
   {:id "presentations" :title (msg messages :presentations)}
   {:id "references" :title (msg messages :references)}])

(def authors
  [{:name "Jun Kawasaki" :email "root@junkawasaki.com" :affiliation (msg messages :affiliation-niigata-med)}
   {:name "Kazuki Tainaka" :affiliation (msg messages :affiliation-niigata-brain)}
   {:name "Tomonori Takeuchi" :affiliation (msg messages :affiliation-aarhus)}])

(def references
  [{:id "landauer-1991"
    :citation "Landauer, R. (1991). Information is physical. Physics Today, 44(5), 23–29."
    :doi "10.1063/1.881299"}
   {:id "berut-2012"
    :citation "Bérut, A., Arakelyan, A., Petrosyan, A., Ciliberto, S., Dillenschneider, R., & Lutz, E. (2012). Experimental verification of Landauer's principle linking information and thermodynamics. Nature, 483(7388), 187–189."
    :doi "10.1038/nature10872"}
   {:id "botvinick-1998"
    :citation "Botvinick, M., & Cohen, J. (1998). Rubber-hand illusion. Nature, 391, 756."
    :doi "10.1038/35784"}
   {:id "toyabe-2010"
    :citation "Toyabe, S., Sagawa, T., Ueda, M., Muneyuki, E., & Sano, M. (2010). Experimental demonstration of information-to-energy conversion and validation of the generalized Jarzynski equality. Nature Physics, 6, 988–992."
    :doi "10.1038/nphys1821"}
   {:id "jung-1910"
    :citation "Jung, C. G. (1910). The association method. American Journal of Psychology, 21(2), 219–269."
    :doi nil}])

(def json-ld
  {"@context" "https://schema.org/"
   "@type" "ScholarlyArticle"
   "headline" (msg messages :paper-title-full)
   "description" (msg messages :abstract-text)
   "datePublished" "2024-11-30"
   "author" (mapv (fn [a] (cond-> {"@type" "Person" "name" (:name a) "affiliation" {"@type" "Organization" "name" (:affiliation a)}}
                            (:email a) (assoc "email" (:email a))))
                  authors)
   "publisher" {"@type" "Organization" "name" "Spirit in Physics Research Group"}
   "mainEntityOfPage" {"@type" "WebPage" "@id" "https://spirit-in-physics.gftd.ai/research/spirit-in-physics"}})
