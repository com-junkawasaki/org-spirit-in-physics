(ns spirit-ui.views.shared.kpi-cards
  "Port of apps/web/src/lib/components/researcher/KPICards.svelte. Pure
  cljc-ui-IR (no :opaque needed) — the sparkline SVG path is computed by
  spirit-ui.d3-interop/sparkline-path, a pure string-returning function, so
  the whole card is ordinary declarative IR the diff renderer can patch
  normally.

  DEVIATION from the original: the per-card 'previous value' delta badge
  (↑/↓ %) was generated via Math.random() in the original — explicitly a
  demo placeholder per its own code comment, not real historical data.
  Showing a fabricated trend indicator on a research tool's KPIs would be
  misleading, so this port drops the delta badge entirely (owner decision,
  2026-07-01, see ADR-2607012330). The 'Total Responses' card's sparkline
  was ALSO random in the original (there's no real per-point history for a
  single aggregate count); this port uses an honest substitute — a
  cumulative running count of responses over the visible data — instead of
  fabricating one."
  (:require [kotoba.lang.text :as str]
            [spirit-ui.d3-interop :as d3]
            [spirit-ui.ir :as ir]))

(defn- avg [xs] (if (seq xs) (/ (reduce + 0.0 xs) (count xs)) 0))

(defn- running-response-count [data]
  (:acc (reduce (fn [{:keys [acc total]} d]
                  (let [total' (+ total (if (:has-response d) 1 0))]
                    {:acc (conj acc total') :total total'}))
                {:acc [] :total 0} data)))

(defn- cards [data]
  (when (seq data)
    (let [n (count data)
          avg-rt (avg (mapv #(or (:reaction-time %) 0) data))
          avg-rv (avg (mapv #(or (:reaction-value %) 0) data))
          responded (count (filter :has-response data))
          response-rate (* (/ responded n) 100)]
      [{:title "Avg Reaction Time" :icon "⏱️" :value avg-rt :unit "ms"
        :sparkline (vec (take-last 20 (mapv #(or (:reaction-time %) 0) data)))}
       {:title "Avg Reaction Value" :icon "📈" :value avg-rv :unit ""
        :sparkline (vec (take-last 20 (mapv #(or (:reaction-value %) 0) data)))}
       {:title "Response Rate" :icon "🎯" :value response-rate :unit "%"
        :sparkline (vec (take-last 20 (mapv #(if (:has-response %) 1 0) data)))}
       {:title "Total Responses" :icon "📝" :value responded :unit ""
        :sparkline (vec (take-last 20 (running-response-count data)))}])))

(defn- format-value [{:keys [value unit]}]
  (str (.toFixed value (cond (= unit "%") 1 (= unit "ms") 0 :else 2)) (when (seq unit) (str " " unit))))

(defn- safe-id [title] (str/replace (str/lower title) #"[^a-z0-9]" "-"))

(defn- card [{:keys [title icon value unit sparkline] :as c}]
  (ir/el :div {:key title :class "kpi-card"}
         (ir/el :div {:class "kpi-card-header"}
                (ir/el :span {:class "kpi-card-icon"} icon))
         (ir/el :h3 {:class "kpi-card-title"} title)
         (ir/el :div {:class "kpi-card-value"} (format-value c))
         (ir/el :div {:class "kpi-card-sparkline"}
                (ir/el :svg {:width "100%" :height "100%" :viewBox "0 0 100 100" :preserveAspectRatio "none"}
                       (ir/el :path {:d (d3/sparkline-path sparkline) :fill "none" :stroke "currentColor"
                                     :stroke-width 3 :stroke-linecap "round" :stroke-linejoin "round"
                                     :class (str "kpi-sparkline-path kpi-" (safe-id title))})))))

(defn view [{:keys [data]}]
  (when-let [cs (cards data)]
    (ir/el :div {:class "kpi-cards-grid"} (mapv card cs))))
