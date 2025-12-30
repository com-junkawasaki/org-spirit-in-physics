<script>
  import * as m from "$lib/paraglide/messages.js";
</script>

# {m.logo()}: {m.paper_title_full()}

<div class="author-grid">
  <div class="author-item">
    <span class="author-name">Jun Kawasaki</span>
    <a href="mailto:root@junkawasaki.com" class="author-email">root@junkawasaki.com</a>
    <span class="author-affiliation">{m.affiliation_niigata_med()}</span>
  </div>
  <div class="author-item">
    <span class="author-name">Kazuki Tainaka</span>
    <span class="author-affiliation">{m.affiliation_niigata_brain()}</span>
  </div>
  <div class="author-item">
    <span class="author-name">Tomonori Takeuchi</span>
    <span class="author-affiliation">{m.affiliation_aarhus()}</span>
  </div>
</div>

<div class="paper-metadata">
  <span class="date"><strong>{m.published()}:</strong> 2024-11-30</span>
  <span class="version"><strong>{m.version()}:</strong> 1.0.0</span>
  <span class="schema"><strong>{m.id()}:</strong> research/spirit-in-physics</span>
</div>

## {m.abstract()}

<div class="abstract-box">
  {m.abstract_text()}
</div>

## {m.introduction()}

{m.introduction_text_1()}

{m.introduction_text_2()}

{m.introduction_text_3()}

## {m.theory()}

### {m.theory_title_2_1()}

{m.theory_text_2_1()}

### {m.theory_title_2_2()}

{m.theory_text_2_2()}

<div class="equation-block">
  $ S = \{V, E, T\} $
  
  <p class="equation-desc">
    {m.theory_equation_desc_1()}
  </p>
</div>

The energy potential of an edge connecting two informational vertices ($w_I, w_O$) is defined as the negative logarithm of their association probability, reflecting the information content or "surprise" of their connection:

<div class="equation-block">
  $ E = -\ln P(w_O | w_I),\; V = \{\vec{w_I}, \vec{w_O}, ...\},\; T = \text{time axis} $
</div>

{m.theory_text_2_2_2()}

<div class="equation-block">
  $ \psi(S) = \frac{\delta E(S)}{\delta S} $
</div>

### {m.theory_title_2_3()}

{m.theory_text_2_3()}

<div class="equation-block">
  $ \frac{dS}{dt} = \frac{dS_{internal}}{dt} + \frac{dS_{exchange}}{dt} $
</div>

## {m.structural()}

{m.structural_text_1()}

<div class="definition-grid">
  <div class="definition-card">
    <h4>{m.complex_title()}</h4>
    <p>{m.complex_text()}</p>
  </div>
  <div class="definition-card">
    <h4>{m.archetype_title()}</h4>
    <p>{m.archetype_text()}</p>
  </div>
  <div class="definition-card">
    <h4>{m.shadow_title()}</h4>
    <p>{m.shadow_text()}</p>
  </div>
</div>

### {m.classification_observed_patterns_title()}

{m.classification_observed_patterns_text()}

<div class="pattern-box spirit-type">
  <h4>{m.spirit_type_title()}</h4>
  <p>{m.spirit_type_text()}</p>
  <p class="formula-inline">$ SpiritType = Archetype(Gene, Meme, Field) $</p>
</div>

<div class="pattern-box ghost-pattern">
  <h4>{m.ghost_pattern_title()}</h4>
  <p>{m.ghost_pattern_text()}</p>
  <p class="formula-inline">$ GhostPattern = f(Shadow, CollectiveArchetype, Meme, Field) $</p>
</div>

## {m.measurement()}

{m.measurement_text_1()}

<div class="equation-block large">
  $$ P(w_O | w_I) = \frac{\exp(\vec{w_I} \cdot \vec{w_O}) \cdot [r(w_I, w_O)]^\alpha \cdot \exp(\gamma \frac{\Delta SP}{\lambda}) \cdot \exp(\eta F)}{\sum_{j} \exp(\vec{w_I} \cdot \vec{w_j}) \cdot [r(w_I, w_j)]^\alpha \cdot \exp(\gamma \frac{\Delta SP}{\lambda}) \cdot \exp(\eta F)} $$
</div>

<div class="component-list">
  <div class="component-item">
    <strong>{m.semantic_component_title()} ($\vec{w_I} \cdot \vec{w_O}$):</strong> {m.semantic_component_text()}
  </div>
  <div class="component-item">
    <strong>{m.behavioural_component_title()} ($r(w_I, w_O)$):</strong> {m.behavioural_component_text()}
  </div>
  <div class="component-item">
    <strong>{m.physiological_component_title()} (Emotion $F$, Arousal $\Delta SP$):</strong> {m.physiological_component_text()}
  </div>
</div>

## {m.methods()}

**{m.methods_participants_title()}:** {m.methods_participants_text()}

**{m.methods_equipment_title()}:** {m.methods_equipment_text()}

**{m.methods_integration_title()}:** {m.methods_integration_text()}

**{m.methods_pipeline_title()}:** {m.methods_pipeline_text()}

## {m.results()}

<div class="results-overview">
  <div class="result-card highlight">
    <span class="result-label">{m.classification_accuracy()}</span>
    <span class="result-value">82%</span>
    <span class="result-sub">{m.results_classification_accuracy_sub()}</span>
  </div>
  <div class="result-card">
    <span class="result-label">{m.ghost_patterns_identified()}</span>
    <span class="result-value">14</span>
    <span class="result-sub">{m.results_ghost_patterns_identified_sub()}</span>
  </div>
  <div class="result-card">
    <span class="result-label">{m.manifold_dim()}</span>
    <span class="result-value">1024</span>
    <span class="result-sub">{m.results_manifold_dim_sub()}</span>
  </div>
