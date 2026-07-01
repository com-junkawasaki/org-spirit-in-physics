(ns spirit.routes.sessions
  "Port of GET /api/sessions in src/index.ts."
  (:require [spirit.db :as db]
            [spirit.http :as http]
            [spirit.util :as util]))

(defn- map-artifact [row]
  {:id (:id row) :artifactType (:artifact_type row) :fileName (:file_name row)
   :contentType (:content_type row) :objectKey (:object_key row) :publicUrl (:public_url row)
   :createdAt (:created_at_ms row)})

(defn- session-key [row-or-artifact]
  (str (:participant_id row-or-artifact) ":" (:session_index row-or-artifact)))

(defn- map-session [row artifacts-by-key]
  {:id (:id row) :participantId (:participant_id row) :sessionIndex (:session_index row)
   :status (:status row) :startTs (:start_ts_ms row) :endTs (:end_ts_ms row)
   :createdAt (:created_at_ms row) :updatedAt (:updated_at_ms row)
   :artifacts (mapv map-artifact (get artifacts-by-key (session-key row) []))})

(defn list! [db ^js url]
  (let [participant-id (util/blank->nil (http/query-param url "participantId"))]
    (-> (js/Promise.all #js [(db/list-sessions db participant-id) (db/list-artifacts db participant-id)])
        (.then (fn [^js results]
                 (let [sessions (aget results 0)
                       artifacts (aget results 1)
                       by-key (group-by session-key artifacts)]
                   (http/json-response
                    {:sessions (mapv (fn [s] (map-session s by-key)) sessions)})))))))
