(ns spirit.schema
  "Table/column definitions, ported from src/db/schema.ts. Documentation +
  light validation reference for spirit.db — D1 itself is the source of truth
  for actual constraints (see ../migrations/*.sql).")

(def tables
  "table-name -> ordered vector of [column-keyword sql-type nullable?]."
  {:participants
   [[:id :text false] [:email :text true] [:age_group :text true]
    [:gender :text true] [:ethnicity :text true] [:income_range :text true]
    [:medical_history_json :text true] [:is_public :integer false]
    [:created_at_ms :integer false] [:updated_at_ms :integer false]]

   :assessment_events
   [[:id :text false] [:participant_id :text false] [:event_type :text false]
    [:payload_json :text false] [:created_at_ms :integer false]]

   :sessions
   [[:id :text false] [:participant_id :text false] [:session_index :integer false]
    [:status :text false] [:start_ts_ms :integer false] [:end_ts_ms :integer true]
    [:created_at_ms :integer false] [:updated_at_ms :integer false]]

   :artifacts
   [[:id :text false] [:participant_id :text false] [:session_index :integer false]
    [:artifact_type :text false] [:file_name :text false] [:content_type :text false]
    [:object_key :text false] [:public_url :text false] [:created_at_ms :integer false]]

   :graph_runs
   [[:id :text false] [:graph_name :text false] [:participant_id :text true]
    [:session_id :text true] [:status :text false] [:input_json :text false]
    [:output_json :text true] [:error_json :text true]
    [:created_at_ms :integer false] [:updated_at_ms :integer false]]

   :graph_checkpoints
   [[:id :text false] [:run_id :text false] [:step_index :integer false]
    [:channel_values_json :text false] [:pending_writes_json :text true]
    [:created_at_ms :integer false]]

   :graph_node_events
   [[:id :text false] [:run_id :text false] [:step_index :integer false]
    [:node_name :text false] [:input_json :text true] [:output_json :text true]
    [:status :text false] [:created_at_ms :integer false]]

   :aggregate_snapshots
   [[:id :text false] [:participant_id :text false] [:session_id :text false]
    [:aggregate_type :text false] [:payload_json :text false]
    [:first_ts_ms :integer true] [:last_ts_ms :integer true]
    [:updated_at_ms :integer false]]

   :users
   [[:id :text false] [:email :text false] [:display_name :text true]
    [:role :text false] [:created_at_ms :integer false] [:updated_at_ms :integer false]]

   :webauthn_credentials
   [[:id :text false] [:user_id :text false] [:public_key :blob false]
    [:counter :integer false] [:transports :text true] [:device_type :text true]
    [:backed_up :integer false] [:nickname :text true]
    [:created_at_ms :integer false] [:last_used_at_ms :integer true]]

   :webauthn_challenges
   [[:id :text false] [:user_id :text true] [:ceremony :text false]
    [:expires_at_ms :integer false] [:created_at_ms :integer false]]

   :auth_sessions
   [[:id :text false] [:user_id :text false] [:expires_at_ms :integer false]
    [:created_at_ms :integer false] [:last_seen_at_ms :integer false]
    [:user_agent :text true]]})

;; Composite-key upsert targets (mirrors the Kysely `.onConflict(oc.columns([...]))`
;; call sites in the TS source) — spirit.db uses these for ON CONFLICT clauses.
(def conflict-keys
  {:participants [:id]
   :assessment_events [:id]
   :sessions [:participant_id :session_index]
   :graph_checkpoints [:run_id :step_index]
   :aggregate_snapshots [:participant_id :session_id :aggregate_type]})
