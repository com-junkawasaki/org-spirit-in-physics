(ns spirit.db
  "D1 access — hand-written parameterized SQL + ^js interop, no query-builder
  DSL (per ADR: 90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port).
  Port of src/db/client.ts + the Kysely call sites in src/index.ts and
  src/graph/{assessment,timeline}.ts.

  Row maps keep snake_case keyword keys (:participant_id, :created_at_ms, ...)
  matching the SQL columns 1:1 — no kebab-case translation layer, since these
  maps are DB rows, not domain values.")

;; ---------- low-level D1 interop ----------

(defn- bind
  "D1's `.bind` is variadic; build the statement via `.apply` so a runtime-sized
  args vector works uniformly."
  [^js stmt args]
  (.apply (.-bind stmt) stmt (into-array args)))

(defn- row->map
  "Shallow JS-object -> map conversion (top-level keys only, values passed
  through as-is). Deliberately NOT `js->clj` (which recurses): the
  webauthn_credentials.public_key column is a BLOB and comes back from D1 as
  an ArrayBuffer/Uint8Array — a recursive js->clj would try to walk it as a
  plain object and shred it into an index->byte map."
  [^js row]
  (when row
    (into {} (map (fn [k] [(keyword k) (unchecked-get row k)])) (js-keys row))))

(defn query-all
  "SELECT ... -> Promise<[{...}]> (snake_case keyword keys)."
  [^js db sql args]
  (-> (bind (.prepare db sql) args)
      (.all)
      (.then (fn [^js result] (mapv row->map (.-results result))))))

(defn query-first
  "SELECT ... -> Promise<{...} | nil>. Uses D1's native `.first()` (no LIMIT
  needed; D1 stops after the first row)."
  [^js db sql args]
  (-> (bind (.prepare db sql) args)
      (.first)
      (.then row->map)))

(defn execute!
  "INSERT/UPDATE/DELETE -> Promise<js D1Result>."
  [^js db sql args]
  (-> (bind (.prepare db sql) args)
      (.run)))

;; ---------- participants ----------

(defn list-participants [db]
  (query-all db "SELECT * FROM participants ORDER BY updated_at_ms DESC" []))

(defn find-participant-by-email [db email]
  (query-first db "SELECT * FROM participants WHERE email = ?" [email]))

(defn find-participant-by-id [db id]
  (query-first db "SELECT * FROM participants WHERE id = ?" [id]))

