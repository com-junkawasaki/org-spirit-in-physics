(ns spirit-ui.d3-interop
  "Interop wrap for d3 (ADR-2606290000 exemption clause — TS-only libraries
  are interop-wrapped, not reimplemented; same tactic as katex-interop.cljc
  and the WebAuthn wraps). Faithful 1:1 port of
  apps/web/src/lib/components/researcher/TimelineChart.svelte's `$effect`
  D3-imperative rendering (renderTimeline/renderOverviewChart) — d3 mutates
  the SVG's DOM directly (append/attr/select chains), so callers MUST treat
  the mounted <svg> as an `:opaque` (see dom.cljs) host-managed subtree,
  same as spirit-ui.katex-interop's contract.

  d3 selection objects returned by `d3/select` etc. have no Closure externs
  (they're plain npm objects) — every local bound to one is `^js`-hinted so
  advanced-mode compilation doesn't rename `.attr`/`.append`/etc."
  (:require ["d3" :as d3]))

;; ---------- pure helpers (no DOM) ----------

(defn to-date
  "Faithful port of TimelineChart's toDate: treats ts as seconds if it's
  small enough to not already be an epoch-ms value (heuristic from the
  original; our backend always emits proper epoch-ms so the `* 1000`
  branch is effectively dead here, kept for parity)."
  [ts]
  (if (or (nil? ts) (not (number? ts)) (js/isNaN ts))
    (js/Date.)
    (js/Date. (if (> ts 1e12) ts (* ts 1000)))))

