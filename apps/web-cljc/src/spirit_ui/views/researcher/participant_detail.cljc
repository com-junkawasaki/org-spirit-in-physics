(ns spirit-ui.views.researcher.participant-detail
  "Port of apps/researcher/src/routes/participants/[id]/+page.svelte —
  almost entirely a <TimelineVisualization> embed. Phase 4
  (ADR-2607012330) ports that component's 'timeline' tab (KPICards +
  TimelineChart, D3 interop); the 'force3d' tab remains a placeholder
  pending Phase 3 (kami-engine結合)."
  (:require [spirit-ui.forms :as forms]
            [spirit-ui.ir :as ir]
            [spirit-ui.views.shared.timeline-visualization :as timeline-viz]))

(defn view [state]
  (let [participant-id (get-in state [:route :id])]
    (ir/el :article {:class "participant-detail"}
           (forms/button {:label "< Back to participants" :on-click [:navigate "/participants"]})
           (ir/el :header {}
                  (ir/el :span {:class "badge"} "Participant Analysis")
                  (ir/el :h1 {:class "participant-id"} participant-id))
           (timeline-viz/view state))))