(defn upsert-participant!
  [db {:keys [id email age_group gender ethnicity income_range medical_history_json
              is_public created_at_ms updated_at_ms]}]
  (execute! db
    "INSERT INTO participants
       (id, email, age_group, gender, ethnicity, income_range, medical_history_json, is_public, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email, age_group = excluded.age_group, gender = excluded.gender,
       ethnicity = excluded.ethnicity, income_range = excluded.income_range,
       medical_history_json = excluded.medical_history_json, is_public = excluded.is_public,
       updated_at_ms = excluded.updated_at_ms"
    [id email age_group gender ethnicity income_range medical_history_json is_public
     created_at_ms updated_at_ms]))

;; ---------- assessment_events ----------

(defn list-assessment-events [db participant-id]
  (query-all db
    "SELECT * FROM assessment_events WHERE participant_id = ? ORDER BY created_at_ms ASC"
    [participant-id]))

(defn insert-assessment-event!
  "Idempotent on `id` (mirrors `.onConflict(oc => oc.column('id').doNothing())`)."
  [db {:keys [id participant_id event_type payload_json created_at_ms]}]
  (execute! db
    "INSERT INTO assessment_events (id, participant_id, event_type, payload_json, created_at_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING"
    [id participant_id event_type payload_json created_at_ms]))

;; ---------- sessions ----------

(defn list-sessions
  "participant-id nil -> all sessions."
  [db participant-id]
  (if participant-id
    (query-all db "SELECT * FROM sessions WHERE participant_id = ? ORDER BY start_ts_ms DESC" [participant-id])
    (query-all db "SELECT * FROM sessions ORDER BY start_ts_ms DESC" [])))

(defn upsert-session-start!
  "Insert an in_progress session, or on conflict(participant_id, session_index)
  re-mark it in_progress (id/start_ts_ms/created_at_ms preserved from the
  original row — matches the TS `sessionPatch = {status, updated_at_ms}`)."
  [db {:keys [id participant_id session_index start_ts_ms created_at_ms updated_at_ms]}]
  (execute! db
    "INSERT INTO sessions (id, participant_id, session_index, status, start_ts_ms, end_ts_ms, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, 'in_progress', ?, NULL, ?, ?)
     ON CONFLICT(participant_id, session_index) DO UPDATE SET
       status = 'in_progress', updated_at_ms = excluded.updated_at_ms"
    [id participant_id session_index start_ts_ms created_at_ms updated_at_ms]))

(defn complete-session!
  [db {:keys [participant_id session_index end_ts_ms updated_at_ms]}]
  (execute! db
    "UPDATE sessions SET status = 'completed', end_ts_ms = ?, updated_at_ms = ?
     WHERE participant_id = ? AND session_index = ? AND status != 'completed'"
    [end_ts_ms updated_at_ms participant_id session_index]))

;; ---------- artifacts ----------

(defn list-artifacts
  [db participant-id]
  (if participant-id
    (query-all db "SELECT * FROM artifacts WHERE participant_id = ? ORDER BY created_at_ms DESC" [participant-id])
    (query-all db "SELECT * FROM artifacts ORDER BY created_at_ms DESC" [])))

(defn insert-artifact!
  [db {:keys [id participant_id session_index artifact_type file_name content_type
              object_key public_url created_at_ms]}]
  (execute! db
    "INSERT INTO artifacts
       (id, participant_id, session_index, artifact_type, file_name, content_type, object_key, public_url, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    [id participant_id session_index artifact_type file_name content_type object_key
     public_url created_at_ms]))

;; ---------- graph_runs / graph_checkpoints / graph_node_events ----------

(defn insert-graph-run!
  [db {:keys [id graph_name participant_id session_id status input_json output_json
              error_json created_at_ms updated_at_ms]}]
  (execute! db
    "INSERT INTO graph_runs
       (id, graph_name, participant_id, session_id, status, input_json, output_json, error_json, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    [id graph_name participant_id session_id status input_json output_json error_json
     created_at_ms updated_at_ms]))

(defn complete-graph-run!
  [db {:keys [id output_json updated_at_ms]}]
  (execute! db
    "UPDATE graph_runs SET status = 'completed', output_json = ?, updated_at_ms = ? WHERE id = ?"
    [output_json updated_at_ms id]))

(defn fail-graph-run!
  [db {:keys [id error_json updated_at_ms]}]
  (execute! db
    "UPDATE graph_runs SET status = 'failed', error_json = ?, updated_at_ms = ? WHERE id = ?"
    [error_json updated_at_ms id]))

(defn upsert-graph-checkpoint!
  [db {:keys [id run_id step_index channel_values_json pending_writes_json created_at_ms]}]
  (execute! db
    "INSERT INTO graph_checkpoints (id, run_id, step_index, channel_values_json, pending_writes_json, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(run_id, step_index) DO UPDATE SET
       channel_values_json = excluded.channel_values_json,
       pending_writes_json = excluded.pending_writes_json,
       created_at_ms = excluded.created_at_ms"
    [id run_id step_index channel_values_json pending_writes_json created_at_ms]))

(defn insert-graph-node-event!
  [db {:keys [id run_id step_index node_name input_json output_json status created_at_ms]}]
  (execute! db
    "INSERT INTO graph_node_events (id, run_id, step_index, node_name, input_json, output_json, status, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    [id run_id step_index node_name input_json output_json status created_at_ms]))

;; ---------- aggregate_snapshots ----------

(defn upsert-aggregate-snapshot!
  [db {:keys [id participant_id session_id aggregate_type payload_json first_ts_ms
              last_ts_ms updated_at_ms]}]
  (execute! db
    "INSERT INTO aggregate_snapshots
       (id, participant_id, session_id, aggregate_type, payload_json, first_ts_ms, last_ts_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(participant_id, session_id, aggregate_type) DO UPDATE SET
       payload_json = excluded.payload_json, first_ts_ms = excluded.first_ts_ms,
       last_ts_ms = excluded.last_ts_ms, updated_at_ms = excluded.updated_at_ms"
    [id participant_id session_id aggregate_type payload_json first_ts_ms last_ts_ms
     updated_at_ms]))

;; ---------- users ----------

(defn find-user-by-email [db email]
  (query-first db "SELECT * FROM users WHERE email = ?" [email]))

(defn find-user-by-id [db id]
  (query-first db "SELECT * FROM users WHERE id = ?" [id]))

(defn count-users [db]
  (-> (query-first db "SELECT COUNT(*) AS n FROM users" [])
      (.then (fn [row] (or (:n row) 0)))))

(defn insert-user!
  [db {:keys [id email display_name role created_at_ms updated_at_ms]}]
  (execute! db
    "INSERT INTO users (id, email, display_name, role, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?)"
    [id email display_name role created_at_ms updated_at_ms]))

;; ---------- webauthn_credentials ----------

(defn list-credential-ids-for-user [db user-id]
  (-> (query-all db "SELECT id FROM webauthn_credentials WHERE user_id = ?" [user-id])
      (.then (fn [rows] (mapv :id rows)))))

(defn find-credential-by-id [db id]
  (query-first db "SELECT * FROM webauthn_credentials WHERE id = ?" [id]))

(defn insert-credential!
  [db {:keys [id user_id public_key counter transports device_type backed_up nickname
              created_at_ms last_used_at_ms]}]
  (execute! db
    "INSERT INTO webauthn_credentials
       (id, user_id, public_key, counter, transports, device_type, backed_up, nickname, created_at_ms, last_used_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    [id user_id public_key counter transports device_type backed_up nickname
     created_at_ms last_used_at_ms]))

(defn touch-credential!
  [db {:keys [id counter last_used_at_ms]}]
  (execute! db
    "UPDATE webauthn_credentials SET counter = ?, last_used_at_ms = ? WHERE id = ?"
    [counter last_used_at_ms id]))

;; ---------- webauthn_challenges ----------

(defn insert-challenge!
  [db {:keys [id user_id ceremony expires_at_ms created_at_ms]}]
  (execute! db
    "INSERT INTO webauthn_challenges (id, user_id, ceremony, expires_at_ms, created_at_ms)
     VALUES (?, ?, ?, ?, ?)"
    [id user_id ceremony expires_at_ms created_at_ms]))

(defn gc-expired-challenges!
  "Best-effort GC of expired challenges, mirroring the TS fire-and-check call
  after every `persistChallenge`."
  [db now-ms]
  (execute! db "DELETE FROM webauthn_challenges WHERE expires_at_ms < ?" [now-ms]))

(defn find-challenge [db challenge ceremony]
  (query-first db
    "SELECT * FROM webauthn_challenges WHERE id = ? AND ceremony = ?"
    [challenge ceremony]))

(defn delete-challenge! [db challenge]
  (execute! db "DELETE FROM webauthn_challenges WHERE id = ?" [challenge]))

;; ---------- auth_sessions ----------

(defn insert-auth-session!
  [db {:keys [id user_id expires_at_ms created_at_ms last_seen_at_ms user_agent]}]
  (execute! db
    "INSERT INTO auth_sessions (id, user_id, expires_at_ms, created_at_ms, last_seen_at_ms, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)"
    [id user_id expires_at_ms created_at_ms last_seen_at_ms user_agent]))

(defn find-auth-session [db id]
  (query-first db "SELECT * FROM auth_sessions WHERE id = ?" [id]))

(defn delete-auth-session! [db id]
  (execute! db "DELETE FROM auth_sessions WHERE id = ?" [id]))

(defn touch-auth-session! [db id last-seen-at-ms]
  (execute! db "UPDATE auth_sessions SET last_seen_at_ms = ? WHERE id = ?" [last-seen-at-ms id]))
