(ns spirit-ui.views.shared.timeline-chart
  "Port of apps/web/src/lib/components/researcher/TimelineChart.svelte. The
  original re-renders imperatively inside a Svelte `$effect` whenever
  data/timeRange change — this app has no reactive-effect system, so the
  two <svg> containers are mounted once as `:opaque` (see dom.cljs) empty
  shells, and `render!` is called EXPLICITLY by whichever state handler
  changed the chart's inputs (spirit-ui.views.shared.timeline-visualization's
  :timeline-loaded and :set-time-range handlers), via state/defer! — same
  explicit-trigger pattern as spirit-ui.views.web.paper's mount-effects!.
  Unlike paper.cljc's KaTeX use of :opaque (content that never changes after
  mount), this opaque subtree's DOM content DOES change over time — just
  never through the normal IR-diff render cycle, only through `render!`'s
  direct d3-interop calls. See dom.cljs's :opaque docstring's warning about
  this exact case (\"a future caller needing periodic updates ... needs a
  different mechanism\") — this explicit-trigger-per-handler approach IS
  that different mechanism, deliberately bypassing the diff renderer for
  this subtree entirely rather than trying to fit it through :opaque's
  equality-gated skip."
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
