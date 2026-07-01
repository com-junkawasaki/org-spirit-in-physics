(ns spirit-ui.views.researcher.participant-detail
  "Port of apps/researcher/src/routes/participants/[id]/+page.svelte — the
  original file is almost entirely the 3D <TimelineVisualization> embed
  (Force3D, kami-engine結合 — explicitly out of scope, see the ADR's phase
  3). This is the shell (header/breadcrumb) around where that panel will
  mount once phase 3 lands."
  (:require [spirit-ui.forms :as forms]
            [spirit-ui.ir :as ir]))

(defn view [state]
  (let [participant-id (get-in state [:route :id])]
    (ir/el :article {:class "participant-detail"}
           (forms/button {:label "< Back to participants" :on-click [:navigate "/participants"]})
           (ir/el :header {}
                  (ir/el :span {:class "badge"} "Participant Analysis")
                  (ir/el :h1 {:class "participant-id"} participant-id))
           (ir/el :div {:class "visualization-placeholder"}
                  (ir/el :p {}
                         "Force3D timeline visualization for this participant is not yet ported "
                         "(requires kami-engine-sdk-clj integration — see ADR phase 3). "
                         "View this participant's raw session/timeline data via the legacy "
                         "researcher app in the meantime.")))))
