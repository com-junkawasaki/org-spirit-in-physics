(ns spirit-ui.views.researcher.sessions
  "Port of apps/researcher/src/routes/sessions/+page.svelte + SessionHistory.svelte.
  Drops the two filter <select>s (unwired/decorative in the original) and
  the disabled '詳細レポート' button; keeps the live GET /api/sessions list
  with artifact links."
  (:require [spirit-ui.ir :as ir]))

(defn- artifact-icon [artifact-type]
  (case artifact-type
    "video" "🎥" "image" "🖼️" "csv" "📊" "audio" "🎙️"
    "📁"))

(defn- artifact-chip [a]
  (ir/el :a {:key (:id a) :href (:publicUrl a) :class "artifact-chip" :target "_blank"}
         (str (artifact-icon (:artifactType a)) " " (:fileName a))))

(defn- session-card [s]
  (ir/el :div {:key (:id s) :class "session-card"}
         (ir/el :div {:class "session-header"}
                (ir/el :span {} (str (:startTs s)))
                (ir/el :span {:class (str "status " (:status s))} (:status s)))
         (ir/el :h3 {} (str "Session " (:sessionIndex s)))
         (ir/el :p {} (str "Participant: " (:participantId s)))
         (ir/el :p {:class "session-id"} (str "ID: " (:id s)))
         (when (seq (:artifacts s))
           (ir/el :div {:class "artifacts"} (mapv artifact-chip (:artifacts s))))))

(defn view [state]
  (let [sessions (get-in state [:data :sessions] [])
        loading? (get-in state [:data :sessions-loading?])]
    (ir/el :article {:class "sessions-page"}
           (ir/el :h1 {} "Sessions")
           (cond
             loading? (ir/el :p {} "Loading...")
             (empty? sessions) (ir/el :p {} "No sessions found.")
             :else (ir/el :div {:class "session-timeline"} (mapv session-card sessions))))))
