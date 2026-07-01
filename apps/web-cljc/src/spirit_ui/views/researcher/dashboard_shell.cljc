(ns spirit-ui.views.researcher.dashboard-shell
  "Port of apps/researcher/src/routes/+page.svelte, minus the 3D
  <TimelineVisualization> panel (phase 3) and the mocked-data
  AnalyticsOverview cards (already placeholder/hardcoded numbers in the
  original — not a data source worth porting as-is). Keeps the live
  GET /api/participants \"select subject\" chip list."
  (:require [spirit-ui.ir :as ir]))

(defn- participant-chip [selected-id p]
  (ir/el :button
         {:key (:id p) :type "button"
          :class (when (= selected-id (:id p)) "selected")
          :ui/on {:click [:select-participant (:id p)]}}
         (subs (:id p) 0 (min 8 (count (:id p))))))

(defn view [state]
  (let [participants (get-in state [:data :participants] [])
        selected-id (get-in state [:form :selected-participant-id])]
    (ir/el :article {:class "dashboard"}
           (ir/el :h1 {} "Researcher Dashboard")
           (ir/el :section {}
                  (ir/el :h2 {} "Select Subject")
                  (if (seq participants)
                    (ir/el :div {:class "chip-row"} (mapv (partial participant-chip selected-id) participants))
                    (ir/el :p {} "No participants yet.")))
           (ir/el :section {}
                  (ir/el :h2 {} "Neural Analysis")
                  (if selected-id
                    (ir/el :p {} (str "Force3D visualization for " selected-id
                                       " not yet ported (phase 3 — kami-engine結合)."))
                    (ir/el :p {} "Select a subject above."))))))
