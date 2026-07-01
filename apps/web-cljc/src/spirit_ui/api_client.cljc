(ns spirit-ui.api-client
  "fetch wrapper for the api-worker-cljc backend (see
  apps/api-worker-cljc/src/spirit/routes/*.cljc for the exact response
  shapes this mirrors). JSON in/out, credentials included (session cookie).
  `@simplewebauthn/browser` is interop-wrapped for the passkey ceremony,
  mirroring the backend's `@simplewebauthn/server` interop-wrap (ADR:
  90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port,
  exemption clause of ADR-2606290000)."
  (:require ["@simplewebauthn/browser" :as webauthn-browser]))

(def ^:dynamic *base-url*
  "Same-origin \"/api\" by default (production deploys the SPA behind the
  same domain/CDN as api-worker-cljc). For local dev where the two are
  served from different ports, set `window.SPIRIT_API_BASE_URL` before
  main.js loads (see public/{web,researcher}/index.html)."
  (or (some-> js/window .-SPIRIT_API_BASE_URL) "/api"))

(defn- request [method path & [body]]
  (-> (js/fetch (str *base-url* path)
                #js {:method method
                     :headers #js {"Content-Type" "application/json"}
                     :credentials "include"
                     :body (when body (js/JSON.stringify (clj->js body)))})
      (.then (fn [^js res]
               (-> (.json res)
                   (.then (fn [^js body]
                            {:ok (.-ok res) :status (.-status res)
                             :body (js->clj body :keywordize-keys true)})))))))

(defn get! [path] (request "GET" path))
(defn post! [path body] (request "POST" path body))

;; ---------- participants / sessions ----------

(defn list-participants! [] (get! "/participants"))

(defn find-participant-by-email! [email]
  (get! (str "/participants/by-email?email=" (js/encodeURIComponent email))))

(defn upsert-participant! [participant] (post! "/participants" participant))

(defn list-sessions!
  ([] (get! "/sessions"))
  ([participant-id] (get! (str "/sessions?participantId=" (js/encodeURIComponent participant-id)))))

;; ---------- auth ----------

(defn me! [] (get! "/auth/me"))
(defn logout! [] (post! "/auth/logout" nil))

(defn register!
  "-> Promise<{:ok :status :body}> (the /register/verify response). Runs the
  full WebAuthn registration ceremony: fetch options -> browser passkey
  prompt (startRegistration) -> verify."
  [email display-name]
  (-> (post! "/auth/register/options" {:email email :displayName display-name})
      (.then (fn [{:keys [body]}]
               (webauthn-browser/startRegistration (clj->js {:optionsJSON (:options body)}))))
      ;; `response` (a plain JSON-safe JS object per the WebAuthn spec) is
      ;; passed through untouched — clj->js leaves non-Clojure values inside
      ;; a map as-is, so no js->clj/clj->js round-trip is needed here.
      (.then (fn [response]
               (post! "/auth/register/verify" {:email email :response response})))))

(defn login!
  "-> Promise<{:ok :status :body}> (the /login/verify response)."
  [email]
  (-> (post! "/auth/login/options" (if email {:email email} {}))
      (.then (fn [{:keys [body]}]
               (webauthn-browser/startAuthentication (clj->js {:optionsJSON (:options body)}))))
      (.then (fn [response]
               (post! "/auth/login/verify" {:response response})))))
