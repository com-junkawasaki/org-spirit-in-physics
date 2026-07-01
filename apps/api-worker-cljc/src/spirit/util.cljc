(ns spirit.util
  "Small helpers deduplicated from logic that was copy-pasted 2-3x across
  src/index.ts, src/graph/assessment.ts, src/graph/timeline.ts.")

(defn gen-uuid [] (.randomUUID js/crypto))

(defn session-index-of
  "Coerce payload.session/sessionIndex/sessionNumber to a session index,
  defaulting to 0. Mirrors the TS `Number(x ?? y ?? z ?? 0) || 0` idiom."
  [payload]
  (let [raw (or (:session payload) (:sessionIndex payload) (:sessionNumber payload) 0)
        n (js/Number raw)]
    (if (and (js/Number.isFinite n) (not (zero? n))) n 0)))

(defn parse-session-index
  "Query-string sessionId -> session index, or nil. Tolerates trailing-digit
  strings like \"session-3\" (mirrors src/index.ts `parseSessionIndex`)."
  [value]
  (when (seq value)
    (let [direct (js/Number value)]
      (if (js/Number.isFinite direct)
        direct
        (when-let [m (.exec (js/RegExp. "(\\d+)$") value)]
          (js/Number (aget m 1)))))))

(defn parse-json-safe
  "JSON string -> EDN value (deep-converted; safe for non-BLOB JSON payloads), or nil on parse failure."
  [value]
  (try (js->clj (js/JSON.parse value) :keywordize-keys true) (catch :default _ nil)))
