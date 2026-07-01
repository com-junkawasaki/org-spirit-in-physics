(ns spirit-ui.views.web.paper
  "Port of apps/web/src/routes/paper (+page.svelte -> PaperView.svelte ->
  PaperContent.md). Math is rendered by spirit-ui.katex-interop
  (auto-render.mjs interop, ADR-2606290000 exemption clause) run once after
  mount (see paper-main-effects! below); scroll-spy (active-section
  highlighting) drives the TOC sidebar only, via plain DOM mutation outside
  app-state — see `article-body`'s docstring for why the article subtree
  must stay pure/opaque instead."
  (:require [spirit-ui.data.paper-content :as content]
            [spirit-ui.ir :as ir]
            [spirit-ui.katex-interop :as katex]))

;; ---------- small content helpers ----------

(defn- m
  ([k] (content/msg content/messages k))
  ([k params] (content/msg content/messages k params)))

(defn- equation-block [{:keys [large? desc]} & latex-lines]
  (ir/el :div {:class (str "equation-block" (when large? " large"))}
         (apply str latex-lines)
         (when desc (ir/el :p {:class "equation-desc"} desc))))

(defn- assumption-block [title-k text-k]
  (ir/el :div {:class "assumption-block"}
         (ir/el :h4 {} (m title-k))
         (ir/el :p {} (m text-k))))

(defn- definition-card [title-k text-k]
  (ir/el :div {:class "definition-card"}
         (ir/el :h4 {} (m title-k))
         (ir/el :p {} (m text-k))))

(defn- pattern-box [class title-k text-k formula]
  (ir/el :div {:class (str "pattern-box " class)}
         (ir/el :h4 {} (m title-k))
         (ir/el :p {} (m text-k))
         (ir/el :p {:class "formula-inline"} formula)))

(defn- result-card [class label-k value sub-k]
  (ir/el :div {:class (str "result-card" (when class (str " " class)))}
         (ir/el :span {:class "result-label"} (m label-k))
         (ir/el :span {:class "result-value"} value)
         (ir/el :span {:class "result-sub"} (m sub-k))))

(defn- results-list-item [label-k count]
  (ir/el :li {:class "flex justify-between" :key label-k}
         (ir/el :strong {} (str (m label-k) ":"))
         (ir/el :span {} (m :results-responses {:count count}))))

(defn- presentation-item [title-k details-k]
  (ir/el :div {:class "presentation-item"}
         (ir/el :h4 {:class "mb-1"} (m title-k))
         (ir/el :p {:class "text-sm text-gray-600 dark:text-gray-400"} (m details-k))))

(defn- reference-item [{:keys [id citation doi]}]
  (ir/el :li {:key id :id id}
         (ir/el :span {:class "ref-text"} citation)
         (when doi
           (ir/el :a {:href (str "https://doi.org/" doi) :class "ref-doi"
                      :target "_blank" :rel "noopener noreferrer"}
                  (str "DOI: " doi)))))

;; ---------- article body (static — MUST stay pure, see dom.cljs's :opaque
;; contract in its ns docstring: katex mutates this subtree's live DOM
;; in place after mount, so successive renders of this function must
;; produce `=` IR or the katex-rendered math gets silently dropped) ----------

