(ns spirit.graph-log
  "Manual D1 audit-log bookkeeping for the (now-plain-function) former
  LangGraph StateGraph runs — ported verbatim from the `recordNodeEvent` /
  `recordCheckpoint` helpers duplicated across src/graph/assessment.ts and
  src/graph/timeline.ts. The StateGraph engine itself was dropped in favor of
  plain sequential Promise pipelines (see ADR:
  90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port — the
  graphs were linear, no LLM/branching/interrupt use, and D1 persistence was
  already hand-written per-node rather than via LangGraph's own checkpointer).
  Row shape/trigger points/table targets are kept identical to the TS source;
  the JSON *key casing* inside input_json/output_json/channel_values_json is
  NOT byte-identical (this side serializes CLJS's idiomatic kebab-case state
  keys, e.g. :participant-id, rather than the TS source's camelCase
  participantId) — these blobs are diagnostic/audit-only, nothing in this
  codebase parses them back, so this is a deliberate non-goal rather than a
  bug, but don't rely on exact key names when reading graph_node_events /
  graph_checkpoints written by this worker vs. the legacy TS one."
  (:require [spirit.db :as db]
            [spirit.util :as util]))

(defn record-node-event!
  [db run-id step-index node-name input output]
  (db/insert-graph-node-event! db
    {:id (util/gen-uuid) :run_id run-id :step_index step-index :node_name node-name
     :input_json (js/JSON.stringify (clj->js input))
     :output_json (js/JSON.stringify (clj->js output))
     :status "completed" :created_at_ms (js/Date.now)}))

(defn record-checkpoint!
  [db run-id step-index channel-values]
  (db/upsert-graph-checkpoint! db
    {:id (util/gen-uuid) :run_id run-id :step_index step-index
     :channel_values_json (js/JSON.stringify (clj->js channel-values))
     :pending_writes_json nil :created_at_ms (js/Date.now)}))

(defn start-run!
  "-> Promise<run-id>."
  [db {:keys [graph-name participant-id session-id input]}]
  (let [run-id (util/gen-uuid)
        now (js/Date.now)]
    (-> (db/insert-graph-run! db
          {:id run-id :graph_name graph-name
           :participant_id (when (seq participant-id) participant-id)
           :session_id session-id :status "running"
           :input_json (js/JSON.stringify (clj->js input))
           :output_json nil :error_json nil
           :created_at_ms now :updated_at_ms now})
        (.then (constantly run-id)))))

(defn complete-run! [db run-id output]
  (db/complete-graph-run! db
    {:id run-id :output_json (js/JSON.stringify (clj->js output)) :updated_at_ms (js/Date.now)}))

(defn fail-run! [db run-id error-message]
  (db/fail-graph-run! db
    {:id run-id
     :error_json (js/JSON.stringify (clj->js {:message error-message}))
     :updated_at_ms (js/Date.now)}))
