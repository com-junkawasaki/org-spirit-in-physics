(ns spirit.routes.assessments
  "Port of src/graph/assessment.ts. The StateGraph is replaced by a plain
  sequential Promise pipeline (see spirit.graph-log docstring for why); D1
  writes (assessment_events / sessions / graph_runs / graph_checkpoints /
  graph_node_events) are kept byte-for-byte identical to the TS source."
  (:require [spirit.db :as db]
            [spirit.graph-log :as glog]
            [spirit.http :as http]
            [spirit.util :as util]))

(defn- stable-event-id [payload]
  (str (or (:eventId payload) (:id payload) (util/gen-uuid))))

(defn- logical-session-id [participant-id session-index]
  (when (seq participant-id) (str participant-id ":" session-index)))

(defn- normalize [db {:keys [run-id payload] :as state}]
  (let [participant-id (str (or (:participantId payload) ""))
        session-index (util/session-index-of payload)
        event-id (stable-event-id payload)
        output {:participant-id participant-id :session-index session-index :event-id event-id
                :session-id (logical-session-id participant-id session-index)
                :now-ms (js/Date.now) :status "normalized"}]
    (-> (glog/record-node-event! db run-id 1 "receiveAssessmentEvent" state output)
        (.then (fn [_] (glog/record-checkpoint! db run-id 1 (merge state output))))
        (.then (constantly (merge state output))))))

(defn- append-assessment-event [db {:keys [run-id event-id participant-id event-type payload now-ms] :as state}]
  (let [event-values {:id event-id :participant_id participant-id :event_type event-type
                       :payload_json (js/JSON.stringify (clj->js (merge payload {:eventId event-id :graphRunId run-id})))
                       :created_at_ms now-ms}
        output {:status "event-appended"}]
    (-> (db/insert-assessment-event! db event-values)
        (.then (fn [_] (glog/record-node-event! db run-id 2 "appendAssessmentEvent" event-values output)))
        (.then (fn [_] (glog/record-checkpoint! db run-id 2 (merge state output))))
        (.then (constantly (merge state output))))))

(defn- upsert-session [db {:keys [run-id event-type participant-id session-index now-ms] :as state}]
  (-> (cond
        (= event-type "session-start")
        (db/upsert-session-start! db {:id (util/gen-uuid) :participant_id participant-id
                                       :session_index session-index :start_ts_ms now-ms
                                       :created_at_ms now-ms :updated_at_ms now-ms})
        (= event-type "complete")
        (db/complete-session! db {:participant_id participant-id :session_index session-index
                                   :end_ts_ms now-ms :updated_at_ms now-ms})
        :else (js/Promise.resolve nil))
      (.then (fn [_]
               (let [output {:status "session-upserted"}]
                 (-> (glog/record-node-event! db run-id 3 "upsertSession" state output)
                     (.then (fn [_] (glog/record-checkpoint! db run-id 3 (merge state output))))
                     (.then (constantly (merge state output)))))))))

(defn run-assessment-graph!
  "event-type: \"start\" | \"session-start\" | \"word-response\" | \"artifact\" | \"complete\".
  -> Promise<{:workflow-id :run-id :event-id :participant-id :session-index :session-id :status}>."
  [db event-type payload]
  (let [participant-id (str (or (:participantId payload) ""))
        session-index (util/session-index-of payload)
        session-id (logical-session-id participant-id session-index)]
    (-> (glog/start-run! db {:graph-name "assessment" :participant-id participant-id :session-id session-id
                              :input {:eventType event-type :payload payload}})
        (.then (fn [run-id]
                 (-> (normalize db {:event-type event-type :payload payload :run-id run-id
                                     :event-id "" :participant-id participant-id
                                     :session-index session-index :session-id session-id
                                     :now-ms (js/Date.now) :status "received"})
                     (.then (fn [state] (append-assessment-event db state)))
                     (.then (fn [state] (upsert-session db state)))
                     (.then (fn [{:keys [event-id participant-id session-index session-id]}]
                              (let [output {:workflow-id (str "assessment-" (if (seq participant-id) participant-id "unknown"))
                                            :run-id run-id :event-id event-id :participant-id participant-id
                                            :session-index session-index :session-id session-id :status "completed"}]
                                (-> (glog/complete-run! db run-id output)
                                    (.then (constantly output))))))
                     (.catch (fn [^js err]
                               (-> (glog/fail-run! db run-id (.-message err))
                                   (.then (fn [_] (throw err))))))))))))

;; ---------- routes ----------

(defn- handle! [db event-type ^js req response-fn]
  (-> (http/parse-json-map req)
      (.then (fn [payload] (run-assessment-graph! db event-type payload)))
      (.then response-fn)))

(defn start! [db ^js req]
  (handle! db "start" req
           (fn [{:keys [workflow-id run-id event-id]}]
             (http/json-response {:workflowId workflow-id :runId run-id :eventId event-id}))))

(defn- success-response [{:keys [run-id event-id]}]
  (http/json-response {:success true :runId run-id :eventId event-id}))

(defn session-start! [db ^js req] (handle! db "session-start" req success-response))
(defn word-response! [db ^js req] (handle! db "word-response" req success-response))
(defn artifact! [db ^js req] (handle! db "artifact" req success-response))
(defn complete! [db ^js req] (handle! db "complete" req success-response))
