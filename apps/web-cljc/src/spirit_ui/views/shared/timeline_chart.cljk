(ns spirit-ui.views.shared.timeline-chart
  "Port of apps/web/src/lib/components/researcher/TimelineChart.svelte. The
  original re-renders imperatively inside a Svelte `$effect` whenever
  data/timeRange change — this app has no reactive-effect system, so the
  two <svg> containers are mounted as `:opaque` (see dom.cljs) shells whose
  IR is ALWAYS a permanently-empty <svg> — never the actual chart content.
  `render!` is called EXPLICITLY, out of band from the IR-diff cycle, by
  EVERY spirit-ui.views.shared.timeline-visualization handler that could
  invalidate what's currently drawn in the DOM (not just ones that change
  chart INPUTS): :timeline-loaded and :set-time-range (new data/range), AND
  :set-active-tab (switching tabs away-and-back destroys/recreates these
  <svg> nodes via dom.cljs's ordinary unkeyed cond-branch diffing — see
  timeline_visualization.cljc's view — even though neither the data nor the
  time-range changed; PR #22's review caught this exact handler having been
  missed on first pass, leaving the chart permanently blank after a 3D-Space
  round trip). Same explicit-trigger pattern as spirit-ui.views.web.paper's
  mount-effects!, but a DIFFERENT contract than that file's :opaque usage:
  paper.cljc's KaTeX-rendered content lives IN the tracked IR and is
  protected from re-diffing by equality (content never changes across
  renders); this <svg> shell's IR never carries real content at all, so the
  equality check is trivially always true and irrelevant — the actual
  protection is that `render!` is the ONLY thing that ever touches this
  subtree's live DOM. CALLER CONTRACT: any FUTURE handler that can cause
  this component's <svg> nodes to be destroyed and recreated (tab switches,
  future filter UI, anything that changes the `cond` branch in
  timeline_visualization.cljc's view) MUST also (defer!) a render-chart!
  call, or the chart silently goes blank with no error — this is NOT
  enforced by dom.cljs, a test, or a lint rule; it's the same class of
  easy-to-violate-unenforced-invariant class as Phase 5's :opaque purity
  contract."
  (:require [spirit-ui.d3-interop :as d3]
            [spirit-ui.data.emotion-normalization :as emo]
            [spirit-ui.ir :as ir]))

(def ^:private main-svg-class "timeline-chart-svg")
(def ^:private overview-svg-class "timeline-overview-svg")

(defn view [{:keys [width height]}]
  (ir/el :div {:class "timeline-chart"}
         (ir/el :div {:class "timeline-chart-main"}
                (ir/el :svg {:key :main :opaque true :class main-svg-class :width width :height height}))
         (ir/el :div {:class "timeline-chart-overview"}
                (ir/el :svg {:key :overview :opaque true :class overview-svg-class :width width :height 80}))))

(defn render!
  "Call after data/time-range change (see ns docstring). `on-time-range-change`
  is forwarded to d3-interop's brush handler unchanged."
  [{:keys [data filters width height time-range analysis-results on-time-range-change]}]
  (when-let [main-el (js/document.querySelector (str "." main-svg-class))]
    (d3/render-timeline! main-el
      {:data data :filters filters :width (max width 1000) :height height
       :time-range time-range :analysis-results analysis-results
       :normalize-emotion-name emo/normalize-emotion-name}))
  (when-let [overview-el (js/document.querySelector (str "." overview-svg-class))]
    (d3/render-overview-chart! overview-el
      {:data data :width (max width 1000) :time-range time-range
       :on-time-range-change on-time-range-change})))