</div>

<div class="results-details grid md:grid-cols-2 gap-8 my-12">
  <div class="results-sub-section p-6 bg-gray-50 rounded-xl">
    <h3 class="mt-0 text-xl">{m.results_spirit_type_distribution_title()}</h3>
    <p class="text-sm text-gray-600 mb-4">{m.results_spirit_type_distribution_text()}</p>
    <ul class="text-sm space-y-2">
      <li class="flex justify-between"><strong>{m.results_hero_archetype()}:</strong> <span>{m.results_responses({ count: 124 })}</span></li>
      <li class="flex justify-between"><strong>{m.results_sage_archetype()}:</strong> <span>{m.results_responses({ count: 98 })}</span></li>
      <li class="flex justify-between"><strong>{m.results_lover_archetype()}:</strong> <span>{m.results_responses({ count: 76 })}</span></li>
      <li class="flex justify-between"><strong>{m.results_caregiver_archetype()}:</strong> <span>{m.results_responses({ count: 45 })}</span></li>
    </ul>
    <div class="mt-4 pt-4 border-t border-gray-200">
      <p class="text-xs italic text-gray-500">{m.results_mean_distance({ value: '0.142' })}</p>
    </div>
  </div>

  <div class="results-sub-section p-6 bg-gray-50 rounded-xl">
    <h3 class="mt-0 text-xl">{m.results_ghost_pattern_detection_title()}</h3>
    <p class="text-sm text-gray-600 mb-4">{m.results_ghost_pattern_detection_text()}</p>
    <ul class="text-sm space-y-2">
      <li class="flex justify-between"><strong>{m.results_individual_shadow()}:</strong> <span>{m.results_responses({ count: 56 })}</span></li>
      <li class="flex justify-between"><strong>{m.results_collective_unconscious_meme()}:</strong> <span>{m.results_responses({ count: 32 })}</span></li>
    </ul>
    <div class="mt-4 pt-4 border-t border-gray-200">
      <p class="text-xs font-semibold text-gray-700 mb-2">{m.results_problematic_indicators()}</p>
      <div class="flex flex-wrap gap-2">
        <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]">{m.results_high_meme_variance()}</span>
        <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]">{m.results_pattern_interference()}</span>
        <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]">{m.results_cognitive_bias()}</span>
      </div>
    </div>
  </div>
</div>

{m.results_summary_text()}

<!-- Placeholder for Interactive Visualization -->
<div class="viz-placeholder">
  <div class="viz-header">
    <h4>{m.viz_interactive_visualization_title()}</h4>
    <span class="badge">{m.viz_experimental_badge()}</span>
  </div>
  <div class="viz-body">
    <p>{@html m.viz_visualization_desc({ code1: '<code>Force3DWordGraphTypeGPU</code>', code2: '<code>TimelineVisualization</code>' })}</p>
    <div class="mock-graph">
      <!-- Graph mock visualization here -->
    </div>
  </div>
</div>

## {m.discussion()}

{m.discussion_text_1()}

{m.discussion_text_2()}

### {m.comparison_with_existing_research_title()}

- **{m.comparison_jung_text()}**
- **{m.comparison_landauer_text()}**
- **{m.comparison_botvinick_text()}**

## {m.conclusion()}

{m.conclusion_text()}

## {m.references()}

<ul class="ref-list">
  <li id="landauer-1991">
    <span class="ref-text">Landauer, R. (1991). Information is physical. Physics Today, 44(5), 23–29.</span>
    <a href="https://doi.org/10.1063/1.881299" class="ref-doi" target="_blank" rel="noopener noreferrer">DOI: 10.1063/1.881299</a>
  </li>
  <li id="berut-2012">
    <span class="ref-text">Bérut, A., Arakelyan, A., Petrosyan, A., Ciliberto, S., Dillenschneider, R., & Lutz, E. (2012). Experimental verification of Landauer's principle linking information and thermodynamics. Nature, 483(7388), 187–189.</span>
    <a href="https://doi.org/10.1038/nature10872" class="ref-doi" target="_blank" rel="noopener noreferrer">DOI: 10.1038/nature10872</a>
  </li>
  <li id="botvinick-1998">
    <span class="ref-text">Botvinick, M., & Cohen, J. (1998). Rubber-hand illusion. Nature, 391, 756.</span>
    <a href="https://doi.org/10.1038/35784" class="ref-doi" target="_blank" rel="noopener noreferrer">DOI: 10.1038/35784</a>
  </li>
  <li id="toyabe-2010">
    <span class="ref-text">Toyabe, S., Sagawa, T., Ueda, M., Muneyuki, E., & Sano, M. (2010). Experimental demonstration of information-to-energy conversion and validation of the generalized Jarzynski equality. Nature Physics, 6, 988–992.</span>
    <a href="https://doi.org/10.1038/nphys1821" class="ref-doi" target="_blank" rel="noopener noreferrer">DOI: 10.1038/nphys1821</a>
  </li>
  <li id="jung-1910">
    <span class="ref-text">Jung, C. G. (1910). The association method. American Journal of Psychology, 21(2), 219–269.</span>
  </li>
</ul>

<div class="addendum">
  <h3>{m.addendum_title()}</h3>
  <p>
    {m.addendum_text()}
  </p>
  <div class="dataset-info">
    <strong>{m.dataset_label()}</strong> {m.dataset_value()}
  </div>
  <p class="ref-text text-sm mt-4">
    <strong>{m.ref_label()}</strong> Jonathan R. I. Coleman et al, Mol Psychiatry 24, 182-197 (2019)
  </p>
</div>

