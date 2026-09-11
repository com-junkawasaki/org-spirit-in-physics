(ns spirit.http
  "Minimal HTTP request/response glue — only the Hono surface actually used by
  src/index.ts (JSON in/out, a single query param, CORS). No router/framework
  (per ADR: 90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port).")

(defn json-response
  ([body] (json-response body 200))
  ([body status]
   (js/Response. (js/JSON.stringify (clj->js body))
                 #js {:status status :headers #js {"content-type" "application/json"}})))

(defn error-response [message status]
  (json-response {:message message} status))

(defn not-found []
  (json-response {:message "Not Found"} 404))

(defn cors-preflight []
  (js/Response. nil #js {:status 204
                          :headers #js {"access-control-allow-methods" "GET, POST, OPTIONS"
                                        "access-control-allow-headers" "Content-Type"}}))

(defn with-cors
  "Mirrors Hono's `cors({origin: o => o ?? '*', credentials: true, ...})` —
  echo the request Origin (or '*'), always mark credentials allowed."
  [^js response origin]
  (.set (.-headers response) "access-control-allow-origin" (or origin "*"))
  (.set (.-headers response) "access-control-allow-credentials" "true")
  response)

(defn query-param [^js url name]
  (.get (.-searchParams url) name))

(defn parse-json
  "-> Promise<^js parsed body>. Rejects on invalid JSON."
  [^js req]
  (.json req))

(defn parse-json-lenient
  "-> Promise<^js parsed body | #js {}> (never rejects)."
  [^js req]
  (-> (.json req) (.catch (fn [_] #js {}))))

(defn parse-json-map
  "-> Promise<EDN map, keyword keys>. For plain (non-binary) JSON bodies."
  [^js req]
  (-> (.json req) (.then (fn [^js body] (js->clj body :keywordize-keys true)))))
