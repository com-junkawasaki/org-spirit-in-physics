(ns spirit.router
  "Manual method+path dispatch — no Hono/router library (per ADR:
  90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port). Modeled
  on app-aozora's router.cljc: cond dispatch, ^js interop, one top-level
  .catch per request. CORS mirrors the TS `cors({origin: o => o ?? '*',
  credentials: true, allowHeaders:['Content-Type'], allowMethods:['GET','POST','OPTIONS']})`
  middleware, scoped to `/api/*` exactly as in src/index.ts."
  (:require [clojure.string :as str]
            [spirit.http :as http]
            [spirit.routes.assessments :as assessments]
            [spirit.routes.auth :as auth]
            [spirit.routes.health :as health]
            [spirit.routes.participants :as participants]
            [spirit.routes.sessions :as sessions]
            [spirit.routes.stimulus-words :as stimulus-words]
            [spirit.routes.storage :as storage]
            [spirit.routes.timeline :as timeline]))

(defn- get-db [^js env]
  (or (.-DB env) (throw (js/Error. "D1 binding `DB` is not configured."))))

(defn- dispatch [^js req ^js env ^js url method path]
  (cond
    (= path "/api/health") (health/health env)
    (= path "/api/capabilities") (health/capabilities env)

    (and (= method "POST") (= path "/api/auth/register/options")) (auth/register-options! (get-db env) req url)
    (and (= method "POST") (= path "/api/auth/register/verify")) (auth/register-verify! (get-db env) req url env)
    (and (= method "POST") (= path "/api/auth/login/options")) (auth/login-options! (get-db env) req url)
    (and (= method "POST") (= path "/api/auth/login/verify")) (auth/login-verify! (get-db env) req url env)
    (and (= method "POST") (= path "/api/auth/logout")) (auth/logout! (get-db env) req url env)
    (and (= method "GET") (= path "/api/auth/me")) (auth/me! (get-db env) req env)

    (and (= method "GET") (= path "/api/participants")) (participants/list! (get-db env))
    (and (= method "GET") (= path "/api/participants/by-email")) (participants/by-email! (get-db env) url)
    (and (= method "POST") (= path "/api/participants")) (participants/create-or-update! (get-db env) req)

    (and (= method "GET") (= path "/api/stimulus-words")) (stimulus-words/list-words)

    (and (= method "GET") (str/starts-with? path "/api/storage/object/")) (storage/get-object! env url)
    (and (= method "POST") (= path "/api/storage/upload")) (storage/upload! (get-db env) env req url)

    (and (= method "GET") (= path "/api/sessions")) (sessions/list! (get-db env) url)

    (and (= method "GET") (= path "/api/timeline/integrated")) (timeline/integrated! (get-db env) url)
    (and (= method "GET") (= path "/api/timeline/analysis")) (timeline/analysis! (get-db env) url)
    (and (= method "GET") (= path "/api/timeline/word-statistics")) (timeline/word-statistics! (get-db env) url)
    (and (= method "GET") (= path "/api/timeline/word-aggregates")) (timeline/word-aggregates! (get-db env) url)
    (and (= method "GET") (= path "/api/timeline/emotion-vectors")) (timeline/emotion-vectors! (get-db env) url)

    (and (= method "POST") (= path "/api/assessments/start")) (assessments/start! (get-db env) req)
    (and (= method "POST") (= path "/api/assessments/session-start")) (assessments/session-start! (get-db env) req)
    (and (= method "POST") (= path "/api/assessments/word-response")) (assessments/word-response! (get-db env) req)
    (and (= method "POST") (= path "/api/assessments/artifact")) (assessments/artifact! (get-db env) req)
    (and (= method "POST") (= path "/api/assessments/complete")) (assessments/complete! (get-db env) req)

    (str/starts-with? path "/api/")
    (js/Promise.resolve
     (http/json-response
      {:ok false :error "not_implemented"
       :message "This Cloudflare Worker API endpoint has not been ported from the legacy backend yet."}
      501))

    :else (js/Promise.resolve (http/not-found))))

(defn handle
  "Fetch handler body: (Request, Env) -> Promise<Response>."
  [^js req ^js env]
  (let [url (js/URL. (.-url req))
        path (.-pathname url)
        method (.-method req)
        api? (str/starts-with? path "/api/")
        origin (.get (.-headers req) "origin")]
    (cond
      (and api? (= method "OPTIONS"))
      (js/Promise.resolve (http/with-cors (http/cors-preflight) origin))

      :else
      (-> (js/Promise.resolve nil)
          (.then (fn [_] (dispatch req env url method path)))
          (.then (fn [^js response] (if api? (http/with-cors response origin) response)))
          (.catch (fn [^js err]
                    (let [^js response (http/json-response
                                         {:ok false :error "internal_error" :message (.-message err)} 500)]
                      (if api? (http/with-cors response origin) response))))))))
