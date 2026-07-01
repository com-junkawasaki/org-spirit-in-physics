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
  :sessionId :eventType} — with :emotions/:physiological always empty (that
  analysis pipeline isn't wired server-side yet, not a client bug).")

(defn ->point [{:keys [time word reactionTime hasResponse emotions physiological reactionValue sessionId eventType]}]
  {:timestamp (.getTime (js/Date. time))
   :word (or word "")
   :reaction-time (* (or reactionTime 0) 1000) ;; backend seconds -> chart ms, matches original's `* 1000`
   :has-response (boolean hasResponse)
   :emotions (mapv (fn [e] {:name (:name e) :score (:score e)}) (or emotions []))
   :physiological (mapv (fn [p] {:value (:value p) :measurement-type (:measurementType p)}) (or physiological []))
   :reaction-value (or reactionValue 0)
   :session-id sessionId
   :event-type (or eventType "")})

(defn- sessions-with-words
  "Distinct :session-id values among points with a non-blank :word — matches
  the original's `points.filter(p => p.word)` (JS truthy: \"\" excluded)
  then `new Set(...map(sessionId))`."
  [points]
  (into [] (distinct) (keep (fn [p] (when (seq (:word p)) (:session-id p))) points)))

(defn- session-latest-timestamp [points session-id]
  (apply max 0 (mapv :timestamp (filter #(= (:session-id %) session-id) points))))

(defn narrow-to-latest-session
  "Port of TimelineVisualization.svelte's fetchData 'no sessionId supplied'
  branch: the real caller (participants/[id]/+page.svelte) never passes a
  sessionId, so in the original this ALWAYS runs when a participant has
  more than one session with word-response data — without it, sessions
  recorded weeks/months apart get merged onto one timeline, exactly the
  'massive time gaps' problem the original comment names. Was missing
  entirely from the first pass of this port; found via /review, PR #22."
  [points]
  (let [sessions (sessions-with-words points)]
    (if (> (count sessions) 1)
      (let [latest (apply max-key (partial session-latest-timestamp points) sessions)]
        (filterv #(= (:session-id %) latest) points))
      points)))

(defn ->points [raw-points]
  (->> raw-points
       (into [] (comp (map ->point) (filter #(not (js/isNaN (:timestamp %))))))
       narrow-to-latest-session))

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