(defn- article-body []
  (ir/el :article {:class "paper-article" :opaque true}
    (ir/el :h1 {} (str (m :logo) ": " (m :paper-title-full)))

    (ir/el :div {:class "author-section"}
           (ir/el :div {:class "author-grid"}
                  (for [{:keys [name email affiliation]} content/authors]
                    (ir/el :div {:class "author-item" :key name}
                           (ir/el :span {:class "author-name"} name)
                           (when email (ir/el :a {:href (str "mailto:" email) :class "author-email"} email))
                           (ir/el :span {:class "author-affiliation"} affiliation))))
           (ir/el :div {:class "paper-metadata"}
                  (ir/el :span {:class "metadata-item"} (ir/el :strong {} (str (m :published) ":")) " 2024-11-30")
                  (ir/el :span {:class "metadata-item"} (ir/el :strong {} (str (m :version) ":")) " 1.0.0")
                  (ir/el :span {:class "metadata-item"} (ir/el :strong {} (str (m :id) ":")) " research/spirit-in-physics")))

    (ir/el :div {:class "abstract-container"}
           (ir/el :h2 {:id "abstract" :class "abstract-title"} (m :abstract))
           (ir/el :div {:class "abstract-content"} (m :abstract-text)))

    (ir/el :h2 {:id "introduction"} (m :introduction))
    (ir/el :p {} (m :introduction-text-1))
    (ir/el :p {} (m :introduction-text-2))
    (ir/el :p {} (m :introduction-text-3))

    (ir/el :h2 {:id "theory"} (m :theory))
    (ir/el :h3 {} "2.1. Fundamental Assumptions")
    (assumption-block :assumption-1-title :assumption-1-text)
    (assumption-block :assumption-2-title :assumption-2-text)
    (assumption-block :assumption-3-title :assumption-3-text)

    (ir/el :h3 {} (m :theory-title-2-2))
    (ir/el :p {} (m :theory-text-2-2))
    (equation-block {:desc (m :theory-equation-desc-1)} "$ S = \\{V, E, T\\} $")
    (ir/el :p {}
           "The energy potential of an edge connecting two informational vertices ($w_I, w_O$) is defined as the negative logarithm of their association probability, reflecting the information content or \"surprise\" of their connection:")
    (equation-block {} "$ E = -\\ln P(w_O | w_I),\\; V = \\{\\vec{w_I}, \\vec{w_O}, ...\\},\\; T = \\text{time axis} $")
    (ir/el :p {} (m :theory-text-2-2-2))
    (equation-block {} "$ \\psi(S) = \\frac{\\delta E(S)}{\\delta S} $")

    (ir/el :h3 {} (m :theory-title-2-3))
    (ir/el :p {} (m :theory-text-2-3))
    (equation-block {} "$ \\frac{dS}{dt} = \\frac{dS_{internal}}{dt} + \\frac{dS_{exchange}}{dt} $")

    (ir/el :h2 {:id "structural"} (m :structural))
    (ir/el :p {} (m :structural-text-1))
    (ir/el :div {:class "definition-grid"}
           (definition-card :complex-title :complex-text)
           (definition-card :archetype-title :archetype-text)
           (definition-card :shadow-title :shadow-text))

    (ir/el :h3 {} (m :classification-observed-patterns-title))
    (ir/el :p {} (m :classification-observed-patterns-text))
    (ir/el :div {:class "pattern-section"}
           (pattern-box "spirit-type" :spirit-type-title :spirit-type-text
                        "\\( SpiritType = Archetype(Gene, Meme, Field) \\)")
           (pattern-box "ghost-pattern" :ghost-pattern-title :ghost-pattern-text
                        "\\( GhostPattern = f(Shadow, CollectiveArchetype, Meme, Field) \\)"))

    (ir/el :h2 {:id "measurement"} (m :measurement))
    (ir/el :p {} (m :measurement-text-1))
    (equation-block {:large? true}
      "$$ P(w_O | w_I) = \\frac{\\exp(\\vec{w_I} \\cdot \\vec{w_O}) \\cdot [r(w_I, w_O)]^{\\alpha} \\cdot \\exp(\\gamma \\frac{\\Delta SP}{\\lambda}) \\cdot \\exp(\\eta F)}{\\sum_{j} \\exp(\\vec{w_I} \\cdot \\vec{w_j}) \\cdot [r(w_I, w_j)]^{\\alpha} \\cdot \\exp(\\gamma \\frac{\\Delta SP}{\\lambda}) \\cdot \\exp(\\eta F)} $$")
    (ir/el :div {:class "component-list"}
           (ir/el :div {:class "component-item"}
                  (ir/el :strong {} (str (m :semantic-component-title) " (\\vec{w_I} \\cdot \\vec{w_O}):")) " " (m :semantic-component-text))
           (ir/el :div {:class "component-item"}
                  (ir/el :strong {} (str (m :behavioural-component-title) " ($r(w_I, w_O)$):")) " " (m :behavioural-component-text))
           (ir/el :div {:class "component-item"}
                  (ir/el :strong {} (str (m :physiological-component-title) " (Emotion $F$, Arousal \\Delta SP):")) " " (m :physiological-component-text)))

    (ir/el :h2 {:id "methods"} (m :methods))
    (ir/el :p {} (ir/el :strong {} (str (m :methods-participants-title) ":")) " " (m :methods-participants-text))
    (ir/el :p {} (ir/el :strong {} (str (m :methods-equipment-title) ":")) " " (m :methods-equipment-text))
    (ir/el :p {} (ir/el :strong {} (str (m :methods-integration-title) ":")) " " (m :methods-integration-text))
    (ir/el :p {} (ir/el :strong {} (str (m :methods-pipeline-title) ":")) " " (m :methods-pipeline-text))

    (ir/el :h2 {:id "results"} (m :results))
    (ir/el :div {:class "results-overview"}
           (result-card "highlight" :classification-accuracy "82%" :results-classification-accuracy-sub)
           (result-card nil :ghost-patterns-identified "14" :results-ghost-patterns-identified-sub)
           (result-card nil :manifold-dim "1024" :results-manifold-dim-sub))
    (ir/el :div {:class "results-details grid md:grid-cols-2 gap-8 my-12"}
           (ir/el :div {:class "results-sub-section p-6 bg-gray-50 rounded"}
                  (ir/el :h3 {:class "mt-0 text-xl"} (m :results-spirit-type-distribution-title))
                  (ir/el :p {:class "text-sm text-gray-600 mb-4"} (m :results-spirit-type-distribution-text))
                  (ir/el :ul {:class "text-sm space-y-2"}
                         (results-list-item :results-hero-archetype 124)
                         (results-list-item :results-sage-archetype 98)
                         (results-list-item :results-lover-archetype 76)
                         (results-list-item :results-caregiver-archetype 45))
                  (ir/el :div {:class "mt-4 pt-4 border-t border-gray-200"}
                         (ir/el :p {:class "text-xs italic text-gray-500"} (m :results-mean-distance {:value "0.142"}))))
           (ir/el :div {:class "results-sub-section p-6 bg-gray-50 rounded"}
                  (ir/el :h3 {:class "mt-0 text-xl"} (m :results-ghost-pattern-detection-title))
                  (ir/el :p {:class "text-sm text-gray-600 mb-4"} (m :results-ghost-pattern-detection-text))
                  (ir/el :ul {:class "text-sm space-y-2"}
                         (results-list-item :results-individual-shadow 56)
                         (results-list-item :results-collective-unconscious-meme 32))
                  (ir/el :div {:class "mt-4 pt-4 border-t border-gray-200"}
                         (ir/el :p {:class "text-xs font-semibold text-gray-700 mb-2"} (m :results-problematic-indicators))
                         (ir/el :div {:class "flex flex-wrap gap-2"}
                                (ir/el :span {:class "px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]"} (m :results-high-meme-variance))
                                (ir/el :span {:class "px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]"} (m :results-pattern-interference))
                                (ir/el :span {:class "px-2 py-1 bg-red-100 text-red-700 rounded text-[10px]"} (m :results-cognitive-bias))))))
    (ir/el :p {} (m :results-summary-text))
    (ir/el :div {:class "viz-placeholder"}
           (ir/el :div {:class "viz-header"}
                  (ir/el :h4 {} (m :viz-interactive-visualization-title))
                  (ir/el :span {:class "badge"} (m :viz-experimental-badge)))
           (ir/el :div {:class "viz-body"}
                  (ir/el :p {}
                         "Visualization components like " (ir/el :code {} "Force3DThrelte")
                         " and " (ir/el :code {} "TimelineVisualization")
                         " can be integrated here to show real-time analysis of the spirit manifold.")))

    (ir/el :h2 {:id "discussion"} (m :discussion))
    (ir/el :p {} (m :discussion-text-1))
    (ir/el :p {} (m :discussion-text-2))
    (ir/el :h3 {} (m :comparison-with-existing-research-title))
    (ir/el :ul {:class "comparison-list"}
           (ir/el :li {:key :jung} (ir/el :strong {} (m :comparison-jung-text)))
           (ir/el :li {:key :landauer} (ir/el :strong {} (m :comparison-landauer-text)))
           (ir/el :li {:key :botvinick} (ir/el :strong {} (m :comparison-botvinick-text))))

    (ir/el :h2 {:id "conclusion"} (m :conclusion))
    (ir/el :p {} (m :conclusion-text))

    (ir/el :h2 {:id "presentations"} (m :presentations))
    (presentation-item :cns-2025-title :cns-2025-details)
    (presentation-item :sfn-2025-title :sfn-2025-details)

    (ir/el :h2 {:id "references"} (m :references))
    (ir/el :ul {:class "ref-list"} (map reference-item content/references))

    (ir/el :div {:class "addendum"}
           (ir/el :h3 {} (m :addendum-title))
           (ir/el :p {} (m :addendum-text))
           (ir/el :div {:class "dataset-info"}
                  (ir/el :strong {} (m :dataset-label)) " " (m :dataset-value))
           (ir/el :p {:class "ref-text text-sm mt-4"}
                  (ir/el :strong {} (m :ref-label)) " Jonathan R. I. Coleman et al, Mol Psychiatry 24, 182-197 (2019)"))))

