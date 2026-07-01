(ns spirit-ui.data.timeline-mapping
  "Maps api-worker-cljc's /api/timeline/integrated response (spirit.routes.
  timeline/integrated!, already js->clj :keywordize-keys true'd by
  api-client.cljc — so keys here are the raw camelCase JSON keys, not
  kebab-case) into the point shape spirit-ui.d3-interop/spirit-ui.views.
  shared.timeline-chart expect.

  DEVIATION from the original TS worker's compact-format parsing
  (`item.t.{s,n}` / snake_case fallbacks in TimelineVisualization.svelte's
  fetchData): the CLJC backend (spirit.routes.timeline/build-timeline-points)
  always emits a plain shape — {:time <ISO8601> :word :reactionTime (already
  in SECONDS) :hasResponse :emotions [] :physiological [] :reactionValue
  :eventType} — with :emotions/:physiological always empty (that analysis
  pipeline isn't wired server-side yet, not a client bug).")

(defn ->point [{:keys [time word reactionTime hasResponse emotions physiological reactionValue eventType]}]
  {:timestamp (.getTime (js/Date. time))
   :word (or word "")
   :reaction-time (* (or reactionTime 0) 1000) ;; backend seconds -> chart ms, matches original's `* 1000`
   :has-response (boolean hasResponse)
   :emotions (mapv (fn [e] {:name (:name e) :score (:score e)}) (or emotions []))
   :physiological (mapv (fn [p] {:value (:value p) :measurement-type (:measurementType p)}) (or physiological []))
   :reaction-value (or reactionValue 0)
   :event-type (or eventType "")})

(defn ->points [raw-points]
  (into [] (comp (map ->point) (filter #(not (js/isNaN (:timestamp %))))) raw-points))

(defn ->analysis [{:keys [gapAreas densityRegions duplicates ghostPatterns overallDensity]}]
  {:gap-areas (or gapAreas [])
   :density-regions (or densityRegions [])
   :duplicates (or duplicates [])
   :ghost-patterns (or ghostPatterns [])
   :overall-density (or overallDensity 0)})

(defn extent-time-range [points]
  (when (seq points)
    (let [ts (mapv :timestamp points)]
      {:start (apply min ts) :end (apply max ts)})))
