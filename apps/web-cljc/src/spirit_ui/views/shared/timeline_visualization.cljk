(ns spirit-ui.views.shared.timeline-visualization
  "Port of apps/web/src/lib/components/researcher/TimelineVisualization.svelte
  — SHELL ONLY (tab switch + data fetch) plus the 'timeline' tab's content
  (KPICards + TimelineChart). The 'force3d' tab (Force3DThrelte/
  Force3DControls/StructureAnalysisPanel, kami-engine結合) is a placeholder
  pending Phase 3 (ADR-2607012330's explicit out-of-scope boundary) — those
  components, plus the graphData/anchor2d/force-preset machinery that only
  feeds them, are NOT ported here.

  This namespace is shared (spirit-ui.views.shared, not web/researcher-
  specific) because the original is imported identically by both apps'
  routes — matches the existing consolidation-into-one-namespace pattern
  from earlier phases. `register-handlers!` is called once from each app's
  entry point (web_main.cljc / researcher_main.cljc), same as every other
  shared-view namespace's handlers in this app."
  (:require [spirit-ui.api-client :as api]
            [spirit-ui.data.timeline-mapping :as tl]
            [spirit-ui.ir :as ir]
            [spirit-ui.state :as state]
            [spirit-ui.views.shared.kpi-cards :as kpi-cards]
            [spirit-ui.views.shared.timeline-chart :as timeline-chart]))

(def default-filters
  {:reaction-values true :reaction-time true :physiological true :emotions true})

(defn load-timeline!
  "Thunk (see spirit-ui.state/dispatch!'s fn-of-2-args form) — fetches
  /api/timeline/integrated for `participant-id` and dispatches
  :timeline-loaded/:timeline-error."
  [participant-id]
  (fn [_state dispatch!]
    (dispatch! [:timeline-loading])
    (-> (api/get-integrated-timeline! participant-id)
        (.then (fn [{:keys [ok body]}]
                 (if (and ok (seq (:points body)))
                   (dispatch! [:timeline-loaded body])
                   (dispatch! [:timeline-error "No timeline data found for this participant"]))))
        (.catch (fn [^js err] (dispatch! [:timeline-error (or (.-message err) "Failed to fetch visualization data")]))))))

(defn- render-chart! [s]
  (timeline-chart/render!
   {:data (get-in s [:timeline :data]) :filters default-filters :width 1000 :height 850
    :time-range (get-in s [:timeline :time-range]) :analysis-results (get-in s [:timeline :analysis])
    :on-time-range-change (fn [range] (state/dispatch! [:set-time-range range]))}))

(defn register-handlers! []
  (state/register-handler! :timeline-loading
    ;; :active-tab reset to "timeline" here (not just :loading?/:error) —
    ;; without it, picking "3D Space" on one participant then navigating to
    ;; a DIFFERENT participant silently opened their page on the (still
    ;; placeholder) 3D tab instead of the timeline (found via /review, PR
    ;; #22). :timeline-loading fires at the start of every load-timeline!
    ;; call, i.e. every fresh route entry — the natural reset point.
    (fn [s] (-> s (assoc-in [:timeline :loading?] true) (assoc-in [:timeline :error] nil)
                (assoc-in [:timeline :active-tab] "timeline"))))
  (state/register-handler! :timeline-error
    (fn [s msg] (-> s (assoc-in [:timeline :loading?] false) (assoc-in [:timeline :error] msg))))
  (state/register-handler! :timeline-loaded
    (fn [s {:keys [points analysis]}]
      (let [mapped (tl/->points points)
            s' (-> s (assoc-in [:timeline :loading?] false)
                   (assoc-in [:timeline :error] nil)
                   (assoc-in [:timeline :data] mapped)
                   (assoc-in [:timeline :analysis] (tl/->analysis analysis))
                   (assoc-in [:timeline :time-range] (tl/extent-time-range mapped)))]
        ;; svg containers only exist in the DOM after THIS handler's state
        ;; change commits (loading? true -> false swaps the placeholder for
        ;; timeline-chart/view's :opaque <svg> shells) — defer! per
        ;; spirit-ui.state's dispatch! GOTCHA docstring.
        (state/defer! #(render-chart! s'))
        s')))
  (state/register-handler! :set-time-range
    (fn [s range]
      (let [s' (assoc-in s [:timeline :time-range] range)]
        (state/defer! #(render-chart! s'))
        s')))
  (state/register-handler! :set-active-tab
    ;; Switching FROM "force3d" back TO "timeline" destroys and recreates
    ;; the :opaque <svg> shells (timeline_chart.cljc's view has no dynamic
    ;; content of its own — dom.cljs's keyed-diff sees the tab-content
    ;; subtree's shape change and rebuilds it fresh, empty). Unlike
    ;; :timeline-loaded/:set-time-range, this handler doesn't otherwise
    ;; change chart INPUTS, but it does change which physical DOM nodes
    ;; back the chart — so it needs the same render-chart! trigger (found
    ;; via /review, PR #22: this was the one chart-affecting handler that
    ;; omitted it, leaving the chart permanently blank after any 3D-Space
    ;; round trip).
    (fn [s tab]
      (let [s' (assoc-in s [:timeline :active-tab] tab)]
        (when (= tab "timeline")
          (state/defer! #(render-chart! s')))
        s'))))

;; ---------- view ----------

(defn- tab-button [{:keys [active-tab tab label]}]
  (ir/el :button {:key tab :type "button" :class (str "tab-button" (when (= active-tab tab) " active"))
                   :ui/on {:click [:set-active-tab tab]}}
         label))

(defn view [state]
  (let [{:keys [loading? error data active-tab]} (get state :timeline {})
        active-tab (or active-tab "timeline")]
    (ir/el :div {:class "timeline-visualization"}
           (ir/el :div {:class "timeline-tabs"}
                  (tab-button {:active-tab active-tab :tab "timeline" :label "Timeline"})
                  (tab-button {:active-tab active-tab :tab "force3d" :label "3D Space"}))
           (cond
             loading?
             (ir/el :div {:class "timeline-loading"} (ir/el :p {} "Analyzing Neural Patterns..."))

             error
             (ir/el :div {:class "timeline-error"}
                    (ir/el :h3 {} "Signal Interrupted")
                    (ir/el :p {} error))

             (= active-tab "force3d")
             (ir/el :div {:class "timeline-force3d-placeholder"}
                    (ir/el :p {}
                           "Force3D visualization for this participant is not yet ported "
                           "(requires kami-engine-sdk-clj integration — see ADR phase 3)."))

             :else
             (ir/el :div {:class "timeline-tab-content"}
                    (kpi-cards/view {:data data})
                    (timeline-chart/view {:width 1000 :height 850}))))))