;; ---------- TOC sidebar (dynamic — active-section/toc-open? state) ----------

(defn- toc-sidebar [{:keys [active-section toc-open?]}]
  (ir/el :nav {:key :toc-sidebar :class (str "toc-sidebar" (when toc-open? " open"))}
         (ir/el :div {:class "toc-inner"}
                (ir/el :div {:class "toc-header"}
                       (ir/el :h3 {:class "toc-title"} (m :table-of-contents))
                       (ir/el :button {:class "close-toc" :ui/on {:click [:toggle-toc]}} "×"))
                (ir/el :ul {}
                       (for [{:keys [id title]} content/sections]
                         (ir/el :li {:key id}
                                (ir/el :a {:href (str "#" id)
                                           :class (when (= active-section id) "active")
                                           :ui/on {:click [:toggle-toc]}}
                                       title)))))))

(defn view [state]
  (let [paper-state (get state :paper {})
        active-section (get paper-state :active-section "abstract")
        toc-open? (get paper-state :toc-open? false)]
    (ir/el :div {:class "paper-container"}
           ;; :key on every child here — (when toc-open? ...) below makes
           ;; this list's LENGTH state-dependent (3 items closed, 4 open);
           ;; without keys, child-key falls back to position, so opening the
           ;; TOC shifts every sibling's positional key by one and the
           ;; keyed-diff misreads toc-sidebar as the old :main.paper-content
           ;; slot — cascading into a stale/freshly-recreated article whose
           ;; katex-rendered math is lost (see dom.cljs's ns docstring's
           ;; unkeyed-list CALLER CONTRACT; found live via browser testing).
           (ir/el :button {:key :toc-trigger :class "toc-trigger" :ui/on {:click [:toggle-toc]}}
                  (m :toc))
           (when toc-open?
             (ir/el :div {:key :toc-overlay :class "toc-overlay" :ui/on {:click [:toggle-toc]}}))
           (toc-sidebar {:active-section active-section :toc-open? toc-open?})
           (ir/el :main {:key :paper-main :class "paper-content"} (article-body)))))