(defn- max-or
  "Port of the original's `d3.max(xs, accessor) || fallback` idiom — NOT the
  same as a floor/`(apply max fallback xs)`. JS `||` only falls back when
  the computed max is falsy (0 here, since every accessor already coerces
  to a non-negative number) — a small-but-truthy real max (e.g. 0.005) is
  used as-is, not clamped up to `fallback`. Mistranslating this as a floor
  was a real bug found via /review (PR #22): reaction-value is always
  ~1e-4..1e-2 (backend: 1/reactionTimeMs), so `(apply max 1 xs)` returned 1
  for every real dataset, flattening the Reaction Value line to the bottom
  of its lane."
  [xs fallback]
  (let [m (if (seq xs) (apply max xs) 0)]
    (if (zero? m) fallback m)))

(defn- pad-if-degenerate
  "[d0 d1] unchanged, unless they're the same instant — then d1 is pushed
  60s out. Same zero-width-domain guard the original applies to both the
  main chart and the overview brush chart; shared here (both
  render-overview-chart! and timeline-extent call this) so a future change
  to the pad amount only needs one edit."
  [^js d0 ^js d1]
  (if (= (.getTime d0) (.getTime d1)) [d0 (js/Date. (+ (.getTime d0) 60000))] [d0 d1]))

(defn sparkline-path
  "KPICards' getPath: pure function, no DOM — returns an SVG path `d`
  string for a 0-100 normalized viewBox. Safe to call directly from
  cljc-ui-IR (no :opaque needed, unlike the timeline chart below)."
  [sparkline]
  (if (empty? sparkline)
    ""
    (let [n (count sparkline)
          valid (filterv #(and (number? %) (not (js/isNaN %))) sparkline)
          max-val (apply max 1 valid)
          ^js line (-> (d3/line)
                       (.defined (fn [d] (and (number? d) (not (js/isNaN d)))))
                       (.x (fn [_ i] (* (/ i (max 1 (dec n))) 100)))
                       (.y (fn [d] (- 100 (* (/ d max-val) 100))))
                       (.curve d3/curveMonotoneX))]
      (or (line (clj->js sparkline)) ""))))

;; ---------- imperative D3 rendering (host-mutated DOM, needs :opaque) ----------

(defn render-overview-chart!
  "Mini area chart + time-range brush below the main timeline. `on-time-range-change`
  is called with {:start ms :end ms} (or nil, matching the original's
  `event.selection == null` branch) whenever the brush moves."
  [^js svg-el {:keys [data width time-range on-time-range-change]}]
  (when svg-el
    (let [^js svg (d3/select svg-el)
          _ (-> (.selectAll svg "*") (.remove))
          margin {:top 5 :right 30 :bottom 25 :left 50}
          overview-width (- width (:left margin) (:right margin))
          overview-height (- 80 (:top margin) (:bottom margin))
          ^js g (-> svg (.append "g") (.attr "transform" (str "translate(" (:left margin) "," (:top margin) ")")))
          sorted (vec (sort-by :timestamp data))]
      (when (seq sorted)
        (let [ts-fn (fn [d] (to-date (:timestamp d)))
              [extent0 extent1] (pad-if-degenerate (to-date (:timestamp (first sorted)))
                                                    (to-date (:timestamp (last sorted))))
              ^js x-scale (-> (d3/scaleTime) (.domain #js [extent0 extent1]) (.range #js [0 overview-width]))
              rv-vals (mapv #(or (:reaction-value %) 0) data)
              rv-min (apply min rv-vals)
              rv-max0 (apply max rv-vals)
              rv-max (if (= rv-min rv-max0) (inc rv-max0) rv-max0)
              ^js y-scale (-> (d3/scaleLinear) (.domain #js [rv-min rv-max]) (.range #js [overview-height 0]))
              ^js area (-> (d3/area)
                           (.x (fn [d] (x-scale (ts-fn d))))
                           (.y0 overview-height)
                           (.y1 (fn [d] (y-scale (or (:reaction-value d) 0))))
                           (.curve d3/curveMonotoneX))]
          (-> g (.append "path") (.datum (to-array sorted)) (.attr "d" area)
              (.attr "class" "fill-blue-500/10 stroke-blue-500/30")
              (.style "stroke-width" 1))
          (let [is-updating-brush? (volatile! false)
                ^js brush (-> (d3/brushX)
                              (.extent #js [#js [0 0] #js [overview-width overview-height]])
                              (.on "brush end"
                                   (fn [^js event]
                                     (when-not @is-updating-brush?
                                       (if-not (.-selection event)
                                         (when on-time-range-change
                                           (on-time-range-change {:start (.getTime extent0) :end (.getTime extent1)}))
                                         (let [sel (.-selection event)
                                               x0 (aget sel 0) x1 (aget sel 1)]
                                           (when on-time-range-change
                                             (on-time-range-change {:start (.getTime (.invert x-scale x0))
                                                                     :end (.getTime (.invert x-scale x1))}))))))))
                ^js brush-group (-> g (.append "g") (.attr "class" "brush") (.call brush))]
            (-> (.selectAll brush-group ".selection") (.attr "stroke" "none") (.attr "fill" "rgba(59, 130, 246, 0.2)"))
            (when time-range
              (let [x0 (x-scale (to-date (:start time-range)))
                    x1 (x-scale (to-date (:end time-range)))]
                (vreset! is-updating-brush? true)
                (.call brush-group (.-move brush) #js [x0 x1])
                (js/requestAnimationFrame (fn [] (vreset! is-updating-brush? false))))))
          (let [^js x-axis (-> (d3/axisBottom x-scale) (.ticks 5) (.tickFormat (d3/timeFormat "%H:%M")) (.tickSize 0) (.tickPadding 10))
                ^js gx (-> g (.append "g") (.attr "transform" (str "translate(0," overview-height ")"))
                           (.attr "class" "text-gray-400 text-[10px]") (.call x-axis))]
            (-> gx (.select ".domain") (.remove))))))))

(def ^:private emotion-config
  [{:key :joy :label "Joy" :color "#f59e0b"}
   {:key :sadness :label "Sadness" :color "#374151"}
   {:key :anger :label "Anger" :color "#ef4444"}
   {:key :fear :label "Fear" :color "#a78bfa"}
   {:key :surprise :label "Surprise" :color "#22c55e"}
   {:key :disgust :label "Disgust" :color "#10b981"}
   {:key :calm :label "Calm" :color "#93c5fd"}
   {:key :focus :label "Focus" :color "#60a5fa"}
   {:key :excitement :label "Excitement" :color "#f97316"}
   {:key :confusion :label "Confusion" :color "#64748b"}])

(def ^:private timeline-sections
  [{:id "rv" :label "Reaction Value" :color "#3b82f6"}
   {:id "rt" :label "Reaction Time" :color "#ef4444"}
   {:id "phys" :label "Physiological" :color "#10b981"}
   {:id "emo" :label "Emotions" :color "#8b5cf6"}])

(defn- filter-points [data time-range]
  (vec (sort-by :timestamp
                (filterv (fn [d]
                           (and (some? (:timestamp d)) (not (js/isNaN (:timestamp d)))
                                (or (nil? time-range)
                                    (and (>= (:timestamp d) (:start time-range))
                                         (<= (:timestamp d) (:end time-range))))))
                         data))))

(defn- timeline-extent [filtered time-range]
  (let [d0 (if time-range (to-date (:start time-range)) (to-date (:timestamp (first filtered))))
        d1 (if time-range (to-date (:end time-range)) (to-date (:timestamp (last filtered))))]
    (pad-if-degenerate d0 d1)))

(defn- render-sections! [^js g section-height inner-width left-margin]
  (doseq [[i s] (map-indexed vector timeline-sections)]
    (let [y0 (* i section-height)]
      (when (even? i)
        (-> g (.append "rect") (.attr "x" 0) (.attr "y" y0) (.attr "width" inner-width)
            (.attr "height" section-height) (.attr "class" "fill-gray-50/50 dark:fill-gray-800/20")))
      (when (pos? i)
        (-> g (.append "line") (.attr "x1" 0) (.attr "y1" y0) (.attr "x2" inner-width) (.attr "y2" y0)
            (.attr "class" "stroke-gray-100 dark:stroke-gray-800")))
      (let [^js label-group (-> g (.append "g")
                                 (.attr "transform" (str "translate(" (- 20 left-margin) ", " (+ y0 (/ section-height 2)) ")")))]
        (-> label-group (.append "text") (.attr "x" 15) (.attr "y" 0) (.attr "text-anchor" "start")
            (.attr "dominant-baseline" "middle")
            (.attr "class" "fill-gray-600 dark:fill-gray-300 text-[11px] font-black uppercase tracking-widest")
            (.style "font-family" "Inter, system-ui, sans-serif")
            (.text (:label s)))
        (-> label-group (.append "circle") (.attr "cx" 0) (.attr "cy" 0) (.attr "r" 5)
            (.attr "fill" (:color s)) (.attr "class" "filter drop-shadow-sm"))))))

(defn- render-reaction-value! [^js g x-scale data filtered section-height]
  (let [rv-max (max-or (mapv #(or (:reaction-value %) 0) data) 1)
        ^js rv-scale (-> (d3/scaleLinear) (.domain #js [0 rv-max]) (.range #js [(- section-height 10) 10]))
        ^js line (-> (d3/line) (.x (fn [d] (x-scale (to-date (:timestamp d)))))
                     (.y (fn [d] (rv-scale (or (:reaction-value d) 0)))) (.curve d3/curveMonotoneX))
        ;; word && word !== 'Unknown' in JS: "" is falsy, so blank words are
        ;; excluded. CLJS truthiness differs ("" is truthy) — (seq %) treats
        ;; blank/nil the same way JS's `&&` did (found via /review, PR #22).
        with-word (filterv #(and (seq (:word %)) (not= (:word %) "Unknown")) filtered)]
    (-> g (.append "path") (.datum (to-array filtered)) (.attr "d" line)
        (.attr "class" "fill-none stroke-blue-500") (.style "stroke-width" 2.5) (.style "stroke-linecap" "round"))
    (-> g (.selectAll ".rv-dot") (.data (to-array with-word)) (.enter) (.append "circle")
        (.attr "cx" (fn [d] (x-scale (to-date (:timestamp d)))))
        (.attr "cy" (fn [d] (rv-scale (or (:reaction-value d) 0))))
        (.attr "r" 4) (.attr "class" "fill-white stroke-blue-500") (.style "stroke-width" 2))))

(defn- render-reaction-time! [^js g x-scale data filtered section-height]
  (let [rt-max (max-or (mapv #(or (:reaction-time %) 0) data) 5000)
        ^js rt-scale (-> (d3/scaleLinear) (.domain #js [0 rt-max])
                         (.range #js [(- (* section-height 2) 10) (+ section-height 10)]))
        responded (filterv :has-response filtered)]
    (-> g (.selectAll ".rt-dot") (.data (to-array responded)) (.enter) (.append "circle")
        (.attr "cx" (fn [d] (x-scale (to-date (:timestamp d)))))
        (.attr "cy" (fn [d] (rt-scale (or (:reaction-time d) 0))))
        (.attr "r" 4) (.attr "class" "fill-red-500"))))

(defn- phys-ch3
  "spirit-ui.data.timeline-mapping/->point is the single normalization
  point for :physiological readings — it always renames to :measurement-type
  (kebab-case), so a raw :measurement_type here can never occur; no dual-key
  fallback needed (removed one during /review, PR #22 — it read as
  ambiguity that didn't exist)."
  [d]
  (or (some #(when (= (:measurement-type %) "Ch3") (:value %)) (:physiological d))
      0))

(defn- render-physiological! [^js g x-scale filtered section-height]
  (let [^js phys-scale (-> (d3/scaleLinear) (.domain #js [0 3])
                           (.range #js [(- (* section-height 3) 10) (+ (* section-height 2) 10)]))
        ^js line (-> (d3/line) (.x (fn [d] (x-scale (to-date (:timestamp d))))) (.y (fn [d] (phys-scale (phys-ch3 d))))
                     (.curve d3/curveMonotoneX))
        ^js area (-> (d3/area) (.x (fn [d] (x-scale (to-date (:timestamp d)))))
                     (.y0 (- (* section-height 3) 5)) (.y1 (fn [d] (phys-scale (phys-ch3 d))))
                     (.curve d3/curveMonotoneX))]
    (-> g (.append "path") (.datum (to-array filtered)) (.attr "d" line)
        (.attr "class" "fill-none stroke-emerald-500") (.style "stroke-width" 2))
    (-> g (.append "path") (.datum (to-array filtered)) (.attr "d" area)
        (.attr "class" "fill-emerald-500/10 stroke-none"))))

(defn- emotion-scores [normalize-emotion-name d]
  (reduce (fn [acc e]
            (if-let [k (normalize-emotion-name (:name e))]
              (update acc k #(max (or % 0) (or (:score e) 0)))
              acc))
          {} (:emotions d)))

(defn- render-emotion-lanes! [^js g x-scale filtered section-height inner-width normalize-emotion-name]
  (let [lane-height (/ (- section-height 20) (count emotion-config))]
    (doseq [[i config] (map-indexed vector emotion-config)]
      (let [y0 (+ (* section-height 3) 10 (* i lane-height))]
        (-> g (.append "text") (.attr "x" (+ inner-width 5)) (.attr "y" (+ y0 (/ lane-height 2)))
            (.attr "class" "fill-gray-400 text-[7px] uppercase font-bold") (.attr "dominant-baseline" "middle")
            (.text (:label config)))
        (doseq [d filtered]
          (let [score (get (emotion-scores normalize-emotion-name d) (:key config))]
            (when (and score (> score 0.05))
              (-> g (.append "rect")
                  (.attr "x" (- (x-scale (to-date (:timestamp d))) 1))
                  (.attr "y" y0) (.attr "width" 2) (.attr "height" (dec lane-height)) (.attr "rx" 0.5)
                  (.attr "fill" (:color config)) (.style "opacity" (max 0.3 score))))))))))

(defn- render-x-axis! [^js g x-scale inner-width inner-height]
  (let [^js x-axis (-> (d3/axisBottom x-scale) (.ticks (if (> inner-width 800) 10 5))
                       (.tickFormat (d3/timeFormat "%H:%M:%S")) (.tickSize (- inner-height)) (.tickPadding 15))
        ^js gx (-> g (.append "g") (.attr "transform" (str "translate(0," inner-height ")"))
                  (.attr "class" "text-gray-400 text-[10px]") (.call x-axis))]
    (-> gx (.select ".domain") (.remove))
    (-> gx (.selectAll ".tick line") (.attr "class" "stroke-gray-100 dark:stroke-gray-800") (.style "stroke-dasharray" "2,2"))))

;; Analysis overlays: the original (TS worker) shape keyed gap areas by
;; nearby_nodes/nearbyNodes labels and re-derived a time range by matching
;; those labels against `data`. The CLJC backend
;; (spirit.routes.timeline/gap-areas) instead emits the time range directly
;; as {:id :start :end :durationMs} — no label cross-referencing needed or
;; possible (nearby-nodes doesn't exist in this response shape). Adapted,
;; not a 1:1 port, to match the actual backend contract.
(defn- render-gap-overlay! [^js analysis-g x-scale inner-height gap]
  (when (and (:start gap) (:end gap))
    (let [x0 (x-scale (to-date (.getTime (js/Date. (:start gap)))))
          x1 (x-scale (to-date (.getTime (js/Date. (:end gap)))))]
      (-> analysis-g (.append "rect")
          (.attr "x" x0) (.attr "y" 0)
          (.attr "width" (max 2 (- x1 x0)))
          (.attr "height" inner-height)
          (.attr "class" "fill-yellow-400/5 stroke-yellow-400/20")
          (.style "stroke-dasharray" "4,2"))
      (-> analysis-g (.append "text")
          (.attr "x" x0) (.attr "y" -5)
          (.attr "class" "fill-yellow-600 text-[8px] font-black uppercase")
          (.text "Potential Gap")))))

(defn- render-analysis-overlays! [^js g x-scale inner-height analysis-results]
  (when analysis-results
    (let [^js analysis-g (-> g (.append "g") (.attr "class" "analysis-overlays"))]
      (doseq [gap (:gap-areas analysis-results)]
        (render-gap-overlay! analysis-g x-scale inner-height gap)))))

(defn render-timeline!
  "Main multi-lane timeline: reaction value line, reaction time dots,
  physiological (Ch3 arousal) line+area, 10 stacked emotion-intensity
  lanes, gap-area analysis overlays. `normalize-emotion-name` is injected
  (spirit-ui.data.emotion-normalization/normalize-emotion-name) rather than
  required directly, keeping this .cljs interop namespace decoupled from
  the .cljc data namespace."
  [^js svg-el {:keys [data filters width height time-range analysis-results normalize-emotion-name]}]
  (when svg-el
    (let [^js svg (d3/select svg-el)
          margin {:top 40 :right 100 :bottom 40 :left 200}
          inner-width (- width (:left margin) (:right margin))
          inner-height (- height (:top margin) (:bottom margin))
          filtered (filter-points data time-range)]
      (-> (.selectAll svg "*") (.remove))
      (when (seq filtered)
        (let [[extent0 extent1] (timeline-extent filtered time-range)
              ^js x-scale (-> (d3/scaleTime) (.domain #js [extent0 extent1]) (.range #js [0 inner-width]))
              ^js g (-> svg (.append "g") (.attr "transform" (str "translate(" (:left margin) "," (:top margin) ")")))
              section-height (/ inner-height (count timeline-sections))]
          (render-sections! g section-height inner-width (:left margin))
          (when (:reaction-values filters) (render-reaction-value! g x-scale data filtered section-height))
          (when (:reaction-time filters) (render-reaction-time! g x-scale data filtered section-height))
          (when (:physiological filters) (render-physiological! g x-scale filtered section-height))
          (render-emotion-lanes! g x-scale filtered section-height inner-width normalize-emotion-name)
          (render-x-axis! g x-scale inner-width inner-height)
          (render-analysis-overlays! g x-scale inner-height analysis-results))))))