;; ---------- post-mount browser-API glue (KaTeX render + scroll-spy) ----------

(defonce ^:private section-observer (atom nil))

(defn mount-effects!
  "Call once after navigating to /paper (see web_main.cljc's :route-changed
  handler, wrapped in state/defer! so the route's DOM has already committed
  — same GOTCHA as router/navigate!, see spirit-ui.state's dispatch!
  docstring). Renders KaTeX math into the (opaque, see article-body's
  docstring) article subtree, and wires an IntersectionObserver that drives
  TOC active-section highlighting by dispatching :set-active-section — that
  handler only updates toc-sidebar's small subtree, never article-body's,
  so it never re-triggers dom.cljs's opaque-skip corruption hazard."
  [dispatch!]
  (when-let [old @section-observer] (.disconnect old))
  (when-let [article (js/document.querySelector ".paper-article")]
    (katex/render-math-in! article))
  (let [observer (js/IntersectionObserver.
                   (fn [entries]
                     (doseq [entry entries]
                       (when (.-isIntersecting entry)
                         (dispatch! [:set-active-section (.. entry -target -id)]))))
                   #js {:threshold 0.2})]
    (reset! section-observer observer)
    (doseq [{:keys [id]} content/sections]
      (when-let [heading (js/document.getElementById id)]
        (.observe observer heading)))))
